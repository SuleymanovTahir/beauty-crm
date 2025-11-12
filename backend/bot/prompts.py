# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import sqlite3


from config import DATABASE_NAME
from db import (
    get_all_services,
    get_all_special_packages,
)
from db.services import format_service_price_for_bot


def transliterate_to_russian(name: str) -> str:
    """Транслитерация английского имени в русское"""
    translit_map = {
        'A': 'А', 'B': 'Б', 'C': 'К', 'D': 'Д', 'E': 'Е', 'F': 'Ф',
        'G': 'Г', 'H': 'Х', 'I': 'И', 'J': 'Дж', 'K': 'К', 'L': 'Л',
        'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'Q': 'К', 'R': 'Р',
        'S': 'С', 'T': 'Т', 'U': 'У', 'V': 'В', 'W': 'В', 'X': 'Кс',
        'Y': 'Й', 'Z': 'З',
        'a': 'а', 'b': 'б', 'c': 'к', 'd': 'д', 'e': 'е', 'f': 'ф',
        'g': 'г', 'h': 'х', 'i': 'и', 'j': 'дж', 'k': 'к', 'l': 'л',
        'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р',
        's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'w': 'в', 'x': 'кс',
        'y': 'й', 'z': 'з'
    }

    result = []
    for char in name:
        result.append(translit_map.get(char, char))

    return ''.join(result)


def translate_position(position: str, language: str) -> str:
    """Перевод должности на нужный язык"""
    translations = {
        'HAIR STYLIST': {
            'ru': 'Парикмахер',
            'en': 'Hair Stylist',
            'ar': 'مصفف شعر'
        },
        'NAIL TECHNICIAN': {
            'ru': 'Мастер маникюра',
            'en': 'Nail Technician',
            'ar': 'فني أظافر'
        },
        'MAKEUP ARTIST': {
            'ru': 'Визажист',
            'en': 'Makeup Artist',
            'ar': 'فنان مكياج'
        },
        'MASSAGE THERAPIST': {
            'ru': 'Массажист',
            'en': 'Massage Therapist',
            'ar': 'معالج تدليك'
        },
        'BEAUTICIAN': {
            'ru': 'Косметолог',
            'en': 'Beautician',
            'ar': 'خبير تجميل'
        },
        'MASTER': {
            'ru': 'Мастер',
            'en': 'Master',
            'ar': 'معلم'
        }
    }

    position_upper = position.upper()
    if position_upper in translations:
        return translations[position_upper].get(language, position)

    return position


