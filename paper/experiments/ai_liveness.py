"""
Experiment 4 — behaviour and cost of the liveness stage.

(a) Anti-spoofing scores of the two MiniFASNet models on the sample genuine
    capture (`real.jpg`) and the sample print attack (`print_attack.jpg`).
    n = 1 + 1: this is a sanity check, NOT an APCER/BPCER evaluation, which
    needs a labelled presentation-attack dataset (OULU-NPU, CelebA-Spoof, ...).
(b) How the genuine capture's score degrades with poor capture conditions
    (low light, blur, JPEG, small face) — the usability risk of the
    passive model: genuine users who are rejected.
(c) Time to process one complete liveness attempt (4 straight + 12 turning
    frames at webcam resolution): the work the AI service does per attempt.

Run:  apps/ai/.venv/bin/python paper/experiments/ai_liveness.py --images DIR
"""

import argparse
from pathlib import Path

import cv2
import numpy as np

from aiutil import load_engine, read_image, resize_long_side, save_json, time_it
from ai_robustness import blur, darken, jpeg, scale_to_face_width
from app.liveness import INPUT_SIZE, REAL_CLASS, AntiSpoofModel, pick_best_frames  # noqa: F401


def per_model_scores(spoof: AntiSpoofModel, image, face) -> dict:
    out = {}
    for (session, input_name, crop_scale), label in zip(spoof._models, ("minifasnet_v2_2.7x", "minifasnet_v1se_4.0x")):
        crop = spoof._crop(image, face.box, crop_scale)
        logits = session.run(None, {input_name: crop.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
        probs = np.exp(logits - logits.max())
        probs /= probs.sum()
        out[label] = {"p_class0": float(probs[0]), "p_real": float(probs[REAL_CLASS]), "p_class2": float(probs[2])}
    out["average_p_real"] = float(np.mean([out[k]["p_real"] for k in list(out)]))
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", type=Path, required=True)
    args = parser.parse_args()
    engine, spoof = load_engine(), AntiSpoofModel()
    result: dict = {"decision_threshold": 0.7}

    # (a) genuine vs print attack
    scores = {}
    for name in ("real", "print_attack"):
        image = read_image(args.images / f"{name}.jpg")
        face = engine.detect(image, with_embedding=False)[0]
        scores[name] = {"image_shape": list(image.shape[:2]), "face_width_px": face.box[2] - face.box[0], **per_model_scores(spoof, image, face)}
        print(name, round(scores[name]["average_p_real"], 4))
    result["sample_scores"] = scores

    # (b) capture-quality sensitivity of the genuine sample
    genuine = read_image(args.images / "real.jpg")
    face = engine.detect(genuine, with_embedding=False)[0]
    base, scale = scale_to_face_width(genuine, face.box[2] - face.box[0], 200)
    base_face = engine.detect(base, with_embedding=False)[0]
    sweeps = {}
    for label, fn, levels in (
        ("brightness_factor", darken, [1.0, 0.6, 0.4, 0.25, 0.15, 0.08]),
        ("blur_sigma_px", blur, [0, 1, 2, 3, 4, 6]),
        ("jpeg_quality", jpeg, [95, 75, 50, 30, 15, 8]),
    ):
        rows = []
        for level in levels:
            perturbed, _ = fn(base, base_face, level)
            found = engine.detect(perturbed, with_embedding=False)
            rows.append({"level": level, "face_found": bool(found),
                         "average_p_real": per_model_scores(spoof, perturbed, found[0])["average_p_real"] if found else None})
        sweeps[label] = rows
    rows = []
    for width in (320, 200, 140, 100, 70, 50, 36):
        small, _ = scale_to_face_width(genuine, face.box[2] - face.box[0], width)
        found = engine.detect(small, with_embedding=False)
        rows.append({"level": width, "face_found": bool(found),
                     "average_p_real": per_model_scores(spoof, small, found[0])["average_p_real"] if found else None})
    sweeps["face_width_px"] = rows
    result["genuine_quality_sweeps"] = sweeps

    # (c) cost of one complete liveness attempt: 4 + 12 webcam-sized frames
    webcam = resize_long_side(genuine, 640)
    front_frames, turned_frames = [webcam.copy() for _ in range(4)], [webcam.copy() for _ in range(12)]
    result["attempt_cost_16_frames_640px"] = time_it(lambda: pick_best_frames(engine, front_frames, turned_frames), runs=15, warmup=2)
    one = engine.single_face(webcam, with_pose=True, with_embedding=False)
    result["spoof_check_two_models"] = time_it(lambda: spoof.real_probability(webcam, one), runs=40)

    save_json("ai_liveness.json", result)


if __name__ == "__main__":
    main()
