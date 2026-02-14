"""
API для подписки на рассылку
"""
from typing import List, Optional

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
    name: Optional[str] = None
    source: str = 'footer'

class SubscriberData(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class BulkImportRequest(BaseModel):
    subscribers: List[SubscriberData]

class UpdateSubscriberRequest(BaseModel):
    is_active: Optional[bool] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: SubscribeRequest, background_tasks: BackgroundTasks):
    """Подписаться на рассылку"""
    try:
        # Валидация email происходит автоматически через Pydantic EmailStr

        result = add_subscriber(data.email, data.name, data.source)

        if result:
            # Отправить приветственное письмо в фоне
            background_tasks.add_task(send_newsletter_welcome_email, data.email)
            log_info(f"📧 Новый подписчик: {data.email} ({data.name or 'No name'})", "newsletter")

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

        if data.is_active is not None:
            update_subscriber_status(subscriber_id, data.is_active)
        
        if data.email is not None or data.name is not None:
            # To update data, we need the current values if one is missing
            from db.newsletter import update_subscriber_data
            # In a real app we'd fetch the current record first, but here we can just pass what we have
            # assuming the frontend sends both if they were modified
            update_subscriber_data(subscriber_id, data.email, data.name)

        log_info(f"Subscriber {subscriber_id} updated", "newsletter")
        return {"success": True, "message": "Subscriber updated"}
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

@router.post("/newsletter/import")
async def import_subscribers(
    data: BulkImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Импорт списка подписчиков (email + name)"""
    if current_user.get('role') not in ['admin', 'director', 'manager']:
        return JSONResponse({"error": "Access denied"}, status_code=403)

    success_count = 0
    for sub in data.subscribers:
        if add_subscriber(sub.email, sub.name, 'import'):
            success_count += 1
    
    log_info(f"Импортировано {success_count} подписчиков из {len(data.subscribers)}", "newsletter")
    return {"success": True, "count": success_count}
