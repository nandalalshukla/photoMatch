"""
Experiment 3 — cost of searching face embeddings with PostgreSQL + pgvector.

Synthetic data (no real faces are needed to measure *cost*): every event holds
identity clusters of 512-d unit vectors. Faces of one identity have cosine
similarity ~0.36-0.81 with each other (typical of hard same-person pairs for
ArcFace-style embeddings); different identities are random directions
(cosine ~ N(0, 1/sqrt(512))). A "selfie" query is a noisy copy of an identity.

Part A  exact search restricted to one event (what PhotoMatch does) —
        latency vs event size, and independence from the total table size.
Part B  global approximate search (HNSW) vs exact search —
        latency, recall of the matching set, build time, index size.
Part C  HNSW combined with an event filter (post-filtering pitfall).

Setup (once):  createdb paperbench (extension vector) — see paper/README.md
Run:           exp-venv/bin/python paper/experiments/pgvector_bench.py a|b|c|all
"""

import argparse
import json
import statistics
import time
from pathlib import Path

import numpy as np
import psycopg
from pgvector.psycopg import register_vector

DSN = "postgresql://photomatch:photomatch@localhost:5432/paperbench"
DIM = 512
THRESHOLD = 0.45  # cosine similarity, same as FACE_MATCH_THRESHOLD
FACES_PER_PHOTO = 4
OUT = Path(__file__).resolve().parents[1] / "data"


def unit(x):
    return x / np.linalg.norm(x, axis=-1, keepdims=True)


