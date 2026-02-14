from fastapi import APIRouter, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Challenges"])

@router.get("/challenges")
async def get_challenges():
    """Получить все челленджи"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id, title, description, bonus_points, is_active FROM active_challenges ORDER BY created_at DESC")
        challenges = []
        for row in c.fetchall():
            challenges.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "bonus_points": row[3],
                "is_active": row[4]
            })
        conn.close()
        return {"success": True, "challenges": challenges}
    except Exception as e:
        log_error(f"Error getting challenges: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/challenges")
async def create_challenge(request: Request, session_token: Optional[str] = Cookie(None)):
    """Создать челлендж (Admin only)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO active_challenges (title, description, bonus_points, is_active)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("title"),
            data.get("description"),
            data.get("bonus_points", 0),
            data.get("is_active", True)
        ))
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return {"success": True, "id": new_id}
    except Exception as e:
        log_error(f"Error creating challenge: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: int, request: Request, session_token: Optional[str] = Cookie(None)):
    """Обновить челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        updates = []
        params = []
        for key in ["title", "description", "bonus_points", "is_active"]:
            if key in data:
                updates.append(f"{key} = %s")
                params.append(data[key])

        if updates:
            params.append(challenge_id)
            c.execute(f"UPDATE active_challenges SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s", params)
            conn.commit()

        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM active_challenges WHERE id = %s", (challenge_id,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
