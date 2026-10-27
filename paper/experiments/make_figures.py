"""
Draws every graph of the paper from the JSON files written by the experiments.
Nothing here invents data: each plotted point is read from paper/data/*.json.

Run:  exp-venv/bin/python paper/experiments/make_figures.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA, FIG = ROOT / "data", ROOT / "figures"
FIG.mkdir(exist_ok=True)

# IEEE column widths: 3.5 in (one column), 7.16 in (two columns). Text ~8 pt.
plt.rcParams.update(
    {
        "font.family": "serif",
        "font.serif": ["Liberation Serif", "Times New Roman", "DejaVu Serif"],
        "font.size": 8,
        "axes.labelsize": 8,
        "axes.titlesize": 8,
        "legend.fontsize": 7,
        "xtick.labelsize": 7,
        "ytick.labelsize": 7,
        "axes.linewidth": 0.6,
        "lines.linewidth": 1.0,
        "lines.markersize": 3.5,
        "axes.grid": True,
        "grid.linewidth": 0.3,
        "grid.alpha": 0.6,
        "figure.dpi": 150,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.02,
        "pdf.fonttype": 42,
    }
)
GRAY, BLACK = "0.65", "0.05"
# Grayscale-safe palette: distinguishable in print thanks to different markers/dashes.
STYLES = [("-", "o"), ("--", "s"), ("-.", "^"), (":", "D")]


def load(name):
    return json.loads((DATA / name).read_text())


def panel_label(ax, text):
    ax.text(0.0, 1.03, text, transform=ax.transAxes, fontsize=8, fontweight="bold", va="bottom", ha="left")


# ----------------------------------------------------------------------------------------------
def fig_latency():
    d = load("ai_latency.json")
    s = d["stages_1600px"]
    names = [
        ("jpeg_decode", "JPEG decode\n(1600 px)"),
        ("detector_scrfd", "SCRFD detector\n(per photo)"),
        ("embedding_arcface_per_face", "ArcFace embedding\n(per face)"),
        ("head_pose_per_face", "Head pose\n(per face)"),
        ("antispoof_two_models_per_face", "Anti-spoof, 2 models\n(per face)"),
    ]
    fig, (a, b) = plt.subplots(2, 1, figsize=(3.45, 3.5), gridspec_kw={"height_ratios": [1.15, 1]})
    med = [s[k]["median_ms"] for k, _ in names]
    lo = [s[k]["median_ms"] - s[k]["p05_ms"] for k, _ in names]
    hi = [s[k]["p95_ms"] - s[k]["median_ms"] for k, _ in names]
    y = np.arange(len(names))[::-1]
    a.barh(y, med, xerr=[lo, hi], color="0.55", edgecolor=BLACK, linewidth=0.5, error_kw={"elinewidth": 0.7, "capsize": 2})
    for yi, m, h in zip(y, med, hi):
        a.text(m + h + 2, yi + 0.02, f"{m:.1f}", va="center", fontsize=7)
    a.set_yticks(y)
    a.set_yticklabels([n for _, n in names])
    a.set_xlabel("median time (ms); whiskers: 5th-95th percentile")
    a.set_xlim(0, 100)
    a.grid(axis="y", visible=False)
    panel_label(a, "(a)")

    r = d["resolution_sweep"]
    x = [row["long_side"] for row in r]
    b.plot(x, [row["median_ms"] for row in r], "o-", color=BLACK, label="time per photo (6 faces)")
    b.set_ylim(0, 700)
    b.set_xlabel("long side of the photo (px)")
    b.set_ylabel("time per photo (ms)")
    b2 = b.twinx()
    b2.plot(x, [row["faces_found"] for row in r], "s--", color="0.45", label="faces found")
    b2.set_ylim(0, 8)
    b2.set_ylabel("faces found")
    b2.grid(False)
    h1, l1 = b.get_legend_handles_labels()
    h2, l2 = b2.get_legend_handles_labels()
    b.legend(h1 + h2, l1 + l2, loc="lower right", frameon=True, framealpha=0.9)
    panel_label(b, "(b)")
    fig.tight_layout(h_pad=1.0)
    fig.savefig(FIG / "graph_latency.pdf")
    plt.close(fig)


# ----------------------------------------------------------------------------------------------
def fig_robustness():
    d = load("ai_robustness.json")
    thr = d["threshold"]
    imp_clean_max = d["impostor_clean"]["max"]
    panels = [
        ("blur_sigma_px", "Gaussian blur $\\sigma$ (px)", False),
        ("jpeg_quality", "JPEG quality", True),
        ("brightness_factor", "brightness factor", True),
        ("noise_sigma", "Gaussian noise $\\sigma$ (gray levels)", False),
        ("rotation_deg", "in-plane rotation (degrees)", False),
        ("lower_face_covered", "lower face covered (fraction)", False),
    ]
    fig, axes = plt.subplots(2, 3, figsize=(7.1, 3.5), sharey=True)
    for ax, (key, label, invert), tag in zip(axes.ravel(), panels, "abcdef"):
        rows = d["sweeps"][key]
        x = np.arange(len(rows))
        for i in range(rows[0]["identities"]):
            ys = [r["genuine"][i] if r["genuine"][i] is not None else np.nan for r in rows]
            ax.plot(x, ys, color="0.78", linewidth=0.6, zorder=1)
        mean = [r["genuine_mean"] if r["genuine_mean"] is not None else np.nan for r in rows]
        mn = [r["genuine_min"] if r["genuine_min"] is not None else np.nan for r in rows]
        imp = [r["impostor_max"] for r in rows]
        ax.plot(x, mean, "o-", color=BLACK, label="mean (9 identities)", zorder=3)
        ax.plot(x, mn, "v--", color="0.35", label="minimum", zorder=3)
        ax.plot(x, imp, "^:", color="0.35", label="max. other identity", zorder=3)
        ax.axhline(thr, color=BLACK, linewidth=0.8, linestyle=(0, (4, 2)))
        ax.set_xticks(x)
        ax.set_xticklabels([str(r["level"]) for r in rows], fontsize=6.5)
        ax.set_xlabel(label)
        ax.set_ylim(-0.1, 1.05)
        panel_label(ax, f"({tag})")
    for ax in axes[:, 0]:
        ax.set_ylabel("cosine similarity to clean face")
    axes[0, 0].text(0.04, thr + 0.03, "threshold 0.45", fontsize=6.5, transform=axes[0, 0].get_yaxis_transform())
    h, l = axes[0, 0].get_legend_handles_labels()
    fig.legend(h, l, loc="lower center", ncol=3, frameon=False, bbox_to_anchor=(0.5, -0.04))
    fig.tight_layout(rect=(0, 0.03, 1, 1), h_pad=1.2, w_pad=0.6)
    fig.savefig(FIG / "graph_robustness.pdf")
    plt.close(fig)


# ----------------------------------------------------------------------------------------------
def fig_face_size():
    d = load("ai_robustness.json")
    rows = d["face_size_in_1600px_photo"]
    x = [r["face_width_px"] for r in rows]
    n = rows[0]["identities"]
    fig, ax = plt.subplots(figsize=(3.45, 2.2))
    ax.plot(x, [r["detected"] / n for r in rows], "s--", color="0.35", label="face detected")
    ax.plot(x, [r["genuine_mean"] if r["genuine_mean"] is not None else np.nan for r in rows], "o-", color=BLACK, label="mean cosine to clean face")
    ax.plot(x, [r["tar_at_threshold"] for r in rows], "^:", color="0.35", label="accepted at threshold 0.45")
    ax.axhline(d["threshold"], color=BLACK, linewidth=0.8, linestyle=(0, (4, 2)))
    ax.set_xscale("log")
    ax.set_xticks(x)
    ax.set_xticklabels([str(v) for v in x], fontsize=6.5)
    ax.minorticks_off()
    ax.invert_xaxis()
    ax.set_xlabel("face width in a 1600-px-wide photo (px)")
    ax.set_ylabel("fraction / similarity")
    ax.set_ylim(0, 1.08)
    ax.legend(loc="lower left", frameon=True, framealpha=0.9)
    fig.tight_layout()
    fig.savefig(FIG / "graph_face_size.pdf")
    plt.close(fig)


# ----------------------------------------------------------------------------------------------
def fig_vector_search():
    a = load("pgvector_a.json")
    b = load("pgvector_b.json")
    fig, axes = plt.subplots(1, 3, figsize=(7.1, 2.35))
    ax = axes[0]
    rows = a["latency_vs_event_size"]
    x = np.array([r["event_faces"] for r in rows])
    med = np.array([r["median_ms"] for r in rows])
    ax.errorbar(x, med, yerr=[med - [r["p05_ms"] for r in rows], [r["p95_ms"] for r in rows] - med], fmt="o-", color=BLACK, capsize=2, elinewidth=0.6)
    ax.plot(x, med[4] * x / x[4], ":", color="0.45", label="linear reference")
    ax.set_xscale("log"), ax.set_yscale("log")
    ax.set_xlabel("faces in the event"), ax.set_ylabel("query latency (ms)")
    ax.legend(loc="upper left", frameon=False)
    panel_label(ax, "(a)")

    ax = axes[1]
    rows = a["latency_vs_table_size"]
    ax.bar([str(r["table_faces"] // 1000) + "k" for r in rows], [r["median_ms"] for r in rows], color="0.6", edgecolor=BLACK, linewidth=0.5,
           yerr=[[r["median_ms"] - r["p05_ms"] for r in rows], [r["p95_ms"] - r["median_ms"] for r in rows]], error_kw={"elinewidth": 0.7, "capsize": 2})
    ax.set_xlabel("faces in the whole table"), ax.set_ylabel("latency, 10k-face event (ms)")
    ax.set_ylim(0, 35), ax.grid(axis="x", visible=False)
    panel_label(ax, "(b)")

    ax = axes[2]
    for (ls, mk), t in zip(STYLES, b["tables"]):
        ef = [h["ef_search"] for h in t["hnsw"]]
        ax.plot(ef, [h["mean_recall"] for h in t["hnsw"]], ls=ls, marker=mk, color=BLACK, label=f"{t['faces'] // 1000}k faces")
    ax.axhline(1.0, color="0.45", linewidth=0.8)
    ax.text(45, 1.005, "exact scan = 1.0", fontsize=6.5, va="bottom")
    ax.set_xscale("log"), ax.set_xticks([40, 100, 200, 400]), ax.set_xticklabels(["40", "100", "200", "400"]), ax.minorticks_off()
    ax.set_xlabel("HNSW ef_search"), ax.set_ylabel("recall of the matching set")
    ax.set_ylim(0.55, 1.04)
    ax.legend(loc="lower right", frameon=True, framealpha=0.9)
    panel_label(ax, "(c)")
    fig.tight_layout(w_pad=1.0)
    fig.savefig(FIG / "graph_vector_search.pdf")
    plt.close(fig)


# ----------------------------------------------------------------------------------------------
def fig_throughput():
    path = DATA / "http_throughput.json"
    if not path.exists():
        return
    d = load("http_throughput.json")
    rows = d["results"]
    fig, ax = plt.subplots(figsize=(3.45, 2.3))
    workers = sorted({r["uvicorn_workers"] for r in rows})
    for (ls, mk), w in zip(STYLES, workers):
        pts = [(r["concurrent_clients"], r["photos_per_second"]) for r in rows if r["uvicorn_workers"] == w]
        ax.plot(*zip(*pts), ls=ls, marker=mk, color=BLACK, label=f"{w} process{'es' if w > 1 else ''}")
    ax.set_xlabel("concurrent clients"), ax.set_ylabel("photos per second")
    ax.set_xscale("log", base=2)
    ax.set_xticks(sorted({r["concurrent_clients"] for r in rows})), ax.set_xticklabels([str(v) for v in sorted({r["concurrent_clients"] for r in rows})])
    ax.minorticks_off()
    ax.set_ylim(bottom=0)
    ax.legend(frameon=True, framealpha=0.9, loc="best")
    fig.tight_layout()
    fig.savefig(FIG / "graph_throughput.pdf")
    plt.close(fig)


if __name__ == "__main__":
    fig_latency()
    fig_robustness()
    fig_face_size()
    if (DATA / "pgvector_a.json").exists() and (DATA / "pgvector_b.json").exists():
        fig_vector_search()
    fig_throughput()
    print("figures written to", FIG)
