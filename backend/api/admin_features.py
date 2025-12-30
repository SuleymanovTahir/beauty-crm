"""
API endpoints for admin panel features: Challenges, Referrals, Loyalty, Notifications, Gallery
"""
from fastapi import APIRouter, Request, Cookie, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error
from datetime import datetime
import os
import uuid

router = APIRouter(tags=["Admin Features"])

# ============================================================================
# CHALLENGES API
# ============================================================================

@router.get("/admin/challenges")
async def get_admin_challenges(session_token: Optional[str] = Cookie(None)):
    """Получить все челленджи для админки"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем все челленджи с информацией об участниках
        c.execute("""
            SELECT
                c.id,
                c.title_ru as title,
                c.description_ru as description,
                c.challenge_type as type,
                c.target_value,
                c.bonus_points as reward_points,
                c.start_date,
                c.end_date,
                c.is_active,
                COUNT(DISTINCT cp.client_id) as participants,
                COUNT(DISTINCT CASE WHEN cp.is_completed THEN cp.client_id END) as completions
            FROM active_challenges c
            LEFT JOIN challenge_progress cp ON c.id = cp.challenge_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """)

        challenges = []
        for row in c.fetchall():
            # Определяем статус
            status = 'upcoming'
            if row[8]:  # is_active
                now = datetime.now().date()
                start_date = row[6]
                end_date = row[7]
                if start_date and end_date:
                    if start_date <= now <= end_date:
                        status = 'active'
                    elif now < start_date:
                        status = 'upcoming'
                    else:
                        status = 'completed'
                else:
                    status = 'active'
            else:
                status = 'completed'

            challenges.append({
                "id": str(row[0]),
                "title": row[1] or "Challenge",
                "description": row[2] or "",
                "type": row[3] or "visits",
                "target_value": row[4] or 0,
                "reward_points": row[5] or 0,
                "start_date": row[6].isoformat() if row[6] else datetime.now().isoformat(),
                "end_date": row[7].isoformat() if row[7] else datetime.now().isoformat(),
                "status": status,
                "participants": row[9] or 0,
                "completions": row[10] or 0
            })

        conn.close()
        return {"success": True, "challenges": challenges}
    except Exception as e:
        log_error(f"Error getting admin challenges: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/challenges")
async def create_admin_challenge(request: Request, session_token: Optional[str] = Cookie(None)):
    """Создать новый челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO active_challenges (
                title_ru, title_en, description_ru, description_en,
                challenge_type, target_value, bonus_points,
                start_date, end_date, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("title", ""),
            data.get("title", ""),
            data.get("description", ""),
            data.get("description", ""),
            data.get("type", "visits"),
            data.get("target_value", 0),
            data.get("reward_points", 0),
            data.get("start_date"),
            data.get("end_date"),
            True
        ))

        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()

        return {"success": True, "id": new_id}
    except Exception as e:
        log_error(f"Error creating challenge: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/admin/challenges/{challenge_id}")
async def update_admin_challenge(challenge_id: int, request: Request, session_token: Optional[str] = Cookie(None)):
    """Обновить челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            UPDATE active_challenges SET
                title_ru = %s,
                title_en = %s,
                description_ru = %s,
                description_en = %s,
                challenge_type = %s,
                target_value = %s,
                bonus_points = %s,
                start_date = %s,
                end_date = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            data.get("title", ""),
            data.get("title", ""),
            data.get("description", ""),
            data.get("description", ""),
            data.get("type", "visits"),
            data.get("target_value", 0),
            data.get("reward_points", 0),
            data.get("start_date"),
            data.get("end_date"),
            challenge_id
        ))

        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating challenge: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/admin/challenges/{challenge_id}")
async def delete_admin_challenge(challenge_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Удаляем прогресс челленджа
        c.execute("DELETE FROM challenge_progress WHERE challenge_id = %s", (challenge_id,))
        # Удаляем сам челлендж
        c.execute("DELETE FROM active_challenges WHERE id = %s", (challenge_id,))

        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting challenge: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# REFERRAL PROGRAM API
# ============================================================================

@router.get("/admin/referrals")
async def get_admin_referrals(
    session_token: Optional[str] = Cookie(None),
    status: Optional[str] = None,
    sort_by: Optional[str] = "date",
    order: Optional[str] = "desc"
):
    """Получить все рефералы с фильтрацией и сортировкой"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Построение WHERE клаузы
        where_clause = ""
        params = []
        if status:
            where_clause = "WHERE r.status = %s"
            params.append(status)

        # Определение сортировки
        sort_column = {
            "date": "r.created_at",
            "points": "r.points_awarded",
            "status": "r.status"
        }.get(sort_by, "r.created_at")

        sort_order = "DESC" if order == "desc" else "ASC"

        query = f"""
            SELECT
                r.id,
                c1.name as referrer_name,
                c1.email as referrer_email,
                c2.name as referred_name,
                c2.email as referred_email,
                r.status,
                r.points_awarded,
                r.created_at
            FROM client_referrals r
            LEFT JOIN clients c1 ON r.referrer_id = c1.instagram_id
            LEFT JOIN clients c2 ON r.referred_id = c2.instagram_id
            {where_clause}
            ORDER BY {sort_column} {sort_order}
        """

        c.execute(query, params)

        referrals = []
        for row in c.fetchall():
            referrals.append({
                "id": str(row[0]),
                "referrer_name": row[1] or "Unknown",
                "referrer_email": row[2] or "",
                "referred_name": row[3] or "Unknown",
                "referred_email": row[4] or "",
                "status": row[5] or "pending",
                "points_awarded": row[6] or 0,
                "created_at": row[7].isoformat() if row[7] else datetime.now().isoformat()
            })

        conn.close()
        return {"success": True, "referrals": referrals}
    except Exception as e:
        log_error(f"Error getting referrals: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/referrals/settings")
