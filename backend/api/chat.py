"""
API Endpoints для работы с чатом
"""
from fastapi import APIRouter, Request, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
from integrations.instagram import send_file

from db import (
    get_chat_history, mark_messages_as_read, save_message,
    get_unread_messages_count, log_activity,get_client_language,
    update_client_bot_mode
)
from integrations import send_message
from utils.utils import require_auth, get_total_unread
from utils.logger import log_error,log_info,log_warning
from services.conversation_context import ConversationContext
from core.config import BASE_URL

router = APIRouter(tags=["Chat"])

_processing_suggestions = set()

def get_messenger_chat_history(client_id: str, messenger_type: str = 'instagram', limit: int = 50):
    """Получить историю чата по типу мессенджера"""

    from core.config import DATABASE_NAME
    from db.connection import get_db_connection

    conn = get_db_connection()

    c = conn.cursor()

    if messenger_type == 'instagram':
        # Для Instagram используем старую таблицу chat_history
        c.execute("""SELECT message, sender, timestamp, message_type, id
                     FROM chat_history
                     WHERE instagram_id = %s
                     ORDER BY timestamp DESC LIMIT %s""",
                  (client_id, limit))
    else:
        # Для других мессенджеров используем messenger_messages
        c.execute("""
            SELECT message_text, sender_type, created_at,
                   COALESCE(attachments_json, 'text'), id
            FROM messenger_messages
            WHERE client_id = %s AND messenger_type = %s
            ORDER BY created_at DESC LIMIT %s
        """, (client_id, messenger_type, limit))

    messages = c.fetchall()
    conn.close()

    return list(reversed(messages))

@router.get("/chat/messages")
async def get_chat_messages(
    client_id: str = Query(...),
    limit: int = Query(50),
    messenger: Optional[str] = Query('instagram'),
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения чата с фильтрацией по мессенджеру"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Валидируем тип мессенджера
    valid_messengers = ['instagram', 'telegram', 'whatsapp', 'tiktok']
    if messenger not in valid_messengers:
        messenger = 'instagram'

    messages_raw = get_messenger_chat_history(client_id, messenger, limit=limit)
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
        ],
        "messenger": messenger
    }

@router.post("/chat/send")
async def send_chat_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение клиенту (только admin, director, manager, sales)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # 🔒 КРИТИЧНО: Только определенные роли могут отправлять сообщения
    ALLOWED_TO_SEND_MESSAGES = ["admin", "director", "manager", "sales"]
    
    if user["role"] not in ALLOWED_TO_SEND_MESSAGES:
        log_warning(
            f"🔒 SECURITY: {user['role']} {user['username']} attempted to send message", 
            "security"
        )
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to send messages to clients"
        )
    
    data = await request.json()
    instagram_id = data.get('instagram_id')
    message = data.get('message')
    
    if not instagram_id or not message:
        return JSONResponse({"error": "Missing data"}, status_code=400)
    
    try:
        log_info(f"📤 {user['role']} {user['username']} sending message to {instagram_id}", "chat")
        
        result = await send_message(instagram_id, message)
        
        if "error" not in result:
            save_message(instagram_id, message, "bot")
            log_activity(user["id"], "send_message", "client", instagram_id, 
                        f"Message sent by {user['role']}")
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
    """Отправить файл клиенту (только admin, director, manager, sales)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # 🔒 КРИТИЧНО: Только определенные роли могут отправлять файлы
    ALLOWED_TO_SEND_MESSAGES = ["admin", "director", "manager", "sales"]
    
    if user["role"] not in ALLOWED_TO_SEND_MESSAGES:
        log_warning(
            f"🔒 SECURITY: {user['role']} {user['username']} attempted to send file", 
            "security"
        )
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to send files to clients"
        )
    
    try:
        data = await request.json()
        instagram_id = data.get('instagram_id')
        # После строки где получаем file_url, перед отправкой:
        file_url = data.get('file_url')
        file_type = data.get('file_type', 'image')

        # ✅ БЫСТРАЯ ПРОВЕРКА ФАЙЛА (только для локальных файлов)
        if file_url and file_url.startswith(BASE_URL):
            try:
                # Быстрая проверка локального файла
                import os
                from pathlib import Path
                
                url_path = file_url.replace(BASE_URL, '')
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
        if file_url.startswith(BASE_URL):
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
        if file_url.startswith(BASE_URL):
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
        # Заменяем BASE_URL на zrok URL для отправки в Instagram (если используется production URL)
        instagram_file_url = file_url
        if file_url.startswith(BASE_URL) and BASE_URL.startswith('https://'):
            # Получаем zrok URL из переменной окружения или используем текущий
            zrok_url = os.getenv('ZROK_URL', 'https://tukq4gpr4pbf.share.zrok.io')
            instagram_file_url = file_url.replace(BASE_URL, zrok_url)
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

@router.post("/chat/ask-bot")
async def ask_bot_advice(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Запросить совет у бота (для менеджера)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    manager_question = data.get('question', '').strip()
    context = data.get('context', '').strip()
        
    # ✅ КРИТИЧЕСКАЯ ПРОВЕРКА
    if not manager_question:
        log_warning(f"⚠️ Empty question from {user['username']}", "api")
        return JSONResponse({"error": "Question is required"}, status_code=400)
    
    log_info(f"💡 Manager advice request: Q='{manager_question[:50]}', Ctx={len(context)} chars", "api")
    if context:
        log_info(f"   Контекст: {context[:100]}...", "api")
        
    if not manager_question:
        return JSONResponse({"error": "Missing question"}, status_code=400)
    
    try:
        # Получаем бота
        from bot import get_bot
        bot = get_bot()
        
        # ✅ ЗАМЕНИТЬ ВЕСЬ БЛОК consultation_prompt
        # (с "Ты — эксперт-консультант..." до "НЕ пиши напрямую для клиента!")
        
        # ВСТАВИТЬ НОВЫЙ КОД:
        from db import get_bot_settings
        bot_settings = get_bot_settings()
        
        consultation_template = bot_settings.get('manager_consultation_prompt', '')
        
        if not consultation_template:
            consultation_template = """Ты — консультант по продажам. 
