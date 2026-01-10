"""
API для подписки на рассылку
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from utils.logger import log_error, log_info
from db.migrations.consolidated.schema_newsletter import add_subscriber, create_newsletter_table

router = APIRouter(tags=["Newsletter"])

class SubscribeRequest(BaseModel):
    email: EmailStr
    source: str = 'footer'

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: SubscribeRequest):
    """Подписаться на рассылку"""
    try:
        # Валидация email происходит автоматически через Pydantic EmailStr
        
        result = add_subscriber(data.email, data.source)
        
        if result:
            # TODO: Отправить приветственное письмо (в будущем)
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
