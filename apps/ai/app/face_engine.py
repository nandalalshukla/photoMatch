"""
Face detection and recognition — the API the rest of the service uses.

Key idea: the recognition model turns every face into an "embedding" — a list
of 512 numbers. Two photos of the same person produce embeddings that point in
almost the same direction, so we can compare faces with simple maths
(cosine similarity) instead of comparing pixels.

The models themselves live in face_models.py.
"""

from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np

from app.face_models import FaceDetector, FaceRecognizer, HeadPose
from app.model_files import ensure_face_models


@dataclass
class DetectedFace:
    embedding: list[float]  # 512 numbers, normalised to length 1
    score: float  # detector confidence (0–1)
    box: list[float]  # [left, top, right, bottom] in pixels
    yaw: float | None = None  # head turn in degrees (0 = facing camera); only computed when asked for

    @property
    def area(self) -> float:
        left, top, right, bottom = self.box
        return max(0.0, right - left) * max(0.0, bottom - top)


class NoFaceError(ValueError):
    code = "NO_FACE"


class MultipleFacesError(ValueError):
    code = "MULTIPLE_FACES"


class FaceEngine:
    """Loads the face models once and answers face questions."""

    def __init__(self, model_dir: Path) -> None:
        # Downloads the models the first time (~290 MB).
        folder = ensure_face_models(model_dir)
        self._detector = FaceDetector(folder / "det_10g.onnx")
        self._recognizer = FaceRecognizer(folder / "w600k_r50.onnx")
        self._head_pose = HeadPose(folder / "1k3d68.onnx")
        # FastAPI runs requests in parallel threads. A lock keeps model usage
        # simple and safe: one image is analysed at a time.
        self._lock = Lock()

    def detect(self, image: np.ndarray, with_pose: bool = False) -> list[DetectedFace]:
        """
        Return every face found in the image, largest first.
        `with_pose` also measures each head's yaw — only the liveness check needs
        it, so event photos skip this extra model.
        """
        with self._lock:
            boxes, scores, landmarks = self._detector.detect(image)
            faces = [
                DetectedFace(
                    embedding=self._recognizer.embed(image, points).tolist(),
                    score=float(score),
                    box=[float(v) for v in box],
                    yaw=self._head_pose.yaw(image, box) if with_pose else None,
                )
                for box, score, points in zip(boxes, scores, landmarks)
            ]
        return sorted(faces, key=lambda f: f.area, reverse=True)

    def single_face(self, image: np.ndarray, crowd_ratio: float = 0.6, with_pose: bool = False) -> DetectedFace:
        """
        Return the one main face in a selfie.

        Small faces in the background are fine (they are ignored), but if a
        second face is almost as big as the first one we cannot know who the
        guest is, so we refuse instead of guessing.
        """
        faces = self.detect(image, with_pose=with_pose)
        if not faces:
            raise NoFaceError("No face found in the photo")
        main = faces[0]
        if len(faces) > 1 and faces[1].area >= main.area * crowd_ratio:
            raise MultipleFacesError("More than one face found in the photo")
        return main
