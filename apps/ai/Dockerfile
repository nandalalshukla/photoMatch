# Image for the PhotoMatch AI face service.
FROM python:3.12-slim

# g++ is needed once to build InsightFace's small C extension; libgl/glib for OpenCV.
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Models are downloaded into /app/models on first start (mount a volume to keep them).
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
