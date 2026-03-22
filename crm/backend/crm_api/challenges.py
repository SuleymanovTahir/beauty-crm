from datetime import datetime
from fastapi import APIRouter, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Optional, Set
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Challenges"])


def _get_table_columns(cursor, table_name: str) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row[0] for row in cursor.fetchall()}


def _coerce_bool(value: Any, fallback: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return fallback
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value in [None, ""]:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.strip()
        if normalized == "":
            return None
        try:
            return datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _serialize_datetime(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _resolve_challenge_type(row_value: Any) -> str:
    normalized = str(row_value or "").strip()
    return normalized if normalized != "" else "visits"

@router.get("/challenges")
async def get_challenges():
    """Получить все челленджи"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        challenge_columns = _get_table_columns(c, "active_challenges")
        reward_column = "points_reward" if "points_reward" in challenge_columns else ("bonus_points" if "bonus_points" in challenge_columns else "NULL")
        type_column = "challenge_type" if "challenge_type" in challenge_columns else ("reward_type" if "reward_type" in challenge_columns else "NULL")
        target_value_column = "target_value" if "target_value" in challenge_columns else "NULL"
        start_date_column = "start_date" if "start_date" in challenge_columns else "NULL"
        end_date_column = "end_date" if "end_date" in challenge_columns else "NULL"
        order_column = "updated_at" if "updated_at" in challenge_columns else "created_at"

        c.execute(f"""
            SELECT
                id,
                title,
                description,
                COALESCE({reward_column}, 0) AS reward_points,
                is_active,
                {type_column} AS challenge_type,
                COALESCE({target_value_column}, 1) AS target_value,
                {start_date_column} AS start_date,
                {end_date_column} AS end_date
            FROM active_challenges
            ORDER BY {order_column} DESC, created_at DESC
        """)
        challenge_rows = c.fetchall()

        progress_by_challenge = {}
        c.execute("""
            SELECT
                challenge_id,
                COUNT(*) AS participants_count,
                COUNT(*) FILTER (WHERE is_completed = TRUE) AS completed_count
            FROM challenge_progress
            GROUP BY challenge_id
        """)
        for progress_row in c.fetchall():
            participants_count = int(progress_row[1] or 0)
            completed_count = int(progress_row[2] or 0)
            completion_rate = 0
            if participants_count > 0:
                completion_rate = round((completed_count / participants_count) * 100)
            progress_by_challenge[int(progress_row[0])] = {
                "participants_count": participants_count,
                "completion_rate": completion_rate,
            }

        challenges = []
        for row in challenge_rows:
            progress = progress_by_challenge.get(int(row[0]), {"participants_count": 0, "completion_rate": 0})
            challenges.append({
                "id": str(row[0]),
                "title": row[1],
                "description": row[2] or "",
                "reward_points": row[3] or 0,
                "is_active": row[4],
                "type": _resolve_challenge_type(row[5]),
                "target_value": float(row[6] or 1),
                "participants_count": progress["participants_count"],
                "completion_rate": progress["completion_rate"],
                "start_date": _serialize_datetime(row[7]),
                "end_date": _serialize_datetime(row[8]),
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
        title = str(data.get("title", "")).strip()
        if title == "":
            return JSONResponse({"error": "Title is required"}, status_code=400)

        description = str(data.get("description", "")).strip()
        reward_points = int(data.get("reward_points", data.get("bonus_points", 0)) or 0)
        challenge_type = str(data.get("type", data.get("challenge_type", "visits"))).strip() or "visits"
        target_value = float(data.get("target_value", 1) or 1)
        is_active = _coerce_bool(data.get("is_active", True))
        start_date = _parse_datetime(data.get("start_date"))
        end_date = _parse_datetime(data.get("end_date"))

        if end_date is not None and start_date is not None and end_date < start_date:
            return JSONResponse({"error": "End date cannot be earlier than start date"}, status_code=400)

        conn = get_db_connection()
        c = conn.cursor()
        challenge_columns = _get_table_columns(c, "active_challenges")
        insert_fields = ["title", "description", "is_active"]
        insert_values = [title, description, is_active]
        placeholders = ["%s", "%s", "%s"]

        reward_column = "points_reward" if "points_reward" in challenge_columns else ("bonus_points" if "bonus_points" in challenge_columns else None)
        if reward_column is not None:
            insert_fields.append(reward_column)
            insert_values.append(reward_points)
            placeholders.append("%s")

        type_column = "challenge_type" if "challenge_type" in challenge_columns else ("reward_type" if "reward_type" in challenge_columns else None)
        if type_column is not None:
            insert_fields.append(type_column)
            insert_values.append(challenge_type)
            placeholders.append("%s")

        if "target_value" in challenge_columns:
            insert_fields.append("target_value")
            insert_values.append(target_value)
            placeholders.append("%s")

        if "start_date" in challenge_columns:
            insert_fields.append("start_date")
            insert_values.append(start_date)
            placeholders.append("%s")

        if "end_date" in challenge_columns:
            insert_fields.append("end_date")
            insert_values.append(end_date)
            placeholders.append("%s")

        if "updated_at" in challenge_columns:
            insert_fields.append("updated_at")
            insert_values.append(datetime.utcnow())
            placeholders.append("%s")

        c.execute(f"""
            INSERT INTO active_challenges ({", ".join(insert_fields)})
            VALUES ({", ".join(placeholders)})
            RETURNING id
        """, tuple(insert_values))
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
        challenge_columns = _get_table_columns(c, "active_challenges")

        updates = []
        params = []
        field_map = {
            "title": "title",
            "description": "description",
            "is_active": "is_active",
        }

        reward_column = "points_reward" if "points_reward" in challenge_columns else ("bonus_points" if "bonus_points" in challenge_columns else None)
        if reward_column is not None and any(key in data for key in ["reward_points", "bonus_points"]):
            updates.append(f"{reward_column} = %s")
            params.append(int(data.get("reward_points", data.get("bonus_points", 0)) or 0))

        type_column = "challenge_type" if "challenge_type" in challenge_columns else ("reward_type" if "reward_type" in challenge_columns else None)
        if type_column is not None and any(key in data for key in ["type", "challenge_type"]):
            updates.append(f"{type_column} = %s")
            params.append(str(data.get("type", data.get("challenge_type", "visits"))).strip() or "visits")

        if "target_value" in challenge_columns and "target_value" in data:
            updates.append("target_value = %s")
            params.append(float(data.get("target_value", 1) or 1))

        if "start_date" in challenge_columns and "start_date" in data:
            parsed_start_date = _parse_datetime(data.get("start_date"))
            if data.get("start_date") not in [None, ""] and parsed_start_date is None:
                return JSONResponse({"error": "Invalid start_date"}, status_code=400)
            updates.append("start_date = %s")
            params.append(parsed_start_date)

        if "end_date" in challenge_columns and "end_date" in data:
            parsed_end_date = _parse_datetime(data.get("end_date"))
            if data.get("end_date") not in [None, ""] and parsed_end_date is None:
                return JSONResponse({"error": "Invalid end_date"}, status_code=400)
            updates.append("end_date = %s")
            params.append(parsed_end_date)

        for payload_key, column_name in field_map.items():
            if payload_key in data:
                value = data[payload_key]
                if payload_key == "is_active":
                    value = _coerce_bool(value)
                updates.append(f"{column_name} = %s")
                params.append(value)

        if updates:
            if "updated_at" in challenge_columns:
                updates.append("updated_at = %s")
                params.append(datetime.utcnow())
            params.append(challenge_id)
            c.execute(f"UPDATE active_challenges SET {', '.join(updates)} WHERE id = %s", params)
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
        c.execute("SELECT COUNT(DISTINCT client_id) FROM challenge_progress")
        total_participants = int((c.fetchone() or [0])[0] or 0)
        c.execute("""
            SELECT COUNT(*)
            FROM challenge_progress
            WHERE completed_at IS NOT NULL
              AND DATE(completed_at) = CURRENT_DATE
        """)
        completed_today = int((c.fetchone() or [0])[0] or 0)
        conn.close()
        return {
            "success": True,
            "stats": {
                "total_challenges": total,
                "active_challenges": active,
                "total_participants": total_participants,
                "completed_today": completed_today,
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
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id FROM active_challenges WHERE id = %s", (challenge_id,))
        if c.fetchone() is None:
            conn.close()
            return JSONResponse({"error": "Challenge not found"}, status_code=404)

        c.execute("SELECT COUNT(*) FROM challenge_progress WHERE challenge_id = %s", (challenge_id,))
        reviewed_rows = int((c.fetchone() or [0])[0] or 0)
        conn.close()
        return {"success": True, "updated_count": reviewed_rows}
    except Exception as e:
        log_error(f"Error checking challenge progress: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