async def get_referral_settings(session_token: Optional[str] = Cookie(None)):
    """Получить настройки реферальной программы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT setting_value FROM settings WHERE setting_key = 'referral_settings'
        """)

        result = c.fetchone()
        if result:
            import json
            settings = json.loads(result[0])
        else:
            settings = {
                "referrer_bonus": 500,
                "referred_bonus": 200,
                "min_purchase_amount": 0
            }

        conn.close()
        return {"success": True, "settings": settings}
    except Exception as e:
        log_error(f"Error getting referral settings: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/admin/referrals/settings")
async def update_referral_settings(request: Request, session_token: Optional[str] = Cookie(None)):
    """Обновить настройки реферальной программы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        import json
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO settings (setting_key, setting_value)
            VALUES ('referral_settings', %s)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        """, (json.dumps(data),))

        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating referral settings: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/referrals/stats")
async def get_referral_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику рефералов"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total referrals
        c.execute("SELECT COUNT(*) FROM referrals")
        total_referrals = c.fetchone()[0] or 0

        # Completed referrals
        c.execute("SELECT COUNT(*) FROM referrals WHERE status = 'completed'")
        completed_referrals = c.fetchone()[0] or 0

        # Points distributed
        c.execute("SELECT COALESCE(SUM(points_awarded), 0) FROM referrals WHERE status = 'completed'")
        points_distributed = c.fetchone()[0] or 0

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_referrals": total_referrals,
                "completed_referrals": completed_referrals,
                "points_distributed": points_distributed
            }
        }
    except Exception as e:
        log_error(f"Error getting referral stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# LOYALTY MANAGEMENT API
# ============================================================================

@router.get("/admin/loyalty/tiers")
async def get_loyalty_tiers(session_token: Optional[str] = Cookie(None)):
    """Получить уровни лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, name, min_points, discount, color
            FROM loyalty_tiers
            ORDER BY min_points ASC
        """)

        tiers = []
        for row in c.fetchall():
            tiers.append({
                "id": str(row[0]),
                "name": row[1],
                "min_points": row[2] or 0,
                "discount": row[3] or 0,
                "color": row[4] or "#CD7F32"
            })

        # Если тиров нет, создаем дефолтные
        if not tiers:
            default_tiers = [
                ('Bronze', 0, 0, '#CD7F32'),
                ('Silver', 1000, 5, '#C0C0C0'),
                ('Gold', 5000, 10, '#FFD700'),
                ('Platinum', 10000, 15, '#E5E4E2')
            ]

            for tier in default_tiers:
                c.execute("""
                    INSERT INTO loyalty_tiers (name, min_points, discount, color)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, name, min_points, discount, color
                """, tier)
                row = c.fetchone()
                tiers.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "min_points": row[2],
                    "discount": row[3],
                    "color": row[4]
                })

            conn.commit()

        conn.close()
        return {"success": True, "tiers": tiers}
    except Exception as e:
        log_error(f"Error getting loyalty tiers: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/admin/loyalty/tiers/{tier_id}")
