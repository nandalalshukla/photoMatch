"""
Experiment 1 — cost of each stage of the face pipeline, and how many faces
the detector finds when the same photo is processed at different resolutions.

Run:  apps/ai/.venv/bin/python paper/experiments/ai_latency.py --images DIR
DIR must contain group.jpg (a photo with several faces) and real.jpg (a selfie);
the AI test-suite downloads both into apps/ai/tests/.images.
"""

import argparse
from pathlib import Path

import cv2

from aiutil import load_engine, read_image, resize_long_side, save_json, time_it
from app.liveness import AntiSpoofModel


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--runs", type=int, default=40)
    args = parser.parse_args()

    engine = load_engine()
    spoof = AntiSpoofModel()
    group = read_image(args.images / "group.jpg")
    selfie = read_image(args.images / "real.jpg")
    out: dict = {"group_shape": list(group.shape[:2]), "selfie_shape": list(selfie.shape[:2])}

    # --- 1. Per-stage cost on the largest size the service accepts (1600 px, what the worker sends)
    photo = resize_long_side(group, 1600)
    jpeg = cv2.imencode(".jpg", photo, [cv2.IMWRITE_JPEG_QUALITY, 90])[1].tobytes()
    faces = engine.detect(photo)
    first = faces[0]
    import numpy as np

    stages = {
        "jpeg_decode": time_it(lambda: cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR), args.runs),
        "detector_scrfd": time_it(lambda: engine._detector.detect(photo), args.runs),
        "embedding_arcface_per_face": time_it(lambda: engine._recognizer.embed(photo, first.landmarks), args.runs),
        "head_pose_per_face": time_it(lambda: engine._head_pose.yaw(photo, np.asarray(first.box)), args.runs),
        "antispoof_two_models_per_face": time_it(lambda: spoof.real_probability(photo, first), args.runs),
    }
    out["stages_1600px"] = {"faces_in_photo": len(faces), **stages}

    # --- 2. Whole-photo analysis (detect + embed every face) as the number of faces grows
    out["photo_analysis"] = []
    for label, image in (("selfie", selfie), ("group", group)):
        image = resize_long_side(image, 1600)
        n = len(engine.detect(image))
        stats = time_it(lambda im=image: engine.detect(im), args.runs)
        out["photo_analysis"].append({"image": label, "faces": n, **stats})

    # --- 3. Same photo at different resolutions: faces found and time
    out["resolution_sweep"] = []
    for side in (320, 480, 640, 960, 1280, 1600, 1920, 2560):
        image = resize_long_side(group, side)
        found = engine.detect(image, with_embedding=False)
        stats = time_it(lambda im=image: engine.detect(im), max(10, args.runs // 2))
        out["resolution_sweep"].append(
            {
                "long_side": side,
                "faces_found": len(found),
                "smallest_face_px": round(min(min(f.box[2] - f.box[0], f.box[3] - f.box[1]) for f in found), 1) if found else None,
                **stats,
            }
        )
        print(side, len(found), round(stats["median_ms"], 1), "ms")

    save_json("ai_latency.json", out)


if __name__ == "__main__":
    main()
