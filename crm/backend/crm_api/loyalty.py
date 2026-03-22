"""
API Endpoints для программы лояльности
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.loyalty import LoyaltyService
from services.features import FeatureService

router = APIRouter(tags=["Loyalty"])

@router.get("/loyalty/{client_id}")
async def get_client_loyalty_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить данные лояльности клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        # Feature Flag Check
        feature_service = FeatureService()
        if not feature_service.is_feature_enabled("loyalty_program"): 
             return {
                "success": True,
                "client_id": client_id,
                "loyalty": {"total_points": 0, "available_points": 0, "spent_points": 0, "loyalty_level": "bronze"},
                "feature_disabled": True
            }

        loyalty_service = LoyaltyService()
        loyalty = loyalty_service.get_client_loyalty(client_id)

        if not loyalty:
            return JSONResponse({"error": "Failed to get loyalty data"}, status_code=500)

        config = loyalty_service.get_loyalty_config()
        all_levels = loyalty_service.get_all_levels()
        discount_info = loyalty_service.calculate_discount(client_id, 100) # Get discount for level

        # Prepare frontend-compatible data
        enriched_loyalty = {
            **loyalty,
            "points": loyalty["total_points"],
            "tier": loyalty["loyalty_level"].capitalize(),
            "discount": discount_info["discount_percent"],
            "config": config,
            "all_tiers": [
                {
                    "name": level["level_name"].capitalize(),
                    "points": level["min_points"],
                    "discount": level["discount_percent"],
                    "color": level.get("color", "#CD7F32"),
                    "requirement": f"From {level['min_points']} points"
                }
                for level in all_levels
            ]
        }

        return {
            "success": True,
            "client_id": client_id,
            "loyalty": enriched_loyalty
        }

    except Exception as e:
        log_error(f"Error getting client loyalty: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/loyalty/{client_id}/earn")
async def earn_points_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Начислить баллы клиенту

    Body:
    {
        "points": 100,
        "reason": "Запись на маникюр",
        "booking_id": 123,
        "expires_days": 365
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        points = data.get('points')
        reason = data.get('reason')
        booking_id = data.get('booking_id')
        expires_days = data.get('expires_days', 365)

        if not points or not reason:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)

        loyalty_service = LoyaltyService()
        
        # Feature Flag Check
        feature_service = FeatureService()
        if not feature_service.is_feature_enabled("loyalty_program"):
             return JSONResponse({"error": "Loyalty program is disabled"}, status_code=403)

        success = loyalty_service.earn_points(
            client_id=client_id,
            points=points,
            reason=reason,
            booking_id=booking_id,
            expires_days=expires_days
        )

        if success:
            return {
                "success": True,
                "message": f"{points} points earned successfully"
            }
        else:
            return JSONResponse({"error": "Failed to earn points"}, status_code=500)

    except Exception as e:
        log_error(f"Error earning points: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/loyalty/{client_id}/spend")
async def spend_points_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Списать баллы

    Body:
    {
        "points": 50,
        "reason": "Скидка на услугу",
        "booking_id": 123
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        points = data.get('points')
        reason = data.get('reason')
        booking_id = data.get('booking_id')

        if not points or not reason:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)

        loyalty_service = LoyaltyService()
        success = loyalty_service.spend_points(
            client_id=client_id,
            points=points,
            reason=reason,
            booking_id=booking_id
        )

        if success:
            return {
                "success": True,
                "message": f"{points} points spent successfully"
            }
        else:
            return JSONResponse({"error": "Failed to spend points (insufficient balance?)"}, status_code=400)

    except Exception as e:
        log_error(f"Error spending points: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/loyalty/{client_id}/history")
async def get_transaction_history_api(
    client_id: str,
    limit: int = Query(50, description="Number of transactions to return"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить историю транзакций баллов"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        loyalty_service = LoyaltyService()
        transactions = loyalty_service.get_transaction_history(client_id, limit)

        return {
            "success": True,
            "client_id": client_id,
            "transactions": transactions,
            "count": len(transactions)
        }

    except Exception as e:
        log_error(f"Error getting transaction history: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/loyalty/levels")
async def get_loyalty_levels_api(
    session_token: Optional[str] = Cookie(None)
):
    """Получить все уровни лояльности"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        loyalty_service = LoyaltyService()
        levels = loyalty_service.get_all_levels()

        return {
            "success": True,
            "levels": levels
        }

    except Exception as e:
        log_error(f"Error getting loyalty levels: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/loyalty/{client_id}/calculate-discount")
async def calculate_discount_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Вычислить скидку для клиента

    Body:
    {
        "original_price": 500
    }
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        original_price = data.get('original_price')

        if not original_price:
            return JSONResponse({"error": "Missing original_price"}, status_code=400)

        loyalty_service = LoyaltyService()
        discount_info = loyalty_service.calculate_discount(client_id, original_price)

        return {
            "success": True,
            "client_id": client_id,
            "discount": discount_info
        }

    except Exception as e:
        log_error(f"Error calculating discount: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== ADMIN ENDPOINTS =====

@router.get("/loyalty/config")
async def get_loyalty_config_api(
    session_token: Optional[str] = Cookie(None)
):
    """
    [Admin] Получить глобальные настройки
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        loyalty_service = LoyaltyService()
        config = loyalty_service.get_loyalty_config()
        return {"success": True, "config": config}
    except Exception as e:
        log_error(f"Error getting loyalty config: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/loyalty/config")
async def update_loyalty_config_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    [Admin] Обновить глобальные настройки
    Body: { "loyalty_points_conversion_rate": 0.1 }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        rate = data.get("loyalty_points_conversion_rate")
        expiration = data.get("points_expiration_days", 365)
        
        if rate is None:
            return JSONResponse({"error": "Missing loyalty_points_conversion_rate"}, status_code=400)

        loyalty_service = LoyaltyService()
        success = loyalty_service.update_loyalty_config(float(rate), int(expiration))
        return {"success": success}
    except Exception as e:
        log_error(f"Error updating loyalty config: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/loyalty/categories")
async def get_loyalty_categories_api(
    session_token: Optional[str] = Cookie(None)
):
    """[Admin] Получить правила для категорий"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        loyalty_service = LoyaltyService()
        rules = loyalty_service.get_category_rules()
        return {"success": True, "rules": rules}
    except Exception as e:
        log_error(f"Error getting category rules: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/loyalty/categories")
async def update_loyalty_category_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    [Admin] Создать/Обновить правило для категории
    Body: { "category": "Nails", "points_multiplier": 1.5 }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        category = data.get("category")
        multiplier = data.get("points_multiplier")
        is_active_raw = data.get("is_active", True)

        if not category or multiplier is None:
            return JSONResponse({"error": "Missing category or points_multiplier"}, status_code=400)

        is_active = is_active_raw if isinstance(is_active_raw, bool) else str(is_active_raw).strip().lower() in ["1", "true", "yes", "on"]
        loyalty_service = LoyaltyService()
        success = loyalty_service.update_category_rule(category, float(multiplier), bool(is_active))
        return {"success": success}
    except Exception as e:
        log_error(f"Error updating category rule: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/loyalty/categories")
async def delete_loyalty_category_api(
    category: str = Query(..., description="Category to delete rule for"),
    session_token: Optional[str] = Cookie(None)
):
    """[Admin] Удалить правило для категории"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        loyalty_service = LoyaltyService()
        success = loyalty_service.delete_category_rule(category)
        return {"success": success}
    except Exception as e:
        log_error(f"Error deleting category rule: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


# Admin endpoints with /admin prefix (for frontend compatibility)

from db.connection import get_db_connection

TIER_COLORS = {
    "bronze": "#CD7F32",
    "silver": "#C0C0C0",
    "gold": "#FFD700",
    "platinum": "#E5E4E2",
}

def _level_to_tier(level: dict) -> dict:
    name = level.get("level_name", "")
    return {
        "id": name,
        "name": name,
        "min_points": level.get("min_points", 0),
        "discount": level.get("discount_percent", 0),
        "is_active": True,
        "color": TIER_COLORS.get(name.lower(), "#8B5CF6"),
    }


@router.get("/loyalty/tiers")
async def get_loyalty_tiers_api(session_token: Optional[str] = Cookie(None)):
    """[Admin] Get loyalty tiers"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        loyalty_service = LoyaltyService()
        levels = loyalty_service.get_all_levels()
        return {"success": True, "tiers": [_level_to_tier(l) for l in levels]}
    except Exception as e:
        log_error(f"Error getting tiers: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/loyalty/tiers")
async def create_loyalty_tier_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """[Admin] Create loyalty tier"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        data = await request.json()
        name = data.get("name", "")
        min_points = int(data.get("min_points", 0))
        discount = float(data.get("discount", 0))
        color = data.get("color", "#8B5CF6")
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("""
                INSERT INTO loyalty_levels (level_name, min_points, discount_percent, points_multiplier, benefits)
                VALUES (%s, %s, %s, 1.0, %s)
                ON CONFLICT (level_name) DO UPDATE SET
                    min_points = EXCLUDED.min_points,
                    discount_percent = EXCLUDED.discount_percent
            """, (name, min_points, discount, color))
            conn.commit()
        finally:
            conn.close()
        return {"success": True, "tier": {"id": name, "name": name, "min_points": min_points, "discount": discount, "is_active": True, "color": color}}
    except Exception as e:
        log_error(f"Error creating tier: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/loyalty/tiers/{tier_id}")
async def update_loyalty_tier_api(tier_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """[Admin] Update loyalty tier"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        data = await request.json()
        min_points = int(data.get("min_points", 0))
        discount = float(data.get("discount", 0))
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("""
                UPDATE loyalty_levels SET min_points=%s, discount_percent=%s WHERE level_name=%s
            """, (min_points, discount, tier_id))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating tier: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/loyalty/tiers/{tier_id}")
async def delete_loyalty_tier_api(tier_id: str, session_token: Optional[str] = Cookie(None)):
    """[Admin] Delete loyalty tier"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("DELETE FROM loyalty_levels WHERE level_name=%s", (tier_id,))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting tier: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/loyalty/stats")
async def get_loyalty_stats_api(session_token: Optional[str] = Cookie(None)):
    """[Admin] Get loyalty program statistics"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("SELECT COUNT(*), COALESCE(SUM(total_points),0), COALESCE(SUM(spent_points),0) FROM client_loyalty_points")
            row = c.fetchone() or (0, 0, 0)
            c.execute("SELECT COUNT(*) FROM loyalty_transactions WHERE transaction_type='earn' AND created_at > NOW() - INTERVAL '30 days'")
            monthly_earn = (c.fetchone() or [0])[0]
        finally:
            conn.close()
        return {
            "success": True,
            "stats": {
                "total_clients": row[0],
                "total_points_issued": row[1],
                "total_points_spent": row[2],
                "monthly_transactions": monthly_earn,
            }
        }
    except Exception as e:
        log_error(f"Error getting loyalty stats: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/loyalty/transactions")
async def get_all_loyalty_transactions_api(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session_token: Optional[str] = Cookie(None)
):
    """[Admin] Get all recent loyalty transactions"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("""
                SELECT lt.id, lt.client_id, COALESCE(cl.name, lt.client_id::text) as client_name,
                       COALESCE(cl.email, '') as client_email,
                       lt.points_amount, lt.transaction_type, lt.reason, lt.created_at
                FROM loyalty_transactions lt
                LEFT JOIN clients cl ON cl.id::text = lt.client_id::text
                ORDER BY lt.created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
            rows = c.fetchall()
            transactions = [
                {
                    "id": str(r[0]),
                    "client_id": str(r[1]),
                    "client_name": r[2],
                    "client_email": r[3],
                    "points": r[4],
                    "type": "earn" if r[5] == "earn" else "redeem",
                    "reason": r[6] or "",
                    "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                }
                for r in rows
            ]
        finally:
            conn.close()
        return {"success": True, "transactions": transactions, "total": len(transactions)}
    except Exception as e:
        log_error(f"Error getting all transactions: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/loyalty/transactions/{transaction_id}")
async def delete_loyalty_transaction_api(transaction_id: str, session_token: Optional[str] = Cookie(None)):
    """[Admin] Delete loyalty transaction"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("DELETE FROM loyalty_transactions WHERE id=%s", (transaction_id,))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting transaction: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/loyalty/adjust-points")
async def adjust_client_points_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """[Admin] Manually adjust client loyalty points"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        data = await request.json()
        client_id = str(data.get("client_id", ""))
        points = int(data.get("points", 0))
        reason = data.get("reason", "Admin adjustment")
        if not client_id or points == 0:
            return JSONResponse({"error": "Missing client_id or points"}, status_code=400)
        loyalty_service = LoyaltyService()
        if points > 0:
            result = loyalty_service.earn_points(client_id, points, reason)
        else:
            result = loyalty_service.spend_points(client_id, abs(points), reason)
        return {"success": result.get("success", False)}
    except Exception as e:
        log_error(f"Error adjusting points: {e}", "loyalty")
        return JSONResponse({"error": str(e)}, status_code=500)