class PromptBuilder:
    """Построитель промптов для AI-бота"""

    def __init__(self, salon: Dict, bot_settings: Dict):
        """
        Args:
            salon: Настройки салона из БД
            bot_settings: Настройки бота из БД
        """
        self.salon = salon
        self.bot_settings = bot_settings

    def build_full_prompt(
        self,
        instagram_id: str,
        history: List[Tuple],
        booking_progress: Optional[Dict] = None,
        client_language: str = 'ru'
    ) -> str:
        """Построить полный system prompt

        Args:
            instagram_id: ID клиента в Instagram
            history: История диалога
            booking_progress: Прогресс бронирования
            client_language: Язык клиента

        Returns:
            Полный system prompt для бота
        """

        if booking_progress is None:
            booking_progress = {}

        # ✅ #2 - Получаем предпочтения
        preferences = get_client_recent_preferences(instagram_id)

        # ✅ #3 - Анализ тона
        client_tone = analyze_client_tone(history)

        # ✅ #6 - История возражений
        objections = get_client_objection_history(instagram_id)

        service_name = booking_progress.get('service_name', '')
        master_name = booking_progress.get('master', '')
        preferred_date = booking_progress.get('date', '')

        parts = [
            self._build_identity(),
            self._build_personality(),
            self._build_language_settings(client_language),
            self._build_greeting_logic(history),
            self._build_special_packages(),
            self._build_booking_rules(),
            self._build_booking_availability(
                instagram_id=instagram_id,
                service_name=service_name,
                master_name=master_name,
                preferred_date=preferred_date,
                history=history,
                client_language=client_language
            ),
            self._build_salon_info(),
            self._build_services_list(),
            self._build_history(history),
            self._build_preferences_section(preferences),
            self._build_tone_adaptation(client_tone),
            self._build_objections_section(objections),
        ]

        return "\n\n".join([p for p in parts if p])

    def _build_identity(self) -> str:
        """Секция IDENTITY - из БД"""
        bot_name = self.bot_settings.get('bot_name', 'AI-ассистент')
        salon_name = self.salon.get('name', 'Салон красоты')
        booking_url = self.salon.get('booking_url', '')

        return f"""=== IDENTITY ===
Ты — {bot_name}, AI-ассистент салона "{salon_name}" в Dubai.

ТВОЯ МИССИЯ:
Консультировать клиентов по услугам и направлять на онлайн-запись: {booking_url}"""

    def _build_personality(self) -> str:
        """Секция PERSONALITY - из БД"""
        return f"""=== PERSONALITY ===
{self.bot_settings.get('personality_traits', '')}

{self.bot_settings.get('communication_style', '')}

{self.bot_settings.get('emoji_usage', '')}

⚠️ КРИТИЧЕСКАЯ ИНСТРУКЦИЯ:
НИКОГДА не пиши текст "Извините, я сейчас перегружен запросами" или подобные технические сообщения.
Это служебное сообщение системы, НЕ твоё!"""

    def _build_language_settings(self, language: str) -> str:
        """Языковые настройки - из БД"""
        supported_raw = self.bot_settings.get(
            'languages_supported', 'ru,en,ar')
        supported_langs = [lang.strip() for lang in supported_raw.split(',')]

        if language not in supported_langs:
            language = 'ru'

        return f"""=== LANGUAGE ===
Отвечай на языке: {language}
Поддерживаемые языки: {', '.join(supported_langs)}"""

    def _build_greeting_logic(self, history: List[Tuple]) -> str:
        """Логика приветствий - из БД"""
        should_greet = self._should_greet(history)

        if should_greet:
            greeting = self.bot_settings.get('greeting_message', 'Привет!')
            return f"""=== GREETING ===
{greeting}

⚠️ НЕ повторяй приветствия в следующих сообщениях!"""
        else:
            return """=== ПРОДОЛЖЕНИЕ ДИАЛОГА ===
НЕ здоровайся снова - отвечай на вопрос клиента"""

    def _should_greet(self, history: List[Tuple]) -> bool:
        """Определить нужно ли здороваться"""
        if len(history) <= 1:
            return True

        if len(history) > 0:
            try:
                last_msg = history[-1]
                if len(last_msg) >= 5:
                    timestamp = last_msg[2]
                elif len(last_msg) >= 3:
                    timestamp = last_msg[2]
                else:
                    return False

                last_timestamp = datetime.fromisoformat(timestamp)
                now = datetime.now()
                time_diff = now - last_timestamp

                if time_diff.total_seconds() > 21600:
                    return True
            except:
                pass

        return False

    def _build_special_packages(self) -> str:
        """Специальные пакеты из БД"""
        packages = get_all_special_packages(active_only=True)

        base_rule = """=== СПЕЦИАЛЬНЫЕ ПАКЕТЫ ===

🚨 НЕ ПРИДУМЫВАЙ СКИДКИ!
Если ниже нет пакетов - значит акций НЕТ!

"""

        if not packages:
            return base_rule + """
Сейчас НЕТ активных акций!

Если клиент спросит:
"Акций сейчас нет, но качество на высоте! 💎"
"""

        packages_text = base_rule + "\n📦 АКТИВНЫЕ АКЦИИ:\n\n"

        for pkg in packages:
            pkg_name = pkg[2]
            orig_price = pkg[5]
            special_price = pkg[6]
            currency = pkg[7]
            discount = pkg[8]
            desc = pkg[4] or ""
            keywords = pkg[11] or ""

            packages_text += f"""🔥 {pkg_name}
- Цена: {special_price} {currency} вместо {orig_price} {currency}
- Скидка: {discount}%
- Описание: {desc}
- Ключевые слова: {keywords}

"""

        return packages_text

    def _build_booking_rules(self) -> str:
        """Правила записи - из БД"""
        booking_msg = self.bot_settings.get(
            'booking_redirect_message',
            'Запись онлайн: {BOOKING_URL}'
        )

        booking_url = self.salon.get('booking_url', '')

        return f"""=== BOOKING RULES ===
{booking_msg.replace('{BOOKING_URL}', booking_url)}"""

    def _build_salon_info(self) -> str:
        """Информация о салоне - из БД"""
        return f"""=== SALON INFO ===
Название: {self.salon.get('name', '')}
Адрес: {self.salon.get('address', '')}
Часы: {self.salon.get('hours', '')}
Телефон: {self.salon.get('phone', '')}
Google Maps: {self.salon.get('google_maps', '')}
Онлайн-запись: {self.salon.get('booking_url', '')}"""

    def _build_services_list(self) -> str:
        """Список услуг из БД"""
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            category = service[9]
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)

        services_text = "=== УСЛУГИ САЛОНА ===\n\n"

        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            for service in services_list:
                price_str = format_service_price_for_bot(service)
                name_ru = service[3] or service[2]
                description = service[11] or ''

                services_text += f"• {name_ru} - {price_str}\n"
                if description:
                    services_text += f"  └ {description}\n"
            services_text += "\n"

        return services_text

    def _build_history(self, history: List[Tuple]) -> str:
        """История диалога"""
        if not history:
            return ""

        # ✅ Фильтруем fallback и технические сообщения
        fallback_phrases = [
            "Извините, я сейчас перегружен",
            "I'm overloaded with requests",
            "أنا محمل بالطلبات",
            "что-то пошло не так"
        ]

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

        history_text = "💬 ИСТОРИЯ (последние сообщения):\n"

        # Показываем последние 5
        for msg, sender, timestamp, msg_type in filtered_history[-5:]:
            role = "Клиент" if sender == "client" else "Ты"
            if msg_type == 'voice':
                history_text += f"{role}: [Голосовое]\n"
            else:
                history_text += f"{role}: {msg}\n"

        return history_text

    def _build_preferences_section(self, preferences: dict) -> str:
        """#2 - Память о предпочтениях"""
        if not preferences or not preferences.get('last_service'):
            return ""

        text = "=== 💎 ПАМЯТЬ О КЛИЕНТЕ ===\n"

        if preferences.get('favorite_service'):
            text += f"Любимая услуга: {preferences['favorite_service']}\n"

        if preferences.get('favorite_master'):
            text += f"Любимый мастер: {preferences['favorite_master']}\n"

        if preferences.get('last_service'):
            text += f"Последний визит: {preferences['last_service']}\n"

        if preferences.get('total_visits', 0) >= 3:
            text += f"Постоянный клиент ({preferences['total_visits']} визитов) - особое внимание!\n"

        text += "\n✨ ИСПОЛЬЗУЙ ЭТУ ИНФО:\n"
        text += "- Напомни о прошлом визите естественно\n"
        text += "- Предложи того же мастера если клиент доволен\n"
        text += "- Для постоянных клиентов - более тёплый тон\n"

        return text

    def _build_tone_adaptation(self, tone: str) -> str:
        """#3 - Адаптация под стиль клиента"""
        tone_instructions = {
            'brief': """=== ✍️ СТИЛЬ КЛИЕНТА: КРАТКИЙ ===
Клиент пишет коротко - отвечай так же:
- Короткие сообщения (1-2 предложения)
- Минимум эмодзи (1-2)
- Без лишних слов
- Прямо к делу

Пример:
Клиент: "Маникюр"
Ты: "Когда удобно?"
""",
            'friendly': """=== ✍️ СТИЛЬ КЛИЕНТА: ДРУЖЕЛЮБНЫЙ ===
Клиент общительный и использует эмодзи - поддержи стиль:
- Больше эмодзи (2-3 на сообщение)
- Дружелюбный тон
- Можно чуть длиннее сообщения
- Позитив и эмоции

Пример:
Клиент: "Привет! Хочу к вам на маникюрчик 💅😊"
Ты: "Привет! Конечно! Когда тебе удобно? 💖✨"
""",
            'detailed': """=== ✍️ СТИЛЬ КЛИЕНТА: ПОДРОБНЫЙ ===
Клиент пишет развёрнуто - давай больше информации:
- Подробные ответы
- Больше деталей
- Можно несколько предложений
- Объясняй детально

Пример:
Клиент: "Добрый день, хотела бы записаться на маникюр, но хотелось бы уточнить..."
Ты: "Добрый день! Конечно помогу с выбором. У нас есть классический маникюр (100 AED)..."
""",
            'neutral': ""
        }

        return tone_instructions.get(tone, "")

    def _build_objections_section(self, objections: List[str]) -> str:
        """#6 - История возражений"""
        if not objections:
            return ""

        text = "=== ⚠️ ИСТОРИЯ ВОЗРАЖЕНИЙ КЛИЕНТА ===\n"
        text += "Клиент УЖЕ говорил:\n"

        objection_responses = {
            'price': "💰 'Дорого' - НЕ снижай цену! Подчеркни ценность и качество",
            'think': "🤔 'Подумать' - Дай конкретную информацию, помоги с выбором",
            'no_time': "⏰ 'Нет времени' - Покажи что процедура быстрая, предложи удобное время",
            'far': "📍 'Далеко' - Подчеркни удобство локации, результат стоит того",
            'pain': "😣 'Больно' - Успокой, расскажи что процедура комфортная"
        }

        for obj in objections:
            if obj in objection_responses:
                text += f"- {objection_responses[obj]}\n"

        text += "\nМЕНЯЙ ПОДХОД если возражение повторяется!\n"

        return text

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

        if history is None:
            history = []

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute(
            "SELECT name, username FROM clients WHERE instagram_id = ?", (instagram_id,))
        client_data = c.fetchone()
        client_has_name = bool(client_data and (
            client_data[0] or client_data[1]))

        # ✅ #2 - Получаем предпочтения клиента
        preferences = get_client_recent_preferences(instagram_id)

        # ✅ Определяем услугу из контекста
        if not service_name and history:
            last_messages = history[-15:]
            bot_showed_service_list = False
            for item in reversed(last_messages[-5:]):
                if len(item) >= 2:
                    msg = item[0]
                    sender = item[1]
                    if sender == 'assistant' and any(word in msg.lower() for word in ['маникюр / педикюр', 'услуга интересует', 'какая услуга']):
                        bot_showed_service_list = True
                        break

            for item in reversed(last_messages):
                if len(item) >= 2:
                    msg = item[0]
                    sender = item[1]

                    if sender == 'client':
                        msg_lower = msg.lower().strip()

                        if bot_showed_service_list:
                            if any(word in msg_lower for word in ['макияж', 'makeup', 'مكياج', 'перманент', 'permanent']):
                                service_name = 'Makeup'
                                break
                            elif any(word in msg_lower for word in ['ресниц', 'брови', 'brow', 'lash', 'رموش', 'حواجب']):
                                service_name = 'Lashes'
                                break
                            elif any(word in msg_lower for word in ['массаж', 'massage', 'تدليك', 'спа', 'spa']):
                                service_name = 'Massage'
                                break
                            elif any(word in msg_lower for word in ['эпиляц', 'wax', 'إزالة', 'шугар', 'sugar']):
                                service_name = 'Waxing'
                                break
                            elif any(word in msg_lower for word in ['чистка', 'пилинг', 'facial', 'peel', 'تنظيف']):
                                service_name = 'Facial'
                                break
                            elif any(word in msg_lower for word in ['баня', 'хамам', 'hammam', 'حمام']):
                                service_name = 'Hammam'
                                break

                        if not service_name:
                            if any(word in msg_lower for word in ['маникюр', 'manicure', 'مانيكير', 'ногти', 'ногт', 'nails', 'nail', 'манікюр']):
                                service_name = 'Manicure'
                                break
                            elif any(word in msg_lower for word in ['педикюр', 'pedicure', 'باديكير', 'педікюр', 'pedi']):
                                service_name = 'Pedicure'
                                break
                            elif any(word in msg_lower for word in ['волос', 'стрижка', 'стриж', 'hair', 'cut', 'شعر', 'парикмахер', 'stylist', 'окраш', 'краск', 'color']):
                                service_name = 'Hair'
                                break

        instructions = self.bot_settings.get(
            'booking_availability_instructions', '')

        if not service_name:
            conn.close()
            return f"""=== ❓ УТОЧНИ УСЛУГУ ===
{instructions}"""

        if client_has_name:
            instructions = instructions.replace(
                "Для записи нужно имя и WhatsApp",
                "Для записи нужен WhatsApp"
            )
            instructions = instructions.replace(
                "Как вас зовут?",
                ""
            )

        now = datetime.now()
        current_hour = now.hour

        time_phrases = {
            'утр': (9, 12),
            'обед': (14, 17),
            'вечер': (17, 21),
        }

        time_preference = None
        if history:
            for msg in reversed(history[-5:]):
                if msg[1] == 'client':
                    msg_lower = msg[0].lower()
                    for phrase, (start_h, end_h) in time_phrases.items():
                        if phrase in msg_lower:
                            time_preference = (start_h, end_h)
                            break
                    if time_preference:
                        break

        c.execute("""
            SELECT id, name_ru, price, currency FROM services 
            WHERE (name LIKE ? OR name_ru LIKE ? OR name_ar LIKE ?)
            AND is_active = 1
            LIMIT 1
        """, (f"%{service_name}%", f"%{service_name}%", f"%{service_name}%"))
        service_row = c.fetchone()
        
        # ✅ ИЗМЕНЕНИЕ: Логируем что ищем
        print(f"   🔍 Ищу услугу '{service_name}' в БД...")
        
        if not service_row:
            # ✅ ИЗМЕНЕНИЕ: Показываем ВСЕ доступные услуги из БД
            c.execute("SELECT name_ru, name FROM services WHERE is_active = 1 LIMIT 5")
            available = c.fetchall()
            print(f"   ⚠️ Услуга '{service_name}' НЕ НАЙДЕНА в БД!")
            print(f"   📋 Доступные услуги: {[s[0] or s[1] for s in available]}")
            
            conn.close()
        if available:
            services_list = "\n".join([f"• {s[0] or s[1]}" for s in available[:5]])
            return f"""=== 🤔 УТОЧНЕНИЕ ===
            К сожалению, '{service_name}' не нашла.
            У нас есть:
            {services_list}
            Что вас интересует?"""
        else:
            # return """=== 🤔 УТОЧНЕНИЕ ===
            # Могу предложить маникюр, педикюр, стрижку, массаж?"""
            print(f"   ✅ Услуга найдена: ID={service_row[0]}, {service_row[1]}")
        service_id = service_row[0]
        employees = get_employees_by_service(service_id)

        if not employees:
            conn.close()
            return f"⚠️ Нет мастеров для услуги '{service_name}'"

        # ✅ #10 - UPSELL: Проверяем давно ли был на других услугах
        upsell_text = ""
        for upsell_service in ['Manicure', 'Pedicure', 'Hair', 'Massage']:
            if upsell_service.lower() in service_name.lower():
                continue  # Пропускаем текущую услугу

            last_date = get_last_service_date(instagram_id, upsell_service)
            if last_date:
                try:
                    last_dt = datetime.fromisoformat(last_date)
                    days_since = (now - last_dt).days

                    if days_since > 21:  # Более 3 недель
                        service_translations = {
                            'Manicure': 'маникюре',
                            'Pedicure': 'педикюре',
                            'Hair': 'стрижке',
                            'Massage': 'массаже'
                        }
                        upsell_text = f"\n💡 Кстати, давно не были на {service_translations.get(upsell_service, upsell_service.lower())} ({days_since} дней)\nДобавить к записи? Можем сделать всё за раз!"
                        break
                except:
                    pass

        # Определяем дату
        if preferred_date:
            target_date = preferred_date
        else:
            target_date = (datetime.now() + timedelta(days=1)
                           ).strftime("%Y-%m-%d")

        try:
            date_obj = datetime.strptime(target_date, "%Y-%m-%d")
            date_display = date_obj.strftime("%d.%m (%A)")
        except:
            date_display = target_date

        # ✅ #9 - Популярное время
        popular_times = get_popular_booking_times(service_name)
        popular_times_text = f"\nБольшинство клиентов выбирают: {', '.join(popular_times)}" if popular_times else ""

        availability_text = f"""=== 📅 МАСТЕРА ДЛЯ '{service_name.upper()}' НА {date_display.upper()} ===

{instructions}{popular_times_text}

ДОСТУПНЫЕ МАСТЕРА:

"""

        # ✅ #2 - Если есть любимый мастер - покажи его первым
        if preferences.get('favorite_master'):
            availability_text += f"⭐ Ваш любимый мастер {preferences['favorite_master']} доступен!\n\n"

        for emp in employees[:5]:
            emp_id = emp[0]
            emp_name = emp[1]

            name_ru = emp[13] if len(emp) > 13 else None
            name_ar = emp[14] if len(emp) > 14 else None

            if client_language == 'ru':
                emp_name_display = name_ru or emp_name
            elif client_language == 'ar':
                emp_name_display = name_ar or emp_name
            else:
                emp_name_display = emp_name

            c.execute("""
                SELECT start_time, end_time
                FROM employee_schedule
                WHERE employee_id = ? AND is_active = 1
                LIMIT 1
            """, (emp_id,))
            schedule = c.fetchone()

            if schedule:
                start_hour = int(schedule[0].split(':')[0])
                end_hour = int(schedule[1].split(':')[0])

                slots = []

                if time_preference:
                    pref_start, pref_end = time_preference
                    for hour in range(max(start_hour, pref_start), min(end_hour, pref_end) + 1, 2):
                        if target_date == now.strftime("%Y-%m-%d"):
                            if hour > current_hour + 2:
                                slots.append(f"{hour:02d}:00")
                        else:
                            slots.append(f"{hour:02d}:00")

                        if len(slots) >= 3:
                            break
                else:
                    for i in range(6):
                        hour = start_hour + (i * 2)
                        if hour >= end_hour:
                            break

                        if target_date == now.strftime("%Y-%m-%d"):
                            if hour > current_hour + 2:
                                slots.append(f"{hour:02d}:00")
                        else:
                            slots.append(f"{hour:02d}:00")

                        if len(slots) >= 3:
                            break

                if slots:
                    availability_text += f"• {emp_name_display}: {', '.join(slots)}\n"

        booking_url = self.salon.get('booking_url', '')

        # ✅ #14 - Альтернативы если время не подходит
        availability_text += f"\n📲 Или выберите сами: {booking_url}"
        availability_text += "\n\n💡 Если это время не подходит - напишите когда удобно, найдём альтернативы!"

        # Добавляем upsell если есть
        if upsell_text:
            availability_text += upsell_text

        conn.close()
        return availability_text

