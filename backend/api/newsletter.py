"""
API для подписки на рассылку
"""
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from utils.logger import log_error, log_info
from db.newsletter import add_subscriber, create_newsletter_table
from utils.email_service import send_newsletter_welcome_email

router = APIRouter(tags=["Newsletter"])

class SubscribeRequest(BaseModel):
    email: EmailStr
    source: str = 'footer'

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
            return {"success": True, "message": "Successfully subscribed"}
        else:
            return JSONResponse(
                {"error": "Failed to subscribe"}, 
                status_code=500
            )
            
    except Exception as e:
        log_error(f"Error subscribing to newsletter: {e}", "newsletter")
        return JSONResponse({"error": str(e)}, status_code=500)
