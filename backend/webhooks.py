"""
Обработчики вебхуков Instagram - С УЛУЧШЕННОЙ ОБРАБОТКОЙ USERNAME
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json
import traceback
import httpx

from config import VERIFY_TOKEN, PAGE_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID
from db import (
    get_or_create_client, save_message, get_chat_history,
    detect_and_save_language, get_client_language, update_client_info
)
from bot import get_bot
from integrations import send_message, send_typing_indicator
from logger import logger, log_info, log_warning, log_error

router = APIRouter(tags=["Webhooks"])


async def fetch_username_from_api(user_id: str) -> str:
    """
    Попытка получить username из Instagram API
    
    Returns:
        str: username или пустая строка
    """
    try:
        url = f"https://graph.facebook.com/v18.0/{user_id}"
        params = {
            "fields": "username,name",
            "access_token": PAGE_ACCESS_TOKEN
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                username = data.get("username", "")
                name = data.get("name", "")
                
                if username:
                    log_info(f"✅ Username найден: @{username}", "webhook")
                    return username
                elif name:
                    log_info(f"✅ Name найден: {name}", "webhook")
                    return name
                    
            else:
                log_warning(f"⚠️ API вернул {response.status_code}: {response.text}", "webhook")
                
    except Exception as e:
        log_error(f"❌ Ошибка получения username: {e}", "webhook")
    
    return ""


async def extract_username_from_webhook(messaging_event: dict) -> str:
    """
    Извлечь username из webhook payload
    
    В некоторых случаях Instagram отправляет username в самом событии
    """
    try:
        # Проверяем различные места где может быть username
        sender = messaging_event.get("sender", {})
        
        # Иногда username есть в sender
        if "username" in sender:
            return sender["username"]
        
        # Или в user_ref
        if "user_ref" in sender:
            return sender["user_ref"]
            
        # Или в message metadata
        message = messaging_event.get("message", {})
        if "metadata" in message and "username" in message["metadata"]:
            return message["metadata"]["username"]
            
    except Exception as e:
        log_error(f"❌ Ошибка извлечения username из webhook: {e}", "webhook")
    
    return ""


@router.get("/webhook")
async def verify_webhook(request: Request):
    """Верификация webhook от Meta"""
    try:
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")
        
        log_info("=" * 70, "webhook")
        log_info("🔍 ВЕРИФИКАЦИЯ WEBHOOK", "webhook")
        log_info(f"Mode: {mode}", "webhook")
        log_info(f"Token: {token}", "webhook")
        log_info(f"Challenge: {challenge}", "webhook")
        log_info("=" * 70, "webhook")
        
        if mode == "subscribe" and token == VERIFY_TOKEN:
            log_info("✅ Webhook верифицирован!", "webhook")
            return int(challenge)
        
        log_warning("❌ Ошибка верификации webhook", "webhook")
        return JSONResponse({"error": "Verification failed"}, status_code=403)
    except Exception as e:
        log_error(f"Ошибка в verify_webhook: {e}", "webhook")
        raise


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Обработка входящих сообщений от Instagram"""
    try:
        logger.info("=" * 70)
        logger.info("📨 WEBHOOK: POST request received")
        
        # Читаем body
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8')
        
        data = json.loads(body_str)
        
        if data.get("object") != "instagram":
            logger.warning(f"⚠️ Not Instagram: {data.get('object')}")
            return {"status": "ok"}
        
        logger.info("✅ Instagram webhook confirmed")
        
        # Получаем экземпляр бота
        bot = get_bot()
        
        # Обрабатываем entries
        for entry in data.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                
                if not sender_id or "message" not in messaging:
                    continue
                
                message_data = messaging["message"]
                
                # Пропускаем эхо
                if message_data.get("is_echo"):
                    continue
                
                message_text = message_data.get("text", "").strip()
                
                if not message_text:
                    continue
                
                try:
                    # ✅ УЛУЧШЕННАЯ ЛОГИКА: Получаем username
                    username = ""
                    
                    # 1. Пробуем из webhook payload
                    username = await extract_username_from_webhook(messaging)
                    
                    # 2. Если не нашли - пробуем API
                    if not username:
                        username = await fetch_username_from_api(sender_id)
                    
                    # 3. Если всё равно не нашли - используем fallback
                    if not username:
                        username = f"user_{sender_id[:8]}"
                        log_warning(f"⚠️ Username не найден для {sender_id}, используем fallback", "webhook")
                    
                    log_info(f"👤 Username: {username}", "webhook")
                    
                    # Создать/получить клиента с username
                    get_or_create_client(sender_id, username=username)
                    
                    # ✅ НОВОЕ: Обновляем username в БД если нашли
                    if username and not username.startswith("user_"):
                        update_client_info(sender_id, name=username)
                    
                    save_message(sender_id, message_text, "client")
                    
                    # Определить язык
                    detect_and_save_language(sender_id, message_text)
                    client_language = get_client_language(sender_id)
                    
                    # Показать typing
                    await send_typing_indicator(sender_id)
                    
                    # Получить историю
                    history = get_chat_history(sender_id, limit=10)
                    
                    # Генерируем ответ через бота
                    logger.info("🤖 Generating AI response...")
                    ai_response = await bot.generate_response(
                        user_message=message_text,
                        instagram_id=sender_id,
                        history=history,
                        client_language=client_language
                    )
                    
                    logger.info(f"✅ AI response: {ai_response[:100]}")
                    
                    # Сохранить и отправить
                    save_message(sender_id, ai_response, "bot")
                    await send_message(sender_id, ai_response)
                    
                    logger.info("📤 Message sent!")
                    
                except Exception as e:
                    logger.error(f"❌ Processing error: {e}")
                    logger.error(traceback.format_exc())
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("=" * 70)
        logger.error(f"❌ CRITICAL ERROR: {e}")
        logger.error(traceback.format_exc())
        return {"status": "ok"}