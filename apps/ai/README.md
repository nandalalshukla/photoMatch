# PhotoMatch AI — face service (`apps/ai`)

A tiny, **stateless** Python HTTP service. It receives images, runs AI models
and returns numbers. It never talks to the database — the Node API stores and
searches the results. Keeping it stateless means you can restart or scale it
freely and there is only one place (the API) that owns data.

It depends only on **FastAPI, ONNX Runtime, OpenCV and numpy**. Every package
installs from a pre-built wheel, so no C++ compiler is needed on Windows,
macOS or Linux.

## Models

| Purpose | Model | Where it comes from | License |
| --- | --- | --- | --- |
| Find faces + 5 landmarks | SCRFD `det_10g` | InsightFace `buffalo_l` pack, downloaded on first start (~290 MB zip, 3 files kept) | Non-commercial |
| Face "fingerprint" (512-number embedding) | ArcFace ResNet-50 `w600k_r50` | same pack | Non-commercial |
| Head angle for the turn challenge | 3-D 68-landmark model `1k3d68` | same pack | Non-commercial |
| Liveness / anti-spoofing | MiniFASNetV2 (2.7× crop) + MiniFASNetV1SE (4× crop) | Silent-Face-Anti-Spoofing, converted to ONNX, shipped in `weights/` | Apache 2.0 |

> ⚠️ InsightFace's models are licensed for **non-commercial research use only**.
> Personal and hobby use is fine; commercial use needs a license from
> InsightFace (or swapping `face_models.py` to commercially licensed models).

**Why run the ONNX files directly instead of using the `insightface` package?**
The package must compile C++ code during `pip install` (needs Microsoft Build
Tools on Windows) and pulls in matplotlib, scikit-image, scikit-learn, scipy and
more that we never use. `app/face_models.py` is a line-by-line port of the
pre/post-processing we need. It was checked against the `insightface` package
on 11 images: identical faces and boxes, identical embeddings (cosine ≥ 0.999999),
head angle within ~2°.

**Why these liveness models?** MiniFASNet is a tiny passive anti-spoofing
network built for exactly this job: deciding from one camera frame whether a
face is real or a printed/screen copy. The original project is Apache-2.0
licensed. Pairing it with the head-turn challenge blocks the two most common
cheats (holding up a photo, replaying a picture) without heavy video models.

## Endpoints

All `POST` endpoints require the header `X-AI-Secret: <AI_SERVICE_SECRET>` and
accept `multipart/form-data`.

| Method & path | Form fields | Returns |
| --- | --- | --- |
| `GET /health` | – | `{ status, modelsLoaded }` |
| `POST /faces/detect` | `image` | `{ faces: [{ embedding[512], score, box }] }` |
| `POST /faces/selfie` | `image` | `{ embedding[512], score }` or `422 { code: NO_FACE \| MULTIPLE_FACES \| INVALID_IMAGE }` |
| `POST /liveness` | `front`, `turned` | `{ passed, reason, realScore, frontYaw, turnedYaw, embedding }` |

`reason` is one of `NOT_FACING_CAMERA`, `HEAD_NOT_TURNED`, `DIFFERENT_PEOPLE`,
`SPOOF_DETECTED` (or `null` when it passed).

## Run it

```bash
cd apps/ai
python3 -m venv .venv              # Windows: python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Or with Docker from the repo root: `docker compose up -d ai`.

## Tests

```bash
pip install pytest httpx
python -m pytest
```

The tests use the real models. Test images are downloaded on the first run
into `tests/.images/` (git-ignored).

## Files

```text
app/
  config.py       settings (read from the shared root .env)
  images.py       bytes → image, with resize
  model_files.py  downloads the face models on first start
  face_models.py  the 3 face models run with ONNX Runtime (detector, ArcFace, head pose)
  face_engine.py  face API used by the routes: detect faces, pick the single selfie face
  liveness.py     anti-spoof models + head-turn rules
  main.py         FastAPI routes
weights/          MiniFASNet ONNX models + their Apache 2.0 license
tests/test_api.py end-to-end tests
```
