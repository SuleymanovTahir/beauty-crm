# backend/bot/core.py

from google import genai
import httpx
import os
import asyncio
import logging  # ✅ ДОБАВЛЕНО
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta
from bot.tools import get_available_time_slots, check_time_slot_available
from utils.datetime_utils import get_current_time

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from core.config import GEMINI_API_KEY, GEMINI_MODEL
from db import (
    get_salon_settings,
    get_bot_settings,
    get_client_by_id,
)
from core.config import DEFAULT_HOURS_WEEKDAYS

# ✅ ДОБАВЛЕНО: Инициализация logger
logger = logging.getLogger(__name__)

class SalonBot:
    """
    Главный класс AI-бота для салона красоты

    Отвечает за:
    - Загрузку настроек из БД
    - Построение промптов
    - Генерацию ответов через Gemini (с прокси)
    - Обработку логики диалогов
    """

    def __init__(self):
        """Инициализация бота - загружаем настройки из БД"""
        self.reload_settings()

        # ✅ Настройка прокси для обхода геоблокировки
        environment = os.getenv("ENVIRONMENT", "development")
        
        # Load proxy list (PROXY_URL, PROXY_URL_1, PROXY_URL_2...)
        self.proxies = []
        
        # Legacy/Single proxy
        legacy_proxy = os.getenv("PROXY_URL")
        if legacy_proxy:
            self.proxies.append(legacy_proxy)
            
        # Numbered proxies
        for i in range(1, 10):
            p = os.getenv(f"PROXY_URL_{i}")
            if p and p not in self.proxies:
                self.proxies.append(p)

        print("=" * 50)
        print(f"🔍 ENVIRONMENT: {environment}")
        print(f"🔍 PROXIES LOADED: {len(self.proxies)}")

        # ✅ Load API KEYS (GEMINI_API_KEY, GEMINI_API_KEY_1, ...)
        self.api_keys = []
        base_key = os.getenv("GEMINI_API_KEY")
        if base_key:
            self.api_keys.append(base_key)
            
        for i in range(1, 10):
            k = os.getenv(f"GEMINI_API_KEY_{i}")
            if k and k not in self.api_keys:
                self.api_keys.append(k)
                
        print(f"🔍 API KEYS LOADED: {len(self.api_keys)}")

        # Configure initial client with first key
        if self.api_keys:
             self.client = genai.Client(api_key=self.api_keys[0])
        else:
             print("❌ NO API KEYS FOUND!")
             self.client = None

        self.proxy_index = 0
        self.key_index = 0

        print("✅ Бот инициализирован (Gemini Multi-Key + Proxy Rotation)")

    def reload_settings(self):
        """Перезагрузить настройки из БД"""
        from .prompts import PromptBuilder

        self.salon = get_salon_settings()
        self.bot_settings = get_bot_settings()

        # ✅ Инициализируем prompt_builder
        self.prompt_builder = PromptBuilder(
            salon=self.salon,
            bot_settings=self.bot_settings
        )

        print(f"✅ Настройки загружены: {self.salon['name']}")

    def build_system_prompt(
        self,
        instagram_id: str,
        history: List[Tuple],
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru'
    ) -> str:
        """..."""
        from .prompts import PromptBuilder

        builder = PromptBuilder(
            salon=self.salon,
            bot_settings=self.bot_settings
        )

        # ✅ СНАЧАЛА СОЗДАЁМ ПРОМПТ
        system_prompt = builder.build_full_prompt(
            instagram_id=instagram_id,
            history=history,
            booking_progress=booking_progress or {},
            client_language=client_language
        )

        # ✅ ПОТОМ ПРОВЕРЯЕМ
        if "ДОСТУПНЫЕ МАСТЕРА" in system_prompt:
            print(f"   ✅ Блок мастеров найден")
        else:
            print(f"   ⚠️ Блок мастеров ОТСУТСТВУЕТ!")

        return system_prompt

    async def generate_response(
        self,
        instagram_id: str,
        user_message: str,
        history: List[Tuple],
        bot_settings: Dict,
        salon_info: Dict,
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru',
        context_flags: Optional[Dict] = None  # ✅ ДОБАВЛЕНО
    ) -> str:
        """
        Генерация ответа от AI с проверкой доступных слотов в БД

        Args:
            instagram_id: ID клиента
            user_message: Сообщение от клиента
            history: История диалога
            bot_settings: Настройки бота из БД
            salon_info: Информация о салоне
            booking_progress: Прогресс бронирования
            client_language: Язык клиента
            context_flags: Флаги контекста (срочность, незавершённая запись и т.д.)

        Returns:
            str: Ответ от AI
        """
        try:
            from datetime import datetime, timedelta
            import re
            from bot.tools import get_available_time_slots, check_time_slot_available

            if context_flags is None:
                context_flags = {}

            print("=" * 50)
            print(f"🤖 Generating AI response (Gemini via proxy)...")
            print(f"📝 User message: {user_message}")
            print(f"👤 Instagram ID: {instagram_id}")
            print(f"🌐 Language: {client_language}")

            # Получаем поддерживаемые языки из БД
            supported_langs = bot_settings.get('languages_supported', 'ru,en,ar')
            print(f"🗂️ Supported langs from DB: {supported_langs}")

            # ✅ АВТООПРЕДЕЛЕНИЕ ЯЗЫКА из сообщения
            def detect_message_language(text: str) -> str:
                """Простое определение языка по характерным символам/словам"""
                text_lower = text.lower()
                
                # Арабский - по символам
                if any('\u0600' <= c <= '\u06FF' for c in text):
                    return 'ar'
                
                # Русский - по кириллице
                if any('\u0400' <= c <= '\u04FF' for c in text):
                    return 'ru'
                
                # Английский - по ключевым словам
                english_words = ['hello', 'hi', 'how', 'want', 'book', 'appointment', 'please', 'thanks', 'when', 'what', 'price']
                if any(word in text_lower for word in english_words):
                    return 'en'
                
                return None  # Не удалось определить
            
            detected_lang = detect_message_language(user_message)
            if detected_lang and detected_lang != client_language:
                print(f"🔄 Language auto-detected: {detected_lang} (was: {client_language})")
                client_language = detected_lang

            # Проверяем соответствие языка клиента поддерживаемым
            client_lang_matches = client_language in supported_langs.split(',')
            print(f"✅ Client lang matches: {client_lang_matches}")

            # Логируем историю для отладки
            print(f"📊 History length: {len(history)}")

            # ========================================
            # ✅ ПРОВЕРКА КОНТЕКСТНЫХ ФЛАГОВ
            # ========================================

            additional_context = ""

            # ========================================
            # ✅ ИСТОРИЯ И СТАТИСТИКА КЛИЕНТА
            # ========================================
            try:
                from db.client_history import get_client_stats, get_recommended_services
                client_stats = get_client_stats(instagram_id)
                recommendations = get_recommended_services(instagram_id)
                
                additional_context += f"\n📊 СТАТИСТИКА КЛИЕНТА:\n"
                if client_stats['is_returning']:
                    additional_context += f"- Постоянный клиент: {client_stats['total_visits']} визитов\n"
                    if client_stats['last_visit_date']:
                        additional_context += f"- Последний визит: {client_stats['last_visit_date']} ({client_stats['last_service']})\n"
                    if client_stats['is_vip']:
                        additional_context += "- ⭐ VIP КЛИЕНТ (особое внимание!)\n"
                else:
                    additional_context += "- Новый клиент (первый визит)\n"
                
                if recommendations:
                    additional_context += f"- Рекомендуемые услуги: {', '.join(recommendations)}\n"
                
                # ✅ #31 - POST-VISIT FOLLOW-UP (1-5 дней после визита)
                if client_stats.get('last_visit_date'):
                    try:
                        from datetime import datetime as dt_class
                        last_visit = dt_class.strptime(client_stats['last_visit_date'], '%Y-%m-%d').date()
                        today = get_current_time().date()
                        days_since_visit = (today - last_visit).days
                        
                        if 1 <= days_since_visit <= 5:
                            last_service = client_stats.get('last_service', 'процедуру')
                            additional_context += f"""
🌟 КЛИЕНТ БЫЛ У НАС {days_since_visit} ДН. НАЗАД ({last_service})!

⚠️ ЭТО ИДЕАЛЬНЫЙ МОМЕНТ ДЛЯ FOLLOW-UP:
1. Спроси как понравился результат: "Как вам {last_service}? Всё устроило?"
2. Предложи оставить отзыв: "Будем рады вашему отзыву в Google/Instagram!"
3. Предложи следующую запись: "Кстати, можем сразу запланировать следующий визит?"

💡 НЕ БУДЬ НАВЯЗЧИВОЙ - это дружеский follow-up, не продажа!
"""
                    except Exception as e:
                        print(f"⚠️ Error calculating days since visit: {e}")
                
                # ✅ #33 - ПРОВЕРКА ДНЯ РОЖДЕНИЯ (скидка ±7 дней)
                try:
                    from db.clients import get_client_by_id
                    client_data = get_client_by_id(instagram_id)
                    if client_data:
                        birthday = client_data[10] if len(client_data) > 10 else None  # birthday field
                        if birthday:
                            from datetime import datetime as dt_class
                            today = get_current_time().date()
                            
                            # Парсим дату рождения
                            if isinstance(birthday, str):
                                try:
                                    bday = dt_class.strptime(birthday, '%Y-%m-%d').date()
                                except:
                                    bday = None
                            else:
                                bday = birthday
                            
                            if bday:
                                # Сравниваем только день и месяц
                                this_year_bday = bday.replace(year=today.year)
                                days_to_bday = (this_year_bday - today).days
                                
                                if -3 <= days_to_bday <= 7:  # 3 дня после или 7 дней до
                                    additional_context += f"""
🎂 СКОРО ДЕНЬ РОЖДЕНИЯ КЛИЕНТА! (через {days_to_bday} дней)

⚠️ ОБЯЗАТЕЛЬНО ПОЗДРАВЬ И ПРЕДЛОЖИ СКИДКУ:
"С наступающим днём рождения! 🎉 У нас для вас подарок — скидка 15% на любую услугу! Действует неделю. Записать вас?"

💡 Если ДР уже прошёл (до 3 дней назад) - тоже поздравь!
"""
                except Exception as e:
                    print(f"⚠️ Error checking birthday: {e}")
                
                # ✅ #34 - РЕФЕРАЛЬНАЯ ПРОГРАММА (для новых клиентов)
                if not client_stats['is_returning']:
                    pass # Referral program prompt removed to avoid aggressive greeting
            except Exception as e:
                print(f"⚠️ Error fetching client stats: {e}")

            # ========================================
            # ✅ ПРЕДПОЧТЕНИЯ КЛИЕНТА (SmartAssistant)
            # ========================================
            try:
                from services.smart_assistant import SmartAssistant
                smart_assistant = SmartAssistant(instagram_id)
                if smart_assistant.preferences:
                    prefs = smart_assistant.preferences
                    pref_master = prefs.get('preferred_master')
                    pref_service = prefs.get('preferred_service')
                    
                    if pref_master or pref_service:
                        additional_context += f"\n🧠 ПРЕДПОЧТЕНИЯ КЛИЕНТА (помни и используй!):\n"
                        if pref_master:
                            additional_context += f"- Любимый мастер: {pref_master}\n"
                        if pref_service:
                            additional_context += f"- Любимая услуга: {pref_service}\n"
                        additional_context += "💡 СОВЕТ: Предложи записаться к любимому мастеру/на любимую услугу!\n"
                        additional_context += f'   Пример: "Записать вас к {pref_master or "вашему мастеру"} на {pref_service or "привычную услугу"}?"\n'
            except Exception as e:
                print(f"⚠️ Error loading client preferences: {e}")

            # ✅ #4 - Незавершённая запись
            if context_flags.get('has_incomplete_booking'):
                incomplete = context_flags.get('incomplete_booking')
                if incomplete:
                    additional_context += f"""
    🔄 У КЛИЕНТА ЕСТЬ НЕЗАВЕРШЁННАЯ ЗАПИСЬ:
    - Услуга: {incomplete.get('service_name', 'не указана')}
    - Дата: {incomplete.get('date', 'не указана')}
    - Время: {incomplete.get('time', 'не указано')}
    - Телефон: {incomplete.get('phone', 'не указан')}

    ⚠️ СПРОСИ: "Вижу вы начали запись. Продолжим?"
    """

            # ✅ #18 - Срочная запись
            if context_flags.get('is_urgent'):
                additional_context += """
    ⚡ КЛИЕНТ СРОЧНО НУЖДАЕТСЯ В ЗАПИСИ!
    Слова вроде "срочно", "уезжаю", "скоро уезжаю" в сообщении.

    ⚠️ ДЕЙСТВУЙ БЫСТРО:
    - Предложи БЛИЖАЙШИЕ доступные слоты (сегодня/завтра)
    - Упрости процесс - сразу предлагай конкретное время
    - Будь решительным: "Могу записать вас на сегодня в 17:00. Согласны?"
    """

            # ✅ #27 - Корпоративная заявка
            if context_flags.get('is_corporate'):
                additional_context += """
    🏢 КОРПОРАТИВНАЯ ЗАЯВКА (группа >5 человек)!

    ⚠️ НЕ ЗАПИСЫВАЙ САМОСТОЯТЕЛЬНО!
    Скажи: "Для группового визита свяжу вас с менеджером. Он подберёт оптимальное время и условия. Один момент!"

    Менеджер УЖЕ получил уведомление.
    """

            # ✅ #28 - Групповая запись (2-4 человека)
            group_keywords = ['с подругой', 'с другом', 'вдвоём', 'вдвоем', 'втроём', 'втроем', 
                              'нас двое', 'нас трое', 'нас 2', 'нас 3', 'на двоих', 'на троих',
                              'with friend', 'together', 'both of us', 'two of us']
            is_group = any(kw in user_message.lower() for kw in group_keywords)
            
            if is_group and not context_flags.get('is_corporate'):
                additional_context += """
    👭 ГРУППОВАЯ ЗАПИСЬ (2-4 человека)!
    
    ⚠️ ВАЖНО:
    1. Уточни количество человек: "Сколько вас будет?"
    2. Уточни услуги для каждого: "Обе на маникюр или разные услуги?"
    3. Предложи ПАРАЛЛЕЛЬНЫЕ слоты (к разным мастерам одновременно)
       ИЛИ ПОСЛЕДОВАТЕЛЬНЫЕ (к одному мастеру подряд)
    
    💡 ПРИМЕР ОТВЕТА:
    "Отлично, вдвоём! 😊 Могу записать вас параллельно:
    • Вы к Гуле на 15:00
    • Подруга к Ляззат на 15:00
    Или хотите к одному мастеру подряд?"
    """

            # ✅ #30 - Детектор фрустрации и эскалация к менеджеру
            frustration_keywords = ['человек', 'менеджер', 'оператор', 'живой', 'недоволен', 'недовольна',
                                    'ужас', 'кошмар', 'возмутительно', 'верните деньги', 'жалоба',
                                    'не понимаешь', 'не понимаете', 'человека позови', 'настоящий человек',
                                    'speak to human', 'manager please', 'real person', 'complaint',
                                    'админ', 'администратор', 'директор', 'главный', 'начальство']
            is_frustrated = any(kw in user_message.lower() for kw in frustration_keywords)
            
            is_frustrated = any(kw in user_message.lower() for kw in frustration_keywords)
            
            if is_frustrated:
                print(f"😤 Frustration/Manager request detected! Keywords found.")
                
                additional_context += """
    😤 КЛИЕНТ РАССТРОЕН / ПРОСИТ МЕНЕДЖЕРА!
    
    ⚠️ ТВОЯ ЗАДАЧА - ДЕЭСКАЛАЦИЯ:
    1. Признай проблему: "Понимаю, это неприятно"
    2. Покажи заботу: "Сейчас передам ваш вопрос менеджеру"
    3. Дай конкретику: "Менеджер свяжется с вами в течение 15 минут"
    
    💡 ПРИМЕР: "Понимаю вас! Передаю ваш вопрос менеджеру прямо сейчас — он свяжется с вами в ближайшее время. Извините за неудобства!"
    
    ❌ НЕ СПОРЬ и НЕ ОПРАВДЫВАЙСЯ!
    """
                
                # Fetch client details for enriched notification
                client_name = "Неизвестный"
                client_username = ""
                client_phone = ""
                
                try:
                    from db.clients import get_client_by_id
                    client_data = get_client_by_id(instagram_id)
                    if client_data:
                        # 0:id, 1:username, 2:phone, 3:name
                        client_username = client_data[1] or ""
                        client_phone = client_data[2] or "Не указан"
                        client_name = client_data[3] or client_username or "Без имени"
                except Exception as e:
                    print(f"⚠️ Error fetching client details: {e}")

                # Determine platform and profile link
                platform_icon = "❓"
                profile_link = "Не найден"
                platform_name = "Unknown"

                if instagram_id.startswith("telegram_"):
                    platform_icon = "✈️"
                    platform_name = "Telegram"
                    tg_id = instagram_id.replace("telegram_", "")
                    if client_username:
                         profile_link = f"https://t.me/{client_username.replace('@', '')}"
                    else:
                         profile_link = f"tg://user?id={tg_id}"
                
                elif instagram_id.startswith("whatsapp_"):
                    platform_icon = "💚"
                    platform_name = "WhatsApp"
                    if client_phone and client_phone != "Не указан":
                        clean_phone = client_phone.replace('+', '').replace(' ', '').replace('-', '')
                        profile_link = f"https://wa.me/{clean_phone}"
                    else:
                        profile_link = "Нет номера"
                
                else:
                    # Instagram
                    platform_icon = "📸"
                    platform_name = "Instagram"
                    if client_username:
                        profile_link = f"https://instagram.com/{client_username}"
                    else:
                        profile_link = f"https://instagram.com/{instagram_id}"

                # Text for notifications
                alert_header = f"{platform_icon} <b>ТРЕБУЕТСЯ МЕНЕДЖЕР</b>"
                client_info_text = f"""
<b>Клиент:</b> {client_name}
<b>Никнейм:</b> {client_username or '-'}
<b>Телефон:</b> {client_phone}
<b>Ссылка:</b> <a href="{profile_link}">{profile_link}</a>
"""
                
                # Уведомляем менеджеров
                try:
                    from api.notifications import create_notification
                    from db.users import get_all_users
                    
                    users = get_all_users()
                    managers = [u for u in users if u[4] in ['admin', 'manager', 'director']]
                    
                    for manager in managers:
                        print(f"🔔 Sending notification to manager {manager[0]} ({manager[4]})...")
                        create_notification(
                            user_id=str(manager[0]),
                            title="😤 КЛИЕНТ НЕДОВОЛЕН",
                            message=f"{client_name} ({platform_name}): {user_message[:100]}",
                            notification_type="urgent",
                            action_url=f"/admin/chat?client_id={instagram_id}"
                        )
                        print(f"   ✅ Notification created in DB")
                        
                        # Email notification
                        manager_email = manager[2]  # email field
                        if manager_email:
                            try:
                                from utils.email import send_email_async
                                await send_email_async(
                                    recipients=[manager_email],
                                    subject=f"🔥 СРОЧНО: Клиент требует менеджера ({client_name})",
                                    message=f"""
                                    Внимание! Клиент требует связи с менеджером.
                                    
                                    Имя: {client_name}
                                    Платформа: {platform_name}
                                    Телефон: {client_phone}
                                    Ссылка: {profile_link}
                                    
                                    Последнее сообщение: "{user_message}"
                                    
                                    Перейти в чат CRM: https://beauty-crm.com/admin/chat?client_id={instagram_id}
                                    """,
                                    html=f"""
                                    <h2>🔥 Клиент требует внимания!</h2>
                                    <p><strong>Клиент:</strong> {client_name} ({platform_name})</p>
                                    <p><strong>Телефон:</strong> {client_phone}</p>
                                    <p><strong>Ссылка:</strong> <a href="{profile_link}" style="color: #1a73e8;">{profile_link}</a></p>
                                    <hr>
                                    <p><strong>Сообщение:</strong> "{user_message}"</p>
                                    <p><a href="https://beauty-crm.com/admin/chat?client_id={instagram_id}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Перейти в чат CRM</a></p>
                                    """
                                )
                                print(f"📧 Escalation email sent to {manager_email}")
                            except Exception as e:
                                print(f"❌ Error sending email to {manager_email}: {e}")
                                
                    # Telegram notification (Broadcast to group/channel)
                    from integrations.telegram_bot import send_telegram_alert
                    await send_telegram_alert(
                        message=f"""
{alert_header}

{client_info_text}
<b>Сообщение:</b> <i>"{user_message}"</i>

<a href="https://beauty-crm.com/admin/chat?client_id={instagram_id}">👉 ОТВЕТИТЬ В CRM</a>
"""
                    )
                    print(f"⚠️ Escalation notification sent to {len(managers)} managers")
                except Exception as e:
                    print(f"❌ Error sending escalation notification: {e}")

            # ========================================
            # ✅ ПРОВЕРКА ДОСТУПНОСТИ ВРЕМЕНИ В БД
            # ========================================

            today = get_current_time().date()
            tomorrow = today + timedelta(days=1)
            current_time = get_current_time()
            
            # ✅ Определяем человекочитаемое название даты
            def get_date_label(date_obj):
                """Получить читаемую метку для даты"""
                today = datetime.now().date()
                if date_obj == today:
                    return "сегодня"
                elif date_obj == today + timedelta(days=1):
                    return "завтра"
                else:
                    days_diff = (date_obj - today).days
                    if days_diff == 2:
                        return "послезавтра"
                    elif 2 < days_diff <= 7:
                        return f"через {days_diff} дня"
                    else:
                        return date_obj.strftime("%d.%m.%Y")
            
            # Явно передаем текущую дату в контекст
            additional_context += f"\n📅 СЕГОДНЯ: {today.strftime('%d.%m.%Y')} ({today.strftime('%A')})\n"
            additional_context += f"⏰ ТЕКУЩЕЕ ВРЕМЯ: {current_time.strftime('%H:%M')}\n"

            target_date = None
            target_date_label = None

            # Определяем дату из сообщения клиента
            user_msg_lower = user_message.lower()

            if 'сегодня' in user_msg_lower or 'today' in user_msg_lower:
                target_date = today.strftime("%Y-%m-%d")
                target_date_label = "сегодня"
            elif 'завтра' in user_msg_lower or 'tomorrow' in user_msg_lower:
                target_date = tomorrow.strftime("%Y-%m-%d")
                target_date_label = "завтра"
            else:
                # Ищем дату в формате DD.MM, DD/MM, DD-MM
                date_match = re.search(r'(\d{1,2})[./-](\d{1,2})', user_message)
                if date_match:
                    day, month = date_match.groups()
                    # Пытаемся угадать год (текущий или следующий)
                    current_year = today.year
                    try:
                        parsed_date = datetime.strptime(f"{current_year}-{month}-{day}", "%Y-%m-%d").date()
                        if parsed_date < today:
                            parsed_date = parsed_date.replace(year=current_year + 1)
                        target_date = parsed_date.strftime("%Y-%m-%d")
                        target_date_label = get_date_label(parsed_date)
                    except:
                        pass

            # ✅ NEW: Если дата не найдена в сообщении, ищем в контексте (история или booking_progress)
            if not target_date:
                # Проверяем booking_progress
                if booking_progress and booking_progress.get('date'):
                    target_date = booking_progress.get('date')
                    # ✅ Безопасный парсинг даты с обработкой ошибок
                    try:
                        target_date_label = get_date_label(datetime.strptime(target_date, "%Y-%m-%d").date())
                    except (ValueError, TypeError) as e:
                        print(f"⚠️ Error parsing date from booking_progress: {e}, using default label")
                        target_date_label = "этот день"  # Fallback
                    print(f"📅 Target date from booking_progress: {target_date} ({target_date_label})")
                else:
                    # Ищем в истории диалога упоминание "сегодня" или "завтра"
                    for item in reversed(history[-5:]):  # Проверяем последние 5 сообщений
                        # ✅ Правильная распаковка истории (может быть 4 или 5 элементов)
                        if len(item) >= 2:
                            msg_text = item[0]
                            sender = item[1]
                        else:
                            continue
                            
                        if sender == 'client':
                            msg_lower = msg_text.lower() if isinstance(msg_text, str) else str(msg_text).lower()
                            if 'сегодня' in msg_lower or 'today' in msg_lower:
                                target_date = today.strftime("%Y-%m-%d")
                                target_date_label = "сегодня"
                                print(f"📅 Target date from history (сегодня): {target_date}")
                                break
                            elif 'завтра' in msg_lower or 'tomorrow' in msg_lower:
                                target_date = tomorrow.strftime("%Y-%m-%d")
                                target_date_label = "завтра"
                                print(f"📅 Target date from history (завтра): {target_date}")
                                break
                    
                    # ✅ Если всё ещё не нашли, но есть время в сообщении - используем "сегодня" по умолчанию
                    if not target_date and re.search(r'(\d{1,2}):(\d{2})', user_message):
                        target_date = today.strftime("%Y-%m-%d")
                        target_date_label = "сегодня"
                        print(f"📅 Target date defaulted to today (time found in message): {target_date}")

            # ✅ Убеждаемся, что target_date_label определен, если target_date определен
            if target_date and not target_date_label:
                try:
                    target_date_label = get_date_label(datetime.strptime(target_date, "%Y-%m-%d").date())
                except (ValueError, TypeError):
                    target_date_label = "этот день"  # Fallback
                print(f"📅 Generated target_date_label: {target_date_label}")

            if target_date:
                # ✅ Безопасное использование target_date_label
                date_label_upper = target_date_label.upper() if target_date_label else "ЭТОТ ДЕНЬ"
                print(f"📅 Target date detected: {target_date} ({target_date_label})")

                # Определяем услугу и мастера из прогресса бронирования
                service_name = booking_progress.get('service_name') if booking_progress else None
                master_name = booking_progress.get('master') if booking_progress else None

                # ✅ Если мастер не выбран в прогрессе, ищем его имя в сообщении
                if not master_name:
                    from db.users import get_all_service_providers
                    from utils.transliteration import transliterate_to_latin
                    
                    providers = get_all_service_providers()  # [{'fullname': 'Lyazzat', ...}]
                    
                    found_master = None
                    for provider in providers:
                        full_name = provider['full_name']
                        # Генерируем варианты написания
                        variants = set()
                        variants.add(full_name.lower())
                        variants.add(transliterate_to_latin(full_name).lower()) # Lyazzat -> lyazzat
                        # Также можно добавить обратную транслитерацию, но пока просто ищем вхождение
                        # Если имя на латинице, пробуем найти его кириллическую версию? 
                        # В данном случае проще искать вхождения частей имени
                        
                        # Разбиваем имя на части (если вдруг "Lyazzat K.")
                        parts = full_name.lower().split()
                        for part in parts:
                            variants.add(part)
                            
                        # Проверяем вхождение любого варианта в сообщение
                        # Плюс костыль для кириллицы, если в БД латиница
                        # Например, БД: "Lyazzat", User: "Ляззат"
                        # Нужно транслитерировать user_msg или имя мастера?
                        # Проще: транслитерировать имя мастера в кириллицу? Нет, лучше user_msg -> latin
                        
                        user_msg_latin = transliterate_to_latin(user_message).lower()
                        
                        # Проверка: имя есть в оригинале (если в сообщении латиница) ИЛИ в транслите
                        if full_name.lower() in user_msg_lower or full_name.lower() in user_msg_latin:
                            found_master = full_name
                            break
                            
                        # Также простая проверка по словарю (если вдруг транслитерация сложная)
                        # Но мы хотим УБРАТЬ хардкод.
                        # Доверимся транслитерации сообщения пользователя.
                        
                    if found_master:
                        master_name = found_master
                        print(f"👤 Detected master in message (dynamic): {master_name}")

                print(f"🔍 Looking for slots: service={service_name}, master={master_name}")

                # Получаем реальные свободные слоты из БД
                # Теперь вся логика фильтрации мастеров внутри этой функции
                # ✅ Не передаём duration_minutes - функция сама определит из БД
                available_slots = get_available_time_slots(
                    date=target_date,
                    service_name=service_name,
                    master_name=master_name
                )

                if available_slots:
                    print(f"✅ Found {len(available_slots)} available slots")
                    
                    slots_text = "\n".join([
                        f"  • {slot['time']} у мастера {slot['master']}"
                        for slot in available_slots[:10]  # Показываем больше слотов
                    ])

                    # ✅ ДИНАМИЧЕСКИЙ СПИСОК МАСТЕРОВ ДЛЯ AI
                    masters_mapping = []
                    try:
                        conn = get_db_connection()
                        c = conn.cursor()
                        c.execute("SELECT full_name FROM users WHERE is_active=TRUE AND is_service_provider=TRUE")
                        masters_rows = c.fetchall()
                        for m_row in masters_rows:
                            masters_mapping.append(f"- {m_row[0]}")
                        conn.close()
                    except Exception as e:
                        print(f"⚠️ Error building masters mapping: {e}")
                    
                    masters_mapping_text = "\n    ".join(masters_mapping) if masters_mapping else "Нет данных о мастерах"

                    additional_context += f"""

    🔴 РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ НА {date_label_upper} (из БД):
    {slots_text}

    ⚠️ КРИТИЧНО:
    - ТЫ ОБЯЗАН ПРЕДЛАГАТЬ ТОЛЬКО ЭТИ ВРЕМЕНА!
    - НЕ ПРИДУМЫВАЙ ДРУГОЕ ВРЕМЯ!
    - Время выше РЕАЛЬНО СВОБОДНО - проверено в базе данных!
    - ВСЕГДА говори "{target_date_label or 'этот день'}" вместо полной даты!
    
    📝 ИМЕНА МАСТЕРОВ (используй эти имена):
    {masters_mapping_text}
    
    ✅ ЕСЛИ КЛИЕНТ ПРОСИТ КОНКРЕТНОЕ ВРЕМЯ:
    1. Проверь ВСЕХ мастеров на это время в списке выше
    2. Если время свободно у НЕСКОЛЬКИХ мастеров - ПРЕДЛОЖИ ВЫБОР!
       Пример: "На 19:00 свободны Дженнифер и Местан. К кому записать?"
    3. Если время занято у одного, но свободно у другого - ПРЕДЛОЖИ АЛЬТЕРНАТИВУ!
       Пример: "У Дженнифер в 19:00 занято, но могу предложить к Местану в 19:00. Подходит?"
    4. НЕ ГОВОРИ "нет свободных слотов" если есть другие мастера на это время!
    5. ВСЕГДА используй имена мастеров из списка выше!"""
                else:
                    print(f"❌ No available slots found for {target_date}")
                    
                    # ✅ Проверяем ПОЧЕМУ нет слотов
                    reason_text = "Все мастера заняты или у них выходной."
                    
                    # Try to get specific reason from scheduler/tools
                    try:
                        from bot.tools import check_time_slot_available
                        # Check some middle-of-the-day slot to see if it gives a reason (vacation etc)
                        check_res = check_time_slot_available(target_date, "14:00")
                        if not check_res['available'] and check_res.get('reason'):
                            reason_text = check_res['reason']
                    except Exception as e:
                        print(f"⚠️ Error getting reason: {e}")

                    additional_context += f"""
    🔴 НА {date_label_upper} НЕТ СВОБОДНЫХ ОКОШЕК (проверено в БД)!
    💡 Причина: {reason_text}
    
    ⚠️ СТРОГИЙ ЗАПРЕТ:
    - НЕ ПРЕДЛАГАЙ НИКАКОЕ ВРЕМЯ НА {target_date_label or 'этот день'}!
    - Вежливо объясни причину: {reason_text}
    - Предложи ближайшее свободное время на следующие дни.
    """

            # ========================================
            # ✅ NEW: CHECK FOR "SAME TIME" INTENT
            # ========================================
            same_time_keywords = ['в это же время', 'на это же время', 'same time', 'одновременно', 'в то же время']
            is_same_time_request = any(k in user_message.lower() for k in same_time_keywords)
            
            if is_same_time_request:
                print(f"🔄 Detected 'same time' intent")
                
                # Fetch last booking
                conn = get_db_connection()
                c = conn.cursor()
                try:
                    c.execute("""
                        SELECT datetime, master, service_name
                        FROM bookings 
                        WHERE instagram_id = %s 
                        AND status != 'cancelled'
                        ORDER BY created_at DESC LIMIT 1
                    """, (instagram_id,))
                    last_booking = c.fetchone()
                    
                    if last_booking:
                        lb_datetime, lb_master, lb_service = last_booking
                        print(f"   📅 Last booking found: {lb_datetime} ({lb_master})")
                        
                        # Parse date and time
                        lb_date_str = None
                        lb_time_str = None
                        
                        if ' ' in lb_datetime:
                            lb_date_str, lb_time_str = lb_datetime.split(' ')
                            lb_time_str = lb_time_str[:5] # HH:MM
                        elif 'T' in lb_datetime:
                            lb_date_str, lb_time_str = lb_datetime.split('T')
                            lb_time_str = lb_time_str[:5]
                            
                        if lb_date_str and lb_time_str:
                            # Use date from booking if not specified in message
                            check_date = target_date if target_date else lb_date_str
                            check_time = lb_time_str
                            # Use master from progress if set, otherwise from last booking
                            check_master = booking_progress.get('master') if booking_progress else lb_master
                            
                            print(f"   🛡️ Checking availability for {check_date} {check_time} ({check_master})")
                            
                            check_result = check_time_slot_available(
                                date=check_date,
                                time=check_time,
                                master_name=check_master
                            )
                            
                            if not check_result['available']:
                                print(f"   ❌ Slot is BUSY for {check_master}")
                                
                                # ✅ NEW: Check if ANY other master is available at this time
                                # We use get_available_time_slots to also filter by SERVICE and get the master's name
                                other_slots = get_available_time_slots(
                                    date=check_date,
                                    service_name=lb_service, # Filter by the same service!
                                    master_name=None 
                                )
                                
                                # Find if anyone has the specific time free
                                found_other_master = None
                                for slot in other_slots:
                                    if slot['time'] == check_time:
                                        found_other_master = slot['master']
                                        break
                                
                                if found_other_master:
                                    # Someone else is free!
                                    print(f"   ✅ But master {found_other_master} is FREE!")
                                    
                                    additional_context += f"""
    
    🚫 ВНИМАНИЕ: КЛИЕНТ ХОЧЕТ "В ЭТО ЖЕ ВРЕМЯ" ({check_time}).
    Мастер {check_master} ЗАНЯТ (там уже запись клиента).
    
    ✅ НО ЕСТЬ ДРУГОЙ СВОБОДНЫЙ МАСТЕР: {found_other_master}!
    (Он делает ту же услугу: {lb_service})
    
    ⚠️ СКАЖИ (ПОЗИТИВНО):
    "Отлично! На это же время свободен мастер {found_other_master}. Записать друга к нему%s"
    (Не извиняйся, просто предложи альтернативу!)
    """
                                else:
                                    # No one is free
                                    alternatives = check_result['alternatives']
                                    alt_text = "\n".join([
                                        f"  • {slot['time']} у {slot['master']}"
                                        for slot in alternatives[:3]
                                    ])
                                    
                                    additional_context += f"""
        
        🚫 ВНИМАНИЕ: КЛИЕНТ ХОЧЕТ "В ЭТО ЖЕ ВРЕМЯ" ({check_time}), НО ОНО УЖЕ ЗАНЯТО!
        (Скорее всего, самим клиентом)
        
        Мастер {check_master} не может принять второго человека в {check_time}.
        
        Доступные альтернативы:
        {alt_text}
        
        ⚠️ СКАЖИ:
        "У {check_master} в {check_time} уже занято (там ваша запись). 
        Могу записать друга к другому мастеру или на другое время.
        Например: {alternatives[0]['time']} к {alternatives[0]['master']}."
        """
                            else:
                                print(f"   ✅ Slot is AVAILABLE")
                                
                except Exception as e:
                    print(f"❌ Error checking last booking: {e}")
                finally:
                    conn.close()

            # Проверка конкретного времени если клиент спрашивает
            time_match = re.search(r'(\d{1,2}):(\d{2})', user_message)
            if time_match:
                requested_time = f"{time_match.group(1).zfill(2)}:{time_match.group(2)}"
                print(f"⏰ Checking specific time: {requested_time}")
                
                # ✅ Если target_date не определен, используем сегодня по умолчанию
                check_date = target_date if target_date else today.strftime("%Y-%m-%d")
                check_date_label = target_date_label if target_date_label else "сегодня"
                
                # ✅ Определяем услугу из контекста для более точной проверки
                service_name_for_check = booking_progress.get('service_name') if booking_progress else None
                if not service_name_for_check:
                    # Ищем услугу в истории диалога
                    for item in reversed(history[-10:]):
                        # ✅ Правильная распаковка истории
                        if len(item) >= 2:
                            msg_text = item[0]
                            sender = item[1]
                        else:
                            continue
                            
                        if sender == 'client':
                            msg_lower = msg_text.lower() if isinstance(msg_text, str) else str(msg_text).lower()
                            # Простая проверка на упоминание услуг
                            if 'маникюр' in msg_lower or 'manicure' in msg_lower:
                                service_name_for_check = 'маникюр'
                                break
                            elif 'педикюр' in msg_lower or 'pedicure' in msg_lower:
                                service_name_for_check = 'педикюр'
                                break

                print(f"🔍 Checking availability for {check_date} {requested_time} (service: {service_name_for_check or 'any'}, master: {booking_progress.get('master') if booking_progress else 'any'})")

                check_result = check_time_slot_available(
                    date=check_date,
                    time=requested_time,
                    master_name=booking_progress.get('master') if booking_progress else None
                )
                
                print(f"📊 Check result: available={check_result['available']}, reason={check_result.get('reason', 'N/A')}, alternatives={len(check_result.get('alternatives', []))}")

                # ✅ ИНИЦИАЛИЗАЦИЯ: Всегда инициализируем переменные
                alternatives = []
                reason = ""
                
                if check_result['available']:
                    # ✅ СЛУЧАЙ 1: Слот ДОСТУПЕН - добавляем информацию о доступных мастерах
                    print(f"✅ Time {requested_time} is AVAILABLE on {check_date_label}")
                    logger.info(f"✅ Slot {requested_time} is AVAILABLE on {check_date_label}")
                    
                    available_masters = check_result.get('available_masters', [])
                    reason = check_result.get('reason', f'Слот свободен')
                    
                    if available_masters:
                        masters_text = ", ".join(available_masters)
                        additional_context += f"""

✅ ВРЕМЯ {requested_time} СВОБОДНО НА {check_date_label.upper()}!

👥 Доступные мастера: {masters_text}

⚠️ ПРЕДЛОЖИ КЛИЕНТУ ЗАПИСАТЬСЯ:
"Да, на {requested_time} {check_date_label} свободно! К какому мастеру записать?"
Или: "Да, свободно! Записываю вас на {requested_time}?"
"""
                        print(f"✅ Slot {requested_time} available with {len(available_masters)} masters: {masters_text}")
                        logger.info(f"✅ Slot {requested_time} available with {len(available_masters)} masters: {masters_text}")
                    else:
                        additional_context += f"""

✅ ВРЕМЯ {requested_time} СВОБОДНО НА {check_date_label.upper()}!

⚠️ ПРЕДЛОЖИ КЛИЕНТУ ЗАПИСАТЬСЯ:
"Да, на {requested_time} {check_date_label} свободно! Записываю вас?"
"""
                        print(f"✅ Slot {requested_time} available (no master list provided)")
                        logger.info(f"✅ Slot {requested_time} available (no master list provided)")
                
                elif not check_result['available']:
                    # ✅ СЛУЧАЙ 2: Слот НЕДОСТУПЕН - добавляем причину и альтернативы
                    print(f"❌ Time {requested_time} is NOT available on {check_date_label}: {check_result.get('reason', 'N/A')}")
                    logger.warning(f"❌ Time {requested_time} is NOT available on {check_date_label}: {check_result.get('reason', 'N/A')}")

                    # ✅ NEW: Добавляем причину недоступности в контекст
                    reason = check_result.get('reason', 'Время занято')
                    
                    alternatives = check_result.get('alternatives', [])
                    
                    # ✅ NEW: Если клиент спрашивает про утро (до 12:00), фильтруем альтернативы - предлагаем утренние слоты
                    requested_hour = int(requested_time.split(':')[0])
                    is_morning_request = requested_hour < 12
                    
                    if is_morning_request and alternatives:
                        # Фильтруем альтернативы - оставляем только утренние (до 14:00, чтобы не попасть на обед)
                        morning_alternatives = [alt for alt in alternatives if int(alt['time'].split(':')[0]) < 14]
                        if morning_alternatives:
                            # ✅ Дедупликация: убираем дубликаты по времени и мастеру
                            seen = set()
                            unique_morning = []
                            for alt in morning_alternatives:
                                key = (alt['time'], alt['master'])
                                if key not in seen:
                                    seen.add(key)
                                    unique_morning.append(alt)
                            alternatives = unique_morning[:3]  # Берем первые 3 уникальных утренних
                            print(f"🌅 Filtered to morning alternatives: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                            logger.info(f"🌅 Filtered to {len(alternatives)} morning alternatives for morning request: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                        else:
                            # Если утренних нет, берем ближайшие после обеда
                            afternoon_alternatives = [alt for alt in alternatives if int(alt['time'].split(':')[0]) >= 14]
                            if afternoon_alternatives:
                                # ✅ Дедупликация
                                seen = set()
                                unique_afternoon = []
                                for alt in afternoon_alternatives:
                                    key = (alt['time'], alt['master'])
                                    if key not in seen:
                                        seen.add(key)
                                        unique_afternoon.append(alt)
                                alternatives = unique_afternoon[:3]
                                print(f"🌆 No morning slots, using afternoon: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                                logger.info(f"🌆 No morning slots available, using {len(alternatives)} afternoon alternatives: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                    elif alternatives:
                        # ✅ УЛУЧШЕНИЕ: Для вечерних запросов тоже фильтруем - предлагаем ближайшие слоты
                        # Сортируем альтернативы по близости к запрошенному времени
                        try:
                            from datetime import datetime as dt_class
                            req_dt = dt_class.strptime(requested_time, "%H:%M")
                            
                            # Сортируем по близости к запрошенному времени
                            alternatives_with_diff = []
                            for alt in alternatives:
                                slot_dt = dt_class.strptime(alt['time'], "%H:%M")
                                diff = abs((slot_dt - req_dt).total_seconds())
                                alternatives_with_diff.append((alt, diff))
                            
                            # Сортируем по разнице времени
                            alternatives_with_diff.sort(key=lambda x: x[1])
                            
                            # Дедупликация
                            seen = set()
                            unique_alternatives = []
                            for alt, _ in alternatives_with_diff:
                                key = (alt['time'], alt['master'])
                                if key not in seen:
                                    seen.add(key)
                                    unique_alternatives.append(alt)
                            
                            alternatives = unique_alternatives[:3]
                            print(f"📋 Sorted alternatives by proximity: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                            logger.info(f"📋 Sorted {len(alternatives)} alternatives by proximity to {requested_time}: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                        except Exception as e:
                            print(f"⚠️ Error sorting alternatives: {e}")
                            logger.error(f"⚠️ Error sorting alternatives: {e}", exc_info=True)
                            # Fallback: простая дедупликация
                            seen = set()
                            unique_alternatives = []
                            for alt in alternatives:
                                key = (alt['time'], alt['master'])
                                if key not in seen:
                                    seen.add(key)
                                    unique_alternatives.append(alt)
                            alternatives = unique_alternatives[:3]
                            print(f"📋 Unique alternatives: {[a['time'] + ' (' + a['master'] + ')' for a in alternatives]}")
                            logger.warning(f"📋 Fallback: Using {len(alternatives)} unique alternatives after sorting error")
                    
                    # ✅ Обработка альтернатив (только если слот недоступен)
                    if alternatives:
                        print(f"✅ Found {len(alternatives)} alternative slots")
                        logger.info(f"✅ Found {len(alternatives)} alternative slots for {requested_time}")
                        
                        # ✅ Находим ближайшее время к запрошенному
                        from datetime import datetime as dt_class
                        try:
                            req_dt = dt_class.strptime(requested_time, "%H:%M")
                            best_slot = None
                            min_diff = 999999
                            
                            for slot in alternatives:
                                slot_dt = dt_class.strptime(slot['time'], "%H:%M")
                                diff = abs((slot_dt - req_dt).total_seconds())
                                if diff < min_diff:
                                    min_diff = diff
                                    best_slot = slot
                            
                            if best_slot:
                                alt_time = best_slot['time']
                                alt_master = best_slot['master']
                                
                                additional_context += f"""

🚫 ВРЕМЯ {requested_time} НЕДОСТУПНО НА {check_date_label.upper()}!

📋 ПРИЧИНА: {reason}

⚠️ ВАЖНО: ВСЕГДА ГОВОРИ КЛИЕНТУ ПРИЧИНУ!
- Если салон закрыт: "К сожалению, мы открываемся в [время]. Могу предложить [альтернативы]"
- Если обед: "В это время у мастеров обед (13:00-14:00). Могу предложить [альтернативы]"
- Если занято: "На {requested_time} уже есть запись. Могу предложить [альтернативы]"

🧠 БЛИЖАЙШЕЕ СВОБОДНОЕ ОКНО: {alt_time} (мастер {alt_master})

⚠️ ТВОЯ ЗАДАЧА:
НЕ ПРОСТО ГОВОРИ "нет", А ОБЪЯСНЯЙ ПРИЧИНУ И ПРЕДЛАГАЙ РЕШЕНИЕ!
Если клиент спрашивал про утро - ПРЕДЛАГАЙ УТРЕННИЕ СЛОТЫ (если есть)!
"""
                                logger.info(f"✅ Best alternative slot found: {alt_time} at {alt_master} (diff: {min_diff/60:.1f} min)")
                        except Exception as e:
                            print(f"⚠️ Error finding best slot: {e}")
                            logger.error(f"⚠️ Error finding best slot: {e}", exc_info=True)
                            alt_text = "\n".join([f"• {s['time']} у {s['master']}" for s in alternatives[:3]])
                            additional_context += f"""
🚫 ВРЕМЯ {requested_time} НЕДОСТУПНО! ПРИЧИНА: {reason}
Альтернативы: {alt_text}
"""
                    else:
                        print(f"❌ No alternatives found for {requested_time}")
                        logger.warning(f"❌ No alternatives found for {requested_time} on {check_date_label}")
                        additional_context += f"""

🚫 ВРЕМЯ {requested_time} НЕДОСТУПНО НА {check_date_label.upper()}!

📋 ПРИЧИНА: {reason}

⚠️ ВАЖНО: ВСЕГДА ГОВОРИ КЛИЕНТУ ПРИЧИНУ!
- Если салон закрыт: "К сожалению, мы открываемся в [время]. Предложить другое время?"
- Если обед: "В это время у мастеров обед (13:00-14:00). Предложить другое время?"
- Если занято: "На {requested_time} уже есть запись. Предложить другую дату?"
"""

            # ========================================
            # ✅ PHONE VALIDATION WITH IMMEDIATE FEEDBACK
            # ========================================
            from utils.validators import validate_phone_detailed
            
            # Check if user provided a phone number in this message
            # Updated regex to catch numbers with or without + prefix
            phone_pattern = r'\+?\d{7,15}'  # Catch +7XXXXXXXXXX or 7XXXXXXXXXX or 050XXXXXXX
            phone_match = re.search(phone_pattern, user_message)
            
            if phone_match:
                extracted_phone = phone_match.group(0)
                is_valid, error_msg = validate_phone_detailed(extracted_phone)
                
                if not is_valid:
                    print(f"⚠️ Invalid phone number detected: {extracted_phone} - {error_msg}")
                    
                    # Return immediate error message to user
                    error_response = f"""Номер {extracted_phone} указан неверно: {error_msg}

Пожалуйста, напишите полный номер в одном из форматов:
• 050XXXXXXX (UAE local)
• +971XXXXXXXXX (UAE international)
• или другой международный формат с кодом страны

После этого я смогу подтвердить вашу запись! 😊"""
                    
                    print(f"📤 Returning validation error to user")
                    return error_response
                else:
                    print(f"✅ Phone number is valid: {extracted_phone}")

            # ========================================
            # Строим промпт
            # ========================================

            full_prompt = self.prompt_builder.build_full_prompt(
                instagram_id=instagram_id,
                history=history,
                booking_progress=booking_progress,
                client_language=client_language,
                additional_context=additional_context  # ✅ ПЕРЕДАЁМ КОНТЕКСТ С РЕАЛЬНЫМИ СЛОТАМИ
            )

            # ========================================
            # Генерируем ответ через прокси
            # ========================================

            try:
                ai_response = await self._generate_via_proxy(full_prompt, instagram_id=instagram_id)
            except Exception as e:
                err_str = str(e)
                if "Rate limit" in err_str:
                    print(f"⚠️ Handled Rate Limit Error: {e}")
                    # Fallback response based on language
                    if client_language == 'ru':
                        return "Извините, сейчас очень много запросов. Пожалуйста, напишите через минуту! 🙏"
                    else:
                        return "Sorry, too many requests right now. Please try again in a minute! 🙏"
                raise e
            
            # ✅ ОБЯЗАТЕЛЬНО: Проверяем необходимость уведомления на успешном ответе
            await self._check_and_escalate(ai_response, instagram_id)

            print(f"✅ AI response generated: {ai_response[:100]}")
            print("=" * 50)

            return ai_response

        except Exception as e:
            print(f"❌ Error in generate_response: {e}")
            logger.error(f"❌ Error in generate_response: {e}", exc_info=True)  # ✅ ДОБАВЛЕНО
            import traceback
            traceback.print_exc()

            # Fallback ответ - простое сообщение (AI недоступен)
            fallback = "Our manager will respond soon! 💎" if client_language == 'en' else "Наш менеджер скоро ответит! 💎"
            
            # ✅ ОБЯЗАТЕЛЬНО: Проверяем необходимость уведомления даже при ошибке!
            await self._check_and_escalate(fallback, instagram_id)
            
            return fallback

    async def _check_and_escalate(self, response_text: str, instagram_id: str):
        """Проверка ответа на необходимость эскалации и отправка уведомлений"""
        
        escalation_promises = [
            'менеджер свяжется', 'свяжусь с менеджером', 'передал ваш запрос', 
            'позвал администратора', 'администратор ответит', 'manager will contact',
            'передаю информацию менеджеру', 'уведомил менеджера', 'менеджер скоро ответит' # Added for fallback
        ]
        
        if any(promise in response_text.lower() for promise in escalation_promises):
            print(f"🔔 Bot promised escalation! Checking if notification needed...")
            
            try:
                from api.notifications import create_notification
                from db.users import get_all_users
                from db.clients import get_client_by_id
                
                # 1. Fetch Client Details
                client_data = get_client_by_id(instagram_id)
                client_name = "Неизвестный"
                client_username = ""
                client_pic = ""
                
                if client_data:
                    # 0:id, 1:username, 2:phone, 3:name, ..., 10:profile_pic
                    client_username = client_data[1] or ""
                    client_name = client_data[3] or client_username or "Без имени"
                    client_pic = client_data[10] or ""

                # Determine platform and profile link
                platform_icon = "❓"
                profile_link = "Не найден"
                platform_name = "Unknown"

                if instagram_id.startswith("telegram_"):
                    platform_icon = "✈️"
                    platform_name = "Telegram"
                    tg_id = instagram_id.replace("telegram_", "")
                    if client_username:
                            profile_link = f"https://t.me/{client_username.replace('@', '')}"
                    else:
                            profile_link = f"tg://user?id={tg_id}"
                
                elif instagram_id.startswith("whatsapp_"):
                    platform_icon = "💚"
                    platform_name = "WhatsApp"
                    profile_link = f"https://wa.me/{instagram_id.replace('whatsapp_', '')}"
                
                else:
                    # Instagram
                    platform_icon = "📸"
                    platform_name = "Instagram"
                    if client_username:
                        profile_link = f"https://instagram.com/{client_username}"
                    else:
                        profile_link = f"https://instagram.com/{instagram_id}"

                users = get_all_users()
                managers = [u for u in users if u[4] in ['admin', 'manager', 'director']]
                
                for manager in managers:
                    # 1. DB Notification
                    create_notification(
                        user_id=str(manager[0]),
                        title="🤖 БОТ ПОЗВАЛ МЕНЕДЖЕРА",
                        message=f"Бот пообещал клиенту {client_name}: {response_text[:100]}...",
                        notification_type="urgent",
                        action_url=f"/admin/chat?client_id={instagram_id}"
                    )
                    
                    # 2. Email Notification
                    manager_email = manager[2]
                    if manager_email:
                        try:
                            from utils.email import send_email_async
                            
                            # HTML for email with photo
                            photo_html = f'<img src="{client_pic}" style="width: 50px; height: 50px; border-radius: 50%;">' if client_pic else ''
                            
                            await send_email_async(
                                recipients=[manager_email],
                                subject=f"🤖 Авто-эскалация: Бот позвал менеджера ({client_name})",
                                message=f"""
                                Бот пообещал клиенту позвать менеджера.
                                
                                Клиент: {client_name}
                                Никнейм: {client_username}
                                Платформа: {platform_name}
                                Ссылка: {profile_link}
                                
                                Ответ бота: '{response_text}'
                                
                                Перейти в чат: https://beauty-crm.com/admin/chat?client_id={instagram_id}
                                """,
                                html=f"""
                                <h2>🤖 Авто-эскалация</h2>
                                <p>Бот пообещал клиенту позвать менеджера.</p>
                                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 10px 0;">
                                    {photo_html}
                                    <p><strong>Клиент:</strong> {client_name} ({platform_name})</p>
                                    <p><strong>Никнейм:</strong> {client_username}</p>
                                    <p><strong>Ссылка:</strong> <a href="{profile_link}">{profile_link}</a></p>
                                </div>
                                <hr>
                                <p><strong>Ответ бота:</strong> {response_text}</p>
                                <p><a href="https://beauty-crm.com/admin/chat?client_id={instagram_id}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Перейти в чат CRM</a></p>
                                """
                            )
                            print(f"   📧 Auto-escalation email sent to {manager_email}")
                        except Exception as ex:
                            print(f"   ⚠️ Email failed: {ex}")
                            
                # 3. Telegram Notification (Broadcast)
                try:
                    from integrations.telegram_bot import send_telegram_alert
                    
                    tg_message = f"""
🤖 <b>АВТО-ЭСКАЛАЦИЯ</b>

Бот пообещал клиенту позвать менеджера!

<b>Клиент:</b> {client_name}
<b>Ник:</b> {client_username or '-'}
<b>Платформа:</b> {platform_name} {platform_icon}
<b>Ссылка:</b> <a href="{profile_link}">{profile_link}</a>

<b>Ответ бота:</b> {response_text[:200]}...
"""
                    await send_telegram_alert(message=tg_message)
                    print(f"   ✈️ Auto-escalation Telegram sent")
                except Exception as ex:
                    print(f"   ⚠️ Telegram failed: {ex}")
                    
                print(f"   ✅ Auto-escalation notification sent!")
            except Exception as e:
                print(f"❌ Error in escalation logic: {e}")

    async def _generate_via_proxy(self, full_prompt: str, max_retries: int = 6, instagram_id: str = None) -> str:
        """Попытка генерации через пул прокси"""
        
        # 🔍 LOGGING FULL PROMPT (TRUNCATED) - First 500 + Last 500 chars only
        truncated_prompt = full_prompt[:500] + "\n...\n[SNIPPED]... \n" + full_prompt[-500:] if len(full_prompt) > 1000 else full_prompt
        print(f"\n🧠 SYSTEM PROMPT SENT TO GEMINI (Brief):\n{'-'*50}\n{truncated_prompt}\n{'-'*50}\n")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

        # ✅ НАСТРОЙКА ИЗ БД: response_style (concise/detailed/adaptive)
        response_style = self.bot_settings.get('response_style', 'adaptive')
        
        # Определяем max_tokens на основе стиля
        # ⚠️ gemini-2.5-flash (flash-latest) тратит ~400-500 токенов на "thinking"
        # Поэтому нужен запас: thinking (500) + ответ
        if response_style == 'concise':
            max_tokens = 1000  # 500 thinking + 500 buffer
            style_instruction = """
🚨🚨🚨 СТРОГИЙ РЕЖИМ: КРАТКИЙ 🚨🚨🚨

ЖЕЛЕЗНОЕ ПРАВИЛО: МАКСИМУМ 2 ПРЕДЛОЖЕНИЯ!

❌ ЗАПРЕЩЕНО: "Какой прекрасный выбор! Маникюр — это всегда идеальное начало..." 
✅ ПРАВИЛЬНО: "Маникюр: гель-лак 150 AED, обычный 80 AED. Какой интересует?"

НЕ ПИШИ восклицания типа "Прекрасный выбор!"
НЕ ПИШИ списки с буллетами!  """
        if response_style == 'brief':
            max_tokens = 1500  # Increased from 800
            style_instruction = """
⚠️ РЕЖИМ: БЫСТРЫЙ ОТВЕТ
- Пиши кратко и по делу
- Не используй лишние вводные слова
- СРАЗУ К ДЕЛУ!
"""
        elif response_style == 'detailed':
            max_tokens = 2000  # Increased from 1100
            style_instruction = """
⚠️ РЕЖИМ: ПОДРОБНЫЙ (настройка администратора)
- Описывай услуги детально
- Используй списки для читаемости
- Давай рекомендации
"""
        else:  # adaptive
            max_tokens = 1800  # Increased from 900
            style_instruction = """
⚠️ РЕЖИМ: УМНЫЙ
- Для записи: кратко (2-3 предложения)
- Для вопросов: подробнее
"""

        prompt_with_limit = f"""{full_prompt}
{style_instruction}
"""

        payload = {
            "contents": [{
                "parts": [{"text": prompt_with_limit}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": max_tokens,
                "stopSequences": []
            }
        }

        if not self.proxies:
            print("ℹ️ Прямое подключение к Gemini API (localhost режим)")

        for attempt in range(max_retries):
            try:
                # ✅ ROTATION LOGIC: Key & Proxy
                current_proxy = self.proxies[attempt % len(self.proxies)] if self.proxies else None
                current_key = self.api_keys[attempt % len(self.api_keys)] if self.api_keys else GEMINI_API_KEY
                
                # Construct URL with current rotated key
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={current_key}"
                
                # Debug Info
                proxy_label = current_proxy.split('@')[1] if current_proxy and '@' in current_proxy else (current_proxy[:25] + "..." if current_proxy else "Direct")
                key_label = f"...{current_key[-6:]}" if current_key else "None"
                
                print(f"🌐 Попытка {attempt + 1}/{max_retries} | Proxy: {proxy_label} | Key: {key_label}")

                if current_proxy:
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, proxy=current_proxy) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()
                else:
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()

                # ✅ ПРОВЕРКА 429 - RATE LIMIT
                if "error" in data:
                    error_code = data["error"].get("code")
                    error_msg = data["error"].get("message", "")

                    if error_code == 429:
                        print(f"⚠️ Rate limit 429 (Key: {key_label})")
                        if attempt < max_retries - 1:
                            # Exponential backoff: 2s, 4s, 8s...
                            wait_time = 2 ** (attempt + 1)
                            print(f"⏳ Waiting {wait_time}s before next attempt...")
                            await asyncio.sleep(wait_time)
                            continue
                        raise Exception(f"Rate limit exceeded after {max_retries} retries")
                    
                    elif error_code == 403:
                        print(f"⚠️ Gemini 403 (Key: {key_label}). Пробуем другой ключ/прокси...")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1) 
                            continue
                        raise Exception(f"Gemini API error 403 after retries")
                        
                    else:
                        raise Exception(f"Gemini API error {error_code}: {error_msg}")

                # Извлекаем текст ответа
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    
                    # Проверяем причину завершения
                    finish_reason = candidate.get("finishReason")
                    if finish_reason and finish_reason != "STOP":
                        print(f"⚠️ Gemini stopped with reason: {finish_reason}")
                        # Если заблокировано безопасностью или другое - пробуем еще раз или фоллбэк
                        if finish_reason == "SAFETY":
                             raise Exception(f"Gemini Safety Filter triggered")
                    
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if len(parts) > 0 and "text" in parts[0]:
                            response_text = parts[0]["text"].strip()
                            
                            # 🤖 ACTION PARSING (SAVE BOOKING)
                            import re
                            import json
                            action_match = re.search(r'\[ACTION\](.*?)\[/ACTION\]', response_text, re.DOTALL)
                            if action_match:
                                try:
                                    action_json = action_match.group(1).strip()
                                    # Fix common json errors (like single quotes)
                                    if "'" in action_json and '"' not in action_json:
                                        action_json = action_json.replace("'", '"')
                                    
                                    action_data = json.loads(action_json)
                                    print(f"⚡️ BOT ACTION DETECTED: {action_data}")
                                    
                                    # Execute Action
                                    if instagram_id:
                                        await self._handle_bot_action(action_data, instagram_id)
                                    else:
                                        print(f"⚠️ WARNING: instagram_id not available, cannot process action")
                                    
                                    # Remove action block from text to send to user
                                    # ✅ УБЕДИТЕЛЬНО УДАЛЯЕМ ACTION БЛОК - клиент не должен его видеть!
                                    action_block = action_match.group(0)
                                    response_text = response_text.replace(action_block, "").strip()
                                    
                                    # Дополнительная очистка на случай если остались следы
                                    response_text = re.sub(r'\[ACTION\].*?\[/ACTION\]', '', response_text, flags=re.DOTALL).strip()
                                except Exception as e:
                                    print(f"❌ Error processing bot action: {e}")
                                    import traceback
                                    traceback.print_exc()

                            # 🧩 LOGIC PARSING (Legacy, checking just in case)
                            logic_match = re.search(r'\[LOGIC\](.*?)\[/LOGIC\]', response_text, re.DOTALL)
                            if logic_match:
                                logic_content = logic_match.group(1).strip()
                                # Remove logic block
                                response_text = response_text.replace(logic_match.group(0), "").strip()


                            # Очистка от markdown
                            response_text = response_text.replace('*', '').replace('`', '').strip()

                            print(f"✅ Успешно получен ответ (попытка {attempt + 1}, прокси {attempt % len(self.proxies) + 1 if self.proxies else 'direct'})")

                            return response_text
                            
                    # Если ответ пустой, но без ошибки (иногда бывает)
                    print(f"⚠️ Received empty content from Gemini (finishReason={finish_reason})")
                    if attempt < max_retries - 1:
                        continue # Пробуем следующую попытку

                # Логируем неожиданный ответ для отладки
                print(f"⚠️ Unexpected response structure: {str(data)[:500]}")
                raise Exception(f"Unexpected Gemini response structure: {str(data)[:100]}")

            except httpx.HTTPError as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 5
                    print(f"❌ HTTP Error (попытка {attempt + 1}/{max_retries}): {e}, retry через {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                print(f"❌ HTTP Error после {max_retries} попыток: {e}")
                raise
            except Exception as e:
                if "Rate limit" in str(e) and attempt < max_retries - 1:
                    continue
                print(f"❌ Unexpected error: {e}")
                raise
            
        raise Exception("All retry attempts exhausted")

    def _get_fallback_response(self, language: str = 'ru') -> str:
        """Резервный ответ при ошибке (синхронный контекст - без AI)"""
        # Простой fallback без AI (синхронный метод)
        msg_ru = "Наш менеджер скоро ответит! 💎"
        msg_en = "Our manager will respond soon! 💎"
        
        # 🔔 Notify manager since we failed
        try:
             # Need to be careful with imports/context here as this might be called in exception handler
             # Just logging for now, or assume system logs error elsewhere
             print("⚠️ Fallback triggered: User should be notified to manager manually if possible.")
        except:
             pass

        return msg_en if language == 'en' else msg_ru

    async def _handle_bot_action(self, action_data: dict, instagram_id: str):
        """Обработка действий от бота (сохранение записи и т.д.)"""
        action_type = action_data.get('action')
        
        if action_type == 'save_booking':
            try:
                print(f"💾 EXECUTE ACTION: Saving booking for {instagram_id}")
                service = action_data.get('service')
                master = action_data.get('master')
                date_str = action_data.get('date') # YYYY-MM-DD или "сегодня"/"завтра"
                time_str = action_data.get('time') # HH:MM
                phone = action_data.get('phone')
                
                if not all([service, master, date_str, time_str, phone]):
                    print(f"❌ Missing data for booking action: {action_data}")
                    return

                # ✅ ПАРСИНГ ДАТЫ: Преобразуем "сегодня"/"завтра" в конкретную дату
                from datetime import datetime, timedelta
                today = datetime.now().date()
                
                date_str_lower = date_str.lower().strip()
                if date_str_lower in ['сегодня', 'today']:
                    date_str = today.strftime('%Y-%m-%d')
                elif date_str_lower in ['завтра', 'tomorrow']:
                    date_str = (today + timedelta(days=1)).strftime('%Y-%m-%d')
                elif date_str_lower in ['послезавтра', 'day after tomorrow']:
                    date_str = (today + timedelta(days=2)).strftime('%Y-%m-%d')
                # Если дата уже в формате YYYY-MM-DD, оставляем как есть
                
                # Convert date/time to ISO format expected by DB
                datetime_str = f"{date_str}T{time_str}"
                
                # 1. Get Client Name from DB (or use default)
                # We need to fetch client info first to get the name
                from db.clients import get_client_by_id, update_client_status
                from db.bookings import save_booking
                
                client = get_client_by_id(instagram_id)
                # client: id, username, phone, name...
                client_name = "Client"
                if client:
                    client_name = client[3] or client[1] or "Client" # Name or Username
                
                # 2. Save Booking
                try:
                    booking_id = save_booking(
                        instagram_id=instagram_id,
                        service=service,
                        datetime_str=datetime_str,
                        phone=phone,
                        name=client_name,
                        master=master
                    )
                    print(f"✅ Booking saved successfully! ID: {booking_id}")
                except Exception as e:
                    print(f"❌ Error saving booking: {e}")
                    import traceback
                    traceback.print_exc()
                    return  # Прерываем выполнение при ошибке сохранения
                
                # 3. Update Client Status -> 'lead' (or 'client')
                # User asked for 'hot' (lead/client). Let's set to 'client' as they have a booking.
                update_client_status(instagram_id, 'client')
                print(f"✅ Client status updated to 'client'")
                
                # 4. Send Email Notification
                # User asked to send to "notification email" instead of master for now.
                # We can use the manager notification logic or `send_email_async` directly.
                from utils.email import send_email_async
                from db.settings import get_salon_settings
                
                # Get recipient from settings or environment
                # Fallback to the same email used for auto-escalations if specific setting missing
                # For now let's try to notify ALL managers/admins as per user request "send to mail where we send notifications"
                
                # Fetch managers email
                from db.users import get_all_users
                users = get_all_users()
                managers_emails = [u[2] for u in users if u[4] in ['admin', 'manager', 'director'] and u[2]]
                
                if managers_emails:
                    from utils.templates import get_booking_notification_email
                    email_data = get_booking_notification_email(
                        date_str=date_str,
                        time_str=time_str,
                        service_name=service,
                        master_name=master,
                        client_name=client_name,
                        client_phone=phone,
                        is_bot_booking=True
                    )
                    
                    await send_email_async(
                        recipients=managers_emails,
                        subject=email_data['subject'],
                        message=email_data['body']
                    )
                    print(f"📧 Notification sent to {len(managers_emails)} managers")
                else:
                    print("⚠️ No manager emails found for notification")

            except Exception as e:
                print(f"❌ Error in _handle_bot_action: {e}")
                import traceback
                traceback.print_exc()

    def should_greet(self, history: List[Tuple]) -> bool:
        """
        Определить нужно ли здороваться

        Returns:
            bool: True если нужно поздороваться
        """
        # Если это первое сообщение
        if len(history) <= 1:
            return True

        # Если прошло много времени (>6 часов + новый деловой день)
        if len(history) > 0:
            try:
                last_msg = history[-1]
                last_timestamp = datetime.fromisoformat(last_msg[2])
                now = get_current_time()
                time_diff = now - last_timestamp

                print(f"👋 Checking greeting: Last msg at {last_timestamp}, Now {now}, Diff {time_diff}")

                if time_diff > timedelta(hours=6):
                    # Проверяем смену "делового дня" (08:00 - следующий день)
                    last_business_day = (
                        last_timestamp.date()
                        if last_timestamp.hour >= 8
                        else (last_timestamp - timedelta(days=1)).date()
                    )
                    current_business_day = (
                        now.date()
                        if now.hour >= 8
                        else (now - timedelta(days=1)).date()
                    )
                    
                    print(f"   📅 Business days: Last {last_business_day}, Curr {current_business_day}")

                    return current_business_day > last_business_day
            except Exception as e:
                print(f"⚠️ Error checking greeting logic: {e}")
                pass

        return False

# Глобальный экземпляр бота
_bot_instance = None

def get_bot() -> SalonBot:
    """Получить глобальный экземпляр бота (singleton)"""
    global _bot_instance
    if _bot_instance is None:
        _bot_instance = SalonBot()
    return _bot_instance