async def update_loyalty_tier(tier_id: int, request: Request, session_token: Optional[str] = Cookie(None)):
    """Обновить уровень лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            UPDATE loyalty_tiers SET
                name = %s,
                min_points = %s,
                discount = %s,
                color = %s
            WHERE id = %s
        """, (
            data.get("name"),
            data.get("min_points"),
            data.get("discount"),
            data.get("color"),
            tier_id
        ))

        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating loyalty tier: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/loyalty/transactions")
async def get_loyalty_transactions(session_token: Optional[str] = Cookie(None)):
    """Получить историю транзакций лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                lt.id,
                c.name as client_name,
                c.email as client_email,
                lt.points,
                lt.transaction_type as type,
                lt.reason,
                lt.created_at
            FROM loyalty_transactions lt
            LEFT JOIN clients c ON lt.client_id = c.id
            ORDER BY lt.created_at DESC
            LIMIT 100
        """)

        transactions = []
        for row in c.fetchall():
            transactions.append({
                "id": str(row[0]),
                "client_name": row[1] or "Unknown",
                "client_email": row[2] or "",
                "points": row[3] or 0,
                "type": row[4] or "adjust",
                "reason": row[5] or "",
                "created_at": row[6].isoformat() if row[6] else datetime.now().isoformat()
            })

        conn.close()
        return {"success": True, "transactions": transactions}
    except Exception as e:
        log_error(f"Error getting loyalty transactions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/loyalty/adjust-points")
async def adjust_loyalty_points(request: Request, session_token: Optional[str] = Cookie(None)):
    """Скорректировать баллы лояльности клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        # Найти клиента по email
        c.execute("SELECT id, loyalty_points FROM clients WHERE email = %s", (data.get("client_email"),))
        result = c.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Client not found")

        client_id = result[0]
        current_points = result[1] or 0
        points = data.get("points", 0)
        new_points = current_points + points

        # Обновить баллы клиента
        c.execute("UPDATE clients SET loyalty_points = %s WHERE id = %s", (new_points, client_id))

        # Создать транзакцию
        c.execute("""
            INSERT INTO loyalty_transactions (client_id, points, transaction_type, reason)
            VALUES (%s, %s, %s, %s)
        """, (client_id, points, 'adjust', data.get("reason", "Manual adjustment")))

        conn.commit()
        conn.close()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error adjusting loyalty points: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/loyalty/stats")
async def get_loyalty_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику программы лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total points issued
        c.execute("SELECT COALESCE(SUM(points), 0) FROM loyalty_transactions WHERE points > 0")
        total_points_issued = c.fetchone()[0] or 0

        # Points redeemed
        c.execute("SELECT COALESCE(SUM(ABS(points)), 0) FROM loyalty_transactions WHERE points < 0")
        points_redeemed = c.fetchone()[0] or 0

        # Active members (clients with points > 0)
        c.execute("SELECT COUNT(*) FROM clients WHERE loyalty_points > 0")
        active_members = c.fetchone()[0] or 0

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_points_issued": total_points_issued,
                "points_redeemed": points_redeemed,
                "active_members": active_members
            }
        }
    except Exception as e:
        log_error(f"Error getting loyalty stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# NOTIFICATIONS DASHBOARD API
# ============================================================================

@router.get("/admin/notifications")
async def get_admin_notifications(session_token: Optional[str] = Cookie(None)):
    """Получить историю уведомлений"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                id, title, message, notification_type,
                recipients_count, sent_count, failed_count,
                status, created_at, sent_at
            FROM notification_history
            ORDER BY created_at DESC
            LIMIT 100
        """)

        notifications = []
        for row in c.fetchall():
            notifications.append({
                "id": str(row[0]),
                "title": row[1] or "",
                "message": row[2] or "",
                "type": row[3] or "push",
                "recipients": row[4] or 0,
                "sent_count": row[5] or 0,
                "failed_count": row[6] or 0,
                "status": row[7] or "pending",
                "created_at": row[8].isoformat() if row[8] else datetime.now().isoformat(),
                "sent_at": row[9].isoformat() if row[9] else None
            })

        conn.close()
        return {"success": True, "notifications": notifications}
    except Exception as e:
        log_error(f"Error getting notifications: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/notifications/templates")
async def get_notification_templates(session_token: Optional[str] = Cookie(None)):
    """Получить шаблоны уведомлений"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, name, title, message, notification_type
            FROM notification_templates
            ORDER BY created_at DESC
        """)

        templates = []
        for row in c.fetchall():
            templates.append({
                "id": str(row[0]),
                "name": row[1] or "",
                "title": row[2] or "",
                "message": row[3] or "",
                "type": row[4] or "push"
            })

        conn.close()
        return {"success": True, "templates": templates}
    except Exception as e:
        log_error(f"Error getting notification templates: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/notifications/templates")
async def create_notification_template(request: Request, session_token: Optional[str] = Cookie(None)):
    """Создать шаблон уведомления"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO notification_templates (name, title, message, notification_type)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("name"),
            data.get("title"),
            data.get("message"),
            data.get("type", "push")
        ))

        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()

        return {"success": True, "id": new_id}
    except Exception as e:
        log_error(f"Error creating notification template: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/notifications/send")
async def send_notification(request: Request, session_token: Optional[str] = Cookie(None)):
    """Отправить уведомление"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        # Определить целевую аудиторию
        target_segment = data.get("target_segment", "all")
        tier_filter = data.get("tier_filter", "")

        # Получить список клиентов
        if target_segment == "all":
            c.execute("SELECT id FROM clients WHERE telegram_id IS NOT NULL")
        elif target_segment == "active":
            c.execute("SELECT id FROM clients WHERE telegram_id IS NOT NULL AND is_active = TRUE")
        elif target_segment == "inactive":
            c.execute("SELECT id FROM clients WHERE telegram_id IS NOT NULL AND is_active = FALSE")
        elif target_segment == "tier" and tier_filter:
            # TODO: Implement tier filtering based on loyalty tier
            c.execute("SELECT id FROM clients WHERE telegram_id IS NOT NULL")
        else:
            c.execute("SELECT id FROM clients WHERE telegram_id IS NOT NULL")

        recipients = c.fetchall()
        recipients_count = len(recipients)

        # Создать запись в истории
        c.execute("""
            INSERT INTO notification_history (
                title, message, notification_type,
                recipients_count, status
            ) VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("title"),
            data.get("message"),
            data.get("type", "push"),
            recipients_count,
            "sent"
        ))

        notification_id = c.fetchone()[0]

        # TODO: Реальная отправка уведомлений через Telegram/Email/SMS
        # Для теста просто помечаем как отправленные
        c.execute("""
            UPDATE notification_history
            SET sent_count = %s, sent_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (recipients_count, notification_id))

        conn.commit()
        conn.close()

        return {"success": True, "id": notification_id}
    except Exception as e:
        log_error(f"Error sending notification: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# PHOTO GALLERY API
# ============================================================================

@router.get("/admin/gallery/photos")
async def get_gallery_photos(session_token: Optional[str] = Cookie(None)):
    """Получить все фото галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                id, url, title, description, category,
                uploaded_by, created_at, is_featured, views,
                before_photo_url, after_photo_url, client_id
            FROM gallery_photos
            ORDER BY created_at DESC
        """)

        photos = []
        for row in c.fetchall():
            photos.append({
                "id": str(row[0]),
                "url": row[1] or "",
                "title": row[2] or "",
                "description": row[3] or "",
                "category": row[4] or "other",
                "uploaded_by": row[5] or "Admin",
                "created_at": row[6].isoformat() if row[6] else datetime.now().isoformat(),
                "is_featured": row[7] or False,
                "views": row[8] or 0,
                "before_photo_url": row[9] or "",
                "after_photo_url": row[10] or "",
                "client_id": row[11] or ""
            })

        conn.close()
        return {"success": True, "photos": photos}
    except Exception as e:
        log_error(f"Error getting gallery photos: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/gallery/categories")
async def get_gallery_categories(session_token: Optional[str] = Cookie(None)):
    """Получить список категорий из базы данных"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем уникальные категории из services таблицы
        c.execute("""
            SELECT DISTINCT category_ru as category
            FROM services
            WHERE category_ru IS NOT NULL AND category_ru != ''
            ORDER BY category_ru
        """)

        categories = []
        for row in c.fetchall():
            if row[0]:
                categories.append({
                    "value": row[0].lower().replace(' ', '_'),
                    "label": row[0]
                })

        # Добавляем дополнительные категории если нужно
        default_categories = [
            {"value": "before_after", "label": "До/После"},
            {"value": "portfolio", "label": "Портфолио"},
            {"value": "interior", "label": "Интерьер"},
            {"value": "other", "label": "Другое"}
        ]

        # Объединяем, избегая дубликатов
        existing_values = {cat["value"] for cat in categories}
        for cat in default_categories:
            if cat["value"] not in existing_values:
                categories.append(cat)

        conn.close()
        return {"success": True, "categories": categories}
    except Exception as e:
        log_error(f"Error getting gallery categories: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/gallery/stats")
async def get_gallery_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total photos
        c.execute("SELECT COUNT(*) FROM gallery_photos")
        total_photos = c.fetchone()[0] or 0

        # Total views
        c.execute("SELECT COALESCE(SUM(views), 0) FROM gallery_photos")
        total_views = c.fetchone()[0] or 0

        # Featured count
        c.execute("SELECT COUNT(*) FROM gallery_photos WHERE is_featured = TRUE")
        featured_count = c.fetchone()[0] or 0

        # Recent uploads (last 7 days)
        c.execute("SELECT COUNT(*) FROM gallery_photos WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'")
        recent_uploads = c.fetchone()[0] or 0

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_photos": total_photos,
                "total_views": total_views,
                "featured_count": featured_count,
                "recent_uploads": recent_uploads
            }
        }
    except Exception as e:
        log_error(f"Error getting gallery stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin/gallery/photos")
