"""
End-to-end tests for the AI service, using the real models.

The test images come from InsightFace's bundled sample photo (`t1`): a group
photo with six people. We cut single faces out of it to act as "selfies".
The first run downloads the models, so it can take a minute.
"""

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from insightface.data import get_image

from app.config import get_settings
from app.main import app

HEADERS = {"X-AI-Secret": "test-secret"}


@pytest.fixture(scope="module")
def client():
    get_settings().ai_service_secret = "test-secret"
    with TestClient(app) as test_client:  # `with` runs startup → models load
        yield test_client


def jpeg(image: np.ndarray) -> bytes:
    return cv2.imencode(".jpg", image)[1].tobytes()


def crop(image: np.ndarray, left: int, top: int, right: int, bottom: int, margin: int = 80) -> np.ndarray:
    """Cut out one face with some background around it."""
    return image[max(top - margin, 0) : bottom + margin, max(left - margin, 0) : right + margin]


GROUP = get_image("t1")
STRAIGHT_FACE = crop(GROUP, 466, 268, 573, 415)  # yaw ≈ -2°  (looking at camera)
TURNED_FACE = crop(GROUP, 903, 62, 1013, 205)  # yaw ≈ -55° (head turned)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "modelsLoaded": True}


def test_rejects_missing_secret(client):
    response = client.post("/faces/detect", files={"image": ("a.jpg", jpeg(GROUP))})
    assert response.status_code == 401


def test_detects_all_faces_in_group_photo(client):
    response = client.post("/faces/detect", files={"image": ("a.jpg", jpeg(GROUP))}, headers=HEADERS)
    faces = response.json()["faces"]
    assert len(faces) == 6
    assert len(faces[0]["embedding"]) == 512


def test_selfie_returns_one_face(client):
    response = client.post("/faces/selfie", files={"image": ("s.jpg", jpeg(STRAIGHT_FACE))}, headers=HEADERS)
    assert response.status_code == 200
    assert len(response.json()["embedding"]) == 512


def test_selfie_matches_same_person_in_group(client):
    """The selfie embedding should be most similar to the same person in the group photo."""
    selfie = client.post("/faces/selfie", files={"image": ("s.jpg", jpeg(STRAIGHT_FACE))}, headers=HEADERS).json()
    faces = client.post("/faces/detect", files={"image": ("a.jpg", jpeg(GROUP))}, headers=HEADERS).json()["faces"]
    similarities = [float(np.dot(selfie["embedding"], face["embedding"])) for face in faces]
    best = int(np.argmax(similarities))
    assert faces[best]["box"][0] == pytest.approx(466, abs=10)
    assert similarities[best] > 0.6
    assert sorted(similarities)[-2] < 0.3  # everyone else is clearly different


def test_selfie_with_no_face(client):
    blank = np.full((400, 400, 3), 200, dtype=np.uint8)
    response = client.post("/faces/selfie", files={"image": ("b.jpg", jpeg(blank))}, headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "NO_FACE"


def test_selfie_with_several_big_faces(client):
    response = client.post("/faces/selfie", files={"image": ("g.jpg", jpeg(GROUP))}, headers=HEADERS)
    assert response.json()["detail"]["code"] == "MULTIPLE_FACES"


def test_invalid_image(client):
    response = client.post("/faces/selfie", files={"image": ("x.jpg", b"not an image")}, headers=HEADERS)
    assert response.json()["detail"]["code"] == "INVALID_IMAGE"


def test_liveness_fails_when_head_not_turned(client):
    files = {"front": ("f.jpg", jpeg(STRAIGHT_FACE)), "turned": ("t.jpg", jpeg(STRAIGHT_FACE))}
    body = client.post("/liveness", files=files, headers=HEADERS).json()
    assert body["passed"] is False
    assert body["reason"] == "HEAD_NOT_TURNED"
    assert body["embedding"] is None


def test_liveness_fails_when_not_facing_camera_first(client):
    files = {"front": ("f.jpg", jpeg(TURNED_FACE)), "turned": ("t.jpg", jpeg(STRAIGHT_FACE))}
    body = client.post("/liveness", files=files, headers=HEADERS).json()
    assert body["reason"] == "NOT_FACING_CAMERA"


def test_liveness_fails_when_frames_show_different_people(client):
    """The straight and turned frames here are two different people from the group photo."""
    files = {"front": ("f.jpg", jpeg(STRAIGHT_FACE)), "turned": ("t.jpg", jpeg(TURNED_FACE))}
    body = client.post("/liveness", files=files, headers=HEADERS).json()
    assert body["reason"] == "DIFFERENT_PEOPLE"
    assert abs(body["turnedYaw"] - body["frontYaw"]) >= 20
