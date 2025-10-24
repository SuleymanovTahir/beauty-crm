"""
API Endpoints для работы с чатом
"""
from fastapi import APIRouter, Request, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
from integrations.instagram import send_file

from db import (
    get_chat_history, mark_messages_as_read, save_message,
    get_unread_messages_count, log_activity
)
from integrations import send_message
from utils import require_auth, get_total_unread
from logger import log_error,log_info

router = APIRouter(tags=["Chat"])


@router.get("/chat/messages")
async def get_chat_messages(
    client_id: str = Query(...),
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения чата"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    messages_raw = get_chat_history(client_id, limit=limit)
    mark_messages_as_read(client_id, user["id"])
    
    return {
        "messages": [
            {
                "id": msg[4] if len(msg) > 4 else None,
                "message": msg[0],
                "sender": msg[1],
                "timestamp": msg[2],
                "type": msg[3] if len(msg) > 3 else "text"
            }
            for msg in messages_raw
        ]
    }


@router.post("/chat/send")
async def send_chat_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение клиенту"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    instagram_id = data.get('instagram_id')
    message = data.get('message')
    
    if not instagram_id or not message:
        return JSONResponse({"error": "Missing data"}, status_code=400)
    
    try:
        result = await send_message(instagram_id, message)
        
        if "error" not in result:
            save_message(instagram_id, message, "bot")
            log_activity(user["id"], "send_message", "client", instagram_id, 
                        "Message sent")
            return {"success": True, "message": "Message sent"}
        
        return JSONResponse({"error": "Send failed"}, status_code=500)
    except Exception as e:
        log_error(f"Error sending message: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    

@router.post("/chat/send-file")
async def send_chat_file(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить файл клиенту"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    instagram_id = data.get('instagram_id')
    file_url = data.get('file_url')
    file_type = data.get('file_type', 'image')
    
    if not instagram_id or not file_url:
        return JSONResponse({"error": "Missing data"}, status_code=400)
    
    try:
        log_info(f"📤 Отправка файла от {user['username']} клиенту {instagram_id}", "api")
        result = await send_file(instagram_id, file_url, file_type)
        
        if "error" not in result:
            # Сохраняем в историю
            save_message(instagram_id, f"[Файл: {file_type}]", "bot", message_type=file_type)
            log_activity(user["id"], "send_file", "client", instagram_id, 
                        f"File sent: {file_type}")
            return {"success": True, "message": "File sent"}
        
        log_error(f"❌ Send file failed: {result.get('error')}", "api")
        return JSONResponse({"error": result.get("error", "Send failed")}, status_code=500)
    except Exception as e:
        log_error(f"❌ Error sending file: {e}", "api", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/unread-count")
async def get_unread_count(session_token: Optional[str] = Cookie(None)):
    """Получить количество непрочитанных сообщений"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return {"count": get_total_unread()}


@router.get("/chat/unread/{client_id}")
async def get_client_unread_count(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить количество непрочитанных сообщений от клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    count = get_unread_messages_count(client_id)
    return {"client_id": client_id, "unread_count": count}