def make_event(rng, n_faces, per_identity=8):
    """Embeddings of one event plus its identity centres and the identity of every face."""
    k = max(1, n_faces // per_identity)
    centers = unit(rng.standard_normal((k, DIM)).astype(np.float32))
    ident = np.arange(n_faces) % k
    c0 = rng.uniform(0.6, 0.9, size=(n_faces, 1)).astype(np.float32)
    noise = unit(rng.standard_normal((n_faces, DIM)).astype(np.float32))
    return centers, ident, unit(c0 * centers[ident] + np.sqrt(1 - c0**2) * noise)


def make_queries(rng, centers, n):
    """Selfie-like probes: identity centre + noise (cosine to the centre ~0.8)."""
    picks = rng.integers(0, len(centers), n)
    noise = unit(rng.standard_normal((n, DIM)).astype(np.float32))
    return picks, unit(0.8 * centers[picks] + 0.6 * noise)


def connect():
    conn = psycopg.connect(DSN, autocommit=True)
    register_vector(conn)
    return conn


def create_tables(conn, name):
    conn.execute(f"DROP TABLE IF EXISTS {name}_face, {name}_photo")
    conn.execute(f"CREATE TABLE {name}_photo (id int PRIMARY KEY, approved bool NOT NULL DEFAULT true)")
    conn.execute(
        f"CREATE TABLE {name}_face (id int PRIMARY KEY, photo_id int NOT NULL, event_id int NOT NULL, embedding vector({DIM}) NOT NULL)"
    )


def load_faces(conn, name, rows):
    """rows: iterable of (face_id, photo_id, event_id, embedding). Photos are created on the way."""
    photo_ids = set()
    with conn.cursor() as cur:
        with cur.copy(f"COPY {name}_face (id, photo_id, event_id, embedding) FROM STDIN (FORMAT BINARY)") as copy:
            copy.set_types(["int4", "int4", "int4", "vector"])
            for row in rows:
                copy.write_row(row)
                photo_ids.add(row[1])
        with cur.copy(f"COPY {name}_photo (id) FROM STDIN (FORMAT BINARY)") as copy:
            copy.set_types(["int4"])
            for pid in sorted(photo_ids):
                copy.write_row((pid,))
    conn.execute(f"CREATE INDEX {name}_face_event_idx ON {name}_face (event_id)")
    conn.execute(f"ANALYZE {name}_face")
    conn.execute(f"ANALYZE {name}_photo")


def build_table(conn, rng, name, event_sizes):
    """Create {name}_face/_photo with one event per entry of event_sizes; return per-event query material."""
    create_tables(conn, name)
    material, next_face, buffer = {}, 0, []

    def rows():
        nonlocal next_face
        for event_id, size in enumerate(event_sizes):
            centers, ident, emb = make_event(rng, size)
            material[event_id] = {"centers": centers, "ident": ident, "emb": emb if size <= 2000 else None, "size": size}
            for i in range(size):
                yield (next_face, next_face // FACES_PER_PHOTO, event_id, emb[i])
                next_face += 1

    load_faces(conn, name, rows())
    return material


# The production query (apps/api/src/lib/face-store.ts), with table names parameterised.
def event_query(name):
    return f"""
    SELECT f.photo_id, MAX(1 - (f.embedding <=> %(q)s::vector))::float AS similarity
    FROM {name}_face f JOIN {name}_photo p ON p.id = f.photo_id
    WHERE f.event_id = %(e)s AND p.approved = true AND 1 - (f.embedding <=> %(q)s::vector) >= %(t)s
    GROUP BY f.photo_id ORDER BY similarity DESC LIMIT 1000"""


def summarise(samples_ms):
    s = sorted(samples_ms)
    pick = lambda q: s[min(len(s) - 1, int(q * len(s)))]  # noqa: E731
    return {"median_ms": statistics.median(s), "p05_ms": pick(0.05), "p95_ms": pick(0.95), "mean_ms": statistics.fmean(s), "n": len(s)}


def timed(conn, sql, params, warmup=3):
    for _ in range(warmup):
        conn.execute(sql, params).fetchall()
    start = time.perf_counter()
    rows = conn.execute(sql, params).fetchall()
    return (time.perf_counter() - start) * 1000, rows


# ----- Part A ---------------------------------------------------------------------------------


def part_a():
    rng = np.random.default_rng(11)
    conn = connect()
    result = {"threshold": THRESHOLD, "pg": conn.execute("show server_version").fetchone()[0],
              "pgvector": conn.execute("select extversion from pg_extension where extname='vector'").fetchone()[0]}

    sizes = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
    total = 500_000
    filler = [1000] * ((total - sum(sizes)) // 1000)
    print("A1: building 500k-face table")
    material = build_table(conn, rng, "a", sizes + filler)
    result["table_faces"] = conn.execute("select count(*) from a_face").fetchone()[0]
    rows = []
    for event_id, size in enumerate(sizes):
        picks, queries = make_queries(rng, material[event_id]["centers"], 40)
        samples, hits = [], []
        for q in queries:
            ms, found = timed(conn, event_query("a"), {"q": q, "e": event_id, "t": THRESHOLD}, warmup=1)
            samples.append(ms)
            hits.append(len(found))
        rows.append({"event_faces": size, **summarise(samples), "mean_photos_returned": statistics.fmean(hits)})
        print("  event", size, round(rows[-1]["median_ms"], 2), "ms")
    result["latency_vs_event_size"] = rows
    print("A2: same 10k-face event in tables of different total size")
    independence = []
    for total_faces in (50_000, 100_000, 250_000, 500_000):
        if total_faces == 500_000:
            name, event_id, mat = "a", sizes.index(10000), material
        else:
            name = f"a{total_faces // 1000}k"
            layout = [10000] + [1000] * ((total_faces - 10000) // 1000)
            mat = build_table(conn, rng, name, layout)
            event_id = 0
        picks, queries = make_queries(rng, mat[event_id]["centers"], 40)
        samples = [timed(conn, event_query(name), {"q": q, "e": event_id, "t": THRESHOLD}, warmup=1)[0] for q in queries]
        independence.append({"table_faces": total_faces, **summarise(samples)})
        print("  total", total_faces, round(independence[-1]["median_ms"], 2), "ms")
        if name != "a":
            conn.execute(f"DROP TABLE {name}_face, {name}_photo")
    result["latency_vs_table_size"] = independence

    (OUT / "pgvector_a.json").write_text(json.dumps(result, indent=2))
    conn.execute("DROP TABLE IF EXISTS a_face, a_photo")
    print("wrote pgvector_a.json")


# ----- Parts B and C ----------------------------------------------------------------------------


def ground_truth(emb_all, queries):
    """Indices of faces with cosine >= threshold for every query (exact, in numpy)."""
    sims = queries @ emb_all.T
    return [np.nonzero(row >= THRESHOLD)[0] for row in sims]


def part_b_c(sizes):
    rng = np.random.default_rng(23)
    conn = connect()
    conn.execute("SET maintenance_work_mem = '2GB'")
    conn.execute("SET max_parallel_maintenance_workers = 3")
    result = {"threshold": THRESHOLD, "tables": [], "filtered": None}

    for n in sizes:
        name = f"b{n // 1000}k"
        print(f"B: {n} faces")
        layout = [1000] * (n // 1000)
        create_tables(conn, name)
        events, all_emb, rows, face_id = [], [], [], 0
        for event_id, size in enumerate(layout):
            centers, ident, emb = make_event(rng, size)
            events.append(centers)
            all_emb.append(emb)
            rows += [(face_id + i, (face_id + i) // FACES_PER_PHOTO, event_id, emb[i]) for i in range(size)]
            face_id += size
        emb_all = np.concatenate(all_emb)
        load_faces(conn, name, iter(rows))
        del rows

        # 100 probes spread over random events
        event_of_query = rng.integers(0, len(layout), 100)
        probes = np.stack([make_queries(rng, events[e], 1)[1][0] for e in event_of_query])
        truth = ground_truth(emb_all, probes)

        exact_sql = f"SELECT id, embedding <=> %(q)s::vector AS d FROM {name}_face ORDER BY embedding <=> %(q)s::vector LIMIT 100"
        conn.execute("SET enable_indexscan = off")
        exact_ms = [timed(conn, exact_sql, {"q": q}, warmup=1)[0] for q in probes[:30]]
        conn.execute("RESET enable_indexscan")

        t0 = time.perf_counter()
        conn.execute(f"CREATE INDEX {name}_hnsw ON {name}_face USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)")
        build_s = time.perf_counter() - t0
        index_mb = float(conn.execute(f"select pg_relation_size('{name}_hnsw')/1048576.0").fetchone()[0])
        table_mb = float(conn.execute(f"select pg_relation_size('{name}_face')/1048576.0").fetchone()[0])
        print(f"   HNSW built in {build_s:.0f}s, {index_mb:.0f} MB")

        ann = []
        for ef in (40, 100, 200, 400):
            conn.execute(f"SET hnsw.ef_search = {ef}")
            recalls, samples = [], []
            for q, gt in zip(probes, truth):
                ms, found = timed(conn, exact_sql, {"q": q}, warmup=0)
                samples.append(ms)
                got = {r[0] for r in found if r[1] <= 1 - THRESHOLD}
                if len(gt):
                    recalls.append(len(got & set(gt.tolist())) / len(gt))
            ann.append({"ef_search": ef, "mean_recall": statistics.fmean(recalls), "min_recall": min(recalls), **summarise(samples)})
            print("   ef", ef, "recall", round(ann[-1]["mean_recall"], 4), round(ann[-1]["median_ms"], 2), "ms")
        conn.execute("RESET hnsw.ef_search")
        result["tables"].append({"faces": n, "exact": summarise(exact_ms), "hnsw_build_s": build_s, "hnsw_mb": index_mb,
                                 "table_mb": table_mb, "hnsw": ann, "mean_true_matches": float(np.mean([len(g) for g in truth]))})

        if n == max(sizes):  # Part C — event-filtered ANN on the largest table
            print("C: HNSW + event filter")
            filtered = []
            sql = f"SELECT id, embedding <=> %(q)s::vector AS d FROM {name}_face WHERE event_id = %(e)s ORDER BY embedding <=> %(q)s::vector LIMIT 100"
            local_truth = []
            for q, e, gt in zip(probes, event_of_query, truth):
                local_truth.append(gt)  # every true match lies in the probe's own event by construction
            # (1) planner's own choice, (2) HNSW forced (event_id btree dropped inside a rolled-back transaction)
            for mode in ("planner_default", "hnsw_forced"):
                for ef in (40, 100, 400):
                    conn.execute(f"SET hnsw.ef_search = {ef}")
                    recalls, samples, returned = [], [], []
                    conn.autocommit = False
                    if mode == "hnsw_forced":
                        conn.execute(f"DROP INDEX {name}_face_event_idx")
                        conn.execute("SET LOCAL enable_seqscan = off")
                    for q, e, gt in zip(probes[:50], event_of_query[:50], local_truth[:50]):
                        ms, found = timed(conn, sql, {"q": q, "e": int(e)}, warmup=0)
                        samples.append(ms)
                        got = {r[0] for r in found if r[1] <= 1 - THRESHOLD}
                        returned.append(len(found))
                        if len(gt):
                            recalls.append(len(got & set(gt.tolist())) / len(gt))
                    plan = "\n".join(r[0] for r in conn.execute("EXPLAIN " + sql, {"q": probes[0], "e": int(event_of_query[0])}).fetchall())
                    conn.rollback()
                    conn.autocommit = True
                    filtered.append({"mode": mode, "ef_search": ef, "mean_recall": statistics.fmean(recalls),
                                     "mean_rows_returned": statistics.fmean(returned), "uses_hnsw": "hnsw" in plan, **summarise(samples)})
                    print("  ", mode, "ef", ef, "recall", round(filtered[-1]["mean_recall"], 3), "rows", round(filtered[-1]["mean_rows_returned"], 1), "hnsw?", filtered[-1]["uses_hnsw"])
            conn.execute("RESET hnsw.ef_search")
            result["filtered"] = filtered
        conn.execute(f"DROP TABLE {name}_face, {name}_photo")

    (OUT / "pgvector_b.json").write_text(json.dumps(result, indent=2))
    print("wrote pgvector_b.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("part", choices=["a", "b", "all"])
    parser.add_argument("--sizes", type=int, nargs="+", default=[10_000, 50_000, 100_000, 250_000])
    args = parser.parse_args()
    if args.part in ("a", "all"):
        part_a()
    if args.part in ("b", "all"):
        part_b_c(args.sizes)
