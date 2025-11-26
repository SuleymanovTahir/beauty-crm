"""
Обработчики вебхуков Instagram - С ПОДДЕРЖКОЙ ВСЕХ ФИШЕК
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json
import httpx
import os
from datetime import datetime

from core.config import VERIFY_TOKEN, PAGE_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID, DATABASE_NAME
from db import (
    get_or_create_client, save_message, get_chat_history,
    detect_and_save_language, get_client_language, update_client_info,
    get_client_bot_mode, get_salon_settings
)
from db.clients import (
    auto_fill_name_from_username, 
    track_client_interest, 
    update_client_temperature
)
from db.bookings import (
    get_incomplete_booking,
    check_if_urgent_booking
)
from bot import get_bot
from integrations import send_message, send_typing_indicator
from utils.logger import logger, log_info, log_warning, log_error

router = APIRouter(tags=["Webhooks"])

_processed_messages = {}  # {mid: timestamp}
_DEDUP_WINDOW = 300


async def fetch_username_from_api(user_id: str) -> tuple:
    """Попытка получить username из Instagram API"""
    try:
        url = f"https://graph.facebook.com/v18.0/{user_id}"
        params = {
            "fields": "username,name,profile_pic",
            "access_token": PAGE_ACCESS_TOKEN,
        }
        
        proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

        if proxy_url:
            async with httpx.AsyncClient(timeout=10.0, proxy=proxy_url) as client:
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
    """
    try:
        url = f"https://graph.facebook.com/v18.0/{sender_id}"
        params = {
            "fields": "id,username",
            "access_token": PAGE_ACCESS_TOKEN,
        }
        
        proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

        if proxy_url:
            async with httpx.AsyncClient(timeout=10.0, proxy=proxy_url) as client:
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
    
    return sender_id


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

                mid = message_data.get("mid")
                if mid:
                    now = datetime.now()
                    # Очистка старых записей
                    _processed_messages.clear() if len(_processed_messages) > 1000 else None
                    for old_mid, old_time in list(_processed_messages.items()):
                        if (now - old_time).total_seconds() > _DEDUP_WINDOW:
                            del _processed_messages[old_mid]

                    # Проверка дубликата
                    if mid in _processed_messages:
                        time_diff = (now - _processed_messages[mid]).total_seconds()
                        logger.info(f"⏭️ Duplicate message {mid} (seen {time_diff:.1f}s ago), skipping")
                        continue
                    
                    _processed_messages[mid] = now
                    logger.info(f"✅ New message {mid}, processing")
                
                # ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: is_echo=True означает что ЭТО МЫ ОТПРАВИЛИ
                is_echo = message_data.get("is_echo", False)
                message_text = message_data.get("text", "").strip()

                logger.info(f"📬 Message from {sender_id}: is_echo={is_echo}, text={message_text[:50]}")
                
                if is_echo:
                    logger.info(f"⏭️ Skipping echo message")
                    
                    # Определяем клиента (получателя)
                    client_id = messaging.get("recipient", {}).get("id")
                    
                    if not client_id:
                        logger.warning(f"⚠️ Cannot determine client_id from echo message")
                        continue
                    
                    # ✅ СОХРАНЯЕМ только сообщения менеджера (не бота!)
                    if message_text:
                        # Проверяем: это НЕ fallback-сообщение бота
                        if 'я сейчас перегружен' not in message_text.lower() and '#бот помоги#' not in message_text.lower():
                            save_message(client_id, message_text, "manager", message_type="text")
                            logger.info(f"💾 Manager message saved: {message_text[:50]}")
                    
                    # Сохраняем файлы
                    attachments = message_data.get("attachments", [])
                    if attachments:
                        for attachment in attachments:
                            attachment_type = attachment.get("type")
                            payload = attachment.get("payload", {})
                            file_url = payload.get("url")
                            save_message(client_id, file_url, "manager", message_type=attachment_type)
                    
                    continue

                # ✅ ПРОВЕРКА КОМАНДЫ #Бот помоги# (от ЛЮБОГО отправителя)
                if message_text and '#бот помоги#' in message_text.lower():
                    logger.info(f"🤖 Получена команда #Бот помоги# от {sender_id}")
                    
                    # Удаляем команду из текста
                    clean_text = message_text.replace('#Бот помоги#', '').replace('#бот помоги#', '').replace('#БОТ ПОМОГИ#', '').strip()
                    
                    if not clean_text:
                        await send_message(sender_id, "❌ Напишите вопрос после команды #Бот помоги#\n\nПример:\n#Бот помоги# клиент говорит что дорого, как ответить?")
                        continue
                    
                    # Разбиваем на вопрос и контекст
                    lines = clean_text.split('\n')
                    question = lines[0].strip()
                    context = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ''
                    
                    try:
                        # Пытаемся найти контекст из истории сообщений
                        history = get_chat_history(sender_id, limit=10)
                        
                        context_with_history = "📝 История последних сообщений:\n"
                        if history:
                            for msg in history[-5:]:
                                sender_label = "Клиент" if msg[1] == "client" else "Менеджер"
                                context_with_history += f"{sender_label}: {msg[0]}\n"
                        else:
                            context_with_history += "(История пуста)\n"
                        
                        context_with_history += f"\n💬 Дополнительный контекст:\n{context}" if context else ""
                        
                        # Генерируем совет
                        from db import get_bot_settings
                        bot_settings = get_bot_settings()
                        
                        consultation_template = bot_settings.get('manager_consultation_prompt', '')
                        
                        if not consultation_template:
                            consultation_template = """Ты — консультант по продажам. 
Дай совет менеджеру как ответить клиенту.

Структура:
1. Анализ ситуации (1-2 предложения)
2. Рекомендованный ответ (готовый текст для отправки)
3. Почему это сработает (1-2 предложения)"""
                        
                        consultation_prompt = f"""{consultation_template}

{context_with_history}

❓ ВОПРОС МЕНЕДЖЕРА:
{question}
"""
                        
                        logger.info(f"🤖 Генерируем консультацию для менеджера...")
                        advice = await bot._generate_via_proxy(consultation_prompt)
                        
                        # Форматируем ответ
                        formatted_response = f"""💡 Совет от AI-консультанта:

{advice}

---
Используй этот ответ или адаптируй под ситуацию 🎯"""
                        
                        # Отправляем совет менеджеру
                        await send_message(sender_id, formatted_response)
                        logger.info(f"✅ Консультация отправлена менеджеру {sender_id}")
                        
                    except Exception as e:
                        logger.error(f"❌ Ошибка генерации консультации: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                        await send_message(sender_id, "❌ Извините, произошла ошибка при генерации совета. Попробуйте ещё раз.")
                    
                    continue
                
                # ✅ ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ОТ КЛИЕНТА
                if not message_text:
                    log_info(f"⚠️ Пустое сообщение от {sender_id}, пропускаем", "webhook")
                    continue
                
                log_info(f"📩 Получено сообщение от клиента {sender_id}: {message_text[:50]}", "webhook")
                
                try:
                    # ✅ ПОЛУЧАЕМ USERNAME И PROFILE_PIC
                    username = ""
                    name = ""
                    profile_pic = ""
                    
                    # ✅ #1 - Автоматическое определение имени из Instagram
                    
                    # Пытаемся извлечь из webhook
                    username = await extract_username_from_webhook(messaging)
                    
                    # Если не нашли - запрашиваем из API
                    if not username:
                        try:
                            url = f"https://graph.facebook.com/v18.0/{sender_id}"
                            params = {
                                "fields": "username,name,profile_pic",
                                "access_token": PAGE_ACCESS_TOKEN,
                            }

                            proxy_url = os.getenv("PROXY_URL") if os.getenv("ENVIRONMENT") == "production" else None

                            if proxy_url:
                                async with httpx.AsyncClient(timeout=10.0, proxy=proxy_url) as client:
                                    response = await client.get(url, params=params)
                            else:
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    response = await client.get(url, params=params)

                            if response.status_code == 200:
                                data_api = response.json()
                                username = data_api.get("username", "")
                                name = data_api.get("name", "")
                                profile_pic = data_api.get("profile_pic", "")

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
                    if name or profile_pic:
                        update_client_info(
                            sender_id,
                            name=name,
                            profile_pic=profile_pic if profile_pic else ""
                        )
                    
                    # ✅ #1 - Автозаполнение имени из username
                    auto_fill_name_from_username(sender_id)
                    
                    # ✅ СОХРАНЯЕМ СООБЩЕНИЕ
                    save_message(
                        sender_id, 
                        message_text, 
                        "client",
                        message_type="text"
                    )
                    log_info(f"💾 Сообщение сохранено в БД: {message_text[:30]}...", "webhook")
                    
                    # ✅ #5 - Отслеживание интереса к услугам
                    services_keywords = {
                        'Manicure': ['маникюр', 'manicure', 'мани', 'ногти', 'nail'],
                        'Pedicure': ['педикюр', 'pedicure', 'педи'],
                        'Hair': ['волос', 'стрижка', 'hair', 'cut', 'окраш'],
                        'Massage': ['массаж', 'massage', 'спа', 'spa'],
                        'Facial': ['чистка', 'facial', 'пилинг', 'косметолог'],
                    }
                    
                    message_lower = message_text.lower()
                    for service, keywords in services_keywords.items():
                        if any(keyword in message_lower for keyword in keywords):
                            track_client_interest(sender_id, service)
                            break
                    
                    # ✅ #21 - Обновление температуры клиента
                    update_client_temperature(sender_id)
                    
                    # ✅ ОПРЕДЕЛЯЕМ ЯЗЫК
                    # Определяем язык и используем результат
                    client_language = detect_and_save_language(sender_id, message_text)
                    
                    # ✅ ПРОВЕРКА: Поддерживается ли язык?
                    try:
                        bot_instance = get_bot()
                        supported_raw = bot_instance.bot_settings.get('languages_supported', 'ru,en,ar')
                        supported_langs = [lang.strip() for lang in supported_raw.split(',')]

                        if client_language not in supported_langs:
                            log_warning(f"⚠️ Unsupported language '{client_language}', fallback to 'ru'", "webhook")
                            client_language = 'ru'

                        log_info(f"🌐 Client language: {client_language} (supported: {','.join(supported_langs)})", "webhook")
                    except Exception as lang_check_error:
                        log_error(f"⚠️ Language check failed: {lang_check_error}, using 'ru'", "webhook")
                        client_language = 'ru'  
                                 
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
                    elif bot_mode == 'assistant':
                        log_info(f"🤖 Assistant mode, bot will respond + suggest", "webhook")
                    elif bot_mode == 'autopilot':
                        log_info(f"🤖 Autopilot mode, bot will respond", "webhook")
                    else:
                        log_warning(f"⚠️ Unknown bot mode: {bot_mode}, defaulting to autopilot", "webhook")

                    await send_typing_indicator(sender_id)
                    
                    history = get_chat_history(sender_id, limit=10)
                    
                    # ✅ #4 - Проверка незавершённой записи
                    incomplete = get_incomplete_booking(sender_id)
                    
                    # ✅ #18 - Детектор "скоро уезжает"
                    is_urgent = check_if_urgent_booking(message_text)
                    
                    # ✅ #27 - Детектор корпоративных заявок
                    corporate_keywords = ['команд', 'сотрудник', 'офис', 'компани', 'корпоратив', 
                                          'группа', 'человек', 'team', 'office', 'company']
                    is_corporate = any(keyword in message_text.lower() for keyword in corporate_keywords) and \
                                   any(str(num) in message_text for num in range(5, 100))
                    
                    if is_corporate:
                        # Уведомляем менеджера
                        from api.notifications import create_notification
                        from db.users import get_all_users
                        
                        users = get_all_users()
                        managers = [u for u in users if u[4] in ['admin', 'manager']]
                        
                        for manager in managers:
                            create_notification(
                                user_id=str(manager[0]),
                                title="🏢 КОРПОРАТИВНАЯ ЗАЯВКА",
                                message=f"Клиент @{username or sender_id[:8]} запросил групповую услугу\nКонтекст: {message_text[:100]}",
                                notification_type="urgent",
                                action_url=f"/admin/chat?client_id={sender_id}"
                            )
                    
                    if is_urgent:
                        # Флаг срочности в контексте
                        log_warning(f"⚡ URGENT booking request from {sender_id}", "webhook")
                    
                    # ✅ Передаём флаги в контекст
                    context_flags = {
                        'has_incomplete_booking': incomplete is not None,
                        'incomplete_booking': incomplete,
                        'is_urgent': is_urgent,
                        'is_corporate': is_corporate
                    }
                    
                    # ✅ ПОЛУЧАЕМ ПРОГРЕСС БРОНИРОВАНИЯ
                    from db.bookings import get_booking_progress, update_booking_progress, clear_booking_progress
                    booking_progress = get_booking_progress(sender_id)
                    
                    logger.info("🤖 Generating AI response...")
                    try:
                        # ✅ ПОЛУЧАЕМ НАСТРОЙКИ ПЕРЕД ВЫЗОВОМ
                        from db import get_bot_settings
                        
                        bot_settings = get_bot_settings()
                        salon = get_salon_settings()
                        
                        # ✅ ПРАВИЛЬНЫЙ ВЫЗОВ С ВСЕМИ ПАРАМЕТРАМИ
                        ai_response = await bot.generate_response(
                            instagram_id=sender_id,
                            user_message=message_text,
                            history=history,
                            bot_settings=bot_settings,
                            salon_info=salon,
                            booking_progress=booking_progress,  # ✅ ПЕРЕДАЕМ ПРОГРЕСС
                            client_language=client_language,
                            context_flags=context_flags
                        )
                        logger.info(f"✅ AI response: {ai_response[:100]}")
                    except Exception as gen_error:
                        logger.error(f"❌ AI generation failed: {gen_error}")
                        logger.error(f"📋 Error type: {type(gen_error).__name__}")
                        import traceback
                        logger.error(f"📋 Traceback:\n{traceback.format_exc()}")
                    
                        ai_response = "Извините, возникла техническая проблема. Наш менеджер скоро вам ответит! 💎"

                    # ✅ ПАРСИНГ КОМАНДЫ СОЗДАНИЯ ЗАПИСИ
                    import re
                    from db.bookings import save_booking
                    from db import get_client_by_id

                    booking_match = re.search(
                        r'\[BOOKING_CONFIRMED\](.*?)\[/BOOKING_CONFIRMED\]',
                        ai_response,
                        re.DOTALL
                    )

                    if booking_match:
                        logger.info("📝 Found booking confirmation command!")
                        booking_data_raw = booking_match.group(1).strip()

                        # Парсим данные
                        booking_data = {}
                        for line in booking_data_raw.split('\n'):
                            if ':' in line:
                                key, value = line.split(':', 1)
                                booking_data[key.strip()] = value.strip()

                        logger.info(f"📊 Booking data parsed: {booking_data}")

                        # Получаем имя клиента
                        client = get_client_by_id(sender_id)
                        client_name = client[3] if client and client[3] else client[1] if client and client[1] else "Client"

                        # Создаем запись в БД
                        try:
                            # Формируем datetime для записи
                            booking_datetime = f"{booking_data['date']} {booking_data['time']}:00"
                            
                            # ✅ ПРОВЕРКА НА ДУБЛИКАТЫ: Проверяем существует ли уже такая запись
                            import sqlite3
                            from datetime import datetime as dt_now, timedelta
                            
                            conn_check = sqlite3.connect(DATABASE_NAME)
                            c_check = conn_check.cursor()
                            
                            # Проверяем записи за последние 5 минут с теми же параметрами
                            five_min_ago = (dt_now.now() - timedelta(minutes=5)).isoformat()
                            
                            c_check.execute("""
                                SELECT id FROM bookings 
                                WHERE instagram_id = ? 
                                  AND service_name = ? 
                                  AND datetime LIKE ?
                                  AND created_at > ?
                            """, (sender_id, booking_data['service'], f"{booking_data['date']}%", five_min_ago))
                            
                            existing = c_check.fetchone()
                            conn_check.close()
                            
                            if existing:
                                logger.warning(f"⚠️ Duplicate booking detected! Skipping save. Existing booking ID: {existing[0]}")
                            else:
                                save_booking(
                                    instagram_id=sender_id,
                                    service=booking_data['service'],
                                    datetime_str=booking_datetime,
                                    phone=booking_data['phone'],
                                    name=client_name,
                                    master=booking_data.get('master')
                                )
                                logger.info(f"✅ Booking saved successfully: {booking_data['service']} at {booking_datetime}")
                            
                            # ✅ ОЧИЩАЕМ ПРОГРЕСС ПОСЛЕ УСПЕШНОЙ ЗАПИСИ
                            clear_booking_progress(sender_id)
                            
                        except Exception as save_error:
                            logger.error(f"❌ Failed to save booking: {save_error}")
                            import traceback
                            logger.error(traceback.format_exc())


                        # Удаляем команду из ответа перед отправкой клиенту
                        ai_response = re.sub(
                            r'\[BOOKING_CONFIRMED\].*?\[/BOOKING_CONFIRMED\]',
                            '',
                            ai_response,
                            flags=re.DOTALL
                        ).strip()
                        logger.info(f"📤 Cleaned response: {ai_response[:100]}")
                    
                    # ✅ ПАРСИНГ ОБНОВЛЕНИЯ ПРОГРЕССА (если бот решил обновить контекст)
                    # Бот может вернуть [UPDATE_PROGRESS]...[/UPDATE_PROGRESS]
                    progress_match = re.search(
                        r'\[UPDATE_PROGRESS\](.*?)\[/UPDATE_PROGRESS\]',
                        ai_response,
                        re.DOTALL
                    )
                    
                    if progress_match:
                        try:
                            progress_raw = progress_match.group(1).strip()
                            new_progress = {}
                            for line in progress_raw.split('\n'):
                                if ':' in line:
                                    key, value = line.split(':', 1)
                                    new_progress[key.strip()] = value.strip()
                            
                            update_booking_progress(sender_id, new_progress)
                            logger.info(f"💾 Progress updated: {new_progress}")
                            
                            # Удаляем тег из ответа
                            ai_response = re.sub(
                                r'\[UPDATE_PROGRESS\].*?\[/UPDATE_PROGRESS\]',
                                '',
                                ai_response,
                                flags=re.DOTALL
                            ).strip()
                        except Exception as e:
                            logger.error(f"❌ Error parsing progress update: {e}")

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
                    import traceback
                    logger.error(traceback.format_exc())
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("=" * 70)
        logger.error(f"❌ CRITICAL ERROR: {e}")
        import traceback
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