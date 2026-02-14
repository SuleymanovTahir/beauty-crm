"""
API для клиентской авторизации и личного кабинета
"""
from fastapi import APIRouter, HTTPException, Depends, Cookie
from pydantic import BaseModel

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Set
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from utils.currency import get_salon_currency
from utils.language_utils import get_localized_name, validate_language
from services.features import FeatureService
from core.config import BASE_URL

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

def _get_client_id(user: dict, cursor) -> str:
    """Универсальный помощник для получения instagram_id клиента"""
    log_info(f"🔍 Determining client_id for user: {user.get('id')} ({user.get('username')})", "client_auth")
    # 1. Сначала пробуем социальные ID из сессии
    instagram_id = user.get("instagram_id")
    telegram_id = user.get("telegram_id")
    
    if instagram_id: return instagram_id
    if telegram_id: return telegram_id
    
    # 2. Если их нет, ищем в таблице clients по email или телефону
    user_email = user.get("email")
    user_phone = user.get("phone")
    
    if user_email:
        cursor.execute("SELECT instagram_id FROM clients WHERE email = %s LIMIT 1", (user_email,))
        row = cursor.fetchone()
        if row: return row[0]
        
    if user_phone:
        cursor.execute("SELECT instagram_id FROM clients WHERE phone = %s LIMIT 1", (user_phone,))
        row = cursor.fetchone()
        if row: return row[0]
        
    # 3. Наконец, пробуем по username
    username = user.get("username")
    if username:
        cursor.execute("SELECT instagram_id FROM clients WHERE instagram_id = %s LIMIT 1", (username,))
        row = cursor.fetchone()
        if row: return row[0]
        
    # 4. Проверяем, есть ли запись в client_loyalty_points по user_id
    user_id = str(user.get("id", ""))
    if user_id:
        cursor.execute("SELECT client_id FROM client_loyalty_points WHERE client_id = %s", (user_id,))
        if cursor.fetchone(): return user_id
        
    # 5. Крайний случай - возвращаем user_id как строку
    return user_id


