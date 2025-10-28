"""
API Endpoints для работы с чатом
"""
from fastapi import APIRouter, Request, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
from httpx import TimeoutException, AsyncClient
from integrations.instagram import send_file

from db import (
    get_chat_history, mark_messages_as_read, save_message,
    get_unread_messages_count, log_activity
)
from integrations import send_message
from utils import require_auth, get_total_unread
from logger import log_error,log_info,log_warning

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
        # После строки где получаем file_url, перед отправкой:
        file_url = data.get('file_url')
        file_type = data.get('file_type', 'image')

        # ✅ БЫСТРАЯ ПРОВЕРКА ФАЙЛА (только для локальных файлов)
        if file_url and file_url.startswith('https://mlediamant.com'):
            try:
                # Быстрая проверка локального файла
                import os
                from pathlib import Path
                
                url_path = file_url.replace('https://mlediamant.com', '')
                # Убираем дублирование static/ если есть
                if url_path.startswith('/static/'):
                    url_path = url_path[7:]  # убираем '/static/'
                local_path = Path("static") / url_path.lstrip('/')
                
                if not local_path.exists():
                    log_error(f"❌ Локальный файл не найден: {local_path}", "api")
                    return JSONResponse(
                        {"error": "File not found on server"},
                        status_code=404
                    )
                
                log_info(f"✅ Локальный файл найден: {local_path}", "api")
            except Exception as e:
                log_warning(f"⚠️ Ошибка проверки локального файла: {e}", "api")
                # Не блокируем отправку из-за ошибки проверки
        
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
        
        # ✅ ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА: Проверяем доступность файла локально
        if file_url.startswith('https://mlediamant.com'):
            log_info(f"🔍 Проверяем локальную доступность файла...", "api")
            try:
                import os
                from pathlib import Path
                
                # Извлекаем путь к файлу из URL
                url_path = file_url.replace('https://mlediamant.com', '')
                # Убираем дублирование static/ если есть
                if url_path.startswith('/static/'):
                    url_path = url_path[7:]  # убираем '/static/'
                local_path = Path("static") / url_path.lstrip('/')
                
                if local_path.exists():
                    file_size = local_path.stat().st_size
                    log_info(f"✅ Локальный файл найден: {local_path} ({file_size} bytes)", "api")
                else:
                    log_warning(f"⚠️ Локальный файл не найден: {local_path}", "api")
            except Exception as diag_err:
                log_warning(f"⚠️ Ошибка диагностики файла: {diag_err}", "api")

        # ✅ ИСПРАВЛЕНИЕ: Проверяем доступность URL для Instagram
        # Instagram требует публичный HTTPS URL без авторизации
        if not file_url.startswith('https://'):
            log_error(f"❌ Instagram требует HTTPS URL: {file_url}", "api")
            return JSONResponse(
                {"error": "Instagram requires HTTPS URLs"}, 
                status_code=400
            )
        
        # ✅ ПРОВЕРКА ДЛЯ LOCALHOST: Если работаем локально, файлы недоступны для Instagram
        if 'localhost' in file_url or '127.0.0.1' in file_url:
            log_error(f"❌ Instagram не может получить доступ к localhost файлам: {file_url}", "api")
            return JSONResponse(
                {"error": "Instagram cannot access localhost files. Use ngrok or deploy to production."}, 
                status_code=400
            )
        
        # ✅ УБРАЛИ ВСЕ ОГРАНИЧЕНИЯ: Принимаем файлы отовсюду
        log_info(f"📁 Принимаем файл: {file_url}", "api")
        
        # ✅ БЫСТРАЯ ПРОВЕРКА РАЗМЕРА ФАЙЛА (только для локальных файлов)
        if file_url.startswith('https://mlediamant.com'):
            try:
                url_path = file_url.replace('https://mlediamant.com', '')
                # Убираем дублирование static/ если есть
                if url_path.startswith('/static/'):
                    url_path = url_path[7:]  # убираем '/static/'
                local_path = Path("static") / url_path.lstrip('/')
                
                if local_path.exists():
                    file_size = local_path.stat().st_size
                    size_mb = file_size / (1024 * 1024)
                    log_info(f"📏 Размер файла: {size_mb:.2f} MB", "api")
                    
                    max_size = 25 if file_type == 'video' else 8
                    if size_mb > max_size:
                        log_error(f"❌ Файл слишком большой: {size_mb:.2f} MB", "api")
                        return JSONResponse(
                            {"error": f"File too large: {size_mb:.2f}MB (max {max_size}MB)"}, 
                            status_code=400
                        )
            except Exception as e:
                log_warning(f"⚠️ Ошибка проверки размера файла: {e}", "api")
                # Не блокируем отправку
        
        # ✅ Отправляем файл через Instagram API
        # Заменяем mlediamant.com на zrok URL для отправки в Instagram
        instagram_file_url = file_url
        if file_url.startswith('https://mlediamant.com'):
            # Получаем zrok URL из переменной окружения или используем текущий
            zrok_url = os.getenv('ZROK_URL', 'https://tukq4gpr4pbf.share.zrok.io')
            instagram_file_url = file_url.replace('https://mlediamant.com', zrok_url)
            log_info(f"🔄 Заменяем URL для Instagram: {file_url} -> {instagram_file_url}", "api")
        
        log_info(f"🚀 Начинаем отправку файла через Instagram API...", "api")
        log_info(f"📤 Параметры отправки: instagram_id={instagram_id}, file_url={instagram_file_url}, file_type={file_type}", "api")
        result = await send_file(instagram_id, instagram_file_url, file_type)
        log_info(f"📋 Результат отправки: {result}", "api")
        
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
        
        # ✅ Успешная отправка - сохраняем в историю с zrok URL
        file_display_name = instagram_file_url.split('/')[-1] if '/' in instagram_file_url else instagram_file_url
        save_message(
            instagram_id, 
            instagram_file_url,  # Сохраняем полный zrok URL
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