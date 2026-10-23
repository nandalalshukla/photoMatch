"""
The three face models, run directly with ONNX Runtime.

All three come from InsightFace's "buffalo_l" model pack. We used to call them
through the `insightface` Python package, but that package needs a C++
compiler to install (painful on Windows) and pulls in many libraries we never
use. Running the ONNX files ourselves needs only onnxruntime + OpenCV + numpy.

Each class below is a faithful port of the matching InsightFace code (same
pre-processing, same post-processing), so the results are identical:

  FaceDetector    det_10g.onnx    finds faces + 5 landmarks (eyes, nose, mouth corners)
  FaceRecognizer  w600k_r50.onnx  turns an aligned face into a 512-number embedding
  HeadPose        1k3d68.onnx     68 3-D face landmarks → how far the head is turned (yaw)

⚠️ License: the buffalo_l models are for NON-COMMERCIAL use only. Commercial
use needs a license from InsightFace (see README → "Model licenses").
"""

import cv2
import numpy as np
import onnxruntime as ort


def _session(path) -> ort.InferenceSession:
    """Load an ONNX model for the CPU."""
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


# ---------------------------------------------------------------------------
# Face detection (SCRFD)
# ---------------------------------------------------------------------------


class FaceDetector:
    """
    SCRFD face detector.

    The network looks at the image at three zoom levels ("strides" 8, 16, 32).
    At every grid point of every level it predicts: a face score, the distances
    from that point to the four sides of the face box, and the offsets of the
    5 landmarks. We turn those raw numbers into boxes, keep confident ones and
    remove duplicates of the same face (non-maximum suppression).
    """

    STRIDES = (8, 16, 32)
    ANCHORS_PER_POINT = 2

    def __init__(self, model_path, input_size: int = 640, score_threshold: float = 0.5, nms_threshold: float = 0.4):
        self._session = _session(model_path)
        self._input_name = self._session.get_inputs()[0].name
        self.input_size = input_size
        self.score_threshold = score_threshold
        self.nms_threshold = nms_threshold

    def detect(self, image: np.ndarray):
        """Return (boxes [N,4], scores [N], landmarks [N,5,2]) in original image pixels, best first."""
        # 1. Shrink the image to fit 640×640 (keeping its shape) and paste it in the top-left corner.
        height, width = image.shape[:2]
        if height / width > 1:
            new_height, new_width = self.input_size, int(self.input_size * width / height)
        else:
            new_width, new_height = self.input_size, int(self.input_size * height / width)
        scale = new_height / height
        canvas = np.zeros((self.input_size, self.input_size, 3), dtype=np.uint8)
        canvas[:new_height, :new_width] = cv2.resize(image, (new_width, new_height))

        # 2. Normalise pixels the way the model was trained: (pixel - 127.5) / 128, RGB order.
        blob = cv2.dnn.blobFromImage(canvas, 1.0 / 128.0, (self.input_size, self.input_size), (127.5, 127.5, 127.5), swapRB=True)
        outputs = self._session.run(None, {self._input_name: blob})

        # 3. Decode each zoom level. Outputs come as [scores×3, boxes×3, landmarks×3].
        all_scores, all_boxes, all_landmarks = [], [], []
        for level, stride in enumerate(self.STRIDES):
            scores = outputs[level][:, 0]
            box_distances = outputs[level + 3] * stride
            landmark_offsets = outputs[level + 6] * stride

            centers = self._grid_centers(self.input_size // stride, stride)
            keep = scores >= self.score_threshold
            all_scores.append(scores[keep])
            all_boxes.append(self._decode_boxes(centers, box_distances)[keep])
            all_landmarks.append(self._decode_landmarks(centers, landmark_offsets)[keep])

        scores = np.concatenate(all_scores)
        boxes = np.concatenate(all_boxes) / scale  # back to original image pixels
        landmarks = np.concatenate(all_landmarks) / scale

        # 4. Highest score first, then drop boxes that overlap a better one.
        order = scores.argsort()[::-1]
        scores, boxes, landmarks = scores[order], boxes[order], landmarks[order]
        keep = self._non_max_suppression(boxes, scores)
        return boxes[keep], scores[keep], landmarks[keep]

    def _grid_centers(self, grid_size: int, stride: int) -> np.ndarray:
        """(x, y) pixel position of every grid point, repeated once per anchor."""
        ys, xs = np.mgrid[:grid_size, :grid_size]
        centers = (np.stack([xs, ys], axis=-1).astype(np.float32) * stride).reshape(-1, 2)
        return np.repeat(centers, self.ANCHORS_PER_POINT, axis=0)

    @staticmethod
    def _decode_boxes(centers: np.ndarray, distances: np.ndarray) -> np.ndarray:
        """Distances to (left, top, right, bottom) → box corners [x1, y1, x2, y2]."""
        return np.stack(
            [
                centers[:, 0] - distances[:, 0],
                centers[:, 1] - distances[:, 1],
                centers[:, 0] + distances[:, 2],
                centers[:, 1] + distances[:, 3],
            ],
            axis=-1,
        )

    @staticmethod
    def _decode_landmarks(centers: np.ndarray, offsets: np.ndarray) -> np.ndarray:
        """Offsets (x1, y1, ..., x5, y5) relative to the grid point → 5 (x, y) points."""
        return offsets.reshape(-1, 5, 2) + centers[:, None, :]

    def _non_max_suppression(self, boxes: np.ndarray, scores: np.ndarray) -> list[int]:
        """Keep the best box, drop any box overlapping it by more than 40 %, repeat."""
        x1, y1, x2, y2 = boxes.T
        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]
        keep = []
        while order.size > 0:
            best, rest = order[0], order[1:]
            keep.append(int(best))
            overlap_w = np.maximum(0.0, np.minimum(x2[best], x2[rest]) - np.maximum(x1[best], x1[rest]) + 1)
            overlap_h = np.maximum(0.0, np.minimum(y2[best], y2[rest]) - np.maximum(y1[best], y1[rest]) + 1)
            intersection = overlap_w * overlap_h
            overlap = intersection / (areas[best] + areas[rest] - intersection)
            order = rest[overlap <= self.nms_threshold]
        return keep


