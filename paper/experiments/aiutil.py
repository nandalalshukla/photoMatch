"""
Shared helpers for the AI-service experiments (run with apps/ai/.venv).

The experiments import the real face engine from `apps/ai` — the same code
the production service runs — so every number comes from the shipped models.
"""

import json
import statistics
import sys
import time
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "ai"))

from app.config import get_settings  # noqa: E402
from app.face_engine import FaceEngine  # noqa: E402

DATA_DIR = ROOT / "paper" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_engine() -> FaceEngine:
    return FaceEngine(get_settings().model_dir)


def read_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(path)
    return image


def resize_long_side(image: np.ndarray, long_side: int) -> np.ndarray:
    height, width = image.shape[:2]
    scale = long_side / max(height, width)
    interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    return cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=interpolation)


def cosine(a, b) -> float:
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


def time_it(fn, runs: int = 40, warmup: int = 5) -> dict:
    """Run fn() repeatedly; return median / 5th / 95th percentile / mean / std in milliseconds."""
    for _ in range(warmup):
        fn()
    samples = []
    for _ in range(runs):
        start = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - start) * 1000)
    samples.sort()
    pick = lambda q: samples[min(len(samples) - 1, int(q * len(samples)))]  # noqa: E731
    return {
        "median_ms": statistics.median(samples),
        "p05_ms": pick(0.05),
        "p95_ms": pick(0.95),
        "mean_ms": statistics.fmean(samples),
        "std_ms": statistics.pstdev(samples),
        "runs": runs,
    }


def save_json(name: str, payload: dict) -> Path:
    path = DATA_DIR / name
    path.write_text(json.dumps(payload, indent=2))
    print("wrote", path)
    return path
