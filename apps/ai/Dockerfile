# Image for the PhotoMatch AI face service.
FROM python:3.12-slim

# libglib is the only system library OpenCV (headless) needs. No compiler is
# required: every Python package installs from a pre-built wheel.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --only-binary=:all: -r requirements.txt

COPY app ./app
# Small anti-spoofing models (Apache 2.0) ship with the code.
COPY weights ./weights

# Face models are downloaded into /app/models on first start (mount a volume to keep them).
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
