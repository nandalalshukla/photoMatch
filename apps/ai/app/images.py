"""Turning uploaded bytes into an image the models can read."""

import cv2
import numpy as np

# Big photos are slow to analyse and do not improve face detection much,
# so we shrink anything larger than this (longest side, in pixels).
MAX_SIDE = 1920


class InvalidImageError(ValueError):
    """Raised when the uploaded bytes are not a readable image."""


def decode_image(data: bytes) -> np.ndarray:
    """
    Decode JPEG/PNG/WEBP bytes into an OpenCV image (a BGR pixel array).
    Large images are resized so the longest side is at most MAX_SIDE.
    """
    buffer = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise InvalidImageError("The file is not a valid image")

    height, width = image.shape[:2]
    scale = MAX_SIDE / max(height, width)
    if scale < 1:
        image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
    return image
