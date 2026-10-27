"""
Experiment 2 — controlled perturbation study of the recognition stage.

Question: when a guest's face is blurred, dark, noisy, compressed, rotated,
partly covered or simply small in the photo, does the embedding still match the
clean face (similarity >= the production threshold), and do perturbed faces of
*different* people ever cross it?

Identities: every face found in the sample images (one identity per face;
`obama*.jpg` are three different photos of one person and are used as natural
same-person pairs). Each identity's image is first scaled so the face is
160 px wide; one perturbation at a time is then applied to the whole image, the
face is found again, and its embedding is compared with the clean reference.

This is NOT a replacement for LFW / IJB-C style benchmarking (see the paper's
limitations); it measures how stable the pipeline's output is.

Run:  apps/ai/.venv/bin/python paper/experiments/ai_robustness.py --images DIR
"""

import argparse
import itertools
from pathlib import Path

import cv2
import numpy as np

from aiutil import cosine, load_engine, read_image, resize_long_side, save_json

THRESHOLD = 0.45  # production FACE_MATCH_THRESHOLD
BASE_FACE_WIDTH = 160


def face_width(face) -> float:
    return face.box[2] - face.box[0]


def center(face) -> np.ndarray:
    return np.array([(face.box[0] + face.box[2]) / 2, (face.box[1] + face.box[3]) / 2])


def scale_to_face_width(image: np.ndarray, width_now: float, width_target: float) -> tuple[np.ndarray, float]:
    scale = width_target / width_now
    interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    resized = cv2.resize(image, (round(image.shape[1] * scale), round(image.shape[0] * scale)), interpolation=interpolation)
    return resized, scale


# ----- perturbations: each returns (image, point_mapper) -----------------------------------------


def identity_map(point):
    return point


def blur(image, face, sigma):
    return (cv2.GaussianBlur(image, (0, 0), sigma) if sigma > 0 else image.copy()), identity_map


def jpeg(image, face, quality):
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    return cv2.imdecode(buffer, cv2.IMREAD_COLOR), identity_map


def darken(image, face, factor):
    # Linear loss of light, as in a dim room; the camera still quantises to 8 bits.
    return np.clip(image.astype(np.float32) * factor, 0, 255).astype(np.uint8), identity_map


def noise(image, face, sigma):
    rng = np.random.default_rng(7)
    noisy = image.astype(np.float32) + rng.normal(0, sigma, image.shape)
    return np.clip(noisy, 0, 255).astype(np.uint8), identity_map


def rotate(image, face, degrees):
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), degrees, 1.0)
    cos, sin = abs(matrix[0, 0]), abs(matrix[0, 1])
    new_w, new_h = int(height * sin + width * cos), int(height * cos + width * sin)
    matrix[0, 2] += new_w / 2 - width / 2
    matrix[1, 2] += new_h / 2 - height / 2
    rotated = cv2.warpAffine(image, matrix, (new_w, new_h), borderValue=(127, 127, 127))
    return rotated, lambda p: matrix @ np.array([p[0], p[1], 1.0])


def cover_lower_face(image, face, fraction):
    # A surgical mask / scarf: grey box over the lower part of the face box.
    out = image.copy()
    left, top, right, bottom = (int(v) for v in face.box)
    out[int(bottom - (bottom - top) * fraction) : bottom, left:right] = 127
    return out, identity_map


PERTURBATIONS = {
    "blur_sigma_px": (blur, [0, 1, 2, 3, 4, 6, 8]),
    "jpeg_quality": (jpeg, [95, 75, 50, 30, 15, 8]),
    "brightness_factor": (darken, [1.0, 0.6, 0.4, 0.25, 0.15, 0.08]),
    "noise_sigma": (noise, [0, 10, 20, 30, 45, 60]),
    "rotation_deg": (rotate, [0, 15, 30, 45, 60, 90]),
    "lower_face_covered": (cover_lower_face, [0.0, 0.15, 0.3, 0.45, 0.6]),
}


def find_again(engine, image, expected_center, tolerance):
    faces = engine.detect(image)
    if not faces:
        return None
    best = min(faces, key=lambda f: np.linalg.norm(center(f) - expected_center))
    return best if np.linalg.norm(center(best) - expected_center) <= tolerance else None


