from fastapi import APIRouter, Request, Cookie, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional, Tuple
from db.connection import get_db_connection
from utils.utils import require_auth
from pathlib import Path
from core.config import UPLOAD_DIR

router = APIRouter(tags=["Admin Client Gallery"])


def _get_gallery_access_status(cursor, client_id: str) -> Tuple[bool, str]:
    cursor.execute("SELECT preferences FROM clients WHERE instagram_id = %s", (client_id,))
    client_row = cursor.fetchone()
    if client_row is None or client_row[0] is None:
        return True, ""

    try:
        import json
        preferences = json.loads(client_row[0])
    except Exception:
        return True, ""

    privacy_prefs = preferences.get("privacy_prefs", {})
    is_allowed = privacy_prefs.get("allowPhotos", True) is not False
    if is_allowed:
        return True, ""
    return False, "Client disabled photo access"

@router.get("/admin/client-gallery/{client_id}")
async def get_admin_client_gallery(client_id: str, session_token: Optional[str] = Cookie(None)):
    """Получить галерею конкретного клиента для админа"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        photo_upload_allowed, photo_upload_reason = _get_gallery_access_status(c, client_id)
        c.execute("""
            SELECT id, before_photo, after_photo, created_at, category, notes, master_id
            FROM client_gallery
            WHERE client_id = %s
            ORDER BY created_at DESC
        """, (client_id,))
        
        gallery = []
        for row in c.fetchall():
            gallery.append({
                "id": row[0],
                "before": row[1],
                "after": row[2],
                "date": row[3],
                "category": row[4],
                "notes": row[5],
                "master_id": row[6]
            })
        conn.close()
        return {
            "success": True,
            "gallery": gallery,
            "photo_upload_allowed": photo_upload_allowed,
            "photo_upload_reason": photo_upload_reason
        }
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/client-gallery/upload")
async def upload_client_gallery_photo(
    client_id: str,
    photo_type: str, # 'before' or 'after'
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Загрузить фото до/после для клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        photo_upload_allowed, photo_upload_reason = _get_gallery_access_status(c, client_id)
        if not photo_upload_allowed:
            conn.close()
            raise HTTPException(status_code=403, detail=photo_upload_reason)
        conn.close()

        target_dir = Path(UPLOAD_DIR) / "client_galleries" / client_id
        target_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = target_dir / f"{photo_type}_{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        image_path = f"/static/uploads/client_galleries/{client_id}/{photo_type}_{file.filename}"
        return {"success": True, "image_path": image_path}
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/client-gallery")
async def add_gallery_entry(request: Request, session_token: Optional[str] = Cookie(None)):
    """Добавить запись в галерею клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()
        client_id = data.get("client_id")
        photo_upload_allowed, photo_upload_reason = _get_gallery_access_status(c, client_id)
        if not photo_upload_allowed:
            conn.close()
            raise HTTPException(status_code=403, detail=photo_upload_reason)

        c.execute("""
            INSERT INTO client_gallery (client_id, before_photo, after_photo, category, notes, master_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            client_id,
            data.get("before_photo"),
            data.get("after_photo"),
            data.get("category"),
            data.get("notes"),
            data.get("master_id")
        ))
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return {"success": True, "id": new_id}
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/admin/client-gallery/{entry_id}")
async def delete_gallery_entry(entry_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить запись из галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM client_gallery WHERE id = %s", (entry_id,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
