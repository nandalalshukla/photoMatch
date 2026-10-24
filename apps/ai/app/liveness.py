"""
Liveness detection — "is a real, present person in front of the camera?"

We combine two simple checks, each stopping a different kind of cheating:

1. Passive anti-spoofing (MiniFASNet, two small ONNX models, Apache 2.0).
   Looks at the texture of the face and its surroundings and gives a
   probability that it is a real face, not a printed photo or a picture shown
   on a screen. Two models look at the face at different zoom levels (2.7× and
   4× the face box) and we average their answers.

2. Active head-turn challenge.
   The browser sends a short burst of frames while the guest looks straight at
   the camera, and another burst while they turn their head. We keep the most
   straight-on frame and the most-turned frame, so the guest doesn't have to
   hit an exact moment. A still photo held up to the camera cannot turn.
   We also check both frames show the same person.

Identity (is this the same person who sent the selfie?) is checked by the Node
API, which compares the face embedding we return with the stored selfie.
"""

from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
import onnxruntime as ort

from app.face_engine import DetectedFace, FaceEngine, MultipleFacesError, NoFaceError

# The models ship with the code in apps/ai/weights/ (≈2 MB each, see weights/README.md).
WEIGHTS_DIR = Path(__file__).resolve().parents[1] / "weights"

# (file, how many times the face box to crop around the face)
ANTI_SPOOF_MODELS = (
    ("minifasnet_v2_scale2.7.onnx", 2.7),
    ("minifasnet_v1se_scale4.0.onnx", 4.0),
)
INPUT_SIZE = 80  # both models take 80×80 crops
REAL_CLASS = 1  # model outputs 3 classes; index 1 = "real face"


class AntiSpoofModel:
    def __init__(self, weights_dir: Path = WEIGHTS_DIR) -> None:
        self._models = []
        for file_name, crop_scale in ANTI_SPOOF_MODELS:
            session = ort.InferenceSession(str(weights_dir / file_name), providers=["CPUExecutionProvider"])
            self._models.append((session, session.get_inputs()[0].name, crop_scale))
        self._lock = Lock()

    def real_probability(self, image: np.ndarray, face: DetectedFace) -> float:
        """Probability (0–1) that `face` in `image` is a real, live person."""
        probabilities = []
        for session, input_name, crop_scale in self._models:
            crop = self._crop(image, face.box, crop_scale)
            # These models take raw 0–255 pixel values in OpenCV's BGR order, shaped [1, 3, 80, 80].
            tensor = crop.transpose(2, 0, 1)[None].astype(np.float32)
            with self._lock:
                logits = session.run(None, {input_name: tensor})[0][0]
            exp = np.exp(logits - logits.max())  # softmax: raw scores → probabilities
            probabilities.append(exp[REAL_CLASS] / exp.sum())
        return float(np.mean(probabilities))

    @staticmethod
    def _crop(image: np.ndarray, box: list[float], scale: float) -> np.ndarray:
        """
        Cut out a region `scale`× the face box around the face and resize it to 80×80.
        Ported from the original project: if the enlarged region would leave the
        image, it is shifted back inside (and the scale reduced if necessary)
        rather than padded, because black padding would look like a fake.
        """
        height, width = image.shape[:2]
        left, top, right, bottom = box
        box_w, box_h = right - left, bottom - top
        scale = min((height - 1) / box_h, (width - 1) / box_w, scale)

        new_w, new_h = box_w * scale, box_h * scale
        center_x, center_y = left + box_w / 2, top + box_h / 2
        x1, y1 = center_x - new_w / 2, center_y - new_h / 2
        x2, y2 = center_x + new_w / 2, center_y + new_h / 2

        # Shift the region back inside the image where needed.
        if x1 < 0:
            x2, x1 = x2 - x1, 0
        if y1 < 0:
            y2, y1 = y2 - y1, 0
        if x2 > width - 1:
            x1, x2 = x1 - (x2 - width + 1), width - 1
        if y2 > height - 1:
            y1, y2 = y1 - (y2 - height + 1), height - 1

        crop = image[int(y1) : int(y2) + 1, int(x1) : int(x2) + 1]
        return cv2.resize(crop, (INPUT_SIZE, INPUT_SIZE))


Frame = tuple[np.ndarray, DetectedFace]


def _faces_in(engine: FaceEngine, images: list[np.ndarray]) -> list[Frame]:
    """
    Find the single main face (with its yaw) in each frame. Frames without a
    usable face (blurry, out of frame, someone else in view) are skipped; only
    if *no* frame is usable do we report why.
    """
    frames: list[Frame] = []
    last_error: Exception = NoFaceError("No face found in the photo")
    for image in images:
        try:
            # Skip the slow recognition step here; only the 2 chosen frames need it.
            frames.append((image, engine.single_face(image, with_pose=True, with_embedding=False)))
        except (NoFaceError, MultipleFacesError) as error:
            last_error = error
    if not frames:
        raise last_error
    return frames


def pick_best_frames(engine: FaceEngine, front_images: list[np.ndarray], turned_images: list[np.ndarray]) -> tuple[Frame, Frame]:
    """
    From the "look straight" burst keep the frame facing the camera most directly;
    from the "turn your head" burst keep the frame turned furthest from it.
    """
    front = min(_faces_in(engine, front_images), key=lambda frame: abs(frame[1].yaw or 0.0))
    front_yaw = front[1].yaw or 0.0
    turned = max(_faces_in(engine, turned_images), key=lambda frame: abs((frame[1].yaw or 0.0) - front_yaw))
    for image, face in (front, turned):
        engine.embed(image, face)
    return front, turned


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
    """Run both liveness checks on the two captured frames (faces must include yaw)."""
    front_image, front_face = front
    turned_image, turned_face = turned
    front_yaw, turned_yaw = front_face.yaw or 0.0, turned_face.yaw or 0.0

    real_score = min(
        model.real_probability(front_image, front_face),
        model.real_probability(turned_image, turned_face),
    )

    def result(passed: bool, reason: str | None) -> LivenessResult:
        return LivenessResult(
            passed=passed,
            reason=reason,
            real_score=round(real_score, 4),
            front_yaw=round(front_yaw, 1),
            turned_yaw=round(turned_yaw, 1),
            embedding=front_face.embedding if passed else None,
        )

    if abs(front_yaw) > max_front_yaw:
        return result(False, "NOT_FACING_CAMERA")
    if abs(turned_yaw - front_yaw) < min_turn_yaw:
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
