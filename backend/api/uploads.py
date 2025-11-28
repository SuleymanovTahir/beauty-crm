from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from pathlib import Path
from typing import Optional

router = APIRouter(tags=["Upload"])

# ✅ Автоматическое определение PUBLIC_URL
# Приоритет: переменная окружения > автоопределение
if os.getenv("PUBLIC_URL"):
    PUBLIC_URL = os.getenv("PUBLIC_URL")
elif os.getenv("ENVIRONMENT") == "production":
    # Production окружение
    PUBLIC_URL = "https://mlediamant.com"
else:
    # Development окружение (localhost)
    PUBLIC_URL = "http://localhost:8000"

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
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


@router.post("/upload")
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


def delete_upload_file(file_path: str) -> bool:
    """
    Удалить файл из папки uploads
    
    Args:
        file_path: Путь к файлу (например, /static/uploads/photos/user_123.jpg)
    
    Returns:
        bool: True если файл успешно удален, False если произошла ошибка
    """
    if not file_path:
        return False
    
    try:
        # Remove leading slash to make it relative
        rel_path = file_path.lstrip('/')
        
        # Construct full path from backend root
        full_path = os.path.join("backend", rel_path)
        
        if os.path.exists(full_path):
            os.remove(full_path)
            print(f"✅ Deleted file: {full_path}")
            return True
        else:
            print(f"⚠️ File not found (already deleted?): {full_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error deleting file {file_path}: {e}")
        return False


def delete_old_photo_if_exists(old_photo_path: str, new_photo_path: str) -> bool:
    """
    Удалить старое фото при замене на новое
    
    Args:
        old_photo_path: Путь к старому фото
        new_photo_path: Путь к новому фото
    
    Returns:
        bool: True если старое фото удалено или не требовало удаления
    """
    # Не удаляем, если пути одинаковые
    if old_photo_path == new_photo_path:
        return True
    
    # Не удаляем, если старого фото нет
    if not old_photo_path or old_photo_path == '':
        return True
    
    # Не удаляем дефолтные аватары
    if 'default' in old_photo_path.lower() or 'placeholder' in old_photo_path.lower():
        return True
    
    return delete_upload_file(old_photo_path)