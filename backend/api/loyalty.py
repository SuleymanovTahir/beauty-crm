"""
API Endpoints для программы лояльности
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.loyalty import LoyaltyService

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
        loyalty_service = LoyaltyService()
        loyalty = loyalty_service.get_client_loyalty(client_id)

        if not loyalty:
            return JSONResponse({"error": "Failed to get loyalty data"}, status_code=500)

        return {
            "success": True,
            "client_id": client_id,
            "loyalty": loyalty
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
    if not user or user["role"] not in ["admin", "manager"]:
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
    if not user or user["role"] not in ["admin", "manager"]:
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
