import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import UPLOAD_DIR, BASE_DIR
from utils.logger import log_info

def consolidate_uploads():
    log_info("🔧 Starting uploads directory normalization...", "maintenance")

    target_dir = Path(UPLOAD_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)

    # Universal CRM runtime keeps telephony/media uploads only.
    for relative_dir in ("audio", "audio/ringtones", "files", "voice"):
        (target_dir / relative_dir).mkdir(parents=True, exist_ok=True)

    # Recordings live outside UPLOAD_DIR under backend/static/recordings.
    recordings_dir = Path(BASE_DIR) / "static" / "recordings"
    recordings_dir.mkdir(parents=True, exist_ok=True)

    log_info("⏭️ Image upload consolidation skipped for universal CRM runtime", "maintenance")
    log_info("✨ Consolidation complete!", "maintenance")

if __name__ == "__main__":
    consolidate_uploads()
