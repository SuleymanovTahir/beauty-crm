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
    # Use user ID as string for instagram_id if not present in user object
    user_email = user.get("email")
    user_phone = user.get("phone")
    client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id"))

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Try to find client by social ID first, then by email
        if client_id:
            c.execute("""
                SELECT loyalty_points, referral_code, total_saved, name, phone, email FROM clients
                WHERE instagram_id = %s OR telegram_id = %s
                LIMIT 1
            """, (client_id, client_id))
        elif user_email:
            c.execute("""
                SELECT loyalty_points, referral_code, total_saved, name, phone, email FROM clients
                WHERE email = %s
                LIMIT 1
            """, (user_email,))
        else:
            c.execute("""
                SELECT loyalty_points, referral_code, total_saved, name, phone, email FROM clients
                WHERE phone = %s
                LIMIT 1
            """, (user_phone,))

        client_row = c.fetchone()

        # If no client record exists, set client_id for other queries
        if not client_row:
            client_id = user_email or user_phone or str(user.get("id"))
        elif not client_id:
            # Found client by email/phone, so use that for subsequent queries
            client_id = user_email or user_phone

        points = client_row[0] if client_row else 0
        loyalty = {
            "points": points,
            "referral_code": client_row[1] if client_row else "",
            "total_saved": client_row[2] if client_row else 0
        }

        client_info = {
            "name": (client_row[3] if client_row and client_row[3] else user.get("full_name", "")),
            "phone": (client_row[4] if client_row and client_row[4] else user_phone or ""),
            "email": (client_row[5] if client_row and client_row[5] else user_email or "")
        }

        current_time = datetime.now().isoformat()

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, COALESCE(u.photo, u.photo_url)
            FROM bookings b
            LEFT JOIN users u ON LOWER(b.master) = LOWER(u.full_name)
            WHERE b.instagram_id = %s
            AND b.status IN ('pending', 'confirmed')
            AND b.datetime >= %s
            ORDER BY b.datetime ASC LIMIT 1
        """, (client_id, current_time))
        row = c.fetchone()

        if row:
            photo = row[4]
            if photo and photo.startswith('/static'):
                photo = f"http://localhost:8000{photo}"
            next_booking = {"id": row[0], "service": row[1], "date": row[2], "master": row[3], "master_photo": photo}
        else:
            next_booking = None

        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, b.master_id, COALESCE(u.photo, u.photo_url)
            FROM bookings b
            LEFT JOIN users u ON LOWER(b.master) = LOWER(u.full_name)
            WHERE b.instagram_id = %s
            AND b.status = 'completed'
            ORDER BY b.datetime DESC LIMIT 1
        """, (client_id,))
        row = c.fetchone()
        if row:
            photo = row[5]
            if photo and photo.startswith('/static'):
                photo = f"http://localhost:8000{photo}"
            last_visit = {
                "id": row[0],
                "booking_id": row[0],
                "service": row[1],
                "service_id": None,
                "date": row[2],
                "master": row[3],
                "master_id": row[4],
                "master_photo": photo
            }
        else:
            last_visit = None

        # Count total visits
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
        """, (client_id,))
        total_visits = c.fetchone()[0] or 0

        # Count visits this month
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE instagram_id = %s
            AND status = 'completed'
            AND datetime >= %s
        """, (client_id, datetime.now().replace(day=1).isoformat()))
        visits_this_month = c.fetchone()[0] or 0

        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = %s AND unlocked_at IS NOT NULL", (client_id,))
        unlocked = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = 'template'")
        total_ach = c.fetchone()[0]

        return {
            "success": True,
            "client": client_info,
            "loyalty": loyalty,
            "next_booking": next_booking,
            "last_visit": last_visit,
            "achievements_summary": {"unlocked": unlocked, "total": total_ach or 4},
            "visit_stats": {
                "total_visits": total_visits,
                "visits_this_month": visits_this_month
            }
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

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id", ""))

        # Get existing achievements for this client
        c.execute("""
            SELECT achievement_type, title_ru, icon, points_awarded, unlocked_at, progress, max_progress, description_ru
            FROM client_achievements
            WHERE client_id = %s
        """, (client_id,))

        existing_achievements = {}
        achievement_id = 1
        for row in c.fetchall():
            existing_achievements[row[0]] = {
                "id": achievement_id,
                "type": row[0],
                "title": row[1],
                "icon": row[2],
                "points": row[3],
                "unlocked": row[4] is not None,
                "unlockedDate": row[4].isoformat() if row[4] else None,
                "progress": row[5],
                "maxProgress": row[6],
                "description": row[7] or ""
            }
            achievement_id += 1

        # Get client statistics for default achievements
        c.execute("""
            SELECT COUNT(*) as total_visits
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
        """, (client_id,))
        total_visits = c.fetchone()[0] or 0

        c.execute("""
            SELECT COUNT(DISTINCT service_name) as unique_services
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
        """, (client_id,))
        unique_services = c.fetchone()[0] or 0

        # Default achievement templates
        default_achievements = [
            {
                "type": "first_visit",
                "title": "Первый визит",
                "icon": "🎉",
                "points": 10,
                "progress": min(total_visits, 1),
                "maxProgress": 1,
                "description": "Совершите свой первый визит в салон"
            },
            {
                "type": "regular_client",
                "title": "Постоянный клиент",
                "icon": "⭐",
                "points": 50,
                "progress": min(total_visits, 5),
                "maxProgress": 5,
                "description": "Посетите салон 5 раз"
            },
            {
                "type": "loyal_customer",
                "title": "Верный поклонник",
                "icon": "💎",
                "points": 100,
                "progress": min(total_visits, 10),
                "maxProgress": 10,
                "description": "Совершите 10 визитов"
            },
            {
                "type": "service_explorer",
                "title": "Исследователь услуг",
                "icon": "🔍",
                "points": 75,
                "progress": min(unique_services, 3),
                "maxProgress": 3,
                "description": "Попробуйте 3 разные услуги"
            }
        ]

        # Merge existing achievements with defaults
        achievements = []
        achievement_id = 1
        for default in default_achievements:
            if default["type"] in existing_achievements:
                achievements.append(existing_achievements[default["type"]])
            else:
                is_unlocked = default["progress"] >= default["maxProgress"]
                achievements.append({
                    "id": achievement_id,
                    "type": default["type"],
                    "title": default["title"],
                    "icon": default["icon"],
                    "points": default["points"],
                    "unlocked": is_unlocked,
                    "unlockedDate": None,
                    "progress": default["progress"],
                    "maxProgress": default["maxProgress"],
                    "description": default["description"]
                })
            achievement_id += 1

        # Get active challenges with localized fields
        c.execute("""
            SELECT id, title_ru, title_en, description_ru, description_en, bonus_points, start_date, end_date, target_value
            FROM active_challenges
            WHERE is_active = true
        """)

        challenges = []
        for row in c.fetchall():
            challenge_id, title_ru, title_en, desc_ru, desc_en, bonus_points, start_date, end_date, target_value = row

            # Get user's progress for this challenge
            c.execute("""
                SELECT progress FROM challenge_progress
                WHERE challenge_id = %s AND user_id = %s
            """, (challenge_id, client_id))
            progress_row = c.fetchone()
            progress = progress_row[0] if progress_row else 0

            challenges.append({
                "id": challenge_id,
                "title_ru": title_ru,
                "title_en": title_en or title_ru,
                "description_ru": desc_ru,
                "description_en": desc_en or desc_ru,
                "reward": bonus_points,
                "progress": progress,
                "maxProgress": target_value,
                "deadline": end_date.isoformat() if end_date else None
            })

        conn.close()
        return {"success": True, "achievements": achievements, "challenges": challenges}
    except Exception as e:
        log_error(f"Error loading achievements: {e}", "client_auth")
        return {"success": True, "achievements": [], "challenges": []}

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
        client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id", ""))

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

        client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id", ""))

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
    # Use user ID as string for instagram_id if not present in user object
    client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id"))

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT b.id, b.service_name, b.datetime, b.status, b.revenue, b.master,
               COALESCE(u.photo, u.photo_url) as master_photo,
               u.id as master_id
        FROM bookings b
        LEFT JOIN users u ON LOWER(b.master) = LOWER(u.full_name)
        WHERE b.instagram_id = %s
        ORDER BY b.datetime DESC
    """, (client_id,))
    items = []
    for r in c.fetchall():
        photo = r[6]
        if photo and photo.startswith('/static'):
            photo = f"http://localhost:8000{photo}"
        items.append({
            "id": r[0],
            "service_name": r[1],
            "date": r[2],
            "status": r[3],
            "price": r[4],
            "master_name": r[5],
            "master_photo": photo,
            "master_id": r[7]
        })
    conn.close()
    return {"success": True, "bookings": items}

@router.get("/loyalty")
async def get_loyalty(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        from services.loyalty import LoyaltyService
        loyalty_service = LoyaltyService()

        # Get client identifier - try multiple sources
        user_email = user.get("email")
        user_phone = user.get("phone")
        client_id = user.get("instagram_id") or user.get("telegram_id")

        # If no social ID, use email or user ID
        if not client_id:
            client_id = user_email or str(user.get("id"))

        if not client_id:
            return {"success": False, "error": "Client ID not found"}

        loyalty_data = loyalty_service.get_client_loyalty(client_id)

        if not loyalty_data:
            return {"success": False, "error": "Failed to get loyalty data"}

        # Get referral code from clients table
        conn = get_db_connection()
        c = conn.cursor()

        # Try different search methods
        social_id = user.get("instagram_id") or user.get("telegram_id")
        if social_id:
            c.execute("SELECT referral_code FROM clients WHERE instagram_id = %s OR telegram_id = %s", (social_id, social_id))
        elif user_email:
            c.execute("SELECT referral_code FROM clients WHERE email = %s", (user_email,))
        else:
            c.execute("SELECT referral_code FROM clients WHERE phone = %s", (user_phone,))

        referral_row = c.fetchone()
        conn.close()

        referral_code = referral_row[0] if referral_row else f"REF{str(user.get('id', ''))[:6].upper()}"

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

        # Get user details from session
        user_id = user.get("id")
        user_email = user.get("email")
        user_phone = user.get("phone")

        # Try multiple ways to find client:
        # 1. By instagram_id or telegram_id (for social login)
        # 2. By email (for regular email/password login)
        # 3. By phone (additional fallback)
        client_id = user.get("instagram_id") or user.get("telegram_id")

        # Get client data from clients table
        if client_id:
            # Social login user - search by social IDs
            c.execute("""
                SELECT name, phone, email, avatar, birthday, created_at
                FROM clients
                WHERE instagram_id = %s OR telegram_id = %s
                LIMIT 1
            """, (client_id, client_id))
        elif user_email:
            # Email/password login - search by email
            c.execute("""
                SELECT name, phone, email, avatar, birthday, created_at
                FROM clients
                WHERE email = %s
                LIMIT 1
            """, (user_email,))
        else:
            # Fallback - search by phone
            c.execute("""
                SELECT name, phone, email, avatar, birthday, created_at
                FROM clients
                WHERE phone = %s
                LIMIT 1
            """, (user_phone,))

        client_row = c.fetchone()

        # If no client found in clients table, use user data from users table
        if not client_row:
            # Create a pseudo client_row from user data
            client_row = (
                user.get("full_name"),  # name
                user_phone,             # phone
                user_email,             # email
                None,                   # avatar
                None,                   # birthday
                None                    # created_at
            )
            # Set client_id to user_id for loyalty lookup
            client_id = str(user_id)

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

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id", ""))

        # Get all service providers (masters) with their favorite status and ratings
        c.execute("""
            SELECT
                u.id,
                u.full_name,
                u.position,
                u.photo_url,
                u.specialization,
                CASE WHEN cfm.master_id IS NOT NULL THEN true ELSE false END as is_favorite,
                COALESCE(AVG(r.rating), 0) as rating,
                COUNT(DISTINCT r.id) as reviews_count
            FROM users u
            LEFT JOIN client_favorite_masters cfm ON cfm.master_id = u.id AND cfm.client_id = %s
            LEFT JOIN ratings r ON r.master_id = u.id
            WHERE u.is_service_provider = true AND u.is_active = true
            GROUP BY u.id, u.full_name, u.position, u.photo_url, u.specialization, cfm.master_id
            ORDER BY is_favorite DESC, u.full_name
        """, (client_id,))

        masters = []
        for row in c.fetchall():
            masters.append({
                "id": row[0],
                "name": row[1],
                "specialty": row[2] or "Специалист",
                "avatar": row[3] or "/default-avatar.png",
                "specialization": row[4],
                "is_favorite": row[5],
                "rating": round(row[6], 1) if row[6] else 0,
                "reviews_count": row[7] or 0
            })

        conn.close()
        return {"success": True, "masters": masters}
    except Exception as e:
        log_error(f"Error loading masters: {e}", "client_auth")
        return {"success": True, "masters": []}

@router.post("/favorite-masters")
async def toggle_favorite_master(
    data: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = user.get("instagram_id") or user.get("telegram_id") or str(user.get("id", ""))
        master_id = data.get("master_id")

        if not master_id:
            return {"success": False, "error": "Master ID is required"}

        # Check if already favorite
        c.execute("""
            SELECT id FROM client_favorite_masters
            WHERE client_id = %s AND master_id = %s
        """, (client_id, master_id))

        existing = c.fetchone()

        if existing:
            # Remove from favorites
            c.execute("""
                DELETE FROM client_favorite_masters
                WHERE client_id = %s AND master_id = %s
            """, (client_id, master_id))
            is_favorite = False
        else:
            # Add to favorites
            c.execute("""
                INSERT INTO client_favorite_masters (client_id, master_id)
                VALUES (%s, %s)
            """, (client_id, master_id))
            is_favorite = True

        conn.commit()
        conn.close()

        return {"success": True, "is_favorite": is_favorite}
    except Exception as e:
        log_error(f"Error toggling favorite master: {e}", "client_auth")
        return {"success": False, "error": str(e)}

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