def collect_identities(engine, folder: Path):
    """One entry per face: name, image scaled so the face is 160 px wide, the clean face."""
    identities = []
    sources = ["group.jpg", "real.jpg", "obama.jpg", "biden.jpg", "Tom_Hanks_54745.png"]
    for source in sources:
        image = read_image(folder / source)
        image = resize_long_side(image, min(1600, max(image.shape[:2])))
        faces = [f for f in engine.detect(image) if face_width(f) >= 40]
        if source != "group.jpg":
            faces = faces[:1]
        for index, face in enumerate(faces):
            base, scale = scale_to_face_width(image, face_width(face), BASE_FACE_WIDTH)
            clean = find_again(engine, base, center(face) * scale, BASE_FACE_WIDTH)
            if clean is not None:
                identities.append({"name": f"{Path(source).stem}#{index}", "image": base, "face": clean})
    return identities


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", type=Path, required=True)
    args = parser.parse_args()
    engine = load_engine()
    ids = collect_identities(engine, args.images)
    names = [i["name"] for i in ids]
    print(len(ids), "identities:", names)
    emb = [np.asarray(i["face"].embedding) for i in ids]

    out: dict = {"threshold": THRESHOLD, "base_face_width_px": BASE_FACE_WIDTH, "identities": names}

    # --- baseline similarity structure ----------------------------------------------------
    impostor = [cosine(emb[a], emb[b]) for a, b in itertools.combinations(range(len(ids)), 2)]
    out["impostor_clean"] = {
        "pairs": len(impostor), "mean": float(np.mean(impostor)), "std": float(np.std(impostor)),
        "max": float(np.max(impostor)), "min": float(np.min(impostor)), "values": impostor,
    }
    natural = []
    obama = [engine.detect(read_image(args.images / f"obama{s}.jpg"))[0].embedding for s in ("", "2", "3")]
    for a, b in itertools.combinations(range(3), 2):
        natural.append(cosine(obama[a], obama[b]))
    out["same_person_different_photos"] = {"pairs": len(natural), "values": natural}

    # --- perturbation sweeps -----------------------------------------------------------------
    out["sweeps"] = {}
    for label, (fn, levels) in PERTURBATIONS.items():
        rows = []
        for level in levels:
            genuine, cross = [], []
            for i, ident in enumerate(ids):
                perturbed, mapper = fn(ident["image"], ident["face"], level)
                found = find_again(engine, perturbed, np.asarray(mapper(center(ident["face"])), dtype=float)[:2], BASE_FACE_WIDTH * 0.6)
                if found is None:
                    genuine.append(None)
                    continue
                genuine.append(cosine(found.embedding, emb[i]))
                cross += [cosine(found.embedding, emb[j]) for j in range(len(ids)) if j != i]
            detected = [g for g in genuine if g is not None]
            rows.append(
                {
                    "level": level,
                    "detected": len(detected),
                    "identities": len(ids),
                    "genuine": genuine,
                    "genuine_mean": float(np.mean(detected)) if detected else None,
                    "genuine_min": float(np.min(detected)) if detected else None,
                    "tar_at_threshold": sum(g >= THRESHOLD for g in detected) / len(ids),  # misses count as rejections
                    "impostor_max": float(np.max(cross)) if cross else None,
                    "impostor_mean": float(np.mean(cross)) if cross else None,
                    "false_accepts": int(sum(c >= THRESHOLD for c in cross)),
                    "impostor_pairs": len(cross),
                }
            )
            print(label, level, f"detected {len(detected)}/{len(ids)}", "mean", rows[-1]["genuine_mean"] and round(rows[-1]["genuine_mean"], 3),
                  "TAR", round(rows[-1]["tar_at_threshold"], 2), "imp.max", rows[-1]["impostor_max"] and round(rows[-1]["impostor_max"], 3))
        out["sweeps"][label] = rows

    # --- face size inside a 1600 px wide photo (what matters for group photos) ----------------
    size_rows = []
    canvas_w, canvas_h = 1600, 1067
    for width in (240, 160, 120, 90, 70, 55, 45, 36, 28, 20):
        genuine, cross = [], []
        for i, ident in enumerate(ids):
            small, scale = scale_to_face_width(ident["image"], face_width(ident["face"]), width)
            canvas = np.full((canvas_h, canvas_w, 3), 127, np.uint8)
            h, w = small.shape[:2]
            h2, w2 = min(h, canvas_h), min(w, canvas_w)
            # place the (downscaled) portrait so the face sits near the canvas centre
            c = center(ident["face"]) * scale
            x0, y0 = int(canvas_w / 2 - c[0]), int(canvas_h / 2 - c[1])
            xs, ys = max(0, x0), max(0, y0)
            xe, ye = min(canvas_w, x0 + w), min(canvas_h, y0 + h)
            canvas[ys:ye, xs:xe] = small[ys - y0 : ye - y0, xs - x0 : xe - x0]
            found = find_again(engine, canvas, np.array([canvas_w / 2, canvas_h / 2]), max(width, 10))
            if found is None:
                genuine.append(None)
                continue
            genuine.append(cosine(found.embedding, emb[i]))
            cross += [cosine(found.embedding, emb[j]) for j in range(len(ids)) if j != i]
        detected = [g for g in genuine if g is not None]
        size_rows.append(
            {
                "face_width_px": width,
                "detected": len(detected), "identities": len(ids), "genuine": genuine,
                "genuine_mean": float(np.mean(detected)) if detected else None,
                "tar_at_threshold": sum(g >= THRESHOLD for g in detected) / len(ids),
                "impostor_max": float(np.max(cross)) if cross else None,
                "false_accepts": int(sum(c >= THRESHOLD for c in cross)), "impostor_pairs": len(cross),
            }
        )
        print("face width", width, f"detected {len(detected)}/{len(ids)}", "TAR", round(size_rows[-1]["tar_at_threshold"], 2))
    out["face_size_in_1600px_photo"] = size_rows

    save_json("ai_robustness.json", out)


if __name__ == "__main__":
    main()
