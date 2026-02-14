"""
API для управления галереей (портфолио и фото салона)
"""
from fastapi import APIRouter, Request, Cookie, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional, List

import os
from pathlib import Path
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth, sanitize_url
from utils.logger import log_info, log_error
from utils.cache import cache
import time

router = APIRouter(tags=["Gallery"])

def _map_gallery_path(url: str, category: str) -> str:
    """Преобразовать пути галереи на frontend папку"""
    if not url:
        return url

    # Маппинг категорий на папки в frontend/public_landing/styles/img/
    category_mappings = {
        'salon': 'salon',
        'portfolio': 'portfolio',
        'services': 'services',
        'faces': 'faces',
        'banners': 'banners',
        'staff': 'staff',
        'employees': 'staff',
    }

    # Старые пути к новым
    old_prefixes = [
        f'/static/images/{category}/',
        f'/static/uploads/images/{category}/',
        f'/static/images/staff/',
        f'/static/uploads/images/staff/',
        f'/static/images/employees/',
        f'/static/uploads/images/employees/',
    ]

    folder_name = category_mappings.get(category, category)

    for old_prefix in old_prefixes:
        if url.startswith(old_prefix):
            filename = url[len(old_prefix):]
            return f'/landing-images/{folder_name}/{filename}'

    return url

@router.get("/gallery/{category}")
async def get_gallery_images(
    category: str,
    visible_only: bool = True
):
    """
    Получить фото из галереи
    category: 'portfolio', 'salon', 'services', 'faces'
    """
    start_time = time.time()
    try:
        from utils.utils import map_image_path, _add_v
        log_info(f"📸 [Gallery] Fetching images for category: {category}", "api")

        conn = get_db_connection()
        c = conn.cursor()

        query = """
            SELECT id, image_url, title, description, display_order, is_active
            FROM public_gallery
            WHERE category = %s
        """
        params = [category]

        if visible_only:
            query += " AND is_active = TRUE"

        query += " ORDER BY display_order ASC, id ASC"

        c.execute(query, params)
        rows = c.fetchall()

        images = []
        for row in rows:
            raw_path = sanitize_url(row[1]) if row[1] else ''
            # Используем глобальный map_image_path вместо локального костыля
            mapped_path = map_image_path(raw_path)
            images.append({
                "id": row[0],
                "image_path": _add_v(mapped_path),
                "title": row[2],
                "description": row[3],
                "sort_order": row[4] or 0,
                "is_visible": row[5]
            })

        conn.close()

        duration = time.time() - start_time
        log_info(f"⏱️ get_gallery_images took {duration:.4f}s returning {len(images)} images", "api")

        return {"success": True, "images": images}

    except Exception as e:
        log_error(f"❌ [Gallery] Error getting gallery images: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/gallery")
async def add_gallery_image(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить фото в галерею"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        category = data.get('category', 'portfolio')

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get('image_path'),
            data.get('title', ''),
            data.get('description', ''),
            category,
            data.get('sort_order', 0),
            True if data.get('is_visible', True) else False
        ))

        image_id = c.fetchone()[0]
        conn.commit()
        # Инвалидируем кеш
        for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
            cache.delete(f"public_gallery_{lang}")
            cache.delete(f"initial_load_{lang}")

        return {"success": True, "image_id": image_id}

    except Exception as e:
        log_error(f"Error adding gallery image: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/gallery/{image_id}")
