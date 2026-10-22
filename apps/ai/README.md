# PhotoMatch AI — face service (`apps/ai`)

A tiny, **stateless** Python HTTP service. It receives images, runs AI models
and returns numbers. It never talks to the database — the Node API stores and
searches the results. Keeping it stateless means you can restart or scale it
freely and there is only one place (the API) that owns data.

## Models

| Purpose | Model | Size | Downloaded from |
| --- | --- | --- | --- |
| Find faces + face "fingerprint" (512-number embedding) | InsightFace `buffalo_l` (RetinaFace detector + ArcFace recognizer) | ~300 MB | InsightFace GitHub release (automatic) |
| Head pose for the turn challenge | `1k3d68` landmark model (part of `buffalo_l`) | — | same pack |
| Liveness / anti-spoofing | MiniFASNet trained on CelebA-Spoof, ONNX (`AntiSpoofing_bin_1.5_128`) | 2 MB | `LIVENESS_MODEL_URL` (automatic) |

Both are downloaded into `apps/ai/models/` on first start (git-ignored).

**Why these models?** InsightFace is the de-facto open-source standard for
face recognition and runs fast on a normal CPU. MiniFASNet (from the
Silent-Face-Anti-Spoofing project) is a tiny passive liveness model designed
for exactly this use case: deciding from one camera frame whether the face is
real or a printed/screen copy. Pairing it with a simple head-turn challenge
blocks the two most common cheats (holding up a photo, replaying a picture)
without needing heavy video models.

> Check the license of any model you ship commercially. You can point
> `LIVENESS_MODEL_URL` at your own ONNX file with the same input format
> (RGB, 128×128, crop 1.5× the face box, output `[real, spoof]`).

## Endpoints

All `POST` endpoints require the header `X-AI-Secret: <AI_SERVICE_SECRET>` and
accept `multipart/form-data`.

| Method & path | Form fields | Returns |
| --- | --- | --- |
| `GET /health` | – | `{ status, modelsLoaded }` |
| `POST /faces/detect` | `image` | `{ faces: [{ embedding[512], score, box }] }` |
| `POST /faces/selfie` | `image` | `{ embedding[512], score }` or `422 { code: NO_FACE \| MULTIPLE_FACES \| INVALID_IMAGE }` |
| `POST /liveness` | `front`, `turned` | `{ passed, reason, realScore, frontYaw, turnedYaw, embedding }` |

`reason` is one of `NOT_FACING_CAMERA`, `HEAD_NOT_TURNED`, `SPOOF_DETECTED`
(or `null` when it passed).

## Run it

```bash
cd apps/ai
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

Or with Docker from the repo root: `docker compose up -d ai`.

## Tests

```bash
pip install pytest httpx
python -m pytest
```

The tests use the real models and InsightFace's bundled sample photo.

## Files

```text
app/
  config.py       settings (read from the shared root .env)
  images.py       bytes → image, with resize
  face_engine.py  InsightFace wrapper: detect faces, pick the single selfie face
  liveness.py     anti-spoof model + head-turn rules
  main.py         FastAPI routes
tests/test_api.py end-to-end tests
```
