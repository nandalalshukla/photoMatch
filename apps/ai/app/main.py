"""
PhotoMatch AI — face service.

A small, stateless HTTP API. It never touches the database: it receives an
image, runs the AI models and returns numbers. The Node API decides what to do
with them (store embeddings, search, grant gallery access...).

Endpoints
  GET  /health        → is the service up?
  POST /faces/detect  → all faces in an event photo (embeddings)
  POST /faces/selfie  → the single face in a guest selfie (embedding)
  POST /liveness      → liveness check on bursts of webcam frames
"""

import hmac
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.face_engine import FaceEngine, MultipleFacesError, NoFaceError
from app.images import InvalidImageError, decode_image
from app.liveness import AntiSpoofModel, evaluate_liveness, pick_best_frames

settings = get_settings()

# The models are loaded once at startup (slow) and then reused for every request (fast).
models: dict = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    models["faces"] = FaceEngine(settings.model_dir)  # downloads face models on first start
    models["liveness"] = AntiSpoofModel()  # small models shipped in apps/ai/weights/
    print("AI models loaded — ready.")
    yield
    models.clear()


app = FastAPI(title="PhotoMatch AI — face service", lifespan=lifespan)


# ---------- helpers ----------


def require_secret(x_ai_secret: str = Header(default="")) -> None:
    """Only the Node API knows the shared secret. compare_digest avoids timing attacks."""
    if not settings.ai_service_secret or not hmac.compare_digest(x_ai_secret, settings.ai_service_secret):
        raise HTTPException(status_code=401, detail="Invalid AI service secret")


def read_image(upload: UploadFile):
    """Read an uploaded file and decode it, enforcing the size limit."""
    data = upload.file.read(settings.max_image_bytes + 1)
    if len(data) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail="Image is too large")
    try:
        return decode_image(data)
    except InvalidImageError as error:
        raise HTTPException(status_code=422, detail={"code": "INVALID_IMAGE", "message": str(error)})


@app.exception_handler(NoFaceError)
@app.exception_handler(MultipleFacesError)
async def face_error_handler(_request, error):
    """Turn 'no face' / 'too many faces' into a clear 422 response with a code."""
    return JSONResponse(status_code=422, content={"detail": {"code": error.code, "message": str(error)}})


# ---------- routes ----------
# Routes are plain `def` (not `async def`): FastAPI then runs them in a thread
# pool, so the CPU-heavy model work does not block other requests.


@app.get("/health")
def health():
    return {"status": "ok", "modelsLoaded": bool(models)}


@app.post("/faces/detect", dependencies=[Depends(require_secret)])
def detect_faces(image: UploadFile = File(...)):
    """Used when indexing event photos: returns every face found (can be zero)."""
    faces = models["faces"].detect(read_image(image))
    return {"faces": [{"embedding": f.embedding, "score": f.score, "box": f.box} for f in faces]}


@app.post("/faces/selfie", dependencies=[Depends(require_secret)])
def selfie_face(image: UploadFile = File(...)):
    """Used for guest selfies: returns exactly one face or a 422 error code."""
    face = models["faces"].single_face(read_image(image))
    return {"embedding": face.embedding, "score": face.score}


MAX_FRONT_FRAMES = 6
MAX_TURNED_FRAMES = 12


@app.post("/liveness", dependencies=[Depends(require_secret)])
def liveness(front: list[UploadFile] = File(...), turned: list[UploadFile] = File(...)):
    """
    `front`  = 1–6 webcam frames taken while looking straight at the camera
    `turned` = 1–12 webcam frames taken while turning the head to either side
    We keep the best frame of each burst (see pick_best_frames).
    """
    if len(front) > MAX_FRONT_FRAMES or len(turned) > MAX_TURNED_FRAMES:
        raise HTTPException(status_code=413, detail="Too many frames")
    engine: FaceEngine = models["faces"]
    best_front, best_turned = pick_best_frames(
        engine, [read_image(f) for f in front], [read_image(f) for f in turned]
    )
    result = evaluate_liveness(
        front=best_front,
        turned=best_turned,
        model=models["liveness"],
        threshold=settings.liveness_threshold,
        max_front_yaw=settings.max_front_yaw,
        min_turn_yaw=settings.min_turn_yaw,
        min_same_person=settings.min_same_person,
    )
    return {
        "passed": result.passed,
        "reason": result.reason,
        "realScore": result.real_score,
        "frontYaw": result.front_yaw,
        "turnedYaw": result.turned_yaw,
        "embedding": result.embedding,
    }
