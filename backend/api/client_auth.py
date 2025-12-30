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

    # Get client identifier - try multiple sources
    client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("username")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT loyalty_points, referral_code, total_saved FROM clients
            WHERE instagram_id = %s OR telegram_id = %s
            LIMIT 1
        """, (client_id, client_id))
        client_row = c.fetchone()
        points = client_row[0] if client_row else 0
        loyalty = {
            "points": points,
            "referral_code": client_row[1] if client_row else "",
            "total_saved": client_row[2] if client_row else 0
        }

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, COALESCE(u.photo, u.photo_url)
            FROM bookings b
            LEFT JOIN users u ON LOWER(b.master) = LOWER(u.full_name)
            WHERE (b.instagram_id = %s OR b.telegram_id = %s OR b.client_id = %s)
            AND b.status IN ('pending', 'confirmed')
            AND b.datetime >= %s
            ORDER BY b.datetime ASC LIMIT 1
        """, (client_id, client_id, client_id, datetime.now().isoformat()))
        row = c.fetchone()
        next_booking = {"id": row[0], "service": row[1], "date": row[2], "master": row[3], "master_photo": row[4]} if row else None

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, COALESCE(u.photo, u.photo_url)
            FROM bookings b
            LEFT JOIN users u ON LOWER(b.master) = LOWER(u.full_name)
            WHERE (b.instagram_id = %s OR b.telegram_id = %s OR b.client_id = %s)
            AND b.status = 'completed'
            ORDER BY b.datetime DESC LIMIT 1
        """, (client_id, client_id, client_id))
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

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Get client notifications (assuming notifications table exists)
        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        c.execute("""
            SELECT id, title, message, created_at, is_read, action_url
            FROM notifications
            WHERE client_id = %s
            ORDER BY created_at DESC
            LIMIT 50
        """, (client_id,))

        notifications = []
        for row in c.fetchall():
            notifications.append({
                "id": row[0],
                "title": row[1],
                "message": row[2],
                "created_at": row[3],
                "is_read": row[4],
                "action_url": row[5] if len(row) > 5 else None
            })

        conn.close()
        return {"success": True, "notifications": notifications}
    except Exception as e:
        log_error(f"Error loading notifications: {e}", "client_auth")
        return {"success": True, "notifications": []}

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        # Verify notification belongs to user and mark as read
        c.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s AND client_id = %s
        """, (notification_id, client_id))

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        log_error(f"Error marking notification as read: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.get("/my-bookings")
async def get_client_bookings(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    # Get client identifier - try multiple sources
    client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("username")

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, service_name, datetime, status, revenue, master
        FROM bookings
        WHERE instagram_id = %s OR telegram_id = %s OR client_id = %s
        ORDER BY datetime DESC
    """, (client_id, client_id, client_id))
    items = [{"id":r[0], "service_name":r[1], "date":r[2], "status":r[3], "price":r[4], "master_name": r[5]} for r in c.fetchall()]
    conn.close()
    return {"success": True, "bookings": items}

@router.get("/loyalty")
async def get_loyalty(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        from services.loyalty import LoyaltyService
        loyalty_service = LoyaltyService()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")
        if not client_id:
            return {"success": False, "error": "Client ID not found"}

        loyalty_data = loyalty_service.get_client_loyalty(client_id)

        if not loyalty_data:
            return {"success": False, "error": "Failed to get loyalty data"}

        # Get referral code from clients table
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT referral_code FROM clients WHERE instagram_id = %s OR telegram_id = %s", (client_id, client_id))
        referral_row = c.fetchone()
        conn.close()

        referral_code = referral_row[0] if referral_row else f"REF{client_id[:6].upper()}"

        return {
            "success": True,
            "loyalty": {
                "points": loyalty_data.get("available_points", 0),
                "total_points": loyalty_data.get("total_points", 0),
                "tier": loyalty_data.get("loyalty_level", "bronze"),
                "discount": get_discount_for_tier(loyalty_data.get("loyalty_level", "bronze")),
                "referral_code": referral_code,
                "total_spent": 0,  # TODO: calculate from bookings
                "total_saved": 0,  # TODO: calculate savings
            }
        }
    except Exception as e:
        log_error(f"Error in get_loyalty: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.get("/profile")
async def get_client_profile(session_token: Optional[str] = Cookie(None)):
    """Get full client profile information"""
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        # Get client data from clients table
        c.execute("""
            SELECT name, phone, email, avatar, birthday, created_at
            FROM clients
            WHERE instagram_id = %s OR telegram_id = %s
        """, (client_id, client_id))

        client_row = c.fetchone()

        if not client_row:
            conn.close()
            return {"success": False, "error": "Client not found"}

        # Get loyalty tier
        c.execute("""
            SELECT loyalty_level, total_points, available_points
            FROM client_loyalty_points
            WHERE client_id = %s
        """, (client_id,))

        loyalty_row = c.fetchone()
        tier = loyalty_row[0] if loyalty_row else "bronze"
        total_points = loyalty_row[1] if loyalty_row else 0
        available_points = loyalty_row[2] if loyalty_row else 0

        conn.close()

        return {
            "success": True,
            "profile": {
                "name": client_row[0],
                "phone": client_row[1],
                "email": client_row[2],
                "avatar": client_row[3],
                "birthday": client_row[4],
                "created_at": client_row[5],
                "tier": tier,
                "total_points": total_points,
                "available_points": available_points
            }
        }
    except Exception as e:
        log_error(f"Error loading client profile: {e}", "client_auth")
        return {"success": False, "error": str(e)}

def get_discount_for_tier(tier: str) -> int:
    """Get discount percentage for loyalty tier"""
    discount_map = {
        "bronze": 0,
        "silver": 5,
        "gold": 10,
        "platinum": 15
    }
    return discount_map.get(tier.lower(), 0)

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

@router.post("/profile/update")
async def update_profile(
    profile: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        # Update client profile
        updates = []
        params = []

        if "name" in profile:
            updates.append("name = %s")
            params.append(profile["name"])
        if "phone" in profile:
            updates.append("phone = %s")
            params.append(profile["phone"])
        if "email" in profile:
            updates.append("email = %s")
            params.append(profile["email"])

        if updates:
            params.append(client_id)
            query = f"UPDATE clients SET {', '.join(updates)} WHERE instagram_id = %s OR telegram_id = %s"
            params.append(client_id)
            c.execute(query, params)
            conn.commit()

        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating profile: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.post("/profile/change-password")
async def change_password(
    data: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        from core.security import hash_password, verify_password

        conn = get_db_connection()
        c = conn.cursor()

        user_id = user.get("id")
        old_password = data.get("old_password")
        new_password = data.get("new_password")

        # Verify old password
        c.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        row = c.fetchone()

        if not row:
            conn.close()
            return {"success": False, "error": "User not found"}

        if not verify_password(old_password, row[0]):
            conn.close()
            return {"success": False, "error": "Incorrect password"}

        # Update password
        new_hash = hash_password(new_password)
        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        log_error(f"Error changing password: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        # Verify booking belongs to user
        c.execute("""
            SELECT id FROM bookings
            WHERE id = %s AND client_id = %s
        """, (booking_id, client_id))

        if not c.fetchone():
            conn.close()
            return {"success": False, "error": "Booking not found"}

        # Update booking status
        c.execute("""
            UPDATE bookings
            SET status = 'cancelled', updated_at = %s
            WHERE id = %s
        """, (datetime.now().isoformat(), booking_id))

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        log_error(f"Error cancelling booking: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.post("/bookings/{booking_id}/update")
async def update_booking(
    booking_id: int,
    data: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or user.get("id")

        # Verify booking belongs to user
        c.execute("""
            SELECT id FROM bookings
            WHERE id = %s AND client_id = %s
        """, (booking_id, client_id))

        if not c.fetchone():
            conn.close()
            return {"success": False, "error": "Booking not found"}

        # Update booking
        updates = []
        params = []

        if "date" in data:
            updates.append("date = %s")
            params.append(data["date"])
        if "time" in data:
            updates.append("time = %s")
            params.append(data["time"])
        if "service_id" in data:
            updates.append("service_id = %s")
            params.append(data["service_id"])
        if "employee_id" in data:
            updates.append("employee_id = %s")
            params.append(data["employee_id"])

        if updates:
            updates.append("updated_at = %s")
            params.append(datetime.now().isoformat())
            params.append(booking_id)

            query = f"UPDATE bookings SET {', '.join(updates)} WHERE id = %s"
            c.execute(query, params)
            conn.commit()

        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating booking: {e}", "client_auth")
        return {"success": False, "error": str(e)}
