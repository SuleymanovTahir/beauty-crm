"""
API для подписки на рассылку
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from utils.logger import log_error, log_info
from db.newsletter import (
    add_subscriber,
    get_all_subscribers,
    update_subscriber_status,
    delete_subscriber,
    get_subscribers_count
)
from utils.email_service import send_newsletter_welcome_email
from utils.utils import get_current_user

router = APIRouter(tags=["Newsletter"])

class SubscribeRequest(BaseModel):
    email: EmailStr
    source: str = 'footer'

class UpdateSubscriberRequest(BaseModel):
    is_active: bool

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: SubscribeRequest, background_tasks: BackgroundTasks):
    """Подписаться на рассылку"""
    try:
        # Валидация email происходит автоматически через Pydantic EmailStr

        result = add_subscriber(data.email, data.source)

        if result:
            # Отправить приветственное письмо в фоне
            background_tasks.add_task(send_newsletter_welcome_email, data.email)
            log_info(f"📧 Новый подписчик: {data.email}", "newsletter")

            # Уведомляем админов/директоров о новой подписке
            try:
                from notifications.admin_notifications import notify_newsletter_subscription
                notify_newsletter_subscription(data.email)
            except Exception as e:
                log_error(f"Failed to send admin notification: {e}", "newsletter")

            return {"success": True, "message": "Successfully subscribed"}
        else:
            return JSONResponse(
                {"error": "Failed to subscribe"},
                status_code=500
            )

    except Exception as e:
        log_error(f"Error subscribing to newsletter: {e}", "newsletter")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/newsletter/subscribers")
async def get_subscribers(
    include_inactive: bool = Query(False, description="Include inactive subscribers"),
    current_user: dict = Depends(get_current_user)
):
    """Получить список подписчиков (только для админов)"""
    try:
        # Проверка прав доступа
        if current_user.get('role') not in ['admin', 'director', 'manager']:
            return JSONResponse(
                {"error": "Access denied"},
                status_code=403
            )

        subscribers = get_all_subscribers(include_inactive)
        counts = get_subscribers_count()

        return {
            "subscribers": subscribers,
            "total": counts['total'],
            "active": counts['active']
        }
    except Exception as e:
        log_error(f"Error getting subscribers: {e}", "newsletter")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.patch("/newsletter/subscribers/{subscriber_id}")
async def update_subscriber(
    subscriber_id: int,
    data: UpdateSubscriberRequest,
    current_user: dict = Depends(get_current_user)
):
    """Обновить статус подписчика (только для админов)"""
    try:
        if current_user.get('role') not in ['admin', 'director', 'manager']:
            return JSONResponse(
                {"error": "Access denied"},
                status_code=403
            )

        result = update_subscriber_status(subscriber_id, data.is_active)

        if result:
            log_info(f"Subscriber {subscriber_id} status updated to {data.is_active}", "newsletter")
            return {"success": True, "message": "Subscriber updated"}
        else:
            return JSONResponse(
                {"error": "Subscriber not found"},
                status_code=404
            )
    except Exception as e:
        log_error(f"Error updating subscriber: {e}", "newsletter")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/newsletter/subscribers/{subscriber_id}")
async def remove_subscriber(
    subscriber_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить подписчика (только для админов)"""
    try:
        if current_user.get('role') not in ['admin', 'director', 'manager']:
            return JSONResponse(
                {"error": "Access denied"},
                status_code=403
            )

        result = delete_subscriber(subscriber_id)

        if result:
            log_info(f"Subscriber {subscriber_id} deleted", "newsletter")
            return {"success": True, "message": "Subscriber deleted"}
        else:
            return JSONResponse(
                {"error": "Subscriber not found"},
                status_code=404
            )
    except Exception as e:
        log_error(f"Error deleting subscriber: {e}", "newsletter")
        return JSONResponse({"error": str(e)}, status_code=500)