Дай совет менеджеру как ответить клиенту.

Структура:
1. Анализ ситуации
2. Рекомендация (с примером текста)
3. Обоснование"""
        
        consultation_prompt = f"""{consultation_template}

{f"КОНТЕКСТ СИТУАЦИИ:{chr(10)}{context}{chr(10)}" if context else ""}

ВОПРОС МЕНЕДЖЕРА:
{manager_question}
"""
        
        # Генерируем ответ (КАК БЫЛО)
        advice = await bot._generate_via_proxy(consultation_prompt)
        
        log_info(f"✅ Bot advice generated for {user['username']}", "api")
        
        return {
            "success": True,
            "advice": advice
        }
        
    except Exception as e:
        log_error(f"Error generating bot advice: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

# НОВЫЙ ENDPOINT: Предложение ответа от бота (режим "ассистент")
@router.post("/chat/bot-suggest")
async def get_bot_suggestion(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Получить предложение ответа от бота (не отправляет клиенту)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        client_id = data.get('client_id')
        
        if not client_id:
            return JSONResponse({"error": "Missing client_id"}, status_code=400)

        request_key = f"{client_id}_{user['id']}"

        if request_key in _processing_suggestions:
            log_warning(f"⚠️ Duplicate request ignored for {client_id}", "api")
            return JSONResponse(
                {"error": "Already processing suggestion for this client"}, 
                status_code=429
            )
        
        # Помечаем что начали обработку
        _processing_suggestions.add(request_key)
        
        # ✅ НОВОЕ: Логирование для отладки
        log_info(f"💡 Менеджер {user['username']} запросил совет", "api")
        
        # ✅ Получаем последние сообщения (включая несколько подряд от клиента)
        history = get_chat_history(client_id, limit=20)
        
        # ✅ КРИТИЧЕСКИ ВАЖНО: Находим все непрочитанные сообщения клиента подряд
        unread_messages = []
        for msg in reversed(history):  # Идем с конца
            if msg[1] == 'client':  # sender == 'client'
                unread_messages.insert(0, msg[0])  # Добавляем в начало
            else:
                break  # Как только встретили ответ менеджера/бота - останавливаемся
        
        if not unread_messages:
            return JSONResponse({"error": "No unread messages"}, status_code=400)
        
        # ✅ Объединяем все непрочитанные сообщения в один контекст
        combined_message = "\n\n".join(unread_messages)
        
        log_info(f"🤖 Bot suggestion request: {len(unread_messages)} unread messages from {client_id}", "api")
        log_info(f"📝 Combined: {combined_message[:100]}...", "api")
        # Получаем язык клиента
        client_language = get_client_language(client_id)

        # Генерируем ответ
        from bot import get_bot
        from db import get_bot_settings, get_salon_settings
        
        bot = get_bot()
        bot_settings = get_bot_settings()
        salon_info = get_salon_settings()
        
        # Получаем прогресс бронирования (если есть)
        from db.bookings import get_booking_progress
        booking_progress = get_booking_progress(client_id)
        
        ai_response = await bot.generate_response(
            instagram_id=client_id,
            user_message=combined_message,
            history=history,
            bot_settings=bot_settings,
            salon_info=salon_info,
            booking_progress=booking_progress,
            client_language=client_language
        )
        
        log_info(f"✅ Bot suggestion generated: {ai_response[:50]}...", "api")
        
        return {
            "success": True,
            "suggestion": ai_response,
            "unread_count": len(unread_messages)
        }
        
    except Exception as e:
        log_error(f"Error generating bot suggestion: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        # ✅ ДОБАВЛЕНО: Гарантированная очистка флага обработки
        request_key = f"{client_id}_{user['id']}" if 'client_id' in locals() and 'user' in locals() else None
        if request_key:
            _processing_suggestions.discard(request_key)

# НОВЫЙ ENDPOINT: Изменить режим бота для клиента
# НОВЫЙ ENDPOINT: Изменить режим бота для клиента
@router.post("/clients/{client_id}/bot-mode")
async def update_client_bot_mode_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить режим бота для клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        mode = data.get('mode')
        
        if mode not in ['manual', 'assistant', 'autopilot']:
            return JSONResponse({"error": "Invalid mode"}, status_code=400)
        
        update_client_bot_mode(client_id, mode)
        
        log_info(f"🔧 Bot mode changed for {client_id}: {mode}", "api")
        
        return {"success": True, "mode": mode}

    except Exception as e:
        log_error(f"Error updating bot mode: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

# ========================================
# CONVERSATION CONTEXT ENDPOINTS
# ========================================

@router.get("/chat/{client_id}/context")
async def get_conversation_context_api(
    client_id: str,
    context_type: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить контекст разговора клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conv_context = ConversationContext(client_id)

        if context_type:
            # Получить конкретный тип контекста
            context = conv_context.get_context(context_type)
            if context:
                return {
                    "client_id": client_id,
                    "context_type": context_type,
                    "context": context
                }
            else:
                return JSONResponse(
                    {"error": f"Context type '{context_type}' not found or expired"},
                    status_code=404
                )
        else:
            # Получить все активные контексты
            all_contexts = conv_context.get_all_active_contexts()
            return {
                "client_id": client_id,
                "contexts": all_contexts,
                "count": len(all_contexts)
            }

    except Exception as e:
        log_error(f"Error getting conversation context: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/chat/{client_id}/context")
async def save_conversation_context_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Сохранить контекст разговора"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        context_type = data.get('context_type')
        context_data = data.get('context_data')
        expires_in_minutes = data.get('expires_in_minutes', 30)

        if not context_type or not context_data:
            return JSONResponse(
                {"error": "context_type and context_data are required"},
                status_code=400
            )

        conv_context = ConversationContext(client_id)
        success = conv_context.save_context(
            context_type=context_type,
            context_data=context_data,
            expires_in_minutes=expires_in_minutes
        )

        if success:
            log_activity(user["id"], "save_conversation_context", "client",
                        client_id, f"Context: {context_type}")
            return {
                "success": True,
                "message": "Context saved",
                "context_type": context_type,
                "expires_in_minutes": expires_in_minutes
            }
        else:
            return JSONResponse({"error": "Failed to save context"}, status_code=500)

    except Exception as e:
        log_error(f"Error saving conversation context: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/chat/{client_id}/context/{context_type}")
async def update_conversation_context_api(
    client_id: str,
    context_type: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить существующий контекст разговора"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        update_data = data.get('update_data')
        extend_expiry = data.get('extend_expiry', False)
        expires_in_minutes = data.get('expires_in_minutes', 30)

        if not update_data:
            return JSONResponse({"error": "update_data is required"}, status_code=400)

        conv_context = ConversationContext(client_id)
        success = conv_context.update_context(
            context_type=context_type,
            update_data=update_data,
            extend_expiry=extend_expiry,
            expires_in_minutes=expires_in_minutes
        )

        if success:
            log_activity(user["id"], "update_conversation_context", "client",
                        client_id, f"Context: {context_type}")
            return {
                "success": True,
                "message": "Context updated",
                "context_type": context_type
            }
        else:
            return JSONResponse({"error": "Failed to update context"}, status_code=500)

    except Exception as e:
        log_error(f"Error updating conversation context: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/chat/{client_id}/context")
async def clear_conversation_context_api(
    client_id: str,
    context_type: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Удалить контекст разговора"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conv_context = ConversationContext(client_id)
        success = conv_context.clear_context(context_type)

        if success:
            log_activity(user["id"], "clear_conversation_context", "client",
                        client_id, f"Context: {context_type or 'all'}")
            return {
                "success": True,
                "message": f"Context {'all' if not context_type else context_type} cleared"
            }
        else:
            return JSONResponse({"error": "Failed to clear context"}, status_code=500)

    except Exception as e:
        log_error(f"Error clearing conversation context: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)