# В начало файла после импортов добавь:


def get_client_recent_preferences(instagram_id: str, limit: int = 3) -> dict:
    """Получить последние предпочтения клиента (#2 - Умная память)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT service_name, master, datetime 
        FROM bookings 
        WHERE instagram_id = ? AND status = 'completed'
        ORDER BY datetime DESC
        LIMIT ?
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
            masters[master] = masters.get(master, 0) + 1

    fav_service = max(services.items(), key=lambda x: x[1])[
        0] if services else None
    fav_master = max(masters.items(), key=lambda x: x[1])[
        0] if masters else None

    return {
        'favorite_service': fav_service,
        'favorite_master': fav_master,
        'last_service': bookings[0][0] if bookings else None,
        'last_master': bookings[0][1] if bookings else None,
        'last_date': bookings[0][2] if bookings else None,
        'total_visits': len(bookings)
    }


def analyze_client_tone(history: List[Tuple]) -> str:
    """Анализировать стиль общения клиента (#3 - Адаптация тона)"""
    if not history:
        return "neutral"

    client_messages = [msg[0] for msg in history[-10:]
                       if len(msg) >= 2 and msg[1] == "client"][-5:]

    if not client_messages:
        return "neutral"

    total_length = sum(len(msg) for msg in client_messages)
    avg_length = total_length / len(client_messages)

    emoji_count = sum(msg.count('😊') + msg.count('💅') + msg.count('❤') + msg.count('🔥') +
                      msg.count('💖') + msg.count('✨') for msg in client_messages)

    short_responses = sum(1 for msg in client_messages if len(msg) < 15)

    if avg_length < 20 and short_responses >= 3:
        return "brief"
    elif emoji_count >= 3:
        return "friendly"
    elif avg_length > 50:
        return "detailed"
    else:
        return "neutral"


def get_popular_booking_times(service_name: str = None) -> List[str]:
    """Популярные времена записи (#9)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if service_name:
        c.execute("""
            SELECT datetime, COUNT(*) as count
            FROM bookings
            WHERE service_name LIKE ?
            GROUP BY strftime('%H', datetime)
            ORDER BY count DESC
            LIMIT 3
        """, (f"%{service_name}%",))
    else:
        c.execute("""
            SELECT datetime, COUNT(*) as count
            FROM bookings
            GROUP BY strftime('%H', datetime)
            ORDER BY count DESC
            LIMIT 3
        """)

    results = c.fetchall()
    conn.close()

    popular_hours = []
    for dt_str, count in results:
        try:
            dt = datetime.fromisoformat(dt_str)
            popular_hours.append(f"{dt.hour:02d}:00")
        except:
            continue

    return popular_hours if popular_hours else ["15:00", "18:00"]


def analyze_client_tone(history: List[Tuple]) -> str:
    """Анализировать стиль общения клиента (#3 - Адаптация тона)"""
    if not history:
        return "neutral"

    # Берём последние 5 сообщений клиента
    client_messages = [msg[0] for msg in history[-10:]
                       if len(msg) >= 2 and msg[1] == "client"][-5:]

    if not client_messages:
        return "neutral"

    # Анализ
    total_length = sum(len(msg) for msg in client_messages)
    avg_length = total_length / len(client_messages)

    emoji_count = sum(msg.count('😊') + msg.count('💅') + msg.count('❤') + msg.count('🔥') +
                      msg.count('💖') + msg.count('✨') for msg in client_messages)

    short_responses = sum(1 for msg in client_messages if len(msg) < 15)

    # Классификация
    if avg_length < 20 and short_responses >= 3:
        return "brief"  # Короткий стиль
    elif emoji_count >= 3:
        return "friendly"  # Дружелюбный
    elif avg_length > 50:
        return "detailed"  # Подробный
    else:
        return "neutral"  # Нейтральный


def get_client_objection_history(instagram_id: str) -> List[str]:
    """История возражений клиента (#6)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT message 
        FROM chat_history 
        WHERE instagram_id = ? AND sender = 'client'
        ORDER BY timestamp DESC
        LIMIT 20
    """, (instagram_id,))

    messages = [row[0] for row in c.fetchall()]
    conn.close()

    objection_keywords = {
        'дорого': 'price',
        'expensive': 'price',
        'подумать': 'think',
        'подумаю': 'think',    # ✅ ДОБАВЛЕНО
        'think': 'think',
        'времени нет': 'no_time',
        'no time': 'no_time',
        'далеко': 'far',
        'far': 'far',
        'больно': 'pain',
        'painful': 'pain',
    }

    found_objections = []
    for msg in messages:
        msg_lower = msg.lower()
        for keyword, obj_type in objection_keywords.items():
            if keyword in msg_lower and obj_type not in found_objections:
                found_objections.append(obj_type)

    return found_objections


def get_last_service_date(instagram_id: str, service_name: str) -> Optional[str]:
    """Когда клиент последний раз был на услуге (#10 - Upsell)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT datetime 
        FROM bookings 
        WHERE instagram_id = ? AND service_name LIKE ? AND status = 'completed'
        ORDER BY datetime DESC
        LIMIT 1
    """, (instagram_id, f"%{service_name}%"))

    result = c.fetchone()
    conn.close()

    return result[0] if result else None
