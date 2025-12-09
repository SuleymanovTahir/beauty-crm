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

class PromptBuilder:
    def __init__(self, salon: dict, bot_settings: dict):
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
                          booking_progress: dict = None,
                          client_language: str = 'ru',
                          additional_context: str = "") -> str:
        """Сборка основного системного промта"""
        # Map arguments to context for internal helper methods
        context = {
            'instagram_id': instagram_id,
            'booking_progress': booking_progress or {},
            'language': client_language,
            'additional_context': additional_context
        }
        client_tone = analyze_client_tone(history)
        
        # 1. Базовая информация о салоне
        base_info = self._build_salon_info()
        
        # 2. Список услуг (ДИНАМИЧЕСКИЙ)
        services_list = self._build_services_list()
        
        # 3. Список мастеров (ДИНАМИЧЕСКИЙ)
        masters_list = self._build_masters_list(client_language)
        
        # 4. Проверка доступности (если есть запрос)
        # Получаем instagram_id из контекста или ищем в истории
        instagram_id = context.get('instagram_id', '')
        booking_availability = self._build_booking_availability(
            instagram_id, 
            history=history,
            client_language=client_language
        )
        
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

        # 🔍 DEBUG LOGGING
        print(f"\n🧩 PROMPT COMPONENTS DEBUG:")
        print(f"   🌐 Language: {client_language}")
        print(f"   🎭 Tone: {client_tone}")
        print(f"   📋 Services len: {len(services_list)}")
        print(f"   👥 Masters len: {len(masters_list)}")
        print(f"   📅 Availability len: {len(booking_availability)}")
        print(f"   📜 History len: {len(history)}")
        print(f"   ⚠️ Objections: {len(objections)}")

        # ✅ Dynamic Settings Injection
        bot_name = self.bot_settings.get('bot_name', 'Virtual Assistant')
        personality = self.bot_settings.get('personality_traits', 'Professional, helpful, efficient')
        comm_style = self.bot_settings.get('communication_style', 'Polite, concise')
        greeting_msg = self.bot_settings.get('greeting_message', 'Hello! How can I help you?')
        
        emoji_rule = self.bot_settings.get('emoji_usage', 'Минимальное (1-2 на сообщение)')
        
        # 9. Дополнительные секции (Dynamic)
        safety_section = self._build_safety_guidelines()
        examples_section = self._build_examples_section()
        anti_patterns_section = self._build_anti_patterns()
        advanced_rules_section = self._build_advanced_rules()

        # СБОРКА ПРОМТА
        system_prompt = f"""
        Ты - {bot_name}, профессиональный администратор салона красоты {self.salon.get('name', 'Beauty Salon')}.
        Ты используешь модель Gemini Pro для генерации ответов.
        
        ТВОЯ РОЛЬ И ХАРАКТЕР:
        {personality}
        
        ВАЖНО:
        1. Ты - ВИРТУАЛЬНЫЙ ПОМОЩНИК, а не живой человек.
        2. Если спросят "ты бот?" - отвечай честно: "Да, я виртуальный помощник".
        3. Твоя цель - записать клиента на услугу.

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
        5. Если клиент спрашивает "есть ли места" - смотри блок ДОСТУПНЫЕ МАСТЕРА.
        6. Не придумывай услуги, которых нет в списке.
        7. Используй язык клиента ({client_language}).
        8. Если клиент просто здоровается - отвечай приветливо, используя фразу: "{greeting_msg}" (но адаптируй под язык клиента).
        
{anti_patterns_section}
        9. ВАЖНО: Не спрашивай "На что хотите записаться?". Лучше: "На какую процедуру хотели бы попасть?". 
        10. ⛔️ ЗАПРЕТ НА ДУБЛИ ПРИВЕТСТВИЙ: Если в истории диалога (см. выше) ты УЖЕ здоровался - НЕ здоровайся снова.
        {phone_instruction}

✅ PROTOCOL: FINALIZING BOOKING (SAVE TO DB)
Когда клиент ПОДТВЕРДИЛ запись (написал "подтверждаю", "да, записывайте" и т.д.) И у тебя есть ВСЕ данные (Услуга, Мастер, Дата, Время, Телефон):
Ты должен сгенерировать специальный блок [ACTION].
Внутри блока - JSON с данными для сохранения в БД.

Пример финального ответа:
"Отлично! Записала вас на Маникюр к мастеру Анна на завтра в 14:00. 💅
[ACTION]
{{
  "action": "save_booking",
  "service": "Маникюр классический",
  "master": "Anna",
  "date": "2025-05-20",
  "time": "14:00",
  "phone": "971501234567"
}}
[/ACTION]
До встречи в салоне!"
"""
        return system_prompt

    def _build_salon_info(self) -> str:
        """Инфо о салоне"""
        payment_methods = self.salon.get('payment_methods', 'Карта, Наличные')
        prepayment_required = self.salon.get('prepayment_required', False)
        parking_info = self.salon.get('parking_info', 'Нет информации')
        wifi_available = self.salon.get('wifi_available', True)

        return f"""{self.prompt_headers.get('SALON_INFO', PROMPT_HEADERS['SALON_INFO'])}
Адрес: {self.salon.get('address', '')}
Часы: {self.salon.get('hours', '')}
Телефон: {self.salon.get('phone', '')}
Google Maps: {self.salon.get('google_maps', '')}

💳 Способы оплаты: {payment_methods}
💰 Предоплата: {'Требуется' if prepayment_required else 'Не требуется'}
🚗 Парковка: {parking_info}
📶 Wi-Fi: {'Да, бесплатный' if wifi_available else 'Нет'}

⚠️ ИСПОЛЬЗУЙ ЭТУ ИНФОРМАЦИЮ когда клиент спрашивает:
- "Как оплатить?" / "Какие способы оплаты?" → Назови способы оплаты выше
- "Нужна предоплата?" → Скажи требуется или нет
- "Есть парковка?" → Назови информацию о парковке
- "Есть Wi-Fi?" → Скажи да или нет"""

    def _build_services_list(self) -> str:
        """Список услуг из БД"""
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            category = service[9]
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)

        services_text = f"{self.prompt_headers.get('SERVICES', PROMPT_HEADERS['SERVICES'])}\n\n"

        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            
            # ✅ ОПТИМИЗАЦИЯ: Показываем только ТОП-15 услуг в категории чтобы не забивать контекст
            # Остальные бот найдет через поиск если клиент спросит
            shown_services = services_list[:15]
            hidden_count = len(services_list) - 15
            
            for service in shown_services:
                price_str = format_service_price_for_bot(service)
                # service[3] is name_ru, service[2] is name_en
                # Force RU name if available, otherwise EN
                name = service[3] if service[3] else service[2]
                # description = service[11] or '' # ❌ Убрали описание для экономии токенов
                duration = service[15] or ''  # duration field
                
                # ✅ Добавляем длительность к каждой услуге
                duration_display = ""
                if duration:
                    # Парсим длительность для отображения
                    try:
                        if 'h' in duration and 'min' in duration:
                            # Формат "1h 30min"
                            hours = duration.split('h')[0].strip()
                            mins = duration.split('h')[1].split('min')[0].strip()
                            duration_display = f" ({hours} ч {mins} мин)"
                        elif 'h' in duration:
                            # Формат "1h" или "2h"
                            hours = duration.split('h')[0].strip()
                            if hours == '1':
                                duration_display = f" (1 час)"
                            else:
                                duration_display = f" ({hours} часа)"
                        elif duration.isdigit():
                            # Формат "60" (минуты)
                            mins = int(duration)
                            if mins >= 60:
                                hours = mins // 60
                                remaining_mins = mins % 60
                                if remaining_mins > 0:
                                    duration_display = f" ({hours} ч {remaining_mins} мин)"
                                else:
                                    duration_display = f" ({hours} час{'а' if hours > 1 else ''})"
                            else:
                                duration_display = f" ({mins} мин)"
                    except:
                        pass

                services_text += f"• {name} - {price_str}{duration_display}\n"
                
            if hidden_count > 0:
                services_text += f"  ... и еще {hidden_count} услуг (ищи в базе если спросят)\n"
            
            services_text += "\n"
        
        services_text += "\n⚠️ КОГДА КЛИЕНТ СПРАШИВАЕТ 'СКОЛЬКО ДЛИТСЯ?':\n"
        services_text += "СМОТРИ ДЛИТЕЛЬНОСТЬ В СКОБКАХ ВЫШЕ И НАЗЫВАЙ ТОЧНОЕ ВРЕМЯ!\n"
        services_text += "НЕ говори 'около 2 часов' если точная длительность известна!\n"

        return services_text

    def _build_masters_list(self, client_language: str = 'ru') -> str:
        """Список мастеров салона С ИХ УСЛУГАМИ из БД"""
        from db.employees import get_all_employees
        
        # Получаем всех сотрудников (провайдеров услуг)
        employees = get_all_employees(active_only=True, service_providers_only=True)

        if not employees:
            return ""

        masters_text = f"{self.prompt_headers.get('MASTERS', PROMPT_HEADERS['MASTERS'])}\n"
        masters_text += "⚠️ ПРОВЕРЯЙ ЭТОТ СПИСОК КОГДА КЛИЕНТ СПРАШИВАЕТ ПРО МАСТЕРА!\n\n"

        conn = get_db_connection()
        c = conn.cursor()

        for emp in employees:
            emp_id = emp[0]
            
            # Индексы из users таблицы (см. users schema):
            # 3: full_name
            # 24: full_name_ru
            # 25: full_name_en
            # 9: position
            # 18: position_ru
            # 20: position_en
            # 13: experience
            # 12: bio
            # 45: bio_ru

            original_name = emp[3]
            
            # ✅ Выбор имени в зависимости от языка
            if client_language == 'ru':
                emp_name_display = emp[24] if emp[24] else original_name
                emp_position_display = emp[18] if emp[18] else (emp[9] or "Мастер")
                emp_bio_display = emp[45] if emp[45] else emp[12]
            else:
                emp_name_display = emp[25] if emp[25] else original_name
                emp_position_display = emp[20] if emp[20] else (emp[9] or "Master")
                emp_bio_display = emp[12]  # Default bio

            experience = emp[13]

            # ✅ ПОЛУЧАЕМ УСЛУГИ ЭТОГО МАСТЕРА ИЗ БД С ЦЕНАМИ
            # Выбираем название услуги на нужном языке (name_ru или name)
            service_name_col = "s.name_ru" if client_language == 'ru' else "s.name"
            
            c.execute(f"""
                SELECT COALESCE({service_name_col}, s.name) as service_name, 
                       s.category, us.price, us.price_min, us.price_max, 
                       us.duration, us.is_online_booking_enabled
                FROM user_services us
                JOIN services s ON us.service_id = s.id
                WHERE us.user_id = %s AND s.is_active = TRUE AND us.is_online_booking_enabled = TRUE
                ORDER BY s.category, service_name
            """, (emp_id,))

            services = c.fetchall()
            
            # Если у мастера нет услуг - пропускаем его, чтобы не путать AI
            if not services:
                continue

            # ✅ ОПТИМИЗАЦИЯ: Краткий формат мастеров
            masters_text += f"👤 {emp_name_display}\n"
            masters_text += f"   Должность: {emp_position_display}\n"
            if experience:
                masters_text += f"   Опыт: {experience}\n"
            # if emp_bio_display: # ❌ Убрали BIO для экономии токенов
            #    masters_text += f"   О себе: {emp_bio_display}\n"
            
            # Группировка услуг по категориям для компактности (опционально)
            # Но пока выводим списком
            for service_name, category, price, price_min, price_max, duration, online_booking in services:
                # Format price
                if price_min and price_max:
                    price_display = f"{int(price_min)}-{int(price_max)} AED"
                elif price:
                    price_display = f"{int(price)} AED"
                else:
                    price_display = "цена по запросу"
                
                # Show duration if custom
                duration_display = f", {duration} мин" if duration else ""
                
                masters_text += f"  - {service_name} ({category}) - {price_display}{duration_display}\n"

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
                msg, sender, timestamp, msg_type, msg_id = item
            else:
                msg, sender, timestamp, msg_type = item

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
        history: List[Tuple] = None,
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
        # db_services row structure: id, code, name, name_ru, description... 
        # (check fetch_services_db implementation for indices)
        # Assuming: 0:id, 1:code, 2:name_en, 3:name_ru, ... 9:category
        
        detected_service = None
        
        if not service_name and history:
            # Собираем все сообщения клиента
            client_messages = []
            for item in reversed(history[-5:]): # последние 5
                if len(item) >= 2 and item[1] == 'client':
                    client_messages.append(item[0].lower())
            
            combined_msg = " ".join(client_messages)

            # Пытаемся найти название услуги в тексте
            # Сортируем услуги по длине названия (чтобы 'Manicure Spa' находилось раньше 'Manicure')
            # Создаем список для поиска: (name, service_obj)
            search_candidates = []
            for s in db_services:
                # Добавляем EN название
                if s[2]: search_candidates.append((s[2].lower(), s))
                # Добавляем RU название
                if s[3]: search_candidates.append((s[3].lower(), s))
                # Можно добавить и category
                if s[9]: search_candidates.append((s[9].lower(), s))
            
            # ✅ Add Synonyms from Constants
            for syn_key, target_names in self.service_synonyms.items():
                if syn_key in combined_msg:
                    # Client used a synonym (e.g. "кератин")
                    # Find the target service object
                    for target_name in target_names:
                        target_name_lower = target_name.lower()
                        # Find service by EN or RU name
                        for s in db_services:
                            # s[2] is name_en, s[3] is name_ru (adjust indices if needed based on fetch_services_db)
                            # Actually fetch_services_db returns: id, code, name(en), name_ru, duration...
                            # Let's assume name match
                            if (s[2] and target_name_lower in s[2].lower()) or \
                               (s[3] and target_name_lower in s[3].lower()):
                                search_candidates.insert(0, (syn_key, s)) # High priority


            # Сортировка по убыванию длины
            search_candidates.sort(key=lambda x: len(x[0]), reverse=True)

            for name_key, s_obj in search_candidates:
                if name_key in combined_msg:
                    # Нашли совпадение!
                    # Берем display name (RU if available)
                    detected_service = s_obj[3] if s_obj[3] else s_obj[2]
                    service_name = detected_service # Используем найденное имя как ключевое для поиска ID
                    print(f"🔎 [PromptBuilder] Detected service in text: '{service_name}' (matched '{name_key}')")
                    break
        
        if not service_name:
             print(f"ℹ️ [PromptBuilder] No service detected in conversation history.")

        instructions = self.bot_settings.get(
            'booking_availability_instructions', '')

        if not service_name:
            conn.close()
            return f"""{self.prompt_headers.get('UNKNOWN_SERVICE', PROMPT_HEADERS['UNKNOWN_SERVICE'])}
{instructions}"""

        print(f"✅ [PromptBuilder] Building availability for service: '{service_name}'")

        if client_has_name:
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
                "Нужно имя",
                ""
            )

        # ✅ NEW: Simple Date Intent Parsing
        # Пытаемся понять, какую дату хочет клиент
        # (Это базовая логика, можно улучшить regex)
        target_date_str = None
        combined_msg_lower = " ".join([m[0].lower() for m in history[-3:] if m[1] == 'client'])
        
        from datetime import datetime, timedelta
        from utils.datetime_utils import get_current_time
        
        # NOTE: get_current_time returns timezone-aware datetime
        now = get_current_time()
        
        import re
        
        if "сегодня" in combined_msg_lower:
            target_date_str = now.strftime('%Y-%m-%d')
            print(f"🗓 Date Intent: TODAY ({target_date_str})")
        elif "завтра" in combined_msg_lower:
            target_date_str = (now + timedelta(days=1)).strftime('%Y-%m-%d')
            print(f"🗓 Date Intent: TOMORROW ({target_date_str})")
        elif "послезавтра" in combined_msg_lower:
            target_date_str = (now + timedelta(days=2)).strftime('%Y-%m-%d')
            print(f"🗓 Date Intent: DAY AFTER TOMORROW ({target_date_str})")
        else:
            # Try to find specific date like "30.12" or "30 число"
            # Regex for "DD.MM" or "DD число"
            match = re.search(r'(\d{1,2})[\./-](\d{1,2})', combined_msg_lower)
            if match:
                day, month = int(match.group(1)), int(match.group(2))
                # Assume current year (or next year if month < current_month)
                year = now.year
                if month < now.month:
                    year += 1
                try:
                    target_date_str = f"{year}-{month:02d}-{day:02d}"
                    print(f"🗓 Date Intent: SPECIFIC DATE ({target_date_str})")
                except:
                    pass
            else:
                 # Check for "30 число"
                 match_day = re.search(r'(\d{1,2})\s+(число|числа)', combined_msg_lower)
                 if match_day:
                     day = int(match_day.group(1))
                     # Assume current month/year
                     # If day < current_day, assume next month
                     target_dt_temp = now
                     if day < now.day:
                         # Move to next month
                         if now.month == 12:
                             target_dt_temp = now.replace(year=now.year+1, month=1)
                         else:
                             target_dt_temp = now.replace(month=now.month+1)
                     
                     try:
                         # Safe replace day
                         target_date_str = target_dt_temp.replace(day=day).strftime('%Y-%m-%d')
                         print(f"🗓 Date Intent: NUMBER ({target_date_str}) from '{match_day.group(0)}'")
                     except:
                         pass

        
        avail_text = f"=== 📅 ДОСТУПНЫЕ МАСТЕРА ({service_name}) ===\n"
        avail_text += f"Услуга: {service_name}\n"
        avail_text += "\n"


        if client_has_name:
            # Добавляем явную инструкцию НЕ спрашивать имя
            additional_instruction = f"\n\n⚠️ У КЛИЕНТА УЖЕ ЕСТЬ ИМЯ (из Instagram) - НЕ СПРАШИВАЙ ИМЯ! Для записи нужен только WhatsApp."
            instructions = additional_instruction + "\n" + instructions
            print(f"ℹ️ [PromptBuilder] Client has name -> Instructions modified to skip name request.")

        now = get_current_time()
        current_hour = now.hour

        time_phrases = {
            'утр': (9, 12),
            'обед': (14, 17),
            'вечер': (17, 21),
            'morning': (9, 12),
            'afternoon': (14, 17),
            'evening': (17, 21)
        }

        time_preference = None
        if history:
            for msg in reversed(history[-5:]):
                if msg[1] == 'client':
                    msg_lower = msg[0].lower()
                    for phrase, (start_h, end_h) in time_phrases.items():
                        if phrase in msg_lower:
                            time_preference = (start_h, end_h)
                            print(f"🕰️ [PromptBuilder] Detected time preference: {phrase} ({start_h}-{end_h})")
                            break
                    if time_preference:
                        break

        # Ищем услугу в БД по названию (точному или похожему)
        # service_name мы определили выше или оно пришло аргументом
        c.execute("""
            SELECT id, name_ru, price, currency FROM services 
            WHERE (LOWER(name) LIKE %s OR LOWER(name_ru) LIKE %s)
            AND is_active = TRUE
            LIMIT 1
        """, (f"%{service_name.lower()}%", f"%{service_name.lower()}%"))
        service_row = c.fetchone()

        if not service_row:
            print(f"❌ [PromptBuilder] Service '{service_name}' NOT found in DB search.")
            conn.close()
            return f"""{self.prompt_headers.get('NOT_FOUND_SERVICE', PROMPT_HEADERS['NOT_FOUND_SERVICE'])}
Не нашла услугу "{service_name}" в списке.
Попробуй назвать услугу иначе (например "Маникюр", "Педикюр", "Стрижка")."""

        service_id = service_row[0]
        employees = get_employees_by_service(service_id)
        print(f"👥 [PromptBuilder] Found {len(employees)} employees for service ID {service_id}")

        if not employees:
            conn.close()
            return f"⚠️ Нет мастеров для услуги '{service_name}'"

        if not employees:
            conn.close()
            return f"⚠️ Нет мастеров для услуги '{service_name}'"

        # ✅ INIT SMART SCHEDULER
        from services.smart_scheduler import SmartScheduler
        scheduler = SmartScheduler()
        
        # Use detected date or default logic
        final_target_date = target_date_str 
        if not final_target_date and preferred_date:
            final_target_date = preferred_date
            
        header_text = self.prompt_headers.get('AVAILABILITY', PROMPT_HEADERS['AVAILABILITY']).format(service_name=service_name)
        avail_text = f"{header_text}\n"

        found_any = False
        
        # Helper to get localized name
        def get_localized_name(user_id, default_name):
            try:
                conn_u = get_db_connection()
                cur_u = conn_u.cursor()
                cur_u.execute("SELECT full_name_ru, full_name_en, full_name_ar FROM users WHERE id = %s", (user_id,))
                row = cur_u.fetchone()
                conn_u.close()
                
                if not row: return default_name
                
                lang = getattr(self, 'lang', 'ru')
                if lang == 'ru' and row[0]: return row[0]
                if lang == 'en' and row[1]: return row[1]
                if lang == 'ar' and row[2]: return row[2]
                return default_name
            except:
                return default_name

        for emp in employees:
            # emp: (id, full_name, ...)
            emp_id = emp[0]
            master_name = get_localized_name(emp_id, emp[1])
            
            # 🧠 SMART SUGGESTION
            suggestions = scheduler.get_smart_suggestions(
                service_name=service_name,
                master_name=emp[1], # Use technical name for scheduler lookup just in case
                target_date_str=final_target_date
            )
            
            avail_text += f"\n👤 Мастер: {master_name}\n"
            
            if suggestions['primary_slots']:
                found_any = True
                date_display = suggestions['primary_date']
                
                # ✅ SHOW MORE SLOTS (Fix #2: Hidden 11:00)
                # Show up to 10 slots to cover full day (10:00 - 20:00 is approx 20 slots of 30min, so 10 is half day)
                # If we detect specific time preference, we should ideally prioritize it, 
                # but increasing limit is the safest quick fix.
                slots_str = ", ".join(suggestions['primary_slots'][:12]) 
                avail_text += f"   ✅ {date_display}: {slots_str}\n"
            else:
                avail_text += f"   ❌ На {suggestions['primary_date']} мест нет.\n"
                
            # Show alternatives if primary is full or explicitly requested
            if suggestions['alternatives']:
                found_any = True
                avail_text += f"   💡 Альтернативы:\n"
                for alt in suggestions['alternatives']:
                    alt_slots = ", ".join(alt['slots'][:3])
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

def get_popular_booking_times(service_name: str = None) -> List[str]:
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

def format_service_price_for_bot(service) -> str:
    """Helper formatting"""
    price = service[5]
    price_min = service[6]
    price_max = service[7]
    currency = service[8] or 'AED'
    
    if price_min is not None and price_max is not None:
        return f"{int(price_min)}-{int(price_max)} {currency}"
    elif price is not None:
        return f"{int(price)} {currency}"
    return "цена по запросу"

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
