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
    
    try:
        data = await request.json()
        instagram_id = data.get('instagram_id')
        file_url = data.get('file_url')
        file_type = data.get('file_type', 'image')
        
        # ✅ Валидация входных данных
        if not instagram_id:
            log_error("❌ Missing instagram_id", "api")
            return JSONResponse({"error": "instagram_id is required"}, status_code=400)
        
        if not file_url:
            log_error("❌ Missing file_url", "api")
            return JSONResponse({"error": "file_url is required"}, status_code=400)
        
        # ✅ Валидация типа файла
        allowed_types = ['image', 'video', 'audio', 'file']
        if file_type not in allowed_types:
            log_error(f"❌ Invalid file_type: {file_type}", "api")
            return JSONResponse(
                {"error": f"file_type must be one of: {', '.join(allowed_types)}"}, 
                status_code=400
            )
        
        log_info(f"📤 Отправка файла от {user['username']} клиенту {instagram_id}", "api")
        log_info(f"   URL: {file_url}", "api")
        log_info(f"   Type: {file_type}", "api")
        
        # ✅ Проверяем доступность файла перед отправкой
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                head_response = await client.head(file_url)
                log_info(f"   File check: HTTP {head_response.status_code}", "api")
                
                if head_response.status_code != 200:
                    log_error(f"❌ Файл недоступен: {file_url} (status={head_response.status_code})", "api")
                    return JSONResponse(
                        {"error": f"File not accessible (HTTP {head_response.status_code})"}, 
                        status_code=400
                    )
                
                # Проверяем размер файла (опционально)
                content_length = head_response.headers.get('content-length')
                if content_length:
                    size_mb = int(content_length) / (1024 * 1024)
                    log_info(f"   File size: {size_mb:.2f} MB", "api")
                    
                    # Instagram ограничение: 25MB для видео, 8MB для изображений
                    max_size = 25 if file_type == 'video' else 8
                    if size_mb > max_size:
                        log_error(f"❌ Файл слишком большой: {size_mb:.2f} MB (max {max_size} MB)", "api")
                        return JSONResponse(
                            {"error": f"File too large: {size_mb:.2f}MB (max {max_size}MB for {file_type})"}, 
                            status_code=400
                        )
                        
        except httpx.TimeoutException:
            log_error(f"⏱️ Timeout при проверке файла: {file_url}", "api")
            return JSONResponse({"error": "File check timeout"}, status_code=408)
        except Exception as check_err:
            log_error(f"❌ Ошибка проверки файла: {check_err}", "api", exc_info=True)
            return JSONResponse({"error": f"Cannot verify file: {str(check_err)}"}, status_code=400)
        
        # ✅ Отправляем файл через Instagram API
        result = await send_file(instagram_id, file_url, file_type)
        
        # ✅ Детальная обработка результата
        if "error" in result:
            error_msg = result.get("error", "Unknown error")
            log_error(f"❌ Instagram API error: {error_msg}", "api")
            
            # Парсим детали ошибки из Instagram API
            if "HTTP 400" in error_msg or "Bad Request" in error_msg:
                return JSONResponse(
                    {"error": "Invalid file format or URL", "details": error_msg}, 
                    status_code=400
                )
            elif "HTTP 403" in error_msg or "Forbidden" in error_msg:
                return JSONResponse(
                    {"error": "Access denied by Instagram", "details": error_msg}, 
                    status_code=403
                )
            elif "HTTP 413" in error_msg or "too large" in error_msg.lower():
                return JSONResponse(
                    {"error": "File too large for Instagram", "details": error_msg}, 
                    status_code=413
                )
            else:
                return JSONResponse(
                    {"error": "Failed to send file", "details": error_msg}, 
                    status_code=500
                )
        
        # ✅ Успешная отправка - сохраняем в историю
        file_display_name = file_url.split('/')[-1] if '/' in file_url else file_url
        save_message(
            instagram_id, 
            f"[Файл: {file_type}] {file_display_name}", 
            "bot", 
            message_type=file_type
        )
        
        # ✅ Логируем активность
        log_activity(
            user["id"], 
            "send_file", 
            "client", 
            instagram_id, 
            f"File sent: {file_type} - {file_display_name}"
        )
        
        log_info(f"✅ Файл успешно отправлен клиенту {instagram_id}", "api")
        
        return {
            "success": True, 
            "message": "File sent successfully",
            "file_type": file_type,
            "instagram_response": result
        }
        
    except ValueError as ve:
        log_error(f"❌ Validation error: {ve}", "api")
        return JSONResponse({"error": str(ve)}, status_code=400)
    except Exception as e:
        log_error(f"❌ Unexpected error sending file: {e}", "api", exc_info=True)
        return JSONResponse(
            {"error": "Internal server error", "details": str(e)}, 
            status_code=500
        )
    

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