"""
Settings for the AI service.

Values are read from environment variables, or from the shared `.env` file in
the repository root (two folders up). Every setting has a sensible default so
the service starts even with an almost empty .env.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/ai/app/config.py → repository root is three parents up.
ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_ENV_FILE,
        extra="ignore",  # the shared .env also contains Node-only values
    )

    # Shared secret: the Node API sends it in the `X-AI-Secret` header.
    ai_service_secret: str = ""

    # Where models are stored (downloaded automatically on first start).
    model_dir: Path = Path(__file__).resolve().parents[1] / "models"

    # InsightFace model pack. "buffalo_l" = accurate detector + ArcFace recognizer.
    face_model_name: str = "buffalo_l"

    # Anti-spoofing (liveness) model: a MiniFASNet network trained on the
    # CelebA-Spoof dataset, exported to ONNX (~2 MB). It looks at a face crop
    # and outputs the probability that it is a real person rather than a
    # printed photo or a phone/laptop screen.
    liveness_model_url: str = (
        "https://raw.githubusercontent.com/hairymax/Face-AntiSpoofing/main/"
        "saved_models/AntiSpoofing_bin_1.5_128.onnx"
    )
    liveness_threshold: float = 0.7

    # Head-turn challenge (in degrees). The guest first looks straight at the
    # camera, then turns their head. A printed photo cannot do this.
    max_front_yaw: float = 15.0
    min_turn_yaw: float = 20.0

    # Reject uploads bigger than this (bytes).
    max_image_bytes: int = 20 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Create the settings once and reuse them everywhere."""
    return Settings()
