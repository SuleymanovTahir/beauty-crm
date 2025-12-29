"""
API для клиентской авторизации и личного кабинета
"""
from fastapi import APIRouter, HTTPException, Depends, Cookie
from pydantic import BaseModel

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
import traceback

# No prefix here because it's added in main.py
router = APIRouter(tags=["Client Auth"])

# ============================================================================
# MODELS
# ============================================================================

class ClientRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None

class ClientLogin(BaseModel):
    email: str
    password: str

class ToggleFavoriteMaster(BaseModel):
    master_id: int
    is_favorite: bool

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/dashboard")
async def get_client_dashboard(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT loyalty_points, referral_code, total_saved FROM clients WHERE instagram_id = %s", (client_id,))
        client_row = c.fetchone()
        points = client_row[0] if client_row else 0
        loyalty = {
            "points": points,
            "referral_code": client_row[1] if client_row else "",
            "total_saved": client_row[2] if client_row else 0
        }

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, u.photo_url 
            FROM bookings b 
            LEFT JOIN users u ON b.master = u.full_name 
            WHERE b.instagram_id = %s 
            AND b.status IN ('pending', 'confirmed') 
            AND b.datetime >= %s 
            ORDER BY b.datetime ASC LIMIT 1
        """, (client_id, datetime.now().isoformat()))
        row = c.fetchone()
        next_booking = {"id": row[0], "service": row[1], "date": row[2], "master": row[3], "master_photo": row[4]} if row else None

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, u.photo_url 
            FROM bookings b 
            LEFT JOIN users u ON b.master = u.full_name 
            WHERE b.instagram_id = %s 
            AND b.status = 'completed' 
            ORDER BY b.datetime DESC LIMIT 1
        """, (client_id,))
        row = c.fetchone()
        last_visit = {"id": row[0], "service": row[1], "date": row[2], "master": row[3], "master_photo": row[4]} if row else None

        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = %s AND unlocked_at IS NOT NULL", (client_id,))
        unlocked = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = 'template'")
        total_ach = c.fetchone()[0]

        return {
            "success": True,
            "loyalty": loyalty,
            "next_booking": next_booking,
            "last_visit": last_visit,
            "achievements_summary": {"unlocked": unlocked, "total": total_ach},
            "visit_stats": {"total_visits": 0} # Placeholder
        }
    except Exception as e:
        log_error(f"Error in dashboard: {e}")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@router.get("/achievements")
async def get_client_achievements(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT achievement_type, title_ru, icon, points_awarded FROM client_achievements WHERE client_id = 'template'")
    achievements = [{"type": r[0], "title": r[1], "icon": r[2], "points": r[3], "is_unlocked": False} for r in c.fetchall()]
    conn.close()
    return {"success": True, "achievements": achievements}

@router.get("/beauty-metrics")
async def get_client_beauty_metrics(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    return {"success": True, "metrics": []}

@router.get("/my-notifications")
async def get_client_notifications(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    return {"notifications": []}

@router.get("/my-bookings")
async def get_client_bookings(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, service_name, datetime, status, revenue FROM bookings WHERE instagram_id = %s", (user["username"],))
    items = [{"id":r[0], "service_name":r[1], "date":r[2], "status":r[3], "price":r[4]} for r in c.fetchall()]
    conn.close()
    return {"bookings": items}

@router.get("/loyalty")
async def get_loyalty(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    return {"total_points": 0}

@router.get("/gallery")
async def get_gallery(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    return {"success": True, "gallery": []}

@router.get("/favorite-masters")
async def get_fav_masters(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    return {"success": True, "masters": []}
