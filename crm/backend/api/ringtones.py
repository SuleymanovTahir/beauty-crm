from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from db.connection import get_db_connection
from datetime import datetime
import os
from pathlib import Path
import re
from core.config import UPLOAD_DIR, PUBLIC_URL

router = APIRouter(tags=["Ringtones"])

UPLOAD_DIR_PATH = Path(UPLOAD_DIR)

@router.get("/ringtones")
async def get_ringtones():
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, url, is_system, start_time, end_time FROM ringtones ORDER BY is_system DESC, created_at DESC")
        rows = c.fetchall()
        ringtones = []
        for row in rows:
            ringtones.append({
                "id": row[0],
                "name": row[1],
                "url": row[2],
                "is_system": row[3],
                "start_time": row[4],
                "end_time": row[5]
            })
        return ringtones
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/ringtones/{ringtone_id}/trim")
async def update_ringtone_trim(ringtone_id: int, data: dict):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        start_time = data.get("start_time", 0.0)
        end_time = data.get("end_time")
        
        c.execute(
            "UPDATE ringtones SET start_time = %s, end_time = %s WHERE id = %s",
            (start_time, end_time, ringtone_id)
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/ringtones")
async def upload_ringtone(file: UploadFile = File(...)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # 1. Validate file
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Only audio files are allowed")
        
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024: # 10MB limit as per user
             raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        # 2. Save file
        timestamp = int(datetime.now().timestamp())
        original_filename = file.filename or "ringtone.mp3"
        
        # Clean filename
        base_name = os.path.splitext(original_filename)[0]
        ext = os.path.splitext(original_filename)[1]
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)
        filename = f"{safe_name}_{timestamp}{ext}"
        
        target_dir = UPLOAD_DIR_PATH / "audio" / "ringtones"
        target_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = target_dir / filename
        with open(file_path, "wb") as f:
            f.write(contents)
            
        public_url = f"/static/uploads/audio/ringtones/{filename}"
        full_url = f"{PUBLIC_URL}{public_url}"

        # 3. Insert into DB
        # User requested to use original name (base_name)
        display_name = base_name 
        
        c.execute(
            "INSERT INTO ringtones (name, url, is_system) VALUES (%s, %s, FALSE) RETURNING id, name, url, is_system",
            (display_name, public_url)
        )
        new_row = c.fetchone()
        conn.commit()
        
        return {
            "id": new_row[0],
            "name": new_row[1],
            "url": new_row[2],
            "full_url": full_url,
            "is_system": new_row[3]
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/ringtones/{ringtone_id}")
async def delete_ringtone(ringtone_id: int):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Check if exists and is not system
        c.execute("SELECT url, is_system FROM ringtones WHERE id = %s", (ringtone_id,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Ringtone not found")
        
        url, is_system = row
        
        if is_system:
            raise HTTPException(status_code=403, detail="Cannot delete system ringtones")

        # Delete from DB
        c.execute("DELETE FROM ringtones WHERE id = %s", (ringtone_id,))
        conn.commit()

        # Delete file if it exists and is local
        if url.startswith("/static/"):
            # Construct absolute path
            # BASE_DIR should be imported or calculated. 
            # Assuming UPLOAD_DIR relates correctly.
            # UPLOAD_DIR is usually backend/static/uploads
            # url is /static/uploads/...
            
            # We can use logic from uploads.py or just UPLOAD_DIR
            # url: /static/uploads/audio/ringtones/file.mp3
            # UPLOAD_DIR: backend/static/uploads
            
            relative_path = url.replace("/static/uploads/", "")
            file_path = UPLOAD_DIR_PATH / relative_path
            
            if file_path.exists():
                os.remove(file_path)

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
