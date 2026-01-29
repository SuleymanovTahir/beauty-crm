import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Optional

# Constants
from bot.constants import (
    OBJECTION_KEYWORDS,
    STYLE_METRICS,
    FALLBACK_PHRASES,
    PROMPT_HEADERS,
    DEFAULT_TONE_INSTRUCTIONS,
    SERVICE_SYNONYMS
)

from db.connection import get_db_connection
from db.services import get_all_services
from utils.datetime_utils import get_current_time
from utils.transliteration import transliterate_name

logger = logging.getLogger(__name__)

# ✅ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ: Извлечение ключевых слов из названий услуг
def extract_service_keywords(service_name: str) -> List[str]:
    """
    Извлекает ключевые слова из названия услуги для универсального поиска
    
    Примеры:
    "Маникюр с обычным покрытием" -> ["маникюр", "обычный", "покрытие", "обычным"]
    "Японский маникюр" -> ["японский", "маникюр"]
    "Hair Color" -> ["hair", "color"]
    """
    if not service_name:
        return []
    
    # Разбиваем на слова
    words = service_name.lower().split()
    
    # Убираем стоп-слова (предлоги, союзы)
    stop_words = {'с', 'и', 'на', 'для', 'the', 'with', 'for', 'of', 'a', 'an'}
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    
    # Добавляем полные фразы из 2-3 слов для лучшего поиска
    # Например: "обычный маникюр", "гель лак"
    if len(words) >= 2:
        for i in range(len(words) - 1):
            bigram = f"{words[i]} {words[i+1]}"
            if bigram not in stop_words:
                keywords.append(bigram)
    
    return keywords

# ✅ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ: Поиск услуги по ключевым словам с учетом контекста
def find_service_by_keywords(
    user_message: str,
    db_services: List,
    context_category: Optional[str] = None
) -> Optional[tuple]:
    """
    Универсальный поиск услуги по ключевым словам из БД
    
    Args:
        user_message: Сообщение пользователя
        db_services: Список услуг из БД
        context_category: Категория из контекста (например, "маникюр" если клиент говорил про маникюр)
    
    Returns:
        (service_row, match_score) или None
    """
    user_msg_lower = user_message.lower()
    
    best_match = None
    best_score = 0
    
    for service_row in db_services:
        # Schema: 0:id, 1:key, 2:name, 3:category, 4:price, 5:min, 6:max, 7:curr, 8:dur
        service_name_base = str(service_row[2] or "").lower() if len(service_row) > 2 else ""
        service_category = str(service_row[3] or "").lower() if len(service_row) > 3 else ""
        
        # Извлекаем ключевые слова из базового названия
        keywords = extract_service_keywords(service_name_base)
        
        # Подсчитываем совпадения
        score = 0
        
        # 1. Точное совпадение названия
        if service_name_base and service_name_base in user_msg_lower:
            score += 100
        
        # 2. Совпадение ключевых слов
        matched_keywords = []
        for keyword in keywords:
            if keyword in user_msg_lower:
                score += 10
                matched_keywords.append(keyword)
        
        # 3. Бонус за совпадение категории из контекста
        if context_category and context_category in service_category:
            score += 5
        
        # 4. Бонус если все ключевые слова совпали
        if matched_keywords and len(matched_keywords) == len(keywords):
            score += 20
        
        if score > best_score:
            best_score = score
            best_match = service_row
    
    # Возвращаем только если есть значимое совпадение
    if best_score >= 10:
        return (best_match, best_score)
    
    return None

# ✅ Импортируем универсальную функцию из utils (убрано дублирование)
from utils.language_utils import get_localized_name

