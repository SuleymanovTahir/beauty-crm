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
        c.execute("SELECT id, title, description, bonus_points, is_active, created_at FROM active_challenges ORDER BY created_at DESC")
        challenges = []
        for row in c.fetchall():
            challenges.append({
                "id": str(row[0]),
                "title": row[1],
                "description": row[2] or "",
                "bonus_points": row[3] or 0,
                "reward_points": row[3] or 0,
                "is_active": row[4],
                "type": "visits",
                "target_value": 1,
                "participants_count": 0,
                "completion_rate": 0,
                "start_date": "",
                "end_date": "",
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


@router.get("/challenges/stats")
async def get_challenges_stats(session_token: Optional[str] = Cookie(None)):
    """Статистика по челленджам"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM active_challenges")
        total = (c.fetchone() or [0])[0]
        c.execute("SELECT COUNT(*) FROM active_challenges WHERE is_active = true")
        active = (c.fetchone() or [0])[0]
        conn.close()
        return {
            "success": True,
            "stats": {
                "total_challenges": total,
                "active_challenges": active,
                "total_participants": 0,
                "completion_rate": 0,
            }
        }
    except Exception as e:
        log_error(f"Error getting challenges stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/challenges/{challenge_id}/check-progress")
async def check_challenge_progress(challenge_id: int, session_token: Optional[str] = Cookie(None)):
    """Проверить прогресс по челленджу"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"success": True, "updated": 0}