def _get_table_columns(cursor, table_name: str) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row[0] for row in cursor.fetchall()}

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/dashboard")
async def get_client_dashboard(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_db_connection()
    c = conn.cursor()

    # Get client identifier using helper
    client_id = _get_client_id(user, c)
    
    user_id = user.get("id")
    user_phone = user.get("phone")
    user_email = user.get("email")

    try:
        # Get client row for stats
        c.execute("""
            SELECT loyalty_points, referral_code, total_saved, name, phone, email 
            FROM clients
            WHERE instagram_id = %s
            LIMIT 1
        """, (client_id,))
        
        client_row = c.fetchone()

        # Get loyalty points and info correctly
        from services.loyalty import LoyaltyService
        loyalty_service = LoyaltyService()
        loyalty_data = loyalty_service.get_client_loyalty(client_id)
        
        points = loyalty_data.get("available_points", 0) if loyalty_data else 0
        total_spent = 0
        total_saved = 0
        
        # Get actual totals if possible
        try:
            c.execute("SELECT total_spend, total_saved FROM clients WHERE instagram_id = %s", (client_id,))
            spent_row = c.fetchone()
            if spent_row:
                total_spent = spent_row[0] or 0
                total_saved = spent_row[1] or 0
        except: pass

        loyalty = {
            "points": points,
            "available_points": points,
            "total_points": loyalty_data.get("total_points", 0) if loyalty_data else points,
            "tier": (loyalty_data.get("loyalty_level", "bronze") if loyalty_data else "bronze").capitalize(),
            "referral_code": client_row[1] if client_row and client_row[1] else None,
            "total_saved": total_saved,
            "total_spent": total_spent
        }

        client_info = {
            "name": (client_row[3] if client_row and client_row[3] else user.get("full_name", "")),
            "phone": (client_row[4] if client_row and client_row[4] else user_phone or ""),
            "email": (client_row[5] if client_row and client_row[5] else user_email or "")
        }

        current_time = datetime.now().isoformat()

        # Search for upcoming booking using multiple identifiers
        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, COALESCE(u.photo, u.photo_url), u.full_name
            FROM bookings b
            LEFT JOIN users u ON (LOWER(b.master) = LOWER(u.full_name) OR LOWER(b.master) = LOWER(u.username))
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status IN ('pending', 'confirmed')
            AND b.datetime >= %s
            ORDER BY b.datetime ASC LIMIT 1
        """, (client_id, user_phone, user_id, current_time))
        row = c.fetchone()

        if row:
            photo = row[4]
            if photo and photo.startswith('/static'):
                photo = f"{photo}"
            next_booking = {"id": row[0], "service": row[1], "date": row[2], "master": row[5] or row[3], "master_photo": photo}
        else:
            next_booking = None

        # Search for recent visits
        c.execute("""
            SELECT b.id, b.service_name, b.datetime, b.master, b.master_id, 
                   COALESCE(u.photo, u.photo_url), u.full_name, s.id, b.revenue
            FROM bookings b
            LEFT JOIN users u ON (LOWER(b.master) = LOWER(u.full_name) OR LOWER(b.master) = LOWER(u.username))
            LEFT JOIN services s ON LOWER(b.service_name) = LOWER(s.name)
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status = 'completed'
            ORDER BY b.datetime DESC LIMIT 10
        """, (client_id, user_phone, user_id))
        
        rows = c.fetchall()
        recent_visits = []
        seen = set()
        
        for row in rows:
            key = (row[1], row[3]) # service_name, master
            if key not in seen and len(recent_visits) < 5:
                photo = row[5]
                if photo and photo.startswith('/static'):
                    photo = f"{photo}"
                
                recent_visits.append({
                    "id": row[0],
                    "booking_id": row[0],
                    "service": row[1],
                    "service_id": row[7],
                    "date": row[2],
                    "master": row[6] or row[3],
                    "master_id": row[4],
                    "master_photo": photo,
                    "price": float(row[8]) if row[8] else 0
                })
                seen.add(key)
        
        last_visit = recent_visits[0] if recent_visits else None
        

        # Count total visits
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE (instagram_id = %s OR phone = %s OR user_id = %s) AND status = 'completed'
        """, (str(client_id), user_phone, user_id))
        total_visits = c.fetchone()[0] or 0

        # Count visits this month
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE (instagram_id = %s OR phone = %s OR user_id = %s)
            AND status = 'completed'
            AND datetime >= %s
        """, (str(client_id), user_phone, user_id, datetime.now().replace(day=1).isoformat()))
        visits_this_month = c.fetchone()[0] or 0

        # Total spent (sum of revenue from completed bookings)
        c.execute("""
            SELECT SUM(revenue) FROM bookings 
            WHERE (instagram_id = %s OR phone = %s OR user_id = %s)
            AND status = 'completed'
        """, (client_id, user_phone, user_id))
        total_spent = c.fetchone()[0] or 0

        # Total saved (sum of spent loyalty points/discounts)
        c.execute("""
            SELECT SUM(points) FROM loyalty_transactions 
            WHERE client_id = %s AND transaction_type = 'spent'
        """, (client_id,))
        total_saved_points = abs(c.fetchone()[0] or 0)

        # Fetch currency
        c.execute("SELECT currency FROM salon_settings LIMIT 1")
        currency_row = c.fetchone()
        currency = currency_row[0] if currency_row else get_salon_currency()

        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = %s AND unlocked_at IS NOT NULL", (client_id,))
        unlocked = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = 'template'")
        total_ach = c.fetchone()[0]

        return {
            "success": True,
            "client": client_info,
            "loyalty": {
                "points": points,
                "total_saved": total_saved_points,
                "total_spent": total_spent,
                "currency": currency
            },
            "next_booking": next_booking,
            "last_visit": last_visit,
            "recent_visits": recent_visits,
            "visit_stats": {
                "total_visits": total_visits,
                "visits_this_month": visits_this_month
            },
            "achievements_summary": {
                "unlocked": unlocked,
                "total": total_ach or 4
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

        client_id = _get_client_id(user, c)

        # Get existing achievements for this client
        c.execute("""
            SELECT achievement_type, title, icon, points_awarded, unlocked_at, progress, max_progress, description
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

        default_achievements = [
            {
                "type": "first_visit",
                "title": "Первый визит",
                "icon": "party-popper",
                "points": 10,
                "progress": min(total_visits, 1),
                "maxProgress": 1,
                "description": "Совершите свой первый визит в салон"
            },
            {
                "type": "regular_client",
                "title": "Постоянный клиент",
                "icon": "star",
                "points": 50,
                "progress": min(total_visits, 5),
                "maxProgress": 5,
                "description": "Посетите салон 5 раз"
            },
            {
                "type": "loyal_customer",
                "title": "Верный поклонник",
                "icon": "gem",
                "points": 100,
                "progress": min(total_visits, 10),
                "maxProgress": 10,
                "description": "Совершите 10 визитов"
            },
            {
                "type": "service_explorer",
                "title": "Исследователь услуг",
                "icon": "search",
                "points": 75,
                "progress": min(unique_services, 3),
                "maxProgress": 3,
                "description": "Попробуйте 3 разные услуги"
            }
        ]

        # Merge and auto-unlock
        achievements = []
        achievement_id = 1
        
        for default in default_achievements:
            if default["type"] in existing_achievements:
                achievements.append(existing_achievements[default["type"]])
                achievement_id += 1
            else:
                # Check if it should be auto-unlocked
                is_earned = default["progress"] >= default["maxProgress"]
                
                if is_earned:
                    try:
                        unlocked_at = datetime.now()
                        c.execute("""
                            INSERT INTO client_achievements
                            (client_id, achievement_type, title, icon, points_awarded, unlocked_at, progress, max_progress, description)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (client_id, default["type"], default["title"], default["icon"], default["points"],
                              unlocked_at, default["progress"], default["maxProgress"], default["description"]))
                        
                        # Award points
                        from services.loyalty import LoyaltyService
                        ls = LoyaltyService()
                        ls.earn_points(
                            client_id=client_id,
                            points=default["points"],
                            reason=f"Достижение: {default['title']}"
                        )
                        
                        conn.commit()
                        
                        achievements.append({
                            "id": achievement_id,
                            "type": default["type"],
                            "title": default["title"],
                            "icon": default["icon"],
                            "points": default["points"],
                            "unlocked": True,
                            "unlockedDate": unlocked_at.isoformat(),
                            "progress": default["progress"],
                            "maxProgress": default["maxProgress"],
                            "description": default["description"]
                        })
                    except Exception as ex:
                        log_error(f"Error auto-unlocking achievement {default['type']}: {ex}")
                        achievements.append({
                            "id": achievement_id,
                            **default,
                            "unlocked": False,
                            "unlockedDate": None
                        })
                else:
                    achievements.append({
                        "id": achievement_id,
                        **default,
                        "unlocked": False,
                        "unlockedDate": None
                    })
                achievement_id += 1

        challenge_columns = _get_table_columns(c, "active_challenges")
        progress_columns = _get_table_columns(c, "challenge_progress")

        challenge_reward_expr = "0"
        if "bonus_points" in challenge_columns:
            challenge_reward_expr = "COALESCE(bonus_points, 0)"
        elif "points_reward" in challenge_columns:
            challenge_reward_expr = "COALESCE(points_reward, 0)"

        challenge_target_expr = "COALESCE(target_value, 0)" if "target_value" in challenge_columns else "0"
        challenge_start_expr = "start_date" if "start_date" in challenge_columns else "created_at"
        challenge_end_expr = "end_date" if "end_date" in challenge_columns else "NULL"

        c.execute(f"""
            SELECT id, title, description,
                   {challenge_reward_expr} AS reward,
                   {challenge_start_expr} AS start_date,
                   {challenge_end_expr} AS end_date,
                   {challenge_target_expr} AS target_value
            FROM active_challenges
            WHERE is_active = true
        """)

        progress_value_column = None
        if "current_value" in progress_columns:
            progress_value_column = "current_value"
        elif "progress" in progress_columns:
            progress_value_column = "progress"

        progress_owner_column = None
        if "client_id" in progress_columns:
            progress_owner_column = "client_id"
        elif "user_id" in progress_columns:
            progress_owner_column = "user_id"

        challenges = []
        for row in c.fetchall():
            challenge_id, title, description, bonus_points, start_date, end_date, target_value = row

            progress = 0
            if progress_value_column and progress_owner_column:
                progress_lookup_id = client_id if progress_owner_column == "client_id" else user.get("id")
                if progress_lookup_id is not None:
                    c.execute(f"""
                        SELECT COALESCE({progress_value_column}, 0)
                        FROM challenge_progress
                        WHERE challenge_id = %s AND {progress_owner_column} = %s
                    """, (challenge_id, progress_lookup_id))
                    progress_row = c.fetchone()
                    if progress_row:
                        progress = progress_row[0]

            challenges.append({
                "id": challenge_id,
                "title": title,
                "description": description,
                "reward": bonus_points or 0,
                "progress": progress,
                "maxProgress": target_value or 0,
                "deadline": end_date.isoformat() if end_date else None
            })

        conn.close()
        return {"success": True, "achievements": achievements, "challenges": challenges}
    except Exception as e:
        log_error(f"Error loading achievements: {e}", "client_auth")
        return {"success": True, "achievements": [], "challenges": []}

@router.get("/features")
async def get_client_features(session_token: Optional[str] = Cookie(None)):
    """Получить доступные фичи для клиента"""
    user = require_auth(session_token)
    # If not authenticated, we can still return general availability (without whitelist)
    # But usually this is called by logged in client app
    
    user_id = user.get("id") if user else None
    
    # We need instagram_id for whitelist? Or user_id? 
    # FeatureService checks user_id. 
    # Note: clients table instagram_id is string, users table id is int. 
    # Feature whitelist stores IDs. 
    # Ideally should support both or map them.
    # FeatureService.is_feature_enabled checks string conversion.
    
    # Let's try to get client_id if possible
    # We can pass user_id (int) from users table. 
    # Or we can pass client_id (str) from clients table.
    # Let's pass user_id for now as it is more unique/stable for 'users'. 
    # But wait, 'clients' are separate?
    # If the user is a client, they are in `users` table with role='client'? 
    # Or just `clients` table?
    # Current code suggests `clients` table acts as profile for `users` table entry (sometimes linked).
    # Let's pass user_id.
    
    service = FeatureService()
    
    # Check all known features
    keys = ["loyalty_program", "referral_program", "challenges"]
    features = {}
    for k in keys:
        features[k] = service.is_feature_enabled(k, user_id)
        
    return {"success": True, "features": features}

@router.get("/beauty-metrics")
async def get_client_beauty_metrics(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        client_id = _get_client_id(user, c)
        
        # Simple logic: higher score for more visits in category
        user_phone = user.get("phone")
        user_id = user.get("id")
        
        c.execute("""
            SELECT s.category, COUNT(*) 
            FROM bookings b
            JOIN services s ON LOWER(b.service_name) = LOWER(s.name)
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status = 'completed'
            GROUP BY s.category
        """, (client_id, user_phone, user_id))
        counts = {r[0]: r[1] for r in c.fetchall()}

        # Get counts for PREVIOUS 30 days to calculate REAL dynamics
        c.execute("""
            SELECT s.category, COUNT(*)
            FROM bookings b
            JOIN services s ON LOWER(b.service_name) = LOWER(s.name)
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status = 'completed'
            AND b.datetime::timestamp < (CURRENT_DATE - INTERVAL '30 days')
            AND b.datetime::timestamp > (CURRENT_DATE - INTERVAL '60 days')
            GROUP BY s.category
        """, (client_id, user_phone, user_id))
        prev_counts = {r[0]: r[1] for r in c.fetchall()}
        
        # Common categories with scores
        all_cats = [
            ("Nails", "#4ECDC4"),
            ("Facial", "#A061FF"),
            ("Hair", "#FF6B9D"),
            ("Brows", "#FFD93D"),
            ("Lashes", "#FF9F43")
        ]
        
        metrics = []
        for cat_name, color in all_cats:
            count = counts.get(cat_name, 0)
            prev_count = prev_counts.get(cat_name, 0)
            
            # Change logic
            change = count - prev_count
            
            # Base score 45, +15 per visit, max 95
            score = 45 + min(count * 15, 50)
            metrics.append({
                "category": cat_name,
                "score": score,
                "color": color,
                "change": change
            })
            
        # Get recommended procedures based on last visits and service-specific intervals from DB
        c.execute("""
            SELECT 
                b.service_name,
                MAX(b.datetime::timestamp) as last_visit,
                s.duration_minutes,
                COALESCE(s.recommended_interval_days, 30) as interval_days
            FROM bookings b
            JOIN services s ON LOWER(b.service_name) = LOWER(s.name)
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status = 'completed'
            GROUP BY b.service_name, s.duration_minutes, s.recommended_interval_days
            ORDER BY last_visit DESC
            LIMIT 10
        """, (client_id, user_phone, user_id))
        
        recommended = []
        from datetime import datetime, timedelta
        now = datetime.now()
        
        for row in c.fetchall():
            service_name = row[0]
            last_visit = row[1]
            interval_days = row[3]  # From database
            
            # Calculate days since last visit
            days_since = (now - last_visit).days
            days_left = interval_days - days_since
            
            # Recommend if overdue or due soon (within 7 days)
            is_recommended = days_left <= 7
            
            recommended.append({
                "service": service_name,
                "days_left": max(0, days_left),
                "recommended": is_recommended,
                "interval_days": interval_days
            })
        
        # Sort: recommended first, then by days_left
        recommended.sort(key=lambda x: (not x['recommended'], x['days_left']))
        
        return {"success": True, "metrics": metrics, "recommended_procedures": recommended[:5]}
    except Exception as e:
        log_error(f"Error in beauty metrics: {e}")
        return {"success": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/my-notifications")
async def get_client_notifications(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = _get_client_id(user, c)

        c.execute("""
            SELECT id, title, content, created_at, is_read, action_url, trigger_type
            FROM unified_communication_log
            WHERE client_id = %s AND medium = 'in_app'
            ORDER BY created_at DESC
            LIMIT 50
        """, (client_id,))

        notifications = []
        for row in c.fetchall():
            msg = row[2].lower() if row[2] else ""
            notif_type = row[6] or "notification"
            
            # Legacy fallback for icons
            if notif_type == "notification":
                if any(x in msg for x in ["запись", "booking", "визит", "visit"]):
                    notif_type = "appointment"
                elif any(x in msg for x in ["акция", "промо", "promotion", "скидка", "discount", "sale"]):
                    notif_type = "promotion"
                elif any(x in msg for x in ["достижение", "achievement", "награда", "bonus", "reward"]):
                    notif_type = "achievement"

            notifications.append({
                "id": row[0],
                "title": row[1],
                "message": row[2],
                "created_at": row[3],
                "is_read": row[4],
                "type": notif_type,
                "action_url": row[5]
            })

        return {"success": True, "notifications": notifications}
    except Exception as e:
        log_error(f"Error loading notifications: {e}", "client_auth")
        return {"success": True, "notifications": []}
    finally:
        if 'conn' in locals(): conn.close()


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()
        client_id = _get_client_id(user, c)
        c.execute("""
            UPDATE unified_communication_log
            SET is_read = TRUE
            WHERE id = %s AND client_id = %s AND medium = 'in_app'
        """, (notification_id, client_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        log_error(f"Error marking notification as read: {e}", "client_auth")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()
        client_id = _get_client_id(user, c)

        c.execute("""
            UPDATE unified_communication_log
            SET is_read = TRUE
            WHERE client_id = %s AND is_read = FALSE AND medium = 'in_app'
        """, (client_id,))

        conn.commit()
        return {"success": True}
    except Exception as e:
        log_error(f"Error marking all notifications as read: {e}", "client_auth")
        return {"success": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/my-bookings")
async def get_client_bookings(
    session_token: Optional[str] = Cookie(None),
    language: str = "ru"
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get client identification
        client_id = _get_client_id(user, c)
        user_phone = user.get("phone")
        user_id = user.get("id")
        language_code = validate_language(str(language).split("-")[0])

        c.execute("""
            SELECT b.id, b.service_id, b.service_name, b.datetime, b.status, 
                   CASE WHEN b.revenue > 0 THEN b.revenue ELSE s.price END as final_price, 
                   b.master,
                   COALESCE(u.photo, u.photo_url) as master_photo,
                   COALESCE(b.master_user_id, u.id) as master_id,
                   u.full_name,
                   s.duration
            FROM bookings b
            LEFT JOIN users u ON (
                (b.master_user_id IS NOT NULL AND b.master_user_id = u.id)
                OR (
                    b.master_user_id IS NULL
                    AND (LOWER(b.master) = LOWER(u.full_name) OR LOWER(b.master) = LOWER(u.username))
                )
            )
            LEFT JOIN services s ON (
                (b.service_id IS NOT NULL AND b.service_id = s.id)
                OR LOWER(b.service_name) = LOWER(s.name)
            )
            WHERE (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            ORDER BY b.datetime DESC
        """, (client_id, user_phone, user_id))
        
        items = []
        for r in c.fetchall():
            photo = r[7]
            if photo and photo.startswith('/static'):
                photo = f"{photo}"
            master_name_source = r[9] if r[9] else r[6]
            localized_master_name = get_localized_name(r[8], master_name_source, language_code) if master_name_source else ""
            booking_datetime = r[3]
            booking_time = ""
            if booking_datetime is not None:
                try:
                    booking_time = booking_datetime.strftime("%H:%M")
                except Exception:
                    booking_time = str(booking_datetime)[11:16]
            items.append({
                "id": r[0],
                "service_id": r[1],
                "service_name": r[2],
                "date": r[3],
                "time": booking_time,
                "status": r[4],
                "price": float(r[5]) if r[5] else 0,
                "master_name": localized_master_name,
                "master_photo": photo,
                "master_id": r[8],
                "duration_minutes": r[10],
            })

        # Fetch currency
        c.execute("SELECT currency FROM salon_settings LIMIT 1")
        currency_row = c.fetchone()
        currency = currency_row[0] if currency_row else get_salon_currency()

        return {"success": True, "bookings": items, "currency": currency}
    except Exception as e:
        log_error(f"Error loading bookings: {e}", "client_auth")
        return {"success": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/loyalty")
async def get_loyalty(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        client_id = _get_client_id(user, c)

        from services.loyalty import LoyaltyService
        loyalty_service = LoyaltyService()

        loyalty_data = loyalty_service.get_client_loyalty(client_id)

        if not loyalty_data:
            return {"success": False, "error": "Failed to get loyalty data"}
        
        # Enrich with configuration and tiers
        all_levels = loyalty_service.get_all_levels()
        
        # Get referral code from clients table
        c.execute("SELECT referral_code FROM clients WHERE instagram_id = %s", (client_id,))
        referral_row = c.fetchone()
        referral_code = referral_row[0] if referral_row and referral_row[0] else None

        # Calculate actual totals
        user_phone = user.get("phone")
        user_id = user.get("id")
        
        # 1. Total spent
        c.execute("""
            SELECT SUM(revenue) FROM bookings 
            WHERE (instagram_id = %s OR phone = %s OR user_id = %s)
            AND status = 'completed'
        """, (client_id, user_phone, user_id))
        total_spent = c.fetchone()[0] or 0
        
        # 2. Total saved
        c.execute("""
            SELECT SUM(points) FROM loyalty_transactions 
            WHERE client_id = %s AND transaction_type = 'spent'
        """, (client_id,))
        total_saved_points = abs(c.fetchone()[0] or 0)

        # 3. Format tiers for frontend
        all_tiers = []
        for level in all_levels:
            all_tiers.append({
                "name": level["level_name"].capitalize(),
                "points": level["min_points"],
                "discount": level["discount_percent"],
                "color": level.get("color", "#CD7F32"),
                "benefits": level.get("benefits", "")
            })

        # 4. Fetch currency
        c.execute("SELECT currency FROM salon_settings LIMIT 1")
        currency_row = c.fetchone()
        currency = currency_row[0] if currency_row else get_salon_currency()

        return {
            "success": True,
            "loyalty": {
                "points": loyalty_data.get("available_points", 0),
                "total_points": loyalty_data.get("total_points", 0),
                "tier": loyalty_data.get("loyalty_level", "bronze").capitalize(),
                "discount": get_discount_for_tier(loyalty_data.get("loyalty_level", "bronze")),
                "referral_code": referral_code,
                "total_spent": total_spent,
                "total_saved": total_saved_points,
                "all_tiers": all_tiers,
                "currency": currency
            }
        }
    except Exception as e:
        log_error(f"Error in get_loyalty: {e}", "client_auth")
        return {"success": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/profile")
async def get_client_profile(session_token: Optional[str] = Cookie(None)):
    """Get full client profile information"""
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        client_id = _get_client_id(user, c)

        # Get client data from clients table
        c.execute("""
            SELECT name, phone, email, avatar, birthday, created_at, preferences
            FROM clients
            WHERE instagram_id = %s
            LIMIT 1
        """, (client_id,))

        client_row = c.fetchone()

        # Extract values with safe fallbacks
        if client_row:
            res_name = client_row[0] or user.get("full_name", "")
            res_phone = client_row[1] or user.get("phone", "")
            res_email = client_row[2] or user.get("email", "")
            res_avatar = client_row[3]
            res_birthday = client_row[4]
            res_created_at = client_row[5]
            prefs_json = client_row[6]
        else:
            res_name = user.get("full_name", "")
            res_phone = user.get("phone", "")
            res_email = user.get("email", "")
            res_avatar = None
            res_birthday = None
            res_created_at = None
            prefs_json = None
            
        import json
        prefs = json.loads(prefs_json) if prefs_json else {}

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

        profile_data = {
            "name": res_name,
            "phone": res_phone,
            "email": res_email,
            "avatar": res_avatar,
            "birthday": res_birthday,
            "created_at": res_created_at,
            "preferences": prefs,
            "tier": tier,
            "total_points": total_points,
            "available_points": available_points
        }
        
        log_info(f"✅ Returning profile for {user.get('username')}: name='{res_name}', phone='{res_phone}'", "client_auth")

        return {
            "success": True,
            "profile": profile_data
        }
    except Exception as e:
        log_error(f"Error loading client profile: {e}", "client_auth")
        return {"success": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()

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
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        client_id = _get_client_id(user, c)
        
        c.execute("""
            SELECT cg.id, cg.before_photo, cg.after_photo, cg.created_at, 
                   s.name as service_name, u.full_name as master_name, cg.notes, cg.category
            FROM client_gallery cg
            LEFT JOIN services s ON cg.service_id = s.id
            LEFT JOIN users u ON cg.master_id = u.id
            WHERE cg.client_id = %s
            ORDER BY cg.created_at DESC
        """, (client_id,))
        
        items = []
        for row in c.fetchall():
            before_url = row[1]
            after_url = row[2]
            
            # Ensure absolute URLs for local paths
            if before_url and before_url.startswith('/static'):
                before_url = f"{BASE_URL}{before_url}"
            if after_url and after_url.startswith('/static'):
                after_url = f"{BASE_URL}{after_url}"
                
            items.append({
                "id": row[0],
                "before_photo": before_url,
                "after_photo": after_url,
                "date": row[3].isoformat() if row[3] else None,
                "service": row[4],
                "master_name": row[5],
                "notes": row[6],
                "category": row[7] or 'other'
            })
            
        return {"success": True, "gallery": items}
    except Exception as e:
        log_error(f"Error getting gallery: {e}", "client_auth")
        return {"success": True, "gallery": []}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/favorite-masters")
async def get_fav_masters(
    session_token: Optional[str] = Cookie(None),
    language: str = 'ru'
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Try to find canonical client_id for favorites lookup
        client_id = _get_client_id(user, c)

        # Sanitize language
        valid_languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
        if language not in valid_languages:
            language = 'ru'

        # Build localized field names
        position_field = f'position_{language}'
        name_field = f'full_name_{language}'
        spec_field = f'specialization_{language}'

        # Get only masters where the client had completed bookings
        c.execute(f"""
            SELECT
                u.id,
                COALESCE(u.{name_field}, u.full_name) as name,
                COALESCE(u.{position_field}, u.position) as position,
                COALESCE(u.photo, u.photo_url),
                COALESCE(u.{spec_field}, u.specialization) as specialization,
                CASE WHEN cfm.master_id IS NOT NULL THEN true ELSE false END as is_favorite,
                COALESCE(AVG(r.rating), 0) as rating,
                COUNT(DISTINCT r.id) as reviews_count,
                COUNT(DISTINCT b.id) as total_bookings
            FROM users u
            INNER JOIN bookings b ON b.master_id = u.id
            LEFT JOIN client_favorite_masters cfm ON cfm.master_id = u.id AND cfm.client_id = %s
            LEFT JOIN ratings r ON r.booking_id = b.id
            WHERE u.is_service_provider = true 
            AND u.is_active = true
            AND (b.instagram_id = %s OR b.phone = %s OR b.user_id = %s)
            AND b.status = 'completed'
            GROUP BY u.id, u.{name_field}, u.full_name, u.{position_field}, u.position, u.photo, u.photo_url, u.{spec_field}, u.specialization, cfm.master_id
            ORDER BY total_bookings DESC, u.full_name
        """, (client_id, client_id, user.get("phone"), user.get("id")))

        masters = []
        default_specialty = "Специалист" if language == 'ru' else "Specialist"
        for row in c.fetchall():
            photo = row[3]
            if photo and photo.startswith('/static'):
                photo = f"{photo}"

            masters.append({
                "id": row[0],
                "name": row[1],
                "specialty": row[2] or default_specialty,
                "avatar": photo or "/default-avatar.png",
                "photo": photo or "/default-avatar.png",
                "specialization": row[4],
                "is_favorite": row[5],
                "rating": round(row[6], 1) if row[6] else 5.0,
                "reviews_count": row[7] or 0,
                "total_bookings": row[8] or 0
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

        client_id = _get_client_id(user, c)
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

        client_id = _get_client_id(user, c)
        user_id = user.get("id")

        # Update client profile in 'clients' table
        from db.clients import update_client_info as db_update_client
        
        client_data = {}
        if "name" in profile: client_data["name"] = profile["name"]
        if "phone" in profile: client_data["phone"] = profile["phone"]
        if "email" in profile: client_data["email"] = profile["email"]
        
        if client_data:
            db_update_client(client_id, **client_data)

        # Update user profile in 'users' table
        from db.users import update_user_info as db_update_user
        
        user_data = {}
        if "name" in profile: user_data["full_name"] = profile["name"]
        if "phone" in profile: user_data["phone"] = profile["phone"]
        if "email" in profile: user_data["email"] = profile["email"]
        
        if user_data and user_id:
            db_update_user(user_id, user_data)

        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating profile: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.post("/notifications/preferences")
async def update_notification_prefs(
    data: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        import json
        conn = get_db_connection()
        c = conn.cursor()
        client_id = _get_client_id(user, c)

        # We store these in a JSON string in the 'preferences' column of the clients table
        c.execute("SELECT preferences FROM clients WHERE instagram_id = %s", (client_id,))
        row = c.fetchone()
        prefs = json.loads(row[0]) if row and row[0] else {}
        
        # Update with new values
        if 'notification_prefs' not in prefs: prefs['notification_prefs'] = {}
        prefs['notification_prefs'].update(data)
        
        c.execute("UPDATE clients SET preferences = %s WHERE instagram_id = %s", (json.dumps(prefs), client_id))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating notification prefs: {e}", "client_auth")
        return {"success": False, "error": str(e)}

@router.post("/privacy/preferences")
async def update_privacy_prefs(
    data: dict,
    session_token: Optional[str] = Cookie(None)
):
    user = require_auth(session_token)
    if not user: raise HTTPException(status_code=401)

    try:
        import json
        conn = get_db_connection()
        c = conn.cursor()
        client_id = _get_client_id(user, c)

        c.execute("SELECT preferences FROM clients WHERE instagram_id = %s", (client_id,))
        row = c.fetchone()
        prefs = json.loads(row[0]) if row and row[0] else {}
        
        if 'privacy_prefs' not in prefs: prefs['privacy_prefs'] = {}
        prefs['privacy_prefs'].update(data)
        
        c.execute("UPDATE clients SET preferences = %s WHERE instagram_id = %s", (json.dumps(prefs), client_id))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating privacy prefs: {e}", "client_auth")
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

        client_id_val = _get_client_id(user, c)

        # Verify booking belongs to user
        # Verify booking belongs to user
        c.execute("""
            SELECT id FROM bookings
            WHERE id = %s AND (
                instagram_id = %s OR 
                user_id = %s OR 
                (phone = %s AND phone IS NOT NULL AND phone != '')
            )
        """, (booking_id, client_id_val, user.get("id"), user.get("phone")))

        if not c.fetchone():
            conn.close()
            log_error(f"❌ Cancel failed: Booking {booking_id} not found/owned by user {user.get('username')}", "client_auth")
            return {"success": False, "error": "Booking not found"}

        # Update booking status
        c.execute("""
            UPDATE bookings
            SET status = 'cancelled', updated_at = %s
            WHERE id = %s
        """, (datetime.now().isoformat(), booking_id))
        
        rows_affected = c.rowcount
        conn.commit()
        conn.close()

        log_info(f"✅ Cancelled booking {booking_id} for user {user.get('username')}. Rows affected: {rows_affected}", "client_auth")
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

        client_id = _get_client_id(user, c)
        c.execute(
            """
            SELECT id, instagram_id, service_id, service_name, datetime, master, name, phone, revenue, source
            FROM bookings
            WHERE id = %s AND (
                instagram_id = %s
                OR user_id = %s
                OR (phone = %s AND phone IS NOT NULL AND phone != '')
            )
            """,
            (booking_id, client_id, user.get("id"), user.get("phone"))
        )
        booking_row = c.fetchone()
        if booking_row is None:
            conn.close()
            return {"success": False, "error": "Booking not found"}

        (
            _,
            booking_client_id,
            old_service_id,
            old_service,
            old_datetime,
            old_master,
            old_name,
            old_phone,
            old_revenue,
            old_source,
        ) = booking_row

        c.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'bookings' AND column_name = 'master_user_id'
            LIMIT 1
            """
        )
        has_master_user_id = bool(c.fetchone())

        new_service = old_service
        new_service_id = old_service_id
        requested_service_name = data.get("service")
        requested_service_id = data.get("service_id")
        if isinstance(requested_service_name, str) and len(requested_service_name.strip()) > 0:
            new_service = requested_service_name.strip()
            c.execute("SELECT id FROM services WHERE LOWER(name) = LOWER(%s) LIMIT 1", (new_service,))
            matched_service_row = c.fetchone()
            if matched_service_row is not None:
                new_service_id = matched_service_row[0]
        elif requested_service_id is not None:
            try:
                normalized_service_id = int(requested_service_id)
            except Exception:
                normalized_service_id = None
            c.execute("SELECT name FROM services WHERE id = %s LIMIT 1", (normalized_service_id,))
            service_row = c.fetchone()
            if service_row is not None and service_row[0]:
                new_service_id = normalized_service_id
                new_service = service_row[0]

        new_datetime = old_datetime
        requested_date = data.get("date")
        requested_time = data.get("time")
        if requested_date is not None or requested_time is not None:
            old_date_str = old_datetime.strftime("%Y-%m-%d") if hasattr(old_datetime, "strftime") else str(old_datetime)[:10]
            old_time_str = old_datetime.strftime("%H:%M") if hasattr(old_datetime, "strftime") else str(old_datetime)[11:16]
            date_str = str(requested_date).strip() if requested_date is not None else old_date_str
            time_str = str(requested_time).strip() if requested_time is not None else old_time_str
            try:
                new_datetime = datetime.strptime(f"{date_str} {time_str[:5]}", "%Y-%m-%d %H:%M")
            except Exception:
                new_datetime = old_datetime

        new_master = old_master
        new_master_user_id = None
        if has_master_user_id:
            c.execute("SELECT master_user_id FROM bookings WHERE id = %s", (booking_id,))
            row = c.fetchone()
            new_master_user_id = row[0] if row is not None else None

        requested_master_id = data.get("master_id")
        requested_employee_id = data.get("employee_id")
        requested_master_name = data.get("master")
        resolved_master_id = requested_master_id if requested_master_id is not None else requested_employee_id

        if resolved_master_id is not None:
            c.execute(
                """
                SELECT id, full_name, username
                FROM users
                WHERE id = %s AND deleted_at IS NULL
                LIMIT 1
                """,
                (resolved_master_id,)
            )
            master_row = c.fetchone()
            if master_row is not None:
                new_master_user_id = master_row[0]
                new_master = master_row[1] if master_row[1] else master_row[2]
        elif isinstance(requested_master_name, str) and len(requested_master_name.strip()) > 0:
            normalized_master = requested_master_name.strip()
            new_master = normalized_master
            if has_master_user_id:
                c.execute(
                    """
                    SELECT id, full_name, username
                    FROM users
                    WHERE deleted_at IS NULL
                      AND (LOWER(full_name) = LOWER(%s) OR LOWER(username) = LOWER(%s))
                    ORDER BY id ASC
                    LIMIT 1
                    """,
                    (normalized_master, normalized_master)
                )
                master_row = c.fetchone()
                if master_row is not None:
                    new_master_user_id = master_row[0]
                    new_master = master_row[1] if master_row[1] else master_row[2]

        new_name = data.get("name", old_name)
        new_phone = data.get("phone", old_phone)
        new_revenue = data.get("revenue", old_revenue)
        new_source = data.get("source", old_source)
        updated_at_value = datetime.now().isoformat()

        if has_master_user_id:
            c.execute(
                """
                UPDATE bookings
                SET service_id = %s,
                    service_name = %s,
                    datetime = %s,
                    master = %s,
                    master_user_id = %s,
                    name = %s,
                    phone = %s,
                    revenue = %s,
                    source = %s,
                    updated_at = %s
                WHERE id = %s
                """,
                (
                    new_service_id,
                    new_service,
                    new_datetime,
                    new_master,
                    new_master_user_id,
                    new_name,
                    new_phone,
                    new_revenue,
                    new_source,
                    updated_at_value,
                    booking_id
                )
            )
        else:
            c.execute(
                """
                UPDATE bookings
                SET service_id = %s,
                    service_name = %s,
                    datetime = %s,
                    master = %s,
                    name = %s,
                    phone = %s,
                    revenue = %s,
                    source = %s,
                    updated_at = %s
                WHERE id = %s
                """,
                (
                    new_service_id,
                    new_service,
                    new_datetime,
                    new_master,
                    new_name,
                    new_phone,
                    new_revenue,
                    new_source,
                    updated_at_value,
                    booking_id
                )
            )

        if (new_name != old_name or new_phone != old_phone) and booking_client_id:
            c.execute(
                """
                UPDATE clients
                SET name = %s, phone = %s, updated_at = %s
                WHERE instagram_id = %s
                """,
                (new_name, new_phone, updated_at_value, booking_client_id)
            )

        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating booking: {e}", "client_auth")
        return {"success": False, "error": str(e)}

# Phone persistence fix completed
