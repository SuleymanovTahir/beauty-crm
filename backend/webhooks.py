"""
Обработчики вебхуков Instagram
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json
import traceback

from config import VERIFY_TOKEN
from db import (
    get_or_create_client, save_message, get_chat_history,
    detect_and_save_language, get_client_language
)
from bot import get_bot
from integrations import send_message, send_typing_indicator
from logger import logger, log_info, log_warning, log_error

router = APIRouter(tags=["Webhooks"])


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
                    # Создать/получить клиента
                    get_or_create_client(sender_id)
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