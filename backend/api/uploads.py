"""
API для загрузки файлов
"""
from fastapi import APIRouter, UploadFile, File, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from pathlib import Path

from utils import require_auth, sanitize_filename
from logger import log_info, log_error

router = APIRouter(tags=["Uploads"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Загрузить файл на сервер"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        # Генерируем уникальное имя файла
        file_ext = Path(file.filename).suffix
        safe_name = sanitize_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}{file_ext}"
        
        # Определяем папку по типу файла
        if file.content_type and file.content_type.startswith('image/'):
            folder = 'images'
        elif file.content_type and file.content_type.startswith('audio/'):
            folder = 'voice'
        else:
            folder = 'files'
        
        # Полный путь (относительно backend/)
        base_dir = Path(__file__).parent.parent  # /backend/
        file_dir = base_dir / 'static' / 'uploads' / folder
        file_dir.mkdir(parents=True, exist_ok=True)
        file_path = file_dir / unique_name
        
        # Сохраняем файл
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Формируем URL
        from config import BASE_URL
        file_url = f"{BASE_URL}/static/uploads/{folder}/{unique_name}"
        
        log_info(f"✅ Файл загружен: {safe_name} -> {unique_name}", "uploads")
        
        return {
            "success": True,
            "file_url": file_url,
            "filename": safe_name,
            "size": len(contents)
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка загрузки файла: {e}", "uploads", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)