async def upload_gallery_photo(
    file: UploadFile = File(None),
    before_photo: UploadFile = File(None),
    after_photo: UploadFile = File(None),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("other"),
    is_featured: str = Form("false"),
    client_id: Optional[str] = Form(None),
    session_token: Optional[str] = Cookie(None)
):
    """Загрузить фото в галерею (обычное или до/после)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        upload_dir = "uploads/gallery"
        os.makedirs(upload_dir, exist_ok=True)

        photo_url = ""
        before_photo_url = ""
        after_photo_url = ""

        # Обработка обычного фото
        if file:
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)

            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            photo_url = f"/uploads/gallery/{unique_filename}"

        # Обработка фото "до"
        if before_photo:
            file_extension = before_photo.filename.split('.')[-1] if '.' in before_photo.filename else 'jpg'
            unique_filename = f"before_{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)

            with open(file_path, "wb") as f:
                content = await before_photo.read()
                f.write(content)

            before_photo_url = f"/uploads/gallery/{unique_filename}"

        # Обработка фото "после"
        if after_photo:
            file_extension = after_photo.filename.split('.')[-1] if '.' in after_photo.filename else 'jpg'
            unique_filename = f"after_{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)

            with open(file_path, "wb") as f:
                content = await after_photo.read()
                f.write(content)

            after_photo_url = f"/uploads/gallery/{unique_filename}"

        # Если нет обычного фото, но есть фото "после", используем его как основное
        if not photo_url and after_photo_url:
            photo_url = after_photo_url

        # Сохранить в БД
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO gallery_photos (
                url, title, description, category,
                uploaded_by, is_featured, client_id,
                before_photo_url, after_photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            photo_url,
            title,
            description,
            category,
            user.get("email", "admin"),
            is_featured.lower() == "true",
            client_id if client_id else None,
            before_photo_url if before_photo_url else None,
            after_photo_url if after_photo_url else None
        ))

        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()

        return {
            "success": True,
            "id": new_id,
            "url": photo_url,
            "before_photo_url": before_photo_url,
            "after_photo_url": after_photo_url
        }
    except Exception as e:
        log_error(f"Error uploading gallery photo: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/admin/gallery/photos/{photo_id}")
async def delete_gallery_photo(photo_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить фото из галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получить URL фото
        c.execute("SELECT url FROM gallery_photos WHERE id = %s", (photo_id,))
        result = c.fetchone()

        if result:
            photo_url = result[0]
            # Удалить файл
            if photo_url.startswith("/uploads/"):
                file_path = photo_url[1:]  # Remove leading /
                if os.path.exists(file_path):
                    os.remove(file_path)

        # Удалить из БД
        c.execute("DELETE FROM gallery_photos WHERE id = %s", (photo_id,))
        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting gallery photo: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/admin/gallery/photos/{photo_id}/featured")
async def toggle_featured_photo(photo_id: int, request: Request, session_token: Optional[str] = Cookie(None)):
    """Переключить статус избранного для фото"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            UPDATE gallery_photos
            SET is_featured = %s
            WHERE id = %s
        """, (data.get("is_featured", False), photo_id))

        conn.commit()
        conn.close()

        return {"success": True}
    except Exception as e:
        log_error(f"Error toggling featured photo: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
