"""
Обработчики вебхуков Instagram - С ПОДДЕРЖКОЙ ПРОКСИ ДЛЯ ИЗОБРАЖЕНИЙ
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json
import httpx
import os
from datetime import datetime

from config import VERIFY_TOKEN, PAGE_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID, DATABASE_NAME
from db import (
    get_or_create_client, save_message, get_chat_history,
    detect_and_save_language, get_client_language, update_client_info,get_client_bot_mode,get_salon_settings
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
        
        # ✅ Правильный синтаксис для AsyncClient
        proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

        if proxy_url:
            transport = httpx.HTTPTransport(proxy=proxy_url)
            async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
                response = await client.get(url, params=params)
        else:
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


async def get_instagram_scoped_id(sender_id: str) -> str:
    """
    Получить Instagram-Scoped ID (IGSID) из App-Scoped ID (ASID)
    
    Instagram может возвращать разные ID для одного пользователя:
    - ASID (17841448618072548) - через Messenger Platform
    - IGSID - через Instagram Graph API
    
    Эта функция пытается получить стабильный IGSID
    """
    try:
        url = f"https://graph.facebook.com/v18.0/{sender_id}"
        params = {
            "fields": "id,username",
            "access_token": PAGE_ACCESS_TOKEN,
        }
        
        proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

        if proxy_url:
            transport = httpx.HTTPTransport(proxy=proxy_url)
            async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
                response = await client.get(url, params=params)
        else:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
            response.raise_for_status()
            if response.status_code == 200:
                data = response.json()
                instagram_id = data.get("id")
                
                if instagram_id and instagram_id != sender_id:
                    log_info(f"🔄 Converted ASID {sender_id} → IGSID {instagram_id}", "webhook")
                    return instagram_id
                    
    except Exception as e:
        log_warning(f"⚠️ Не удалось получить IGSID: {e}", "webhook")
    
    return sender_id  # Возвращаем оригинальный ID


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
        
        logger.info(f"📦 Full webhook payload: {json.dumps(data, indent=2)[:500]}...")
        
        bot = get_bot()
        
        for entry in data.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                sender_id = await get_instagram_scoped_id(sender_id)
                logger.info(f"📨 Processing messaging event: {json.dumps(messaging, indent=2)[:300]}...")                
                if not sender_id or "message" not in messaging:
                    continue
                
                message_data = messaging["message"]
                
                # ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: is_echo=True означает что ЭТО МЫ ОТПРАВИЛИ
                is_echo = message_data.get("is_echo", False)
                message_text = message_data.get("text", "").strip()

                logger.info(f"📬 Message from {sender_id}: is_echo={is_echo}, text={message_text[:50]}")

                if is_echo:
                    

                    # ✅ КРИТИЧЕСКИ ВАЖНО: Проверяем sender_id
                    # Если sender_id = наш бизнес-аккаунт (17841448618072548), то это НАШЕ сообщение
                    # Если sender_id = ID клиента, то это эхо ИЗ CRM API

                    if sender_id == "17841448618072548":
                        # ✅ Это МЕНЕДЖЕР написал из Instagram Direct
                        logger.info(f"📨 Manager sent via Instagram Direct to {messaging['recipient']['id']}")

                        # Получаем ID клиента из recipient
                        client_id = messaging.get("recipient", {}).get("id")

                        if not client_id:
                            logger.warning(f"⚠️ Cannot determine client_id from echo message")
                            continue
                        
                        # ✅ СОХРАНЯЕМ ТЕКСТ если есть
                        if message_text:
                            save_message(client_id, message_text, "manager", message_type="text")
                            logger.info(f"💾 Manager message saved: {message_text[:50]}")

                        # ✅ СОХРАНЯЕМ ФАЙЛЫ если есть
                        attachments = message_data.get("attachments", [])
                        if attachments:
                            for attachment in attachments:
                                attachment_type = attachment.get("type")
                                payload = attachment.get("payload", {})
                                file_url = payload.get("url")

                                if attachment_type == "image":
                                    save_message(client_id, file_url, "manager", message_type=attachment_type)
                                else:
                                    save_message(client_id, file_url, "manager", message_type=attachment_type)

                        continue
                    else:
                        # ✅ Это эхо от БОТА из CRM API - пропускаем
                        logger.info(f"⏭️ Skipping echo from CRM API")
                        continue

                
                # ✅ 4. ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ОТ КЛИЕНТА
                if not message_text:
                    log_info(f"⚠️ Пустое сообщение от {sender_id}, пропускаем", "webhook")
                    continue
                
                log_info(f"📩 Получено сообщение от клиента {sender_id}: {message_text[:50]}", "webhook")
                
                try:
                    # ✅ ПОЛУЧАЕМ USERNAME И PROFILE_PIC
                    username = ""
                    name = ""
                    profile_pic = ""
                    
                    # Пытаемся извлечь из webhook
                    username = await extract_username_from_webhook(messaging)
                    
                    # Если не нашли - запрашиваем из API
                    if not username:
                        # Стало:
                        try:
                            url = f"https://graph.facebook.com/v18.0/{sender_id}"
                            params = {
                                "fields": "username,name,profile_pic",  # ✅ ДОБАВИЛИ profile_pic
                                "access_token": PAGE_ACCESS_TOKEN,
                            }

                            client_kwargs: dict = {"timeout": 10.0}
                            if os.getenv("ENVIRONMENT") == "production":
                                proxy_url = os.getenv("PROXY_URL")
                                if proxy_url:
                                    client_kwargs["proxies"] = proxy_url

                            proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

                            if proxy_url:
                                transport = httpx.HTTPTransport(proxy=proxy_url)
                                async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
                                    response = await client.get(url, params=params)
                            else:
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    response = await client.get(url, params=params)

                                if response.status_code == 200:
                                    data_api = response.json()
                                    username = data_api.get("username", "")
                                    name = data_api.get("name", "")
                                    profile_pic = data_api.get("profile_pic", "")  # ✅ ПОЛУЧАЕМ АВАТАР

                                    log_info(f"✅ API data: username={username}, name={name}, has_pic={bool(profile_pic)}", "webhook")
                                else:
                                    log_warning(f"⚠️ API вернул {response.status_code}: {response.text}", "webhook")
                        except Exception as api_err:
                            log_error(f"❌ API fetch error: {api_err}", "webhook", exc_info=True)
                    
                    if not username:
                        username = f"user_{sender_id[:8]}"
                        log_warning(f"⚠️ Username не найден для {sender_id}, используем fallback", "webhook")
                    
                    log_info(f"👤 Username: {username}", "webhook")
                    
                    # ✅ СОЗДАЁМ/ОБНОВЛЯЕМ КЛИЕНТА
                    get_or_create_client(sender_id, username=username)
                    
                    # ✅ ОБНОВЛЯЕМ ИМЯ (если есть)
                    # Стало:
                    if name or profile_pic:
                        update_client_info(sender_id, name=name, profile_pic=profile_pic if profile_pic else None)
                    
                    # ✅ СОХРАНЯЕМ СООБЩЕНИЕ
                    save_message(
                        sender_id, 
                        message_text, 
                        "client",
                        message_type="text"
                    )
                    log_info(f"💾 Сообщение сохранено в БД: {message_text[:30]}...", "webhook")
                    
                    # ✅ ОПРЕДЕЛЯЕМ ЯЗЫК
                    detect_and_save_language(sender_id, message_text)
                    client_language = get_client_language(sender_id)
                    
                    salon = get_salon_settings()
                    bot_globally_enabled = salon.get('bot_globally_enabled', 1)
                    
                    log_info(f"🌐 Global bot enabled: {bot_globally_enabled}", "webhook")
                    
                    if not bot_globally_enabled:
                        log_info(f"⏸️ Bot globally disabled, skipping auto-response", "webhook")
                        continue
                    
                    # ✅ Получаем режим ПОСЛЕ проверки глобальной настройки
                    bot_mode = get_client_bot_mode(sender_id)
                    log_info(f"🤖 Bot mode for {sender_id}: {bot_mode}", "webhook")
                    
                    if bot_mode == 'manual':
                        log_info(f"👤 Manual mode, skipping auto-response", "webhook")
                        continue
                    
                    # ✅ ИСПРАВЛЕНИЕ: В assistant и autopilot бот отвечает
                    elif bot_mode == 'assistant':
                        log_info(f"🤖 Assistant mode, bot will respond + suggest", "webhook")
                        # НЕ CONTINUE - продолжаем
                    elif bot_mode == 'autopilot':
                        log_info(f"🤖 Autopilot mode, bot will respond", "webhook")
                        # НЕ CONTINUE - продолжаем
                    else:
                        log_warning(f"⚠️ Unknown bot mode: {bot_mode}, defaulting to autopilot", "webhook")


                    await send_typing_indicator(sender_id)
                    
                    history = get_chat_history(sender_id, limit=10)
                    
                    logger.info("🤖 Generating AI response...")
                    try:
                        ai_response = await bot.generate_response(
                            user_message=message_text,
                            instagram_id=sender_id,
                            history=history,
                            client_language=client_language
                        )
                        logger.info(f"✅ AI response: {ai_response[:100]}")
                    except Exception as gen_error:
                        logger.error(f"❌ AI generation failed: {gen_error}")
                        logger.error(f"📋 Error type: {type(gen_error).__name__}")
                        import traceback
                        logger.error(f"📋 Traceback:\n{traceback.format_exc()}")

                        # Вернем дефолтный ответ
                        ai_response = "Извините, возникла техническая проблема. Наш менеджер скоро вам ответит! 💎"
                    
                    save_message(
                        sender_id, 
                        ai_response, 
                        "bot",
                        message_type="text"
                    )
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
    

@router.get("/webhook/test")
async def test_webhook():
    """Тестовый эндпоинт для проверки работы вебхука"""
    return {
        "status": "ok",
        "message": "Webhook is working",
        "verify_token": VERIFY_TOKEN[:5] + "...",
        "instagram_business_id": INSTAGRAM_BUSINESS_ID,
        "timestamp": datetime.now().isoformat()
    }