"""
API Endpoints для админ панели
"""
from fastapi import APIRouter, Request, Cookie, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error
from datetime import datetime, timedelta

router = APIRouter(tags=["Admin Panel"])

# ============================================================================
# DASHBOARD STATS
# ============================================================================

@router.get("/admin-panel/stats")
async def get_admin_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику для админ дашборда"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total users
        c.execute("SELECT COUNT(*) FROM users WHERE role NOT IN ('admin', 'director')")
        total_users = c.fetchone()[0]

        # Active challenges
        c.execute("SELECT COUNT(*) FROM active_challenges WHERE is_active = TRUE")
        active_challenges = c.fetchone()[0]

        # Total loyalty points issued
        c.execute("SELECT COALESCE(SUM(points), 0) FROM loyalty_transactions WHERE points > 0")
        total_loyalty_points = c.fetchone()[0]

        # Total referrals
        c.execute("SELECT COUNT(*) FROM referrals")
        total_referrals = c.fetchone()[0]

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_users": total_users,
                "active_challenges": active_challenges,
                "total_loyalty_points": int(total_loyalty_points),
                "total_referrals": total_referrals
            }
        }
    except Exception as e:
        log_error(f"Error getting admin stats: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# LOYALTY MANAGEMENT
# ============================================================================

@router.get("/admin-panel/loyalty/transactions")
async def get_loyalty_transactions(
    limit: int = Query(50, description="Number of transactions"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить все транзакции лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
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
            JOIN clients c ON lt.client_id = c.id
            ORDER BY lt.created_at DESC
            LIMIT %s
        """, (limit,))

        transactions = []
        for row in c.fetchall():
            transactions.append({
                "id": str(row[0]),
                "client_name": row[1],
                "client_email": row[2],
                "points": row[3],
                "type": row[4],
                "reason": row[5],
                "created_at": row[6].isoformat() if row[6] else None
            })

        conn.close()
        return {"success": True, "transactions": transactions}
    except Exception as e:
        log_error(f"Error getting loyalty transactions: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin-panel/loyalty/adjust")
async def adjust_loyalty_points(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Скорректировать баллы лояльности клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        client_email = data.get("client_email")
        points = data.get("points")
        reason = data.get("reason")

        if not client_email or points is None:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)

        conn = get_db_connection()
        c = conn.cursor()

        # Find client by email
        c.execute("SELECT id FROM clients WHERE email = %s", (client_email,))
        client_row = c.fetchone()
        if not client_row:
            conn.close()
            return JSONResponse({"error": "Client not found"}, status_code=404)

        client_id = client_row[0]

        # Add transaction
        transaction_type = "earn" if points > 0 else "spend"
        c.execute("""
            INSERT INTO loyalty_transactions (client_id, points, transaction_type, reason)
            VALUES (%s, %s, %s, %s)
        """, (client_id, abs(points), transaction_type, reason))

        conn.commit()
        conn.close()

        return {"success": True, "message": "Points adjusted successfully"}
    except Exception as e:
        log_error(f"Error adjusting loyalty points: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin-panel/loyalty/stats")
async def get_loyalty_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику программы лояльности"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total points issued
        c.execute("SELECT COALESCE(SUM(points), 0) FROM loyalty_transactions WHERE transaction_type = 'earn'")
        total_issued = c.fetchone()[0]

        # Total points redeemed
        c.execute("SELECT COALESCE(SUM(points), 0) FROM loyalty_transactions WHERE transaction_type = 'spend'")
        total_redeemed = c.fetchone()[0]

        # Active members (clients with transactions)
        c.execute("SELECT COUNT(DISTINCT client_id) FROM loyalty_transactions")
        active_members = c.fetchone()[0]

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_points_issued": int(total_issued),
                "points_redeemed": int(total_redeemed),
                "active_members": active_members
            }
        }
    except Exception as e:
        log_error(f"Error getting loyalty stats: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# REFERRAL PROGRAM
# ============================================================================

@router.get("/admin-panel/referrals")
async def get_referrals(
    limit: int = Query(100, description="Number of referrals"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить все рефералы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                r.id,
                c1.name as referrer_name,
                c1.email as referrer_email,
                c2.name as referred_name,
                c2.email as referred_email,
                r.status,
                r.points_awarded,
                r.created_at
            FROM referrals r
            LEFT JOIN clients c1 ON r.referrer_id = c1.id
            LEFT JOIN clients c2 ON r.referred_id = c2.id
            ORDER BY r.created_at DESC
            LIMIT %s
        """, (limit,))

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
                "created_at": row[7].isoformat() if row[7] else None
            })

        conn.close()
        return {"success": True, "referrals": referrals}
    except Exception as e:
        log_error(f"Error getting referrals: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin-panel/referrals/stats")
async def get_referral_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику реферальной программы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Total referrals
        c.execute("SELECT COUNT(*) FROM referrals")
        total_referrals = c.fetchone()[0]

        # Completed referrals
        c.execute("SELECT COUNT(*) FROM referrals WHERE status = 'completed'")
        completed_referrals = c.fetchone()[0]

        # Total points distributed
        c.execute("SELECT COALESCE(SUM(points_awarded), 0) FROM referrals WHERE status = 'completed'")
        points_distributed = c.fetchone()[0]

        conn.close()

        return {
            "success": True,
            "stats": {
                "total_referrals": total_referrals,
                "completed_referrals": completed_referrals,
                "points_distributed": int(points_distributed)
            }
        }
    except Exception as e:
        log_error(f"Error getting referral stats: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin-panel/referrals/settings")
