# backend/bot/core.py

import google.generativeai as genai
import httpx
import os
import asyncio
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
from services.smart_assistant import SmartAssistant
from services.conversation_context import ConversationContext

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
        proxy_url_raw = os.getenv("PROXY_URL", "")

        print("=" * 50)
        print(f"🔍 ENVIRONMENT: {environment}")
        print(f"🔍 PROXY_URL: {'установлен' if proxy_url_raw else 'не установлен'}")

        # Прокси активны только если:
        # 1. Окружение = production
        # 2. PROXY_URL не пустой
        if environment == "production" and proxy_url_raw:
            self.proxy_url = proxy_url_raw
            proxy_display = self.proxy_url.split('@')[1] if '@' in self.proxy_url else self.proxy_url[:30]
            print(f"✅ Прокси АКТИВЕН: {proxy_display}...")
        else:
            self.proxy_url = None
            print(f"❌ Прокси ОТКЛЮЧЕН")

        # Настраиваем Gemini (для fallback без прокси)
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(GEMINI_MODEL)

        print("✅ Бот инициализирован (Gemini через прокси)")

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
                                    'speak to human', 'manager please', 'real person', 'complaint']
            is_frustrated = any(kw in user_message.lower() for kw in frustration_keywords)
            
            if is_frustrated:
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
                        create_notification(
                            user_id=str(manager[0]),
                            title="😤 КЛИЕНТ НЕДОВОЛЕН",
                            message=f"{client_name} ({platform_name}): {user_message[:100]}",
                            notification_type="urgent",
                            action_url=f"/admin/chat?client_id={instagram_id}"
                        )
                        
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
                """Возвращает 'сегодня', 'завтра' или DD.MM"""
                if date_obj == today:
                    return "сегодня"
                elif date_obj == tomorrow:
                    return "завтра"
                else:
                    return date_obj.strftime('%d.%m')
            
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

            if target_date:
                print(f"📅 Target date detected: {target_date} ({target_date_label})")

                # Определяем услугу и мастера из прогресса бронирования
                service_name = booking_progress.get('service_name') if booking_progress else None
                master_name = booking_progress.get('master') if booking_progress else None

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

                    additional_context += f"""

    🔴 РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ НА {target_date_label.upper()} (из БД):
    {slots_text}

    ⚠️ КРИТИЧНО:
    - ТЫ ОБЯЗАН ПРЕДЛАГАТЬ ТОЛЬКО ЭТИ ВРЕМЕНА!
    - НЕ ПРИДУМЫВАЙ ДРУГОЕ ВРЕМЯ!
    - Время выше РЕАЛЬНО СВОБОДНО - проверено в базе данных!
    - ВСЕГДА говори "{target_date_label}" вместо полной даты!
    
    📝 РУССКИЕ ИМЕНА МАСТЕРОВ (ВСЕГДА используй эти имена):
    - GULYA / Gulya → Гуля
    - JENNIFER / Jennifer → Дженнифер  
    - LYAZZAT / Lyazzat → Ляззат
    - MESTAN / Mestan → Местан
    - SIMO / Simo → Симо
    - TURSUNAY / Tursunay → Турсунай
    
    ✅ ЕСЛИ КЛИЕНТ ПРОСИТ КОНКРЕТНОЕ ВРЕМЯ:
    1. Проверь ВСЕХ мастеров на это время в списке выше
    2. Если время свободно у НЕСКОЛЬКИХ мастеров - ПРЕДЛОЖИ ВЫБОР!
       Пример: "На 19:00 свободны Дженнифер и Местан. К кому записать?"
    3. Если время занято у одного, но свободно у другого - ПРЕДЛОЖИ АЛЬТЕРНАТИВУ!
       Пример: "У Дженнифер в 19:00 занято, но могу предложить к Местану в 19:00. Подходит?"
    4. НЕ ГОВОРИ "нет свободных слотов" если есть другие мастера на это время!
    5. ВСЕГДА используй РУССКИЕ имена мастеров из списка выше!"""
                else:
                    print(f"❌ No available slots found for {target_date}")

                    # ✅ Проверяем ПОЧЕМУ нет слотов на сегодня
                    reason_text = ""
                    if target_date_label == "сегодня":
                        # Получаем часы работы салона
                        salon_hours = self.salon.get('hours', 'Daily 10:30 - 21:00')
                        
                        # Парсим время закрытия
                        if '-' in salon_hours:
                            try:
                                end_time_str = salon_hours.split('-')[1].strip()  # "21:00"
                                from datetime import datetime
                                salon_close = datetime.strptime(end_time_str, '%H:%M').time()
                                
                                # Получаем длительность услуги
                                service_duration_mins = 60  # default
                                if service_name:
                                    from bot.tools import get_available_time_slots
                                    # Функция уже парсит длительность, используем её логику
                                    conn = get_db_connection()
                                    c = conn.cursor()
                                    c.execute("SELECT duration FROM services WHERE name_ru LIKE %s OR name LIKE %s", 
                                             (f"%{service_name}%", f"%{service_name}%"))
                                    dur_row = c.fetchone()
                                    if dur_row and dur_row[0]:
                                        dur_str = dur_row[0]
                                        try:
                                            hours = 0
                                            minutes = 0
                                            if 'h' in dur_str:
                                                hours = int(dur_str.split('h')[0])
                                            if 'min' in dur_str:
                                                min_part = dur_str.split('min')[0]
                                                if 'h' in min_part:
                                                    minutes = int(min_part.split('h')[1].strip())
                                                else:
                                                    minutes = int(min_part)
                                            service_duration_mins = hours * 60 + minutes
                                        except:
                                            pass
                                    conn.close()
                                
                                # Проверяем достаточно ли времени
                                current_hour = current_time.hour
                                current_minute = current_time.minute
                                close_hour = salon_close.hour
                                close_minute = salon_close.minute
                                
                                remaining_minutes = (close_hour * 60 + close_minute) - (current_hour * 60 + current_minute)
                                
                                if remaining_minutes < service_duration_mins:
                                    reason_text = f"\n💡 Сейчас {current_time.strftime('%H:%M')}, салон работает до {end_time_str}.\n"
                                    reason_text += f"Для этой услуги нужно {service_duration_mins} минут, а осталось только {remaining_minutes} минут.\n"
                                    reason_text += "Поэтому на сегодня уже поздно. Предложи завтра!\n"
                            except Exception as e:
                                print(f"⚠️ Error parsing salon hours: {e}")

                    additional_context += f"""

    🔴 НА {target_date_label.upper()} ВСЕ СЛОТЫ ЗАНЯТЫ (проверено в БД)!
    {reason_text}
    ⚠️ СТРОГИЙ ЗАПРЕТ:
    - НЕ ПРЕДЛАГАЙ НИКАКОЕ ВРЕМЯ НА {target_date_label}!
    - НЕ ГОВОРИ "ЕСТЬ ОКОШКО", ЕСЛИ ЕГО НЕТ!
    - Скажи: "На {target_date_label} уже полная запись. Предложить ближайшее свободное время на следующие дни?"
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
            if time_match and target_date:
                requested_time = f"{time_match.group(1).zfill(2)}:{time_match.group(2)}"
                print(f"⏰ Checking specific time: {requested_time}")

                check_result = check_time_slot_available(
                    date=target_date,
                    time=requested_time,
                    master_name=booking_progress.get('master') if booking_progress else None
                )

                if not check_result['available']:
                    print(f"❌ Time {requested_time} is NOT available")

                    alternatives = check_result['alternatives']
                    if alternatives:
                        # 🧠 SMART SUGGESTION LOGIC
                        # Find the closest slot to requested_time
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

    🚫 ВРЕМЯ {requested_time} УЖЕ ЗАНЯТО!
    
    🧠 Я НАШЕЛ БЛИЖАЙШЕЕ СВОБОДНОЕ ОКНО: {alt_time} (мастер {alt_master})
    
    ⚠️ ТВОЯ ЗАДАЧА - БЫТЬ "УМНЫМ АССИСТЕНТОМ" (ПРИНИМАЙ РЕШЕНИЕ ЗА КЛИЕНТА):
    НЕ СПРАШИВАЙ "Когда вам удобно?".
    
    СКАЖИ УТВЕРДИТЕЛЬНО И РЕШИТЕЛЬНО:
    "На {requested_time} уже есть запись, но я нашла для вас окошко рядом - в {alt_time} к мастеру {alt_master}! Записываю вас на это время?"
    
    (Будь настойчива - клиент хочет, чтобы за него решили!)"""
                            else:
                                # Fallback if calc fails
                                alt_text = "\n".join([f"• {s['time']}" for s in alternatives[:3]])
                                additional_context += f"""
    🚫 ВРЕМЯ {requested_time} ЗАНЯТО! Есть: {alt_text}. Предложи ближайшее!"""
                        except Exception as e:
                            print(f"Error finding best slot: {e}")
                            alt_text = "\n".join([f"• {s['time']}" for s in alternatives[:3]])
                            additional_context += f"""
    🚫 ВРЕМЯ {requested_time} ЗАНЯТО! Есть: {alt_text}. Предложи любое из них!"""
                            
                    else:
                        additional_context += f"""
    🚫 ВРЕМЯ {requested_time} ЗАНЯТО И НЕТ АЛЬТЕРНАТИВ НА {target_date}!
    
    ⚠️ ПРЕДЛОЖИ WAITLIST (Лист ожидания):
    "К сожалению, на {target_date} всё занято. Но могу добавить вас в лист ожидания - 
    если кто-то отменит запись, сразу напишу вам! Хотите?"
    
    ИЛИ предложи другую дату/"ближайшие дни".
    """
                    
                    # Prevent AI from saying checking time is available
                    additional_context += "\n⚠️ НЕ ГОВОРИ ЧТО ЭТО ВРЕМЯ СВОБОДНО!"
                else:
                    print(f"✅ Time {requested_time} is available")

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

            ai_response = await self._generate_via_proxy(full_prompt)

            print(f"✅ AI response generated: {ai_response[:100]}")
            print("=" * 50)

            return ai_response

        except Exception as e:
            print(f"❌ Error in generate_response: {e}")
            import traceback
            traceback.print_exc()

            # Fallback ответ - простое сообщение (AI недоступен)
            fallback = "Our manager will respond soon! 💎" if client_language == 'en' else "Наш менеджер скоро ответит! 💎"
            return fallback

    async def _generate_via_proxy(self, prompt: str, max_retries: int = 2) -> str:
        """Генерация через Gemini REST API с прокси и retry механизмом"""
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
НЕ ПИШИ списки с буллетами!  
СРАЗУ К ДЕЛУ!
"""
        elif response_style == 'detailed':
            max_tokens = 1100  # 500 thinking + 600 ответ
            style_instruction = """