class PromptBuilder:
    def __init__(self, salon: dict = None, bot_settings: dict = None):
        if salon is None or bot_settings is None:
            from db.settings import get_salon_settings
            from bot.core import SalonBot
            self.salon = salon or get_salon_settings()
            self.bot_settings = bot_settings or SalonBot().bot_settings
        else:
            self.salon = salon
            self.bot_settings = bot_settings
        
        # ✅ Load Universal Constants from DB (with fallback to Constants file)
        self.prompt_headers = self._load_json_setting('prompt_headers', PROMPT_HEADERS)
        self.service_synonyms = self._load_json_setting('service_synonyms', SERVICE_SYNONYMS)
        self.objection_keywords = self._load_json_setting('objection_keywords', OBJECTION_KEYWORDS)

    def _load_json_setting(self, key: str, default_value: dict) -> dict:
        """Helper to safely load JSON settings"""
        try:
            val = self.bot_settings.get(key)
            if isinstance(val, dict): return val
            if isinstance(val, str) and val.strip():
                return json.loads(val)
            return default_value
        except Exception as e:
            logger.warning(f"Error loading {key} from settings: {e}. Using default.")
            return default_value

    def build_full_prompt(self, 
                          instagram_id: str,
                          history: List[Tuple], 
                          booking_progress: Optional[dict] = None,
                          client_language: str = 'ru',
                          additional_context: str = "") -> str:
        """Сборка основного системного промта"""
        from datetime import datetime, timedelta
        
        # Получаем текущую дату и завтрашнюю для промпта
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        today_str = today.strftime('%Y-%m-%d')
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        day_after_tomorrow_str = (tomorrow + timedelta(days=1)).strftime('%Y-%m-%d')
        # Map arguments to context for internal helper methods
        context = {
            'instagram_id': instagram_id,
            'booking_progress': booking_progress or {},
            'language': client_language,
            'additional_context': additional_context
        }
        client_tone = analyze_client_tone(history)
        
        # 1. Базовая информация о салоне
        base_info = self._build_salon_info(client_language)
        
        # 2. Список услуг (ДИНАМИЧЕСКИЙ) с локализацией
        services_list = self._build_services_list(client_language)
        
        # 3. Список мастеров (ДИНАМИЧЕСКИЙ)
        masters_list = self._build_masters_list(client_language)
        
        # 4. Проверка доступности (если есть запрос)
        # Получаем instagram_id из контекста или ищем в истории
        instagram_id = context.get('instagram_id', '')
        
        # ✅ ОБРАБОТКА ОШИБОК: Не падаем при ошибке в _build_booking_availability
        try:
            booking_availability = self._build_booking_availability(
                instagram_id, 
                history=history,
                client_language=client_language
            )
        except Exception as e:
            logger.error(f"❌ ERROR in _build_booking_availability: {e}", exc_info=True)
            print(f"❌ ERROR in _build_booking_availability: {e}")
            import traceback
            traceback.print_exc()
            # ✅ Fallback: Показываем базовую информацию даже при ошибке
            booking_availability = f"""
⚠️ ВРЕМЕННО НЕДОСТУПНО: Не удалось загрузить расписание.
Пожалуйста, уточните желаемую дату и время, и мы подберем свободное окно.
"""
        
        # 5. История и контекст
        history_summary = self._build_history(history)
        
        # 6. Предпочтения клиента
        preferences = context.get('preferences', {})
        if not preferences and instagram_id:
            preferences = get_client_recent_preferences(instagram_id)
        preferences_section = self._build_preferences_section(preferences)

        # ✅ Check for existing phone number
        phone_instruction = "10. 📞 ОБЯЗАТЕЛЬНО: Ты НЕ ИМЕЕШЬ ПРАВА подтвердить запись без номера телефона (WhatsApp)! Вежливо попроси номер. Без номера запись невозможна."
        
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT phone FROM clients WHERE instagram_id = %s", (instagram_id,))
            row = c.fetchone()
            if row and row[0]:
                client_phone = row[0]
                phone_instruction = f"10. ✅ НОМЕР ТЕЛЕФОНА ИЗВЕСТЕН: {client_phone}. НЕ СПРАШИВАЙ его у клиента. Используй этот номер для записи."
                print(f"📱 [PromptBuilder] Client phone found: {client_phone}")
            else:
                 print(f"📱 [PromptBuilder] Client phone NOT found. Rule #10 enforced.")
            conn.close()
        except Exception as e:
            print(f"❌ Error fetching client phone: {e}")

        # 7. Возражения
        objections = get_client_objection_history(instagram_id) if instagram_id else []
        objections_section = self._build_objections_section(objections)
        
        # 8. Тон
        tone_instruction = self._build_tone_adaptation(client_tone)

        # DEBUG LOGGING
        print(f"\nPROMPT COMPONENTS DEBUG:")
        print(f"   Language: {client_language}")
        print(f"   Tone: {client_tone}")
        print(f"   Services len: {len(services_list)}")
        print(f"   Masters len: {len(masters_list)}")
        print(f"   Availability len: {len(booking_availability)}")
        print(f"   History len: {len(history)}")
        print(f"   Objections: {len(objections)}")

        # Dynamic Settings Injection
        bot_name = self.bot_settings.get('bot_name', 'Virtual Assistant')
        personality = self.bot_settings.get('personality_traits', 'Professional, helpful, efficient')
        comm_style = self.bot_settings.get('communication_style', 'Polite, concise')
        greeting_msg = self.bot_settings.get('greeting_message', 'Hello! How can I help you?')
        
        emoji_rule = self.bot_settings.get('emoji_usage', 'Минимальное (1-2 на сообщение)')
        
        # 9. Дополнительные секции (Dynamic)
        price_exp = self.bot_settings.get('price_explanation', 'Мы в премиум-сегменте')
        safety_section = self._build_safety_guidelines()
        examples_section = self._build_examples_section()
        anti_patterns_section = self._build_anti_patterns()
        advanced_rules_section = self._build_advanced_rules()

        # СБОРКА ПРОМТА
        if client_language != 'ru':
            system_prompt = f"""
        You are {bot_name}, the professional assistant of {self.salon.get('name', 'Beauty Salon')}.
        You use the Gemini Pro model to generate responses.
        
        YOUR ROLE & PERSONALITY:
        {personality}
        
        IMPORTANT:
        1. You are a VIRTUAL ASSISTANT, not a human.
        2. If asked "are you a bot?" - answer honestly: "Yes, I am a virtual assistant."
        3. Your goal is to book the client for a service.
        4. PRICING RULES: {price_exp}

{base_info}

{services_list}

{masters_list}

{booking_availability}

{preferences_section}

{objections_section}

{safety_section}

{examples_section}

{advanced_rules_section}

{tone_instruction}

{history_summary}

        IMPORTANT COMMUNICATION RULES ({comm_style}):
        1. Be polite but concise.
        2. Emoji usage: {emoji_rule}.
        3. Always suggest specific times if slots are available.
        4. If the client asks for price - name the price from the services list.
        5. ⛔️ AVAILABILITY CHECK: If "AVAILABLE MASTERS" says "no slots" or "❌" - IT MEANS THE MASTER IS BUSY! Do not suggest them.
        6. Do not invent services not found in the list.
        7. 🌐 CRITICAL: ALWAYS use the client's language ({client_language}) for ALL responses!
        8. If the client just says hello - respond warmly using: "{greeting_msg}" (adapted to the language).
        
{anti_patterns_section}
        9. ONE QUESTION AT A TIME: Do not ask for Date + Master + Phone at once. Ask sequentially: Date -> Phone.
        10. DO NOT ask about the Master unless requested. Pick any available master.
        {phone_instruction}

✅ PROTOCOL: FINALIZING BOOKING (SAVE TO DB)
When the client CONFIRMED the booking and you have all data (Service, Master, Date, Time, Phone):
Generate an [ACTION] block - it is invisible to the client.

⚠️ CRITICAL RULES FOR ACTION BLOCK:
1. "service" - EXACT name from the services list above (in client's language)
2. "master" - EXACT name from the staff list above (in client's language)
3. "date" - EXACT date in YYYY-MM-DD format. Today: {today_str}, tomorrow: {tomorrow_str}.
4. "time" - HH:MM format.
5. "phone" - full number with country code.

📝 RESPONSE FORMAT:
- No ACTION block for the client.
- Write a beautiful confirmation with address and hours.
- Use {client_language} for all text.

Example ({client_language}):
"Great! I've booked you for [service] with [master] on [date] at [time]. 💅
Location: {self.salon.get('address', '')}
Hours: {self.salon.get('hours_weekdays', '')}
See you soon! 😊

[ACTION]
{{
  "action": "save_booking",
  "service": "[EXACT service name]",
  "master": "[EXACT master name]",
  "date": "{today_str}",
  "time": "10:30",
  "phone": "[client phone]"
}}
[/ACTION]"
"""
        else:
            system_prompt = f"""
        Ты - {bot_name}, профессиональный администратор салона красоты {self.salon.get('name', 'Beauty Salon')}.
        Ты используешь модель Gemini Pro для генерации ответов.
        
        ТВОЯ РОЛЬ И ХАРАКТЕР:
        {personality}
        
        ВАЖНО:
        1. Ты - ВИРТУАЛЬНЫЙ ПОМОЩНИК, а не живой человек.
        2. Если спросят "ты бот?" - отвечай честно: "Да, я виртуальный помощник".
        3. Твоя цель - записать клиента на услугу.
        4. ПРАВИЛА ЦЕНООБРАЗОВАНИЯ: {price_exp}

{base_info}

{services_list}

{masters_list}

{booking_availability}

{preferences_section}

{objections_section}

{safety_section}

{examples_section}

{advanced_rules_section}

{tone_instruction}

{history_summary}

        ВАЖНЫЕ ПРАВИЛА ОБЩЕНИЯ ({comm_style}):
        1. Будь вежлив, но краток.
        2. Использование эмодзи: {emoji_rule}.
        3. Всегда предлагай конкретное время если есть слоты.
        4. Если клиент спрашивает цену - называй цену из списка услуг.
        5. ⛔️ ПРОВЕРКА ДОСТУПНОСТИ: Если в блоке "ДОСТУПНЫЕ МАСТЕРА" написано "мест нет" или "❌" - ЗНАЧИТ МАСТЕР ЗАНЯТ!
        6. Не придумывай услуги, которых нет в списке.
        7. 🌐 КРИТИЧЕСКИ ВАЖНО: ВСЕГДА используй язык клиента ({client_language}) для ВСЕХ ответов!
        8. Если клиент просто здоровается - отвечай приветливо: "{greeting_msg}"
        
{anti_patterns_section}
        9. ОДИН ВОПРОС ЗА РАЗ: Не спрашивай Дату + Мастера + Телефон одновременно. Спрашивай последовательно: Дата -> Телефон.
        10. ПРО МАСТЕРА НЕ СПРАШИВАЙ, если клиент сам не попросил. Выбирай свободного мастера.
        {phone_instruction}

✅ PROTOCOL: FINALIZING BOOKING (SAVE TO DB)
Когда клиент ПОДТВЕРДИЛ запись и у тебя есть ВСЕ данные (Услуга, Мастер, Дата, Время, Телефон):
Сгенерируй блок [ACTION] (невидим для клиента).

⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА ДЛЯ ACTION БЛОКА:
1. "service" - ТОЧНОЕ название из списка услуг выше (в языке клиента)
2. "master" - ТОЧНОЕ имя из списка мастеров выше (в языке клиента)
3. "date" - конкретная дата YYYY-MM-DD. Сегодня: {today_str}, завтра: {tomorrow_str}.
4. "time" - HH:MM
5. "phone" - полный номер с кодом

📝 ФОРМАТ ОТВЕТА КЛИЕНТУ:
- НЕ показывай ACTION блок клиенту.
- Выполни красивое подтверждение с адресом и часами.
- Используй {client_language} для всего текста.

Пример ({client_language}):
"Отлично! Записала вас на [название] к мастеру [имя] на [дата] в [время]. 💅
Адрес: {self.salon.get('address', '')}
Режим работы: {self.salon.get('hours_weekdays', '')}
До встречи! 😊

[ACTION]
{{
  "action": "save_booking",
  "service": "[ТОЧНОЕ название]",
  "master": "[ТОЧНОЕ имя]",
  "date": "{today_str}",
  "time": "10:30",
  "phone": "[телефон клиента]"
}}
[/ACTION]"
"""
        return system_prompt

    def _build_salon_info(self, language: str = 'ru') -> str:
        """Инфо о салоне"""
        payment_methods = self.salon.get('payment_methods', 'Card, Cash' if language != 'ru' else 'Карта, Наличные')
        prepayment_required = self.salon.get('prepayment_required', False)
        parking_info = self.salon.get('parking_info', 'Available' if language != 'ru' else 'Есть информация')
        wifi_available = self.salon.get('wifi_available', True)

        # Labels
        addr_label = "Address" if language != 'ru' else "Адрес"
        hours_label = "Hours" if language != 'ru' else "Часы"
        phone_label = "Phone" if language != 'ru' else "Телефон"
        pay_label = "Payment Methods" if language != 'ru' else "Способы оплаты"
        prep_label = "Prepayment" if language != 'ru' else "Предоплата"
        prep_val = ("Required" if prepayment_required else "Not required") if language != 'ru' else ("Требуется" if prepayment_required else "Не требуется")
        wifi_val = ("Yes, free" if wifi_available else "No") if language != 'ru' else ("Да, бесплатный" if wifi_available else "Нет")

        address = self.salon.get('address', '')
        hours = self.salon.get('hours_weekdays', self.salon.get('hours', ''))

        return f"""{self.prompt_headers.get('SALON_INFO', PROMPT_HEADERS['SALON_INFO'])}
{addr_label}: {address}
{hours_label}: {hours}
{phone_label}: {self.salon.get('phone', self.salon.get('whatsapp', ''))}
Google Maps: {self.salon.get('google_maps', '')}

💳 {pay_label}: {payment_methods}
💰 {prep_label}: {prep_val}
🚗 Parking: {parking_info}
📶 Wi-Fi: {wifi_val}

⚠️ USE THIS INFORMATION when client asks about:
- Payment? → Mention payment methods
- Prepayment? → Mention if required
- Parking? → Mention parking info
- Wi-Fi? → Mention Wi-Fi availability"""

    def _get_category_translation(self, category: str, language: str) -> str:
        """Получить перевод категории - бот сам переведет, просто возвращаем оригинал"""
        # Бот сам переведет категории на язык клиента, просто возвращаем оригинальное название
        return category
    
    def _get_service_name_by_language(self, service: tuple, language: str) -> str:
        """Получить название услуги на указанном языке из locales/dynamic.json"""
        from utils.language_utils import get_dynamic_translation
        
        # New schema: id(0), key(1), name(2)
        base_name = service[2] if len(service) > 2 else f"Service {service[0]}"
        
        return get_dynamic_translation(
            table='services',
            item_id=service[0],
            field='name',
            language=language,
            default_value=base_name
        )
    
    def _get_duration_display(self, duration: str, language: str) -> str:
        """Получить отображение длительности с учетом языка"""
        if not duration:
            return ""
        
        from utils.duration_utils import parse_duration_to_minutes, format_duration_display
        
        # Парсим длительность в минуты
        minutes = parse_duration_to_minutes(duration)
        if not minutes:
            return ""
        
        # Форматируем в читаемый вид на нужном языке
        formatted = format_duration_display(minutes, language)
        return f" ({formatted})"
    
    def _get_language_instructions(self, language: str) -> str:
        """Получить универсальные инструкции"""
        if language != 'ru':
            return """⚠️ IMPORTANT SERVICE RULES:
1. ALWAYS use EXACT service names from the list above in the client's language!
2. ALWAYS use category names in the client's language!
3. WHEN CLIENT ASKS ABOUT DURATION: Check the duration in brackets next to the service and state the EXACT time!
4. DO NOT provide approximate values if the exact duration is listed!"""
        
        return """⚠️ ВАЖНЫЕ ПРАВИЛА ДЛЯ УСЛУГ:
1. ВСЕГДА используй ТОЧНЫЕ названия услуг из списка выше на языке клиента!
2. ВСЕГДА используй названия категорий на языке клиента, НЕ используй другие языки!
3. КОГДА КЛИЕНТ СПРАШИВАЕТ О ДЛИТЕЛЬНОСТИ: СМОТРИ ДЛИТЕЛЬНОСТЬ В СКОБКАХ ВЫШЕ И НАЗЫВАЙ ТОЧНОЕ ВРЕМЯ на языке клиента!
4. НЕ говори приблизительные значения если точная длительность известна!"""

    def _build_services_list(self, client_language: str = 'ru') -> str:
        """Список услуг из БД с локализацией"""
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            # Schema index 6 is category
            # New schema from db/services.py: id(0), key(1), name(2), category(3), price(4), min(5), max(6), curr(7), dur(8), desc(9)
            category = service[3] if len(service) > 3 else 'general'
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)

        services_text = f"{self.prompt_headers.get('SERVICES', PROMPT_HEADERS['SERVICES'])}\n\n"
        
        for category, services_list in services_by_category.items():
            # Используем перевод категории на язык клиента
            category_display = self._get_category_translation(category, client_language)
            services_text += f"📂 {category_display}:\n"
            
            # ✅ ОПТИМИЗАЦИЯ: Показываем только ТОП-15 услуг в категории чтобы не забивать контекст
            shown_services = services_list[:15]
            hidden_count = len(services_list) - 15
            
            currency = self.salon.get('currency', 'AED')
            for service in shown_services:
                price_str = format_service_price_for_bot(service, currency_fallback=currency)
                # Получаем название услуги на языке клиента
                name = self._get_service_name_by_language(service, client_language)
                # New schema dur is 8
                duration = service[8] if len(service) > 8 else ''
                
                # Получаем отображение длительности на языке клиента
                duration_display = self._get_duration_display(duration, client_language)

                services_text += f"• {name} - {price_str}{duration_display}\n"
                
            if hidden_count > 0:
                services_text += f"  ... and {hidden_count} more services (available upon request)\n"
            
            services_text += "\n"
        
        # Добавляем инструкции на языке клиента
        services_text += "\n" + self._get_language_instructions(client_language) + "\n"

        return services_text

    def _build_masters_list(self, client_language: str = 'ru') -> str:
        """Список мастеров салона С ИХ УСЛУГАМИ из БД"""
        from db.employees import get_all_employees
        
        # Получаем всех сотрудников (провайдеров услуг)
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT id, full_name, position, 
                   experience, years_of_experience
            FROM users 
            WHERE is_service_provider = TRUE AND is_active = TRUE
            AND (role = 'employee' OR secondary_role = 'employee')
            ORDER BY full_name ASC
        """)
        
        employees = c.fetchall()

        if not employees:
            return ""

        masters_text = f"{self.prompt_headers.get('MASTERS', PROMPT_HEADERS['MASTERS'])}\n"
        masters_text += "⚠️ ПРОВЕРЯЙ ЭТОТ СПИСОК КОГДА КЛИЕНТ СПРАШИВАЕТ ПРО МАСТЕРА!\n"
        masters_text += "⚠️ ВСЕГДА используй ТОЧНЫЕ имена мастеров из списка выше на языке клиента (не транслит, не другие языки)!\n\n"

        conn = get_db_connection()
        c = conn.cursor()

        for emp in employees:
            emp_id = emp[0]
            
            from utils.language_utils import validate_language, build_coalesce_query, get_dynamic_translation
            client_language = validate_language(client_language)
            
            # Name and Position via dynamic translations
            emp_name_display = get_dynamic_translation(
                table='users',
                item_id=emp_id,
                field='full_name',
                language=client_language,
                default_value=emp[1] # base full_name
            )
            
            emp_position_display = get_dynamic_translation(
                table='users',
                item_id=emp_id,
                field='position',
                language=client_language,
                default_value=emp[2] # base position
            )
            
            experience = emp[3] or emp[4] # experience or years_of_experience
            

            # ✅ ПОЛУЧАЕМ УСЛУГИ ЭТОГО МАСТЕРА ИЗ БД С ЦЕНАМИ
            # Универсальный запрос с COALESCE для любого языка
            service_name_coalesce = build_coalesce_query('name', client_language)
            
            c.execute(f"""
                SELECT {service_name_coalesce} as service_name, 
                       s.category, us.price, us.price_min, us.price_max, 
                       us.duration, us.is_online_booking_enabled
                FROM user_services us
                JOIN services s ON us.service_id = s.id
                WHERE us.user_id = %s AND s.is_active = TRUE
                ORDER BY us.is_online_booking_enabled DESC, s.category, service_name
            """, (emp_id,))

            services = c.fetchall()
            
            # Если у мастера нет услуг - пропускаем его, чтобы не путать AI
            if not services:
                continue

            # ✅ ОПТИМИЗАЦИЯ: Краткий формат мастеров
            currency = self.salon.get('currency', 'AED')
            masters_text += f"👤 {emp_name_display}\n"
            position_label = "Position" if client_language != 'ru' else "Должность"
            exp_label = "Experience" if client_language != 'ru' else "Опыт"
            masters_text += f"   {position_label}: {emp_position_display}\n"
            if experience:
                masters_text += f"   {exp_label}: {experience}\n"
            
            for service_name, category, price, price_min, price_max, duration, online_booking in services:
                # Format price
                if price_min and price_max:
                    price_display = f"{int(price_min)}-{int(price_max)} {currency}"
                elif price:
                    price_display = f"{int(price)} {currency}"
                else:
                    price_display = "price upon request" if client_language != 'ru' else "цена по запросу"
                
                # Show duration if custom
                duration_display = f", {duration} min" if duration else ""
                
                # Marker for offline booking
                offline_marker = ""
                if not online_booking:
                    offline_marker = " (phone only)" if client_language != 'ru' else " (только по телефону)"
                
                masters_text += f"  - {service_name} ({category}) - {price_display}{duration_display}{offline_marker}\n"

            masters_text += "\n"

        conn.close()
        return masters_text

    def _build_history(self, history: List[Tuple]) -> str:
        """История диалога"""
        if not history:
            return ""

        # ✅ Фильтруем fallback и технические сообщения
        fallback_phrases = FALLBACK_PHRASES

        filtered_history = []
        for item in history[-10:]:  # Берём последние 10
            if len(item) >= 5:
                msg, sender, timestamp, msg_type, msg_id = item[:5]
            elif len(item) >= 4:
                msg, sender, timestamp, msg_type = item[:4]
            elif len(item) >= 3:
                msg, sender, timestamp = item[:3]
                msg_type = 'text'
            else:
                # Недостаточно данных - пропускаем
                continue

            # Пропускаем fallback сообщения
            if any(phrase in msg for phrase in fallback_phrases):
                continue

            filtered_history.append(
                (msg, sender, timestamp, msg_type if len(item) > 3 else 'text'))

        if not filtered_history:
            return ""

        history_text = f"{self.prompt_headers.get('HISTORY', PROMPT_HEADERS['HISTORY'])}\n"

        # Показываем последние 5
        for msg, sender, timestamp, msg_type in filtered_history[-5:]:
            role = "Клиент" if sender == "client" else "Ты"
            if msg_type == 'voice':
                history_text += f"{role}: [Голосовое]\n"
            else:
                history_text += f"{role}: {msg}\n"

        return history_text

    def _build_preferences_section(self, preferences: dict) -> str:
        """#2 - Память о предпочтениях + #10 - Upsell"""
        if not preferences or not preferences.get('last_service'):
            return ""

        text = f"{self.prompt_headers.get('PREFERENCES', PROMPT_HEADERS['PREFERENCES'])}\n"

        if preferences.get('favorite_service'):
            text += f"Любимая услуга: {preferences['favorite_service']}\n"

        if preferences.get('favorite_master'):
            text += f"Любимый мастер: {preferences['favorite_master']}\n"

        if preferences.get('last_service'):
            text += f"Последний визит: {preferences['last_service']}\n"

        if preferences.get('total_visits', 0) >= 3:
            text += f"Постоянный клиент ({preferences['total_visits']} визитов) - особое внимание!\n"

        # ✅ #10 - UPSELL: Проверяем давно ли был на педикюре
        instagram_id = preferences.get('instagram_id', '')
        if instagram_id:
            last_pedicure_date = get_last_service_date(instagram_id, 'Pedicure')
            if last_pedicure_date:
                try:
                    last_date = datetime.fromisoformat(last_pedicure_date)
                    days_ago = (get_current_time() - last_date).days
                    if days_ago > 21:
                        text += f"\n💡 UPSELL ВОЗМОЖНОСТЬ: Педикюр был {days_ago} дней назад!\n"
                        text += f"   Если клиент записывается на маникюр - предложи педикюр тоже!\n"
                except:
                    pass

        text += "\n✨ ИСПОЛЬЗУЙ ЭТУ ИНФО:\n"
        text += "- Напомни о прошлом визите естественно\n"
        text += "- Предложи того же мастера если клиент доволен\n"
        text += "- Для постоянных клиентов - более тёплый тон\n"
        text += "- Если есть UPSELL возможность - предложи услугу естественно\n"

        return text

    def _build_tone_adaptation(self, tone: str) -> str:
        """#3 - Адаптация под стиль клиента"""
        tone_instructions = DEFAULT_TONE_INSTRUCTIONS

        custom_adaptations = self.bot_settings.get('personality_adaptations', '')
        
        base_instruction = tone_instructions.get(tone, "")
        
        if custom_adaptations:
            return f"{base_instruction}\n\n=== 🎭 ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ПО СТИЛЮ ИЗ БАЗЫ ===\n{custom_adaptations}"
            
        return base_instruction

    def _build_objections_section(self, objections: List[str]) -> str:
        """#6 - История возражений"""
        if not objections:
            return ""

        text = f"{self.prompt_headers.get('OBJECTIONS', PROMPT_HEADERS['OBJECTIONS'])}\n"
        text += "Клиент УЖЕ говорил:\n"

        # Соответствие паттернов и рекомендаций
        # Соответствие паттернов и полей настройки
        # Используем get c fallback на дефолтное значение если в базе пусто
        objection_responses = {
            'price': self.bot_settings.get('objection_expensive') or "💰 'Дорого' - НЕ снижай цену! Подчеркни ценность и качество (премиум косметика, стерильность, опыт)",
            'think': self.bot_settings.get('objection_think_about_it') or "🤔 'Подумать' - Дай конкретную информацию, предложи свободное окно на выбор, спроси что смущает",
            'no_time': self.bot_settings.get('objection_no_time') or "⏰ 'Нет времени' - Покажи что процедура быстрая (есть экспресс), предложи вечернее время или выходной",
            'far': self.bot_settings.get('objection_too_far') or "📍 'Далеко' - Подчеркни удобство локации (JBR, парковка), скажи что результат стоит поездки",
            'pain': self.bot_settings.get('objection_pain') or "😣 'Больно' - Успокой, расскажи про стерильность и аккуратность мастеров",
            'result_doubt': self.bot_settings.get('objection_result_doubt') or "🧐 'Сомнения в результате' - Предложи посмотреть портфолио в Instagram, расскажи про гарантию",
            'cheaper_elsewhere': self.bot_settings.get('objection_cheaper_elsewhere') or "💸 'Где-то дешевле' - Объясни разницу в качестве материалов и сервиса (мы не экономим на здоровье)",
            'consult_husband': self.bot_settings.get('objection_consult_husband') or "💑 'Посоветоваться с мужем' - Скажи 'Конечно!', предложи подарочный сертификат"
        }

        # objections - это СПИСОК типов (например ['price', 'think'])
        for obj_type in objections:
            if obj_type in objection_responses:
                text += f"- {objection_responses[obj_type]}\n"

        text += "\nМЕНЯЙ ПОДХОД если возражение повторяется!\n"

        return text

    def _build_safety_guidelines(self) -> str:
        """🛡️ Правила безопасности и этики"""
        guidelines = self.bot_settings.get('safety_guidelines', '')
        emergency = self.bot_settings.get('emergency_situations', '')
        if not guidelines and not emergency:
            return ""
            
        return f"""
🛡️ БЕЗОПАСНОСТЬ И ЭТИКА:
{guidelines}
{emergency}
"""

    def _build_examples_section(self) -> str:
        """💡 Примеры диалогов и ответов"""
        good_responses = self.bot_settings.get('example_good_responses', '')
        dialogues = self.bot_settings.get('example_dialogues', '')
        
        if not good_responses and not dialogues:
            return ""
            
        return f"""
💡 ПРИМЕРЫ ОБЩЕНИЯ:
{good_responses}

{dialogues}
"""

    def _build_anti_patterns(self) -> str:
        """❌ ЧЕГО НЕЛЬЗЯ ДЕЛАТЬ"""
        anti_patterns = self.bot_settings.get('anti_patterns', '')
        if not anti_patterns:
            return ""
            
        return f"""
❌ СТРОГО ЗАПРЕЩЕНО (ANTI-PATTERNS):
{anti_patterns}
"""

    def _build_advanced_rules(self) -> str:
        """🧠 Сложные правила и контекст"""
        contextual = self.bot_settings.get('contextual_rules', '')
        algorithm = self.bot_settings.get('algorithm_actions', '')
        ad_campaign = self.bot_settings.get('ad_campaign_detection', '')
        
        parts = []
        if contextual: parts.append(f"🌍 КОНТЕКСТ:\n{contextual}")
        if algorithm: parts.append(f"📋 АЛГОРИТМЫ:\n{algorithm}")
        if ad_campaign: parts.append(f"🎯 РЕКЛАМА:\n{ad_campaign}")
        
        if not parts:
            return ""
            
        return "\n\n".join(parts)

    def _build_booking_availability(
        self,
        instagram_id: str,
        service_name: str = "",
        master_name: str = "",
        preferred_date: str = "",
        history: Optional[List[Tuple]] = None,
        client_language: str = 'ru'
    ) -> str:
        """Построить информацию о доступности мастеров"""
        from db.employees import get_employees_by_service, get_all_employees
        from db.services import get_all_services as fetch_services_db

        if history is None:
            history = []

        conn = get_db_connection()
        c = conn.cursor()
        c.execute(
            "SELECT name, username FROM clients WHERE instagram_id = %s", (instagram_id,))
        client_data = c.fetchone()
        client_has_name = bool(client_data and (
            client_data[0] or client_data[1]))

        # ✅ #2 - Получаем предпочтения клиента
        preferences = get_client_recent_preferences(instagram_id)

        # ✅ #NEW - ДИНАМИЧЕСКОЕ ОПРЕДЕЛЕНИЕ УСЛУГИ ИЗ БД
        # 1. Получаем все активные услуги
        db_services = fetch_services_db(active_only=True)
        # db_services row structure: 0:id, 1:service_key, 2:name, 3:category, 4:price, 5:min_price, 6:max_price, 7:currency, 8:duration
        # (Translations are handled via locales, not stored in DB columns)
        
        detected_service = None
        
        logger.info(f"🔍 [PromptBuilder] Starting service detection. service_name='{service_name}', history_length={len(history)}")
        
        if not service_name and history:
            # Собираем все сообщения клиента
            client_messages = []
            for item in reversed(history[-5:]): # последние 5
                if len(item) >= 2 and item[1] == 'client':
                    client_messages.append(item[0].lower())
            
            combined_msg = " ".join(client_messages)
            logger.debug(f"📝 [PromptBuilder] Client messages (last 5): {client_messages}")

            # ✅ FIX: Restrict service detection scope to avoid "ghost" matches from history
            # Only look at the VERY LAST message for new service intent, 
            # unless we clearly don't have a service yet.
            
            # If we already have a service intent from argument, skip detection
            if service_name:
                print(f"ℹ️ [PromptBuilder] Service already known: '{service_name}'. Skipping detection.")
            else:
                # Analyze mostly the last message for strong intent
                last_msg_lower = ""
                if history:
                    last_item = history[-1]
                    if len(last_item) >= 2 and last_item[1] == 'client':
                        last_msg_lower = last_item[0].lower()
                
                # Check for strong match in LAST message first
                found_in_last = False
                
                # Search candidates construction (same as before)
                search_candidates = []
                for s in db_services:
                    if isinstance(s, dict):
                         # If s is a dict, use keys
                         for key in ['name', 'category']:
                             val = s.get(key)
                             if val and isinstance(val, str):
                                 search_candidates.append((val.lower(), s))
                    else:
                         # If s is a tuple (Schema: id(0), key(1), name(2), ru(3), en(4), ar(5), cat(6), price(7)...)
                         # We use indices 2, 3, 4, 5 (names) and 6 (category)
                         for idx in [2, 3, 4, 5, 6]:
                             if len(s) > idx and s[idx] and isinstance(s[idx], str):
                                 search_candidates.append((s[idx].lower(), s))
                
                # ✅ УНИВЕРСАЛЬНЫЙ ПОИСК: Используем контекст для определения категории
                # Определяем категорию из предыдущих сообщений (если клиент говорил про маникюр, то "обычный" = маникюр)
                context_category = None
                for item in reversed(history[-10:]):
                    if len(item) >= 2 and item[1] == 'client':
                        msg_lower = item[0].lower()
                        # Ищем упоминания категорий услуг
                        if 'маникюр' in msg_lower or 'manicure' in msg_lower:
                            context_category = 'маникюр'
                            break
                        elif 'педикюр' in msg_lower or 'pedicure' in msg_lower:
                            context_category = 'педикюр'
                            break
                        elif 'стрижка' in msg_lower or 'haircut' in msg_lower:
                            context_category = 'стрижка'
                            break
                        elif 'окрашивание' in msg_lower or 'coloring' in msg_lower:
                            context_category = 'окрашивание'
                            break
                
                # ✅ УНИВЕРСАЛЬНЫЙ ПОИСК: Сначала пробуем точное совпадение
                for name_key, s_obj in search_candidates:
                    if name_key in last_msg_lower:
                        detected_service = s_obj[3] if s_obj[3] else s_obj[2]
                        service_name = detected_service
                        found_in_last = True
                        logger.info(f"✅ [PromptBuilder] Exact match found: '{service_name}'")
                        print(f"🔎 [PromptBuilder] Service detected in LAST message: '{service_name}'")
                        break
                
                # ✅ УНИВЕРСАЛЬНЫЙ ПОИСК: Если точного совпадения нет, используем поиск по ключевым словам
                if not found_in_last:
                    match_result = find_service_by_keywords(
                        user_message=last_msg_lower,
                        db_services=db_services,
                        context_category=context_category
                    )
                    
                    if match_result:
                        service_row, match_score = match_result
                        detected_service = service_row[3] if service_row[3] else service_row[2]
                        service_name = detected_service
                        found_in_last = True
                        logger.info(f"✅ [PromptBuilder] Keyword match found: '{service_name}' (score: {match_score})")
                        print(f"🔎 [PromptBuilder] Service detected by keywords: '{service_name}' (score: {match_score})")
                
                # ✅ FALLBACK: Старые синонимы (только общие, не зависящие от услуг)
                if not found_in_last:
                    for syn_key, target_names in self.service_synonyms.items():
                        if syn_key in last_msg_lower:
                            logger.info(f"🔍 [PromptBuilder] Found general synonym '{syn_key}' in last message")
                            print(f"🔍 [PromptBuilder] Found general synonym '{syn_key}' in last message")
                            # Ищем соответствующую услугу в БД
                            for target_name in target_names:
                                target_name_lower = target_name.lower()
                                for s in db_services:
                                    service_name_en = (s[2] or "").lower()
                                    service_name_ru = (s[3] or "").lower()
                                    if target_name_lower in service_name_en or target_name_lower in service_name_ru:
                                        detected_service = s[3] if s[3] else s[2]
                                        service_name = detected_service
                                        logger.info(f"✅ [PromptBuilder] Mapped synonym '{syn_key}' → service '{service_name}'")
                                        print(f"✅ [PromptBuilder] Mapped synonym '{syn_key}' → service '{service_name}'")
                                        found_in_last = True
                                        break
                                if found_in_last:
                                    break
                            if found_in_last:
                                break
                
                # 2. If not found in last message, check broader history BUT be careful
                # We only fallback to history if the last message was likely "Yes", "No", "Ok" (short)
                if not found_in_last and len(last_msg_lower) < 10:
                    # ✅ УНИВЕРСАЛЬНЫЙ ПОИСК: Используем поиск по ключевым словам в истории
                    match_result = find_service_by_keywords(
                        user_message=combined_msg,
                        db_services=db_services,
                        context_category=context_category
                    )
                    
                    if match_result:
                        service_row, match_score = match_result
                        detected_service = service_row[3] if service_row[3] else service_row[2]
                        service_name = detected_service
                        logger.info(f"✅ [PromptBuilder] Service recovery from history: '{service_name}' (score: {match_score})")
                        print(f"🔎 [PromptBuilder] Service recovery from history: '{service_name}'")
                    else:
                        # Fallback на старый метод
                        for name_key, s_obj in search_candidates:
                            if name_key in combined_msg:
                                detected_service = s_obj[3] if s_obj[3] else s_obj[2]
                                service_name = detected_service
                                print(f"🔎 [PromptBuilder] Service recovery from history: '{service_name}'")
                                break

        
        if not service_name:
             print(f"ℹ️ [PromptBuilder] No service detected in conversation history.")
             logger.info(f"ℹ️ [PromptBuilder] No service detected in conversation history. Will ask client.")

        instructions = self.bot_settings.get(
            'booking_availability_instructions', '')

        if not service_name:
            # ✅ УЛУЧШЕНИЕ UX: Проверяем, был ли уже задан вопрос об услуге
            recent_bot_messages = []
            for item in reversed(history[-5:]):
                if len(item) >= 2 and item[1] == 'bot':
                    recent_bot_messages.append(item[0].lower())
            
            # Проверяем, был ли уже вопрос об услуге
            service_question_asked = any(
                'какую процедуру' in msg or 'на какую услугу' in msg or 
                'что вас интересует' in msg or 'какой маникюр' in msg or
                'какой педикюр' in msg or 'какая услуга' in msg or
                'what service' in msg or 'which service' in msg
                for msg in recent_bot_messages
            )
            
            # ✅ УЛУЧШЕНИЕ UX: Если вопрос уже задан, предлагаем варианты вместо открытого вопроса
            if service_question_asked:
                logger.info(f"🔄 [PromptBuilder] Service question already asked. Providing options instead.")
                print(f"🔄 [PromptBuilder] Service question already asked. Providing options instead.")
                
                # Определяем категорию из контекста
                context_category = None
                for item in reversed(history[-10:]):
                    if len(item) >= 2 and item[1] == 'client':
                        msg_lower = item[0].lower()
                        if 'маникюр' in msg_lower or 'manicure' in msg_lower:
                            context_category = 'маникюр'
                            break
                        elif 'педикюр' in msg_lower or 'pedicure' in msg_lower:
                            context_category = 'педикюр'
                            break
                        elif 'стрижка' in msg_lower or 'haircut' in msg_lower:
                            context_category = 'стрижка'
                            break
                        elif 'окрашивание' in msg_lower or 'coloring' in msg_lower:
                            context_category = 'окрашивание'
                            break
                
                # Получаем популярные услуги из БД (либо по категории, либо все популярные)
                from utils.language_utils import build_coalesce_query
                service_name_coalesce = build_coalesce_query('name', client_language)
                
                if context_category:
                    # Поиск по name и category (переводы хранятся в locales)
                    c.execute("""
                        SELECT name, category
                        FROM services
                        WHERE is_active = TRUE
                        AND (LOWER(category) LIKE %s OR LOWER(name) LIKE %s)
                        ORDER BY id
                        LIMIT 5
                    """, (f"%{context_category}%", f"%{context_category}%"))
                else:
                    # Если категория не определена, берем услуги из разных категорий
                    c.execute("""
                        SELECT DISTINCT ON (category) name, category
                        FROM services
                        WHERE is_active = TRUE
                        ORDER BY category, id
                        LIMIT 6
                    """)
                
                popular_services = c.fetchall()
                conn.close()
                
                if popular_services:
                    services_list = "\n".join([f"   • {s[0] or s[1]}" for s in popular_services])
                    category_text = f" в категории '{context_category}'" if context_category else ""
                    return f"""
✅ У нас есть несколько вариантов{category_text}:
{services_list}

Какой вас интересует? 😊
"""
            
            # ✅ УЛУЧШЕНИЕ UX: Используем контекст - если клиент упоминал категорию, предлагаем услуги этой категории
            context_category = None
            for item in reversed(history[-10:]):
                if len(item) >= 2 and item[1] == 'client':
                    msg_lower = item[0].lower()
                    if 'маникюр' in msg_lower or 'manicure' in msg_lower:
                        context_category = 'маникюр'
                        break
                    elif 'педикюр' in msg_lower or 'pedicure' in msg_lower:
                        context_category = 'педикюр'
                        break
                    elif 'стрижка' in msg_lower or 'haircut' in msg_lower:
                        context_category = 'стрижка'
                        break
                    elif 'окрашивание' in msg_lower or 'coloring' in msg_lower:
                        context_category = 'окрашивание'
                        break
            
            if context_category:
                logger.info(f"🔍 [PromptBuilder] Detected category from context: '{context_category}'. Providing options.")
                print(f"🔍 [PromptBuilder] Detected category from context: '{context_category}'. Providing options.")
                
                c.execute("""
                    SELECT name
                    FROM services
                    WHERE is_active = TRUE
                    AND (LOWER(category) LIKE %s OR LOWER(name) LIKE %s)
                    ORDER BY id
                    LIMIT 4
                """, (f"%{context_category}%", f"%{context_category}%"))
                
                category_services = c.fetchall()
                conn.close()
                
                if category_services:
                    services_text = "\n".join([f"   • {s[0]}" for s in category_services])
                    # Бот сам переведет этот текст на язык клиента
                    return f"""
У нас есть несколько вариантов {context_category}а:
{services_text}

Какой вас интересует? 😊
"""
            
            # Если ничего не найдено, возвращаем стандартное сообщение
            conn.close()
            return f"""{self.prompt_headers.get('UNKNOWN_SERVICE', PROMPT_HEADERS['UNKNOWN_SERVICE'])}
{instructions}"""

        print(f"✅ [PromptBuilder] Building availability for service: '{service_name}'")
        logger.info(f"✅ [PromptBuilder] Building availability for service: '{service_name}'")

        if client_has_name:
            logger.debug(f"✅ [PromptBuilder] Client has name, skipping name request")
            instructions = instructions.replace(
                "Для записи нужно имя и WhatsApp",
                "Для записи нужен только WhatsApp"
            )
            instructions = instructions.replace(
                "Как вас зовут?",
                ""
            )
            instructions = instructions.replace(
                "имя и WhatsApp",
                "WhatsApp"
            )
            instructions = instructions.replace(
                "имя и",
                ""
            )

        # Ищем услугу в БД по названию (точному или похожему)
        # service_name мы определили выше или оно пришло аргументом
        logger.debug(f"🔍 [PromptBuilder] Searching for service in DB: '{service_name}'")

        # Поиск по name (переводы хранятся в locales)
        c.execute("""
            SELECT id, name, price, currency, duration, category
            FROM services
            WHERE LOWER(name) LIKE %s
            AND is_active = TRUE
            LIMIT 1
        """, (f"%{service_name.lower()}%",))
        service_row = c.fetchone()

        if not service_row:
            logger.warning(f"❌ [PromptBuilder] Service '{service_name}' NOT found in DB search.")
            print(f"❌ [PromptBuilder] Service '{service_name}' NOT found in DB search.")
            conn.close()
            # Бот сам переведет это сообщение на язык клиента
            return f"""{self.prompt_headers.get('NOT_FOUND_SERVICE', PROMPT_HEADERS['NOT_FOUND_SERVICE'])}
Не нашла услугу "{service_name}" в списке.
Попробуй назвать услугу иначе."""

        service_id = service_row[0]
        service_name_display = service_row[1]  # Уже локализованное название
        service_category = service_row[5] if len(service_row) > 5 else None
        logger.info(f"✅ [PromptBuilder] Service found in DB: id={service_id}, name='{service_name_display}', category='{service_category}'")
        print(f"✅ [PromptBuilder] Service found: id={service_id}, name='{service_name_display}', category='{service_category}'")
        
        # Parse base duration from service definition
        base_duration_val = service_row[4]  # index 4 is duration, 5 is category
        base_duration_minutes = 60  # Default safe fallback
        
        if base_duration_val:
            from utils.duration_utils import parse_duration_to_minutes
            
            parsed = parse_duration_to_minutes(base_duration_val)
            if parsed:
                base_duration_minutes = parsed
                logger.debug(f"📏 [PromptBuilder] Parsed duration: {base_duration_minutes} minutes from '{base_duration_val}'")
            else:
                logger.warning(f"⚠️ [PromptBuilder] Could not parse duration '{base_duration_val}' for service id={service_id}, name='{service_name_display}'. Using fallback {base_duration_minutes} min")
        
        employees = get_employees_by_service(service_id)
        print(f"👥 [PromptBuilder] Found {len(employees)} employees for service ID {service_id}")
        logger.info(f"✅ Found {len(employees)} employees for service_id={service_id}, service_name='{service_name}'")

        if not employees:
            logger.warning(f"⚠️ No employees found for service_id={service_id}, service_name='{service_name}'")
            print(f"❌ ERROR: No employees found for service_id={service_id}, service_name='{service_name}'")
            
            # ✅ УЛУЧШЕНИЕ: Ищем альтернативные услуги в той же категории, у которых ЕСТЬ мастера
            # service_row structure: 0:id, 1:service_key, 2:name, 3:category, 4:price, 5:min_price, 6:max_price, 7:currency, 8:duration
            service_category = service_row[6] if len(service_row) > 6 else None
            alternative_services = []
            
            from utils.language_utils import build_coalesce_query
            service_name_coalesce = build_coalesce_query('name', client_language)
            
            if service_category:
                # Ищем услуги в той же категории, у которых есть мастера
                c.execute(f"""
                    SELECT s.id, {service_name_coalesce} as name
                    FROM services s
                    WHERE s.is_active = TRUE 
                    AND s.id != %s
                    AND LOWER(s.category) LIKE %s
                    AND EXISTS (
                        SELECT 1 FROM user_services us
                        JOIN users u ON u.id = us.user_id
                        WHERE us.service_id = s.id
                        AND u.is_active = TRUE 
                        AND u.is_service_provider = TRUE
                        AND u.role NOT IN ('director', 'admin', 'manager')
                    )
                    ORDER BY s.id
                    LIMIT 5
                """, (service_id, f"%{service_category.lower()}%"))
                alternative_services = c.fetchall()
            
            # Если не нашли в категории, ищем любые популярные услуги с мастерами
            if not alternative_services:
                c.execute(f"""
                    SELECT DISTINCT s.id, {service_name_coalesce} as name
                    FROM services s
                    WHERE s.is_active = TRUE 
                    AND s.id != %s
                    AND EXISTS (
                        SELECT 1 FROM user_services us
                        JOIN users u ON u.id = us.user_id
                        WHERE us.service_id = s.id
                        AND u.is_active = TRUE 
                        AND u.is_service_provider = TRUE
                        AND u.role NOT IN ('director', 'admin', 'manager')
                    )
                    ORDER BY s.id
                    LIMIT 5
                """, (service_id,))
                alternative_services = c.fetchall()
            
            conn.close()
            
            # Используем фактическое название услуги из БД
            actual_service_name = service_name_display if service_name_display else service_name
            
            if alternative_services:
                alt_list = "\n".join([f"   • {s[1]}" for s in alternative_services])
                return f"""⚠️ ВАЖНО: Услуга "{actual_service_name}" временно недоступна (нет свободных мастеров).

✅ Вместо этого доступны похожие услуги:
{alt_list}

🎯 ИНСТРУКЦИЯ ДЛЯ AI: 
- НЕ предлагай услугу "{actual_service_name}" - она недоступна!
- Вежливо сообщи клиенту, что "{actual_service_name}" временно недоступна
- Предложи альтернативные услуги из списка выше
- Если клиент настаивает на "{actual_service_name}", предложи связаться с салоном по телефону"""
            else:
                return f"""⚠️ ВАЖНО: Услуга "{actual_service_name}" временно недоступна (нет свободных мастеров).

🎯 ИНСТРУКЦИЯ ДЛЯ AI: 
- НЕ предлагай услугу "{actual_service_name}" - она недоступна!
- Вежливо сообщи клиенту, что "{actual_service_name}" временно недоступна
- Предложи клиенту связаться с салоном по телефону {self.salon.get('phone', '')} для уточнения доступности
- Или предложи выбрать другую услугу из общего списка услуг"""

        # ✅ INIT SMART SCHEDULER
        from services.smart_scheduler import SmartScheduler
        scheduler = SmartScheduler()
        
        # ... (lines skipped)
        
        found_any = False
        avail_text = ""
        
        for emp in employees:
            # emp: (u.*, price, duration, price_min, price_max)
            # u.* fields: 0:id, 1:username, 2:pass, 3:full_name, ...
            emp_id = emp[0]
            username = emp[1]
            full_name = emp[3]
            
            # ✅ ВАЛИДАЦИЯ: Проверяем, что мастер существует и активен
            c.execute("SELECT id, is_active, is_service_provider FROM users WHERE id = %s", (emp_id,))
            master_check = c.fetchone()
            
            if not master_check:
                logger.error(f"❌ ERROR: Master with id={emp_id}, name='{full_name}' NOT FOUND in DB! Skipping.")
                print(f"❌ ERROR: Master with id={emp_id}, name='{full_name}' NOT FOUND in DB! Skipping.")
                continue
            
            if not master_check[1]:  # is_active
                logger.warning(f"⚠️ WARNING: Master {full_name} (id={emp_id}) is NOT ACTIVE! Skipping.")
                print(f"⚠️ WARNING: Master {full_name} (id={emp_id}) is NOT ACTIVE! Skipping.")
                continue
            
            if not master_check[2]:  # is_service_provider
                logger.warning(f"⚠️ WARNING: Master {full_name} (id={emp_id}) is NOT a service provider! Skipping.")
                print(f"⚠️ WARNING: Master {full_name} (id={emp_id}) is NOT a service provider! Skipping.")
                continue
            
            # Fetch duration (Master Override)
            duration_val = emp[-3]
            
            # Start with BASE service duration
            duration_minutes = base_duration_minutes 
            
            if duration_val:
                from utils.duration_utils import parse_duration_to_minutes
                
                parsed = parse_duration_to_minutes(duration_val)
                if parsed:
                    duration_minutes = parsed
                else:
                    logger.warning(f"⚠️ Could not parse master override duration '{duration_val}' for {full_name}, using base duration {base_duration_minutes} min")

            master_display_name = get_localized_name(emp_id, full_name, client_language)
            
            # ✅ ВАЛИДАЦИЯ: Проверяем, что service_name существует в БД перед вызовом scheduler
            if service_name:
                c.execute("SELECT id, name FROM services WHERE id = %s AND is_active = TRUE", (service_id,))
                service_check = c.fetchone()
                if not service_check:
                    logger.error(f"❌ ERROR: Service id={service_id}, name='{service_name}' NOT FOUND or NOT ACTIVE in DB!")
                    print(f"❌ ERROR: Service id={service_id}, name='{service_name}' NOT FOUND or NOT ACTIVE in DB!")
                    continue
            
            # 🧠 SMART SUGGESTION
            # Pass full_name because MasterScheduleService uses it for lookup
            # Используем preferred_date если есть, иначе None (scheduler сам определит)
            target_date_str = preferred_date if preferred_date else None
            try:
                suggestions = scheduler.get_smart_suggestions(
                    service_name=service_name,
                    master_name=full_name, 
                    target_date_str=target_date_str,
                    duration_minutes=duration_minutes
                )
                
                # ✅ ВАЛИДАЦИЯ: Проверяем, что suggestions содержит валидные данные
                if not isinstance(suggestions, dict):
                    logger.error(f"❌ ERROR: scheduler.get_smart_suggestions returned invalid data type: {type(suggestions)}")
                    print(f"❌ ERROR: scheduler.get_smart_suggestions returned invalid data type: {type(suggestions)}")
                    continue
                
                if 'primary_slots' not in suggestions:
                    logger.error(f"❌ ERROR: suggestions missing 'primary_slots' key!")
                    print(f"❌ ERROR: suggestions missing 'primary_slots' key!")
                    continue
                
            except Exception as e:
                logger.error(f"❌ ERROR in get_smart_suggestions for {full_name}: {e}", exc_info=True)
                print(f"❌ ERROR in get_smart_suggestions for {full_name}: {e}")
                continue
            
            # Формируем отображение цены для этого мастера
            price_min = emp[-2]
            price_max = emp[-1]
            price_val = emp[-4]
            currency = self.salon.get('currency', 'AED')
            
            price_display = ""
            if price_min and price_max:
                price_display = f" ({int(price_min)}-{int(price_max)} {currency})"
            elif price_val:
                price_display = f" ({int(price_val)} {currency})"
            
            avail_text += f"\n👤 Мастер: {master_display_name}{price_display}\n"
            
            if suggestions['primary_slots']:
                found_any = True
                date_display = suggestions['primary_date']
                
                # ... (rest of slots logic)
                slots_str = ", ".join(suggestions['primary_slots'][:24])
                avail_text += f"   ✅ {date_display}: {slots_str}\n"
            else:
                status = suggestions.get('status', 'full')
                date_display = suggestions['primary_date']
                if status == 'vacation':
                    avail_text += f"   🌴 {date_display}: Мастер в отпуске/выходной.\n"
                elif status == 'inactive':
                    avail_text += f"   ❌ {date_display}: Мастер временно не принимает.\n"
                else:
                    avail_text += f"   ❌ {date_display}: На этот день мест нет.\n"
                
            # Show alternatives if primary is full or explicitly requested
            if suggestions.get('alternatives'):
                found_any = True
                avail_text += f"   💡 Альтернативы:\n"
                for alt in suggestions['alternatives']:
                    if not isinstance(alt, dict) or 'date' not in alt or 'slots' not in alt:
                        logger.warning(f"⚠️ Invalid alternative format: {alt}")
                        continue
                    
                    # Валидация слотов в альтернативах
                    valid_alt_slots = []
                    for slot in alt['slots'][:3]:
                        if isinstance(slot, str) and ':' in slot:
                            try:
                                hour, minute = map(int, slot.split(':'))
                                if 0 <= hour < 24 and 0 <= minute < 60:
                                    valid_alt_slots.append(slot)
                            except ValueError:
                                pass
                    
                    if valid_alt_slots:
                        alt_slots = ", ".join(valid_alt_slots)
                        avail_text += f"      - {alt['date']}: {alt_slots}\n"

        if not found_any:
            avail_text += "\n😔 К сожалению, свободных окошек на ближайшие дни нет."
            
        avail_text += "\nВАЖНО: Предлагай ТОЛЬКО эти слоты. Не выдумывай время."

        conn.close()
        return avail_text