# ---------------------------------------------------------------------------
# Face recognition (ArcFace)
# ---------------------------------------------------------------------------

# Where the 5 landmarks must end up in the 112×112 face crop the recognizer was trained on.
ARCFACE_LANDMARKS = np.array(
    [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]],
    dtype=np.float32,
)


def similarity_transform(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    """
    Best rotation + uniform scale + shift that moves points `src` onto `dst`
    (the Umeyama method — the same maths scikit-image's SimilarityTransform uses).
    Returns a 2×3 matrix for cv2.warpAffine.
    """
    src_mean, dst_mean = src.mean(axis=0), dst.mean(axis=0)
    src_centered, dst_centered = src - src_mean, dst - dst_mean

    covariance = dst_centered.T @ src_centered / len(src)
    U, S, Vt = np.linalg.svd(covariance)
    signs = np.ones(2)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:  # avoid a mirror image
        signs[-1] = -1
    rotation = U @ np.diag(signs) @ Vt
    scale = (S * signs).sum() / src_centered.var(axis=0).sum()

    matrix = np.zeros((2, 3))
    matrix[:, :2] = scale * rotation
    matrix[:, 2] = dst_mean - scale * rotation @ src_mean
    return matrix


class FaceRecognizer:
    """
    ArcFace (ResNet-50). The face is first rotated/scaled so the eyes, nose and
    mouth sit at standard positions in a 112×112 image ("alignment"), then the
    network turns it into 512 numbers. Two photos of the same person give
    embeddings pointing in almost the same direction.
    """

    SIZE = 112

    def __init__(self, model_path):
        self._session = _session(model_path)
        self._input_name = self._session.get_inputs()[0].name

    def embed(self, image: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
        """512-number embedding, normalised to length 1, for the face with these 5 landmarks."""
        matrix = similarity_transform(landmarks.astype(np.float64), ARCFACE_LANDMARKS.astype(np.float64))
        aligned = cv2.warpAffine(image, matrix, (self.SIZE, self.SIZE), borderValue=0.0)
        # Pixels → (pixel - 127.5) / 127.5, RGB order, as the model was trained.
        blob = cv2.dnn.blobFromImage(aligned, 1.0 / 127.5, (self.SIZE, self.SIZE), (127.5, 127.5, 127.5), swapRB=True)
        embedding = self._session.run(None, {self._input_name: blob})[0][0]
        return embedding / np.linalg.norm(embedding)


# ---------------------------------------------------------------------------
# Head pose (68 3-D landmarks)
# ---------------------------------------------------------------------------


class HeadPose:
    """
    Predicts 68 face landmarks in 3-D and derives the head's yaw — how far it
    is turned left/right (0° = looking straight at the camera). Only needed for
    the liveness head-turn check, so it is not run when indexing event photos.
    """

    SIZE = 192
    # Landmark numbers of the outer corners of the two eyes in the 68-point scheme.
    LEFT_EYE_CORNER, RIGHT_EYE_CORNER = 36, 45

    def __init__(self, model_path):
        self._session = _session(model_path)
        self._input_name = self._session.get_inputs()[0].name

    def yaw(self, image: np.ndarray, box: np.ndarray) -> float:
        landmarks = self.landmarks_3d(image, box)
        # The line between the outer eye corners. Seen from the front it lies
        # flat in the image; when the head turns, one eye moves towards the
        # camera and the other away, so the line gains depth (z). The angle
        # between the line and the image plane is the yaw. Using the line's full
        # length in the image (not just x) keeps a tilted head from skewing it.
        dx, dy, dz = landmarks[self.RIGHT_EYE_CORNER] - landmarks[self.LEFT_EYE_CORNER]
        return float(np.degrees(np.arctan2(dz, np.hypot(dx, dy))))

    def landmarks_3d(self, image: np.ndarray, box: np.ndarray) -> np.ndarray:
        """68 (x, y, z) points in original image pixels."""
        # Crop a square 1.5× the face box, scaled to 192×192, centred on the face.
        x1, y1, x2, y2 = box
        scale = self.SIZE / (max(x2 - x1, y2 - y1) * 1.5)
        center_x, center_y = (x1 + x2) / 2, (y1 + y2) / 2
        matrix = np.array(
            [[scale, 0, self.SIZE / 2 - center_x * scale], [0, scale, self.SIZE / 2 - center_y * scale]],
            dtype=np.float32,
        )
        crop = cv2.warpAffine(image, matrix, (self.SIZE, self.SIZE), borderValue=0.0)

        # This model takes raw 0–255 RGB pixels (its first layer normalises them itself).
        blob = cv2.dnn.blobFromImage(crop, 1.0, (self.SIZE, self.SIZE), (0, 0, 0), swapRB=True)
        points = self._session.run(None, {self._input_name: blob})[0][0].reshape(-1, 3)[-68:]

        # Outputs are in -1…1 crop coordinates → crop pixels → original image pixels.
        points[:, :2] = (points[:, :2] + 1) * (self.SIZE // 2)
        points[:, 2] *= self.SIZE // 2
        points[:, :2] = (points[:, :2] - matrix[:, 2]) / scale
        points[:, 2] /= scale
        return points
