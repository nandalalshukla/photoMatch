"""
Experiment 5 — throughput of the AI service over HTTP.

Starts the real service (uvicorn, 1..N processes), sends photos to
POST /faces/detect from several concurrent clients exactly like the Node
worker does, and reports photos per second and request latency.

The client uses only the standard library plus OpenCV (to resize the photo), so run it
with the AI service's virtual environment.

Run:  apps/ai/.venv/bin/python paper/experiments/http_throughput.py --image group.jpg
"""

import argparse
import http.client
import json
import os
import signal
import statistics
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AI_DIR = ROOT / "apps" / "ai"
PORT = 8011


def read_secret() -> str:
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("AI_SERVICE_SECRET="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


def multipart(field: str, filename: str, data: bytes) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; filename=\"{filename}\"\r\n"
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def one_request(body: bytes, content_type: str, secret: str) -> float:
    start = time.perf_counter()
    conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=120)
    conn.request("POST", "/faces/detect", body, {"Content-Type": content_type, "X-AI-Secret": secret})
    response = conn.getresponse()
    payload = response.read()
    conn.close()
    if response.status != 200:
        raise RuntimeError(f"{response.status}: {payload[:200]!r}")
    return (time.perf_counter() - start) * 1000


def wait_ready(timeout: float = 120) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=2)
            conn.request("GET", "/health")
            if conn.getresponse().status == 200:
                return
        except OSError:
            pass
        time.sleep(0.5)
    raise TimeoutError("AI service did not start")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--requests", type=int, default=48)
    parser.add_argument("--configs", default="1:1,1:2,1:4,2:2,2:4,4:4,4:8", help="workers:concurrency pairs")
    args = parser.parse_args()

    import cv2

    image = cv2.imread(str(args.image))
    scale = 1600 / max(image.shape[:2])
    if scale < 1:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    jpeg = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 90])[1].tobytes()
    body, content_type = multipart("image", "photo.jpg", jpeg)
    secret = read_secret()
    results = []

    for config in args.configs.split(","):
        workers, concurrency = (int(x) for x in config.split(":"))
        env = {**os.environ, "AI_SERVICE_SECRET": secret}
        proc = subprocess.Popen(
            [str(AI_DIR / ".venv" / "bin" / "python"), "-m", "uvicorn", "app.main:app", "--port", str(PORT), "--workers", str(workers),
             "--log-level", "warning"],
            cwd=AI_DIR, env=env, start_new_session=True,
        )
        try:
            wait_ready()
            with ThreadPoolExecutor(concurrency) as pool:  # warm-up: every worker process loads/uses its models
                list(pool.map(lambda _: one_request(body, content_type, secret), range(max(8, workers * 4))))
            started = time.perf_counter()
            with ThreadPoolExecutor(concurrency) as pool:
                latencies = list(pool.map(lambda _: one_request(body, content_type, secret), range(args.requests)))
            elapsed = time.perf_counter() - started
            latencies.sort()
            row = {
                "uvicorn_workers": workers, "concurrent_clients": concurrency, "requests": args.requests,
                "photos_per_second": args.requests / elapsed,
                "latency_median_ms": statistics.median(latencies),
                "latency_p95_ms": latencies[int(0.95 * len(latencies)) - 1],
            }
            results.append(row)
            print(row)
        finally:
            os.killpg(proc.pid, signal.SIGTERM)
            proc.wait(timeout=30)
            time.sleep(1)

    out = ROOT / "paper" / "data" / "http_throughput.json"
    out.write_text(json.dumps({"image": args.image.name, "image_size_after_resize": list(image.shape[:2]), "jpeg_bytes": len(jpeg),
                               "cpu_count": os.cpu_count(), "results": results}, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    sys.exit(main())