⚠️ РЕЖИМ: ПОДРОБНЫЙ (настройка администратора)
- Описывай услуги детально
- Используй списки для читаемости
- Давай рекомендации
"""
        else:  # adaptive
            max_tokens = 900  # 500 thinking + 400 ответ
            style_instruction = """
⚠️ РЕЖИМ: УМНЫЙ
- Для записи: кратко (2-3 предложения)
- Для вопросов: подробнее
"""

        prompt_with_limit = f"""{prompt}
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

        # ✅ РОТАЦИЯ ПРОКСИ
        proxy_urls = []
        if self.proxy_url:
            proxy_urls.append(self.proxy_url)
        proxy_2 = os.getenv("PROXY_URL_2")
        proxy_3 = os.getenv("PROXY_URL_3")
        if proxy_2:
            proxy_urls.append(proxy_2)
        if proxy_3:
            proxy_urls.append(proxy_3)

        if not proxy_urls:
            print("ℹ️ Прямое подключение к Gemini API (localhost режим)")

        for attempt in range(max_retries):
            try:
                # ✅ Выбираем прокси по кругу
                current_proxy = proxy_urls[attempt % len(proxy_urls)] if proxy_urls else None

                if current_proxy:
                    proxy_display = current_proxy.split('@')[1] if '@' in current_proxy else current_proxy[:30]
                    print(f"🌐 Попытка {attempt + 1}/{max_retries} через прокси: {proxy_display}")

                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, proxy=current_proxy) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()
                else:
                    print(f"ℹ️ Попытка {attempt + 1}/{max_retries} (прямое подключение)")
                    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                        response = await client.post(url, json=payload)
                        data = response.json()

                # ✅ ПРОВЕРКА 429 - RATE LIMIT
                if "error" in data:
                    error_code = data["error"].get("code")
                    error_msg = data["error"].get("message", "")

                    if error_code == 429:
                        if attempt < max_retries - 1:
                            wait_time = (2 ** attempt) * 8  # 8s, 16s, 32s, 64s (увеличено!)
                            print(f"⚠️ Rate limit 429 (попытка {attempt + 1}/{max_retries}), ждём {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            print(f"❌ Rate limit 429 после {max_retries} попыток через все прокси")
                            raise Exception("Rate limit exceeded after retries")
                    else:
                        raise Exception(f"Gemini API error {error_code}: {error_msg}")

                # Извлекаем текст ответа
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if len(parts) > 0 and "text" in parts[0]:
                            response_text = parts[0]["text"].strip()

                            # ❌ УБРАНО ЖЕСТКОЕ ОБРЕЗАНИЕ
                        # if len(response_text) > max_chars:
                        #     response_text = response_text[:max_chars-3] + "..."

                        print(f"✅ Успешно получен ответ (попытка {attempt + 1}, прокси {attempt % len(proxy_urls) + 1 if proxy_urls else 'direct'})")
                        return response_text

                # Логируем неожиданный ответ для отладки
                print(f"⚠️ Unexpected response structure: {str(data)[:500]}")
                raise Exception(f"Unexpected Gemini response structure")

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
        return "Our manager will respond soon! 💎" if language == 'en' else "Наш менеджер скоро ответит! 💎"

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

                    return current_business_day > last_business_day
            except:
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