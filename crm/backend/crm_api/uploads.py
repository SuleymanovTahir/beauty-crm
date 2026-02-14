from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from pathlib import Path
from typing import Optional
from datetime import datetime
import re

router = APIRouter(tags=["Upload"])

# ✅ Универсальное определение PUBLIC_URL
from core.config import UPLOAD_DIR, BASE_DIR, is_localhost, PUBLIC_URL

print(f"📸 PUBLIC_URL: {PUBLIC_URL}")

UPLOAD_DIR_PATH = Path(UPLOAD_DIR)

# Создаем подпапки если их нет
for subdir in ["images", "videos", "audio", "files"]:
    (UPLOAD_DIR_PATH / subdir).mkdir(parents=True, exist_ok=True)

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
async def upload_file(
    file: UploadFile = File(...),
    subfolder: Optional[str] = None
):
    """
    Загрузить файл и получить публичный URL
    subfolder: Опциональная подпапка внутри категории (например 'faces' для 'images')
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

        # Генерируем имя файла с timestamp для избежания кэширования
        original_filename = file.filename or 'uploaded_file'
        timestamp = int(datetime.now().timestamp())

        # Разделяем имя и расширение
        if '.' in original_filename:
            name_parts = original_filename.rsplit('.', 1)
            base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_parts[0])  # Безопасное имя
            extension = name_parts[1]
            filename = f"{base_name}_{timestamp}.{extension}"
        else:
            base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', original_filename)
            filename = f"{base_name}_{timestamp}"

        # Путь для сохранения (с учетом подпапки)
        if subfolder and category == 'images':
            target_dir = UPLOAD_DIR_PATH / category / subfolder
            target_dir.mkdir(parents=True, exist_ok=True)
            file_path = target_dir / filename
            public_path = f"/static/uploads/{category}/{subfolder}/{filename}"
        else:
            file_path = UPLOAD_DIR_PATH / category / filename
            public_path = f"/static/uploads/{category}/{filename}"
        
        # Сохраняем файл
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Формируем публичный URL (относительный по умолчанию для DB)
        # Мы также возвращаем полный URL для фронтенда если нужно
        full_url = f"{PUBLIC_URL}{public_path}"
        
        print(f"✅ File uploaded: {filename} to {public_path}")
        
        return {
            "file_url": public_path, # Сохраняем относительный в БД
            "full_url": full_url,    # Для немедленного отображения на фронте
            "filename": filename,
            "content_type": file.content_type,
            "size": file_size,
            "category": category,
            "subfolder": subfolder
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
        # Remove leading slash and static/ prefix if present to find file relative to BASE_DIR/static
        # Actually, it's safer to just join with BASE_DIR
        rel_path = file_path.lstrip('/')
        
        # If the path starts with static/uploads, it's already Correct
        # If it doesn't, we assume it's relative to static
        full_path = os.path.join(BASE_DIR, rel_path)
        
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