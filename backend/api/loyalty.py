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

        if not category or multiplier is None:
            return JSONResponse({"error": "Missing category or points_multiplier"}, status_code=400)

        loyalty_service = LoyaltyService()
        success = loyalty_service.update_category_rule(category, float(multiplier))
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
@router.get("/admin/loyalty/config")
async def get_loyalty_config_admin(session_token: Optional[str] = Cookie(None)):
    """[Admin] Получить конфигурацию программы лояльности (admin prefix)"""
    return await get_loyalty_config_api(session_token)


@router.post("/admin/loyalty/config")
async def update_loyalty_config_admin(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """[Admin] Обновить конфигурацию программы лояльности (admin prefix)"""
    return await update_loyalty_config_api(request, session_token)


@router.get("/admin/loyalty/categories")
async def get_loyalty_categories_admin(session_token: Optional[str] = Cookie(None)):
    """[Admin] Получить правила по категориям (admin prefix)"""
    return await get_loyalty_categories_api(session_token)


# Admin compatibility endpoints used by frontend loyalty management page.
# They proxy to admin_features handlers to keep one source of business logic.
@router.get("/admin/loyalty/tiers")
async def get_loyalty_tiers_admin(session_token: Optional[str] = Cookie(None)):
    """[Admin] Получить уровни лояльности (compat)"""
    from api.admin_features import get_loyalty_tiers as get_loyalty_tiers_handler
    return await get_loyalty_tiers_handler(session_token)


@router.put("/admin/loyalty/tiers/{tier_id}")
async def update_loyalty_tier_admin(
    tier_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """[Admin] Обновить уровень лояльности (compat)"""
    from api.admin_features import update_loyalty_tier as update_loyalty_tier_handler
    return await update_loyalty_tier_handler(tier_id, request, session_token)


@router.get("/admin/loyalty/transactions")
async def get_loyalty_transactions_admin(session_token: Optional[str] = Cookie(None)):
    """[Admin] Получить историю транзакций лояльности (compat)"""
    from api.admin_features import get_loyalty_transactions as get_loyalty_transactions_handler
    return await get_loyalty_transactions_handler(session_token)


@router.post("/admin/loyalty/adjust-points")
async def adjust_loyalty_points_admin(request: Request, session_token: Optional[str] = Cookie(None)):
    """[Admin] Скорректировать баллы клиента (compat)"""
    from api.admin_features import adjust_loyalty_points as adjust_loyalty_points_handler
    return await adjust_loyalty_points_handler(request, session_token)


@router.get("/admin/loyalty/stats")
async def get_loyalty_stats_admin(session_token: Optional[str] = Cookie(None)):
    """[Admin] Получить статистику программы лояльности (compat)"""
    from api.admin_features import get_loyalty_stats as get_loyalty_stats_handler
    return await get_loyalty_stats_handler(session_token)
