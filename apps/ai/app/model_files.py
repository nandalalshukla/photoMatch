"""
Downloading the AI model files on first start.

Models are large binary files, so they are not stored in git. The first time
the service starts it downloads them into `apps/ai/models/` (git-ignored);
after that they are reused.
"""

import shutil
import urllib.request
import zipfile
from pathlib import Path

# InsightFace's official "buffalo_l" release. It contains 5 models; we keep only these 3.
BUFFALO_L_URL = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"
BUFFALO_L_FILES = ("det_10g.onnx", "w600k_r50.onnx", "1k3d68.onnx")


def download(url: str, destination: Path) -> None:
    """Download `url` to `destination` via a temporary file, so a broken download never looks complete."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    print(f"Downloading {url} ...")
    with urllib.request.urlopen(url) as response, open(temporary, "wb") as file:
        shutil.copyfileobj(response, file)
    temporary.rename(destination)


def ensure_face_models(model_dir: Path) -> Path:
    """Make sure the 3 face model files exist in `model_dir/buffalo_l/` and return that folder."""
    folder = model_dir / "buffalo_l"
    if all((folder / name).exists() for name in BUFFALO_L_FILES):
        return folder

    archive = model_dir / "buffalo_l.zip"
    download(BUFFALO_L_URL, archive)  # ~290 MB, once
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.namelist():
            name = Path(member).name
            if name in BUFFALO_L_FILES:
                folder.mkdir(parents=True, exist_ok=True)
                (folder / name).write_bytes(zipped.read(member))
    archive.unlink()
    return folder