async def update_gallery_image(
    image_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить фото в галерее"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT image_url FROM public_gallery WHERE id = %s", (image_id,))
        row = c.fetchone()
        if not row: return JSONResponse({"error": "Not found"}, status_code=404)

        current_url = row[0]

        updates = []
        params = []

        if 'title' in data:
            updates.append("title = %s"); params.append(data['title'])
        if 'description' in data:
            updates.append("description = %s"); params.append(data['description'])
        if 'is_visible' in data:
            updates.append("is_active = %s"); params.append(bool(data['is_visible']))
        if 'sort_order' in data:
            updates.append("display_order = %s"); params.append(int(data['sort_order']))

        if 'image_path' in data:
            if current_url != data['image_path']:
                from crm_api.uploads import delete_old_photo_if_exists
                delete_old_photo_if_exists(current_url, data['image_path'])
            updates.append("image_url = %s"); params.append(data['image_path'])

        if updates:
            params.append(image_id)
            c.execute(f"UPDATE public_gallery SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()

        conn.close()

        # Инвалидируем кеш
        for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
            cache.delete(f"public_gallery_{lang}")
            cache.delete(f"initial_load_{lang}")

        return {"success": True}

    except Exception as e:
        log_error(f"Error updating gallery image: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/gallery/{image_id}")
async def delete_gallery_image(
    image_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить фото из галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        from crm_api.uploads import delete_upload_file
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT image_url FROM public_gallery WHERE id = %s", (image_id,))
        row = c.fetchone()

        if row:
            c.execute("DELETE FROM public_gallery WHERE id = %s", (image_id,))
            conn.commit()
            if row[0]: delete_upload_file(row[0])
            
            # Инвалидируем кеш
            for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
                cache.delete(f"public_gallery_{lang}")
                cache.delete(f"initial_load_{lang}")
        return {"success": True}

    except Exception as e:
        log_error(f"Error deleting gallery image: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/gallery/upload")
async def upload_gallery_image(
    category: str,
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Загрузить новое фото в галерею"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        from core.config import UPLOAD_DIR
        from datetime import datetime
        import re

        target_dir = Path(UPLOAD_DIR) / "images" / category
        target_dir.mkdir(parents=True, exist_ok=True)

        original_filename = file.filename or 'image'
        timestamp = int(datetime.now().timestamp())

        # Очистка имени файла
        if '.' in original_filename:
            name_parts = original_filename.rsplit('.', 1)
            base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_parts[0])
            unique_filename = f"{base_name}_{timestamp}.{name_parts[1]}"
        else:
            unique_filename = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', original_filename)}_{timestamp}.jpg"

        file_path = target_dir / unique_filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        image_url = f"/static/uploads/images/{category}/{unique_filename}"

        conn = get_db_connection()
        c = conn.cursor()

        # Получаем макс display_order для категории
        c.execute("SELECT MAX(display_order) FROM public_gallery WHERE category = %s", (category,))
        max_order = c.fetchone()[0] or 0

        c.execute("""
            INSERT INTO public_gallery (image_url, title, category, is_active, display_order)
            VALUES (%s, %s, %s, TRUE, %s)
            RETURNING id
        """, (image_url, original_filename, category, max_order + 1))

        image_id = c.fetchone()[0]
        conn.commit()
        # Инвалидируем кеш
        for lang in ['ru', 'en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']:
            cache.delete(f"public_gallery_{lang}")
            cache.delete(f"initial_load_{lang}")

        return {"success": True, "image_id": image_id, "image_path": image_url}

    except Exception as e:
        log_error(f"Error uploading gallery image: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/gallery/settings/display")
async def get_gallery_settings():
    """Получить настройки отображения галереи"""
    try:
        from db.settings import get_salon_settings
        settings = get_salon_settings()
        return {
            "gallery_count": settings.get("gallery_display_count", 6),
            "portfolio_count": settings.get("portfolio_display_count", 6),
            "services_count": settings.get("services_display_count", 6),
            "faces_count": settings.get("faces_display_count", 6)
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/gallery/settings/display")
async def update_gallery_settings(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки отображения галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        from db.settings import update_salon_settings

        success = update_salon_settings({
            "gallery_display_count": data.get('gallery_count'),
            "portfolio_display_count": data.get('portfolio_count'),
            "services_display_count": data.get('services_count'),
            "faces_display_count": data.get('faces_count')
        })

        return {"success": success}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
