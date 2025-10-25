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
        log_info(f"📤 Upload request: {file.filename} ({file.content_type})", "uploads")
        
        # Генерируем уникальное имя файла
        file_ext = Path(file.filename).suffix
        safe_name = sanitize_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}{file_ext}"
        
        log_info(f"   Original: {file.filename}", "uploads")
        log_info(f"   Safe name: {safe_name}", "uploads")
        log_info(f"   Unique name: {unique_name}", "uploads")
        
        # Определяем папку по типу файла
        if file.content_type and file.content_type.startswith('image/'):
            folder = 'images'
        elif file.content_type and file.content_type.startswith('audio/'):
            folder = 'voice'
        elif file.content_type and file.content_type.startswith('video/'):
            folder = 'videos'
        else:
            folder = 'files'
        
        log_info(f"   Folder: {folder}", "uploads")
        
        # Полный путь (относительно backend/)
        base_dir = Path(__file__).parent.parent  # /backend/
        file_dir = base_dir / 'static' / 'uploads' / folder
        file_dir.mkdir(parents=True, exist_ok=True)
        file_path = file_dir / unique_name
        
        log_info(f"   Path: {file_path}", "uploads")
        
        # Сохраняем файл
        contents = await file.read()
        log_info(f"   Size: {len(contents)} bytes", "uploads")
        
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # ✅ ПРОВЕРЯЕМ что файл действительно сохранился
        if not file_path.exists():
            raise Exception(f"Файл не создан: {file_path}")
        
        # Формируем URL
        from config import BASE_URL
        file_url = f"{BASE_URL}/static/uploads/{folder}/{unique_name}"
        
        log_info(f"✅ File uploaded successfully!", "uploads")
        log_info(f"   URL: {file_url}", "uploads")
        
        return {
            "success": True,
            "file_url": file_url,
            "filename": safe_name,
            "size": len(contents),
            "content_type": file.content_type
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка загрузки файла: {e}", "uploads", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)