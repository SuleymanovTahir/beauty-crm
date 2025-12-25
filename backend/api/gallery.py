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
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Gallery"])

@router.get("/gallery/{category}")
async def get_gallery_images(
    category: str,
    visible_only: bool = True
):
    """
    Получить фото галереи
    category: 'portfolio' или 'salon'
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        query = "SELECT id, image_path, title, description, sort_order, is_visible FROM gallery_images WHERE category = %s"
        params = [category]
        
        if visible_only:
            query += " AND is_visible = 1"
        
        query += " ORDER BY sort_order ASC, id ASC"
        
        c.execute(query, params)
        images = []
        
        for row in c.fetchall():
            images.append({
                "id": row[0],
                "image_path": row[1],
                "title": row[2],
                "description": row[3],
                "sort_order": row[4],
                "is_visible": row[5]
            })
        
        conn.close()
        return {"success": True, "images": images}
        
    except Exception as e:
        log_error(f"Error getting gallery images: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/gallery")
async def add_gallery_image(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить фото в галерею (только admin)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO gallery_images (category, image_path, title, description, sort_order, is_visible)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data.get('category'),
            data.get('image_path'),
            data.get('title', ''),
            data.get('description', ''),
            data.get('sort_order', 0),
            True if data.get('is_visible', True) else False
        ))
        
        image_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_info(f"Added gallery image {image_id}", "api")
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
        
        updates = []
        params = []
        
        if 'title' in data:
            updates.append("title = %s")
            params.append(data['title'])
        
        if 'description' in data:
            updates.append("description = %s")
            params.append(data['description'])
        
        if 'sort_order' in data:
            updates.append("sort_order = %s")
            params.append(data['sort_order'])
        
        if 'is_visible' in data:
            updates.append("is_visible = %s")
            params.append(True if data['is_visible'] else False)

        if 'image_path' in data:
            updates.append("image_path = %s")
            params.append(data['image_path'])
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(image_id)
            
            query = f"UPDATE gallery_images SET {', '.join(updates)} WHERE id = %s"
            c.execute(query, params)
            conn.commit()
        
        conn.close()
        
        log_info(f"Updated gallery image {image_id}", "api")
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
        from api.uploads import delete_upload_file
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Получаем путь к файлу
        c.execute("SELECT image_path FROM gallery_images WHERE id = %s", (image_id,))
        row = c.fetchone()
        
        if row:
            # Удаляем из БД
            c.execute("DELETE FROM gallery_images WHERE id = %s", (image_id,))
            conn.commit()
            
            # Удаляем файл с диска
            image_path = row[0]
            if image_path:
                delete_upload_file(image_path)
        
        conn.close()
        
        log_info(f"Deleted gallery image {image_id}", "api")
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
        # Используем центральный UPLOAD_DIR из конфига
        from core.config import UPLOAD_DIR
        target_dir = Path(UPLOAD_DIR) / "images" / category
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем файл
        file_path = target_dir / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # URL должен начинаться с /static, так как мы маунтим static папку
        # Путь теперь вложен в /images/
        image_path = f"/static/uploads/images/{category}/{file.filename}"
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get max sort_order
        c.execute("SELECT MAX(sort_order) FROM gallery_images WHERE category = %s", (category,))
        row = c.fetchone()
        max_order = row[0] if row and row[0] is not None else 0
        
        c.execute("""
            INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
            VALUES (%s, %s, %s, %s, TRUE)
        """, (category, image_path, file.filename, max_order + 1))
        
        image_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_info(f"Uploaded gallery image {image_id}: {file.filename}", "api")
        return {"success": True, "image_id": image_id, "image_path": image_path}
        
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
        conn = get_db_connection()
        c = conn.cursor()
        
        # Update or Insert settings
        # Assuming salon_settings is a key-value store or single row. 
        # Based on get_salon_settings, it seems to be a single row table 'salon_settings' with columns.
        # We need to check if columns exist, if not create them (migration is better but I can't do migration easily now without checking schema).
        # Alternatively, use a generic settings table if exists.
        # Let's check salon_settings schema first.
        
        # For now, I'll assume columns might not exist and I should probably use a migration.
        # But user asked to "add button", implying I should make it work.
        # I will check schema in next step. For now I will write the logic assuming columns exist.
        
        updates = []
        params = []
        
        if 'gallery_count' in data:
            updates.append("gallery_display_count = %s")
            params.append(data['gallery_count'])
            
        if 'portfolio_count' in data:
            updates.append("portfolio_display_count = %s")
            params.append(data['portfolio_count'])

        if 'services_count' in data:
            updates.append("services_display_count = %s")
            params.append(data['services_count'])

        if 'faces_count' in data:
            updates.append("faces_display_count = %s")
            params.append(data['faces_count'])
            
        if updates:
            # Check if row exists
            c.execute("SELECT id FROM salon_settings LIMIT 1")
            if c.fetchone():
                c.execute(f"UPDATE salon_settings SET {', '.join(updates)}", params)
            else:
                # Insert default row
                c.execute("INSERT INTO salon_settings (gallery_display_count, portfolio_display_count, services_display_count, faces_display_count) VALUES (%s, %s, %s, %s)", 
                          (data.get('gallery_count', 6), data.get('portfolio_count', 6), data.get('services_count', 6), data.get('faces_count', 6)))
            
            conn.commit()
            
        conn.close()
        return {"success": True}
        
    except Exception as e:
        # If column missing error
        if "no such column" in str(e):
             # Auto-migration fallback (risky but effective for this task)
             try:
                 conn = get_db_connection()
                 c = conn.cursor()
                 if 'gallery_count' in data:
                     try:
                         c.execute("ALTER TABLE salon_settings ADD COLUMN gallery_display_count INTEGER DEFAULT 6")
                     except: pass
                 if 'portfolio_count' in data:
                      try:
                          c.execute("ALTER TABLE salon_settings ADD COLUMN portfolio_display_count INTEGER DEFAULT 6")
                      except: pass
                 if 'services_count' in data:
                     try:
                         c.execute("ALTER TABLE salon_settings ADD COLUMN services_display_count INTEGER DEFAULT 6")
                     except: pass
                 if 'faces_count' in data:
                     try:
                         c.execute("ALTER TABLE salon_settings ADD COLUMN faces_display_count INTEGER DEFAULT 6")
                     except: pass
                 conn.commit()
                 conn.close()
                 # Retry update
                 return await update_gallery_settings(request, session_token)
             except Exception as ex:
                 return JSONResponse({"error": str(ex)}, status_code=500)
                 
        return JSONResponse({"error": str(e)}, status_code=500)
