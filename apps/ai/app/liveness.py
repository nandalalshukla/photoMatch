"""
Liveness detection — "is a real, present person in front of the camera?"

We combine two simple checks, each stopping a different kind of cheating:

1. Passive anti-spoofing model (MiniFASNet, ONNX).
   Looks at the texture of the face crop and gives a probability that it is a
   real face, not a printed photo or a picture shown on a screen.

2. Active head-turn challenge.
   The browser captures one frame looking straight at the camera and one frame
   with the head turned. A still photo held up to the camera cannot turn.
   We also check both frames show the same person.

Identity (is this the same person who sent the selfie?) is checked by the Node
API, which compares the face embedding we return with the stored selfie.
"""

import urllib.request
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
import onnxruntime as ort

from app.face_engine import DetectedFace

# The model was trained on square crops 1.5× larger than the face box, resized to 128×128.
CROP_SCALE = 1.5
INPUT_SIZE = 128


def download_if_missing(url: str, path: Path) -> None:
    """Download the model file the first time the service starts."""
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading liveness model to {path} ...")
    temp_path = path.with_suffix(".part")
    urllib.request.urlretrieve(url, temp_path)
    temp_path.rename(path)


class AntiSpoofModel:
    def __init__(self, model_path: Path) -> None:
        self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        self._input_name = self._session.get_inputs()[0].name
        self._lock = Lock()

    def real_probability(self, image: np.ndarray, face: DetectedFace) -> float:
        """Probability (0–1) that `face` in `image` is a real live person."""
        crop = self._crop_face(image, face.box)
        tensor = self._to_tensor(crop)
        with self._lock:
            logits = self._session.run(None, {self._input_name: tensor})[0][0]
        # Softmax turns the two raw scores [real, spoof] into probabilities.
        exp = np.exp(logits - np.max(logits))
        probabilities = exp / exp.sum()
        return float(probabilities[0])

    @staticmethod
    def _crop_face(image: np.ndarray, box: list[float]) -> np.ndarray:
        """Cut a square around the face, 1.5× its size, padding with black at the edges."""
        left, top, right, bottom = box
        side = max(right - left, bottom - top) * CROP_SCALE
        center_x, center_y = (left + right) / 2, (top + bottom) / 2
        x1, y1 = int(center_x - side / 2), int(center_y - side / 2)
        x2, y2 = int(x1 + side), int(y1 + side)

        height, width = image.shape[:2]
        crop = image[max(y1, 0) : min(y2, height), max(x1, 0) : min(x2, width)]
        return cv2.copyMakeBorder(
            crop,
            top=max(0, -y1),
            bottom=max(0, y2 - height),
            left=max(0, -x1),
            right=max(0, x2 - width),
            borderType=cv2.BORDER_CONSTANT,
            value=(0, 0, 0),
        )

    @staticmethod
    def _to_tensor(crop: np.ndarray) -> np.ndarray:
        """Resize to 128×128, convert BGR→RGB, scale to 0–1 and reshape to [1, 3, 128, 128]."""
        rgb = cv2.cvtColor(cv2.resize(crop, (INPUT_SIZE, INPUT_SIZE)), cv2.COLOR_BGR2RGB)
        return np.expand_dims(rgb.transpose(2, 0, 1).astype(np.float32) / 255.0, axis=0)


@dataclass
class LivenessResult:
    passed: bool
    reason: str | None  # machine-readable reason when it fails
    real_score: float  # lowest anti-spoof score of the two frames
    front_yaw: float
    turned_yaw: float
    embedding: list[float] | None  # face embedding from the front frame


def evaluate_liveness(
    front: tuple[np.ndarray, DetectedFace],
    turned: tuple[np.ndarray, DetectedFace],
    model: AntiSpoofModel,
    threshold: float,
    max_front_yaw: float,
    min_turn_yaw: float,
    min_same_person: float,
) -> LivenessResult:
    """Run both liveness checks on the two captured frames."""
    front_image, front_face = front
    turned_image, turned_face = turned

    real_score = min(
        model.real_probability(front_image, front_face),
        model.real_probability(turned_image, turned_face),
    )

    def result(passed: bool, reason: str | None) -> LivenessResult:
        return LivenessResult(
            passed=passed,
            reason=reason,
            real_score=round(real_score, 4),
            front_yaw=round(front_face.yaw, 1),
            turned_yaw=round(turned_face.yaw, 1),
            embedding=front_face.embedding if passed else None,
        )

    if abs(front_face.yaw) > max_front_yaw:
        return result(False, "NOT_FACING_CAMERA")
    if abs(turned_face.yaw - front_face.yaw) < min_turn_yaw:
        return result(False, "HEAD_NOT_TURNED")
    # Both frames must show the same person, otherwise someone could show the
    # real guest's face for one frame and their own turning head for the other.
    # (A turned head looks less similar than a straight one, so this bar is lower
    # than the normal face-match threshold.)
    if float(np.dot(front_face.embedding, turned_face.embedding)) < min_same_person:
        return result(False, "DIFFERENT_PEOPLE")
    if real_score < threshold:
        return result(False, "SPOOF_DETECTED")
    return result(True, None)