# В начало файла после импортов добавь:

def get_client_recent_preferences(instagram_id: str, limit: int = 3) -> dict:
    """Получить последние предпочтения клиента (#2 - Умная память)"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT service_name, master, datetime 
        FROM bookings 
        WHERE instagram_id = %s AND status = 'completed'
        ORDER BY datetime DESC
        LIMIT %s
    """, (instagram_id, limit))

    bookings = c.fetchall()
    conn.close()

    if not bookings:
        return {}

    services = {}
    masters = {}

    for service, master, dt in bookings:
        services[service] = services.get(service, 0) + 1
        if master:
            # ✅ ПРОВЕРЯЕМ что мастер существует в БД
            conn2 = get_db_connection()
            c2 = conn2.cursor()
            # Check if master exists and is active
            c2.execute("SELECT COUNT(*) FROM users WHERE full_name = %s AND is_active = TRUE AND is_service_provider = TRUE", (master,))
            if c2.fetchone()[0] > 0:
                masters[master] = masters.get(master, 0) + 1
            conn2.close()

    fav_service = max(services.items(), key=lambda x: x[1])[0] if services else None
    fav_master = max(masters.items(), key=lambda x: x[1])[0] if masters else None

    return {
        'favorite_service': fav_service,
        'favorite_master': fav_master,
        'last_service': bookings[0][0] if bookings else None,
        'last_master': bookings[0][1] if bookings else None,
        'last_date': bookings[0][2] if bookings else None,
        'total_visits': len(bookings)
    }

def get_popular_booking_times(service_name: Optional[str] = None) -> List[str]:
    """Популярные времена записи (#9)"""
    conn = get_db_connection()
    c = conn.cursor()

    if service_name:
        c.execute("""
            SELECT EXTRACT(HOUR FROM datetime::timestamp) as hour, COUNT(*) as count
            FROM bookings
            WHERE service_name LIKE %s
            GROUP BY EXTRACT(HOUR FROM datetime::timestamp)
            ORDER BY count DESC
            LIMIT 3
        """, (f"%{service_name}%",))
    else:
        c.execute("""
            SELECT EXTRACT(HOUR FROM datetime::timestamp) as hour, COUNT(*) as count
            FROM bookings
            GROUP BY EXTRACT(HOUR FROM datetime::timestamp)
            ORDER BY count DESC
            LIMIT 3
        """)

    results = c.fetchall()
    conn.close()

    popular_hours = []
    for hour, count in results:
        try:
            popular_hours.append(f"{int(hour):02d}:00")
        except:
            continue

    return popular_hours if popular_hours else ["15:00", "18:00"]

def analyze_client_tone(history: List[Tuple]) -> str:
    """Анализировать стиль общения клиента (#3 - Адаптация тона)"""
    if not history:
        return "neutral"

    # Берём последние 5 сообщений клиента
    client_messages = [msg[0] for msg in history[-10:] if msg[1] == 'client']
    
    if not client_messages:
        return "neutral"

    # Анализ метрик
    avg_len = sum(len(m) for m in client_messages) / len(client_messages)
    emoji_count = sum(len([c for c in m if c in '😊👍❤️💅✨']) for m in client_messages)
    
    # Решение
    if avg_len < STYLE_METRICS['BRIEF_LEN_THRESHOLD'] and emoji_count < 1:
        return 'brief'
    elif emoji_count >= STYLE_METRICS['EMOJI_COUNT_THRESHOLD']:
        return 'friendly'
    elif avg_len > STYLE_METRICS['DETAILED_LEN_THRESHOLD']:
        return 'detailed'
    
    return 'neutral'

def format_service_price_for_bot(service, currency_fallback: str = 'AED') -> str:
    """Helper formatting using correct schema indices or dict keys"""
    if isinstance(service, dict):
        price = service.get('price', 0)
        p_min = service.get('min_price')
        p_max = service.get('max_price')
        curr = service.get('currency', currency_fallback)
    else:
        # New schema from db/services.py: id(0), key(1), name(2), cat(3), price(4), min(5), max(6), curr(7), dur(8)
        price = service[4] if len(service) > 4 else 0
        p_min = service[5] if len(service) > 5 else None
        p_max = service[6] if len(service) > 6 else None
        curr = service[7] if len(service) > 7 else currency_fallback
    
    currency = curr or currency_fallback
    
    try:
        if p_min is not None and p_max is not None and str(p_min).strip() != "" and str(p_max).strip() != "" and p_min != p_max:
            return f"{int(float(p_min))}-{int(float(p_max))} {currency}"
        elif price is not None and str(price).strip() != "":
            return f"{int(float(price))} {currency}"
    except (ValueError, TypeError):
        pass
        
    return "price upon request"

def get_last_service_date(instagram_id: str, service_name_part: str) -> Optional[str]:
    """Helper: get date of last specific service"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT datetime FROM bookings 
        WHERE instagram_id = %s AND status = 'completed' AND service_name ILIKE %s
        ORDER BY datetime DESC LIMIT 1
    """, (instagram_id, f"%{service_name_part}%"))
    row = c.fetchone()
    conn.close()
    return row[0] if row else None

def get_client_objection_history(instagram_id: str) -> List[str]:
    """Получить историю возражений клиента (просто заглушка или реальный анализ)"""
    # В реальной системе здесь мог быть анализ тегов клиента
    return []
