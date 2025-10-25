"""
Обработчики вебхуков Instagram - ИСПРАВЛЕНИЕ СОХРАНЕНИЯ ИЗОБРАЖЕНИЙ
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


async def fetch_username_from_api(user_id: str) -> tuple:
    """Попытка получить username из Instagram API"""
    try:
        url = f"https://graph.facebook.com/v18.0/{user_id}"
        params = {
            "fields": "username,name,profile_pic",
            "access_token": PAGE_ACCESS_TOKEN,
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                username = data.get("username", "")
                name = data.get("name", "")
                profile_pic = data.get("profile_pic", "")
                
                log_info(f"✅ API data: username={username}, name={name}, has_pic={bool(profile_pic)}", "webhook")
                return username, name, profile_pic
            else:
                log_warning(f"⚠️ API вернул {response.status_code}: {response.text}", "webhook")
                return "", "", ""
                
    except httpx.TimeoutException:
        log_error(f"⏱️ Timeout при запросе к Instagram API для {user_id}", "webhook")
        return "", "", ""
    except Exception as e:
        log_error(f"❌ Ошибка получения username: {e}", "webhook", exc_info=True)
        return "", "", ""


async def extract_username_from_webhook(messaging_event: dict) -> str:
    """Извлечь username из webhook payload"""
    try:
        sender = messaging_event.get("sender", {})
        
        if "username" in sender:
            return sender["username"]
        
        if "user_ref" in sender:
            return sender["user_ref"]
            
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
        
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8')
        
        data = json.loads(body_str)
        
        if data.get("object") != "instagram":
            logger.warning(f"⚠️ Not Instagram: {data.get('object')}")
            return {"status": "ok"}
        
        logger.info("✅ Instagram webhook confirmed")
        
        bot = get_bot()
        
        for entry in data.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                
                if not sender_id or "message" not in messaging:
                    continue
                
                message_data = messaging["message"]
                
                if message_data.get("is_echo"):
                    continue

                attachments = message_data.get("attachments", [])
                if attachments:
                    for attachment in attachments:
                        attachment_type = attachment.get("type")
                        payload = attachment.get("payload", {})
                        file_url = payload.get("url")
                        
                        log_info(f"📎 Получено вложение: {attachment_type}", "webhook")
                        log_info(f"📎 URL файла: {file_url}", "webhook")
                        
                        # ✅ ИСПРАВЛЕНИЕ: Сохраняем ТОЛЬКО URL, без текста "[Файл: image]"
                        save_message(
                            sender_id, 
                            file_url,  # Сохраняем прямой URL
                            "client",
                            message_type=attachment_type
                        )
                    
                    await send_typing_indicator(sender_id)
                    await send_message(
                        sender_id, 
                        "Спасибо! Я получил ваш файл. Наш менеджер скоро свяжется с вами! 😊"
                    )
                    continue
                
                message_text = message_data.get("text", "").strip()
                
                if not message_text:
                    continue
                
                try:
                    username = ""
                    name = ""
                    profile_pic = ""
                    
                    username = await extract_username_from_webhook(messaging)
                    
                    if not username:
                        try:
                            api_result = await fetch_username_from_api(sender_id)
                            if isinstance(api_result, tuple) and len(api_result) == 3:
                                username, name, profile_pic = api_result
                            else:
                                log_error(f"❌ Неверный формат ответа API: {api_result}", "webhook")
                                username, name, profile_pic = "", "", ""
                        except Exception as api_err:
                            log_error(f"❌ API fetch error: {api_err}", "webhook", exc_info=True)
                            username, name, profile_pic = "", "", ""
                    
                    if not username:
                        username = f"user_{sender_id[:8]}"
                        log_warning(f"⚠️ Username не найден для {sender_id}, используем fallback", "webhook")
                    
                    log_info(f"👤 Username: {username}", "webhook")
                    
                    get_or_create_client(sender_id, username=username)
                    
                    if profile_pic or name:
                        update_client_info(sender_id, name=name, profile_pic=profile_pic)
                    
                    save_message(sender_id, message_text, "client")
                    
                    detect_and_save_language(sender_id, message_text)
                    client_language = get_client_language(sender_id)
                    
                    await send_typing_indicator(sender_id)
                    
                    history = get_chat_history(sender_id, limit=10)
                    
                    logger.info("🤖 Generating AI response...")
                    ai_response = await bot.generate_response(
                        user_message=message_text,
                        instagram_id=sender_id,
                        history=history,
                        client_language=client_language
                    )
                    
                    logger.info(f"✅ AI response: {ai_response[:100]}")
                    
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