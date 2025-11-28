from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from pathlib import Path
from typing import Optional

router = APIRouter(tags=["Upload"])

# ✅ ВАЖНО: Укажите ваш реальный домен или публичный IP
# Для production:
PUBLIC_URL = os.getenv("PUBLIC_URL", "https://mlediamant.com")
# Для разработки с ngrok (если используете):
# PUBLIC_URL = os.getenv("PUBLIC_URL", "https://your-ngrok-url.ngrok-free.app")

UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Создаем подпапки
(UPLOAD_DIR / "images").mkdir(exist_ok=True)
(UPLOAD_DIR / "videos").mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "files").mkdir(exist_ok=True)


def get_file_category(content_type: str) -> str:
    """Определить категорию файла по MIME типу"""
    if content_type.startswith('image/'):
        return 'images'
    elif content_type.startswith('video/'):
        return 'videos'
    elif content_type.startswith('audio/'):
        return 'audio'
    else:
        return 'files'


@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Загрузить файл и получить публичный URL
    
    Returns:
        {
            "file_url": "https://your-domain.com/static/uploads/images/file.jpg",
            "filename": "file.jpg",
            "content_type": "image/jpeg",
            "size": 12345
        }
    """
    try:
        # Проверка размера (максимум 25MB)
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > 25 * 1024 * 1024:  # 25MB
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 25MB"
            )
        
        # Определяем категорию
        category = get_file_category(file.content_type or 'application/octet-stream')
        
        # Используем оригинальное имя файла (перезаписываем если существует)
        filename = file.filename or 'uploaded_file'
        
        # Полный путь для сохранения
        file_path = UPLOAD_DIR / category / filename
        
        # Сохраняем файл (перезаписываем если существует)
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Формируем публичный URL
        public_file_url = f"{PUBLIC_URL}/static/uploads/{category}/{filename}"
        
        print(f"✅ File uploaded: {filename}")
        print(f"📍 Public URL: {public_file_url}")
        
        return {
            "file_url": public_file_url,
            "filename": filename,
            "content_type": file.content_type,
            "size": file_size,
            "category": category
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )