"""
API Endpoints для управления расписанием сотрудников
"""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_error, log_info
from core.auth import get_current_user_or_redirect as get_current_user

router = APIRouter(tags=["Employee Schedule"])

@router.get("/users/{user_id}/schedule")
async def get_user_schedule(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить расписание сотрудника"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT day_of_week, start_time, end_time, is_active
            FROM user_schedule
            WHERE user_id = %s
            ORDER BY day_of_week
        """, (user_id,))
        
        schedule = []
        for row in c.fetchall():
            schedule.append({
                "day_of_week": row["day_of_week"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "is_active": bool(row["is_active"])
            })
        
        conn.close()
        
        return {"schedule": schedule}
        
    except Exception as e:
        log_error(f"Error getting user schedule: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/schedule")
async def update_user_schedule(
    user_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Обновить расписание сотрудника"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        schedule = data.get("schedule", [])
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Используем атомарный UPSERT (INSERT ... ON CONFLICT)
        for entry in schedule:
            c.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, day_of_week) DO UPDATE 
                SET start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    is_active = EXCLUDED.is_active,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                user_id,
                entry["day_of_week"],
                entry["start_time"],
                entry["end_time"],
                True if entry.get("is_active", True) else False
            ))
        
        conn.commit()
        conn.close()
        
        log_info(f"Schedule updated for user {user_id}", "api")
        
        return {"success": True, "message": "Schedule updated"}
        
    except Exception as e:
        log_error(f"Error updating user schedule: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