async def get_referral_settings(session_token: Optional[str] = Cookie(None)):
    """Получить настройки реферальной программы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT setting_key, setting_value
            FROM settings
            WHERE setting_key IN ('referral_bonus_referrer', 'referral_bonus_referred', 'referral_min_purchase')
        """)

        settings = {
            "referrer_bonus": 500,
            "referred_bonus": 200,
            "min_purchase_amount": 0
        }

        for row in c.fetchall():
            key = row[0]
            value = row[1]
            if key == 'referral_bonus_referrer':
                settings['referrer_bonus'] = int(value)
            elif key == 'referral_bonus_referred':
                settings['referred_bonus'] = int(value)
            elif key == 'referral_min_purchase':
                settings['min_purchase_amount'] = int(value)

        conn.close()
        return {"success": True, "settings": settings}
    except Exception as e:
        log_error(f"Error getting referral settings: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin-panel/referrals/settings")
async def update_referral_settings(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки реферальной программы"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        if "referrer_bonus" in data:
            c.execute("""
                INSERT INTO settings (setting_key, setting_value)
                VALUES ('referral_bonus_referrer', %s)
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
            """, (str(data["referrer_bonus"]),))

        if "referred_bonus" in data:
            c.execute("""
                INSERT INTO settings (setting_key, setting_value)
                VALUES ('referral_bonus_referred', %s)
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
            """, (str(data["referred_bonus"]),))

        if "min_purchase_amount" in data:
            c.execute("""
                INSERT INTO settings (setting_key, setting_value)
                VALUES ('referral_min_purchase', %s)
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
            """, (str(data["min_purchase_amount"]),))

        conn.commit()
        conn.close()

        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        log_error(f"Error updating referral settings: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# CHALLENGES
# ============================================================================

@router.get("/admin-panel/challenges")
async def get_admin_challenges(session_token: Optional[str] = Cookie(None)):
    """Получить все челленджи для админ панели"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                id,
                title_ru as title,
                description_ru as description,
                'visits' as type,
                3 as target_value,
                bonus_points as reward_points,
                created_at as start_date,
                (created_at + INTERVAL '30 days') as end_date,
                CASE WHEN is_active THEN 'active' ELSE 'completed' END as status,
                0 as participants,
                0 as completions
            FROM active_challenges
            ORDER BY created_at DESC
        """)

        challenges = []
        for row in c.fetchall():
            challenges.append({
                "id": str(row[0]),
                "title": row[1],
                "description": row[2],
                "type": row[3],
                "target_value": row[4],
                "reward_points": row[5],
                "start_date": row[6].isoformat() if row[6] else None,
                "end_date": row[7].isoformat() if row[7] else None,
                "status": row[8],
                "participants": row[9],
                "completions": row[10]
            })

        conn.close()
        return {"success": True, "challenges": challenges}
    except Exception as e:
        log_error(f"Error getting admin challenges: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin-panel/challenges")
async def create_admin_challenge(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новый челлендж"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            INSERT INTO active_challenges (title_ru, title_en, description_ru, description_en, bonus_points, is_active)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("title"),
            data.get("title"),
            data.get("description"),
            data.get("description"),
            data.get("reward_points", 0),
            True
        ))

        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()

        return {"success": True, "id": str(new_id)}
    except Exception as e:
        log_error(f"Error creating challenge: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/admin-panel/challenges/{challenge_id}")
async def delete_admin_challenge(
    challenge_id: int,
    session_token: Optional[str] = Cookie(None)
):
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
        log_error(f"Error deleting challenge: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin-panel/challenges/stats")
async def get_challenges_stats(session_token: Optional[str] = Cookie(None)):
    """Получить статистику челленджей"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Active challenges
        c.execute("SELECT COUNT(*) FROM active_challenges WHERE is_active = TRUE")
        active_count = c.fetchone()[0]

        conn.close()

        return {
            "success": True,
            "stats": {
                "active_challenges": active_count,
                "total_participants": 0,
                "completions": 0
            }
        }
    except Exception as e:
        log_error(f"Error getting challenges stats: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# NOTIFICATIONS
# ============================================================================

@router.get("/admin-panel/notifications")
async def get_admin_notifications(
    limit: int = Query(50, description="Number of notifications"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить все уведомления"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Mock data for now
        notifications = []

        conn.close()
        return {"success": True, "notifications": notifications}
    except Exception as e:
        log_error(f"Error getting notifications: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin-panel/notifications")
async def send_notification(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить уведомление"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        # TODO: Implement notification sending logic

        return {"success": True, "message": "Notification sent successfully"}
    except Exception as e:
        log_error(f"Error sending notification: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# PHOTO GALLERY
# ============================================================================

@router.get("/admin-panel/gallery")
async def get_gallery_photos(
    category: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить фотографии галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Mock data for now
        photos = []

        conn.close()
        return {"success": True, "photos": photos}
    except Exception as e:
        log_error(f"Error getting gallery photos: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/admin-panel/gallery")
async def upload_gallery_photo(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Загрузить фото в галерею"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        # TODO: Implement photo upload logic

        return {"success": True, "message": "Photo uploaded successfully"}
    except Exception as e:
        log_error(f"Error uploading photo: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/admin-panel/gallery/{photo_id}")
async def delete_gallery_photo(
    photo_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить фото из галереи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        # TODO: Implement photo deletion logic

        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting photo: {e}", "admin_panel")
        return JSONResponse({"error": str(e)}, status_code=500)
