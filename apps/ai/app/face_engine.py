"""
Face detection and recognition with InsightFace.

Key idea: the recognition model turns every face into an "embedding" — a list
of 512 numbers. Two photos of the same person produce embeddings that point in
almost the same direction, so we can compare faces with simple maths
(cosine similarity) instead of comparing pixels.
"""

import warnings
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import numpy as np
from insightface.app import FaceAnalysis

# InsightFace uses an older scikit-image API that prints a harmless warning on every face.
warnings.filterwarnings("ignore", category=FutureWarning, module="insightface")


@dataclass
class DetectedFace:
    embedding: list[float]  # 512 numbers, normalised to length 1
    score: float  # detector confidence (0–1)
    box: list[float]  # [left, top, right, bottom] in pixels
    yaw: float  # head rotation left/right in degrees (0 = facing camera)

    @property
    def area(self) -> float:
        left, top, right, bottom = self.box
        return max(0.0, right - left) * max(0.0, bottom - top)


class NoFaceError(ValueError):
    code = "NO_FACE"


class MultipleFacesError(ValueError):
    code = "MULTIPLE_FACES"


class FaceEngine:
    """Loads the InsightFace models once and answers face questions."""

    def __init__(self, model_name: str, model_dir: Path) -> None:
        # Only the three models we actually need are loaded:
        #   detection      → finds faces
        #   recognition    → creates the 512-number embedding
        #   landmark_3d_68 → estimates head pose (used by the liveness challenge)
        # The model pack is downloaded automatically the first time (~300 MB).
        self._app = FaceAnalysis(
            name=model_name,
            root=str(model_dir),
            allowed_modules=["detection", "recognition", "landmark_3d_68"],
            providers=["CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=-1, det_size=(640, 640), det_thresh=0.5)
        # FastAPI runs requests in parallel threads. A lock keeps model usage
        # simple and safe: one image is analysed at a time.
        self._lock = Lock()

    def detect(self, image: np.ndarray) -> list[DetectedFace]:
        """Return every face found in the image, largest first."""
        with self._lock:
            raw_faces = self._app.get(image)

        faces = []
        for face in raw_faces:
            embedding = np.asarray(face.normed_embedding, dtype=np.float32)
            # pose = [pitch, yaw, roll]; we only need yaw (turning left/right).
            yaw = float(face.pose[1]) if getattr(face, "pose", None) is not None else 0.0
            faces.append(
                DetectedFace(
                    embedding=embedding.tolist(),
                    score=float(face.det_score),
                    box=[float(v) for v in face.bbox],
                    yaw=yaw,
                )
            )
        return sorted(faces, key=lambda f: f.area, reverse=True)

    def single_face(self, image: np.ndarray, crowd_ratio: float = 0.6) -> DetectedFace:
        """
        Return the one main face in a selfie.

        Small faces in the background are fine (they are ignored), but if a
        second face is almost as big as the first one we cannot know who the
        guest is, so we refuse instead of guessing.
        """
        faces = self.detect(image)
        if not faces:
            raise NoFaceError("No face found in the photo")
        main = faces[0]
        if len(faces) > 1 and faces[1].area >= main.area * crowd_ratio:
            raise MultipleFacesError("More than one face found in the photo")
        return main
