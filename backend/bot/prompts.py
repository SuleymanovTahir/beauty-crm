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
        supported_raw = self.bot_settings.get('languages_supported', 'ru,en,ar')
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
            
            filtered_history.append((msg, sender, timestamp, msg_type if len(item) > 3 else 'text'))

        if not filtered_history:
            return ""

        history_text = "💬 ИСТОРИЯ (последние сообщения):\n"

        for msg, sender, timestamp, msg_type in filtered_history[-5:]:  # Показываем последние 5
            role = "Клиент" if sender == "client" else "Ты"
            if msg_type == 'voice':
                history_text += f"{role}: [Голосовое]\n"
            else:
                history_text += f"{role}: {msg}\n"

        return history_text
    
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
        
        # ✅ Определяем услугу из контекста
        if not service_name and history:
            # КРИТИЧНО: Анализируем последние сообщения для понимания контекста
            last_messages = history[-15:]  # Берем больше контекста

            # Сначала проверяем: бот недавно показывал список услуг?
            bot_showed_service_list = False
            for item in reversed(last_messages[-5:]):  # Последние 5 сообщений
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
                        
                        # КРИТИЧНО: Если бот только что показал список, даже ОДНО слово = выбор услуги
                        if bot_showed_service_list:
                            # Макияж и перманентный макияж
                            if any(word in msg_lower for word in ['макияж', 'makeup', 'مكياج', 'перманент', 'permanent']):
                                service_name = 'Makeup'
                                break
                            # Ресницы и брови
                            elif any(word in msg_lower for word in ['ресниц', 'брови', 'brow', 'lash', 'رموش', 'حواجب']):
                                service_name = 'Lashes'
                                break
                            # Массаж
                            elif any(word in msg_lower for word in ['массаж', 'massage', 'تدليك', 'спа', 'spa']):
                                service_name = 'Massage'
                                break
                            # Эпиляция
                            elif any(word in msg_lower for word in ['эпиляц', 'wax', 'إزالة', 'шугар', 'sugar']):
                                service_name = 'Waxing'
                                break
                            # Чистка лица
                            elif any(word in msg_lower for word in ['чистка', 'пилинг', 'facial', 'peel', 'تنظيف']):
                                service_name = 'Facial'
                                break
                            # Баня
                            elif any(word in msg_lower for word in ['баня', 'хамам', 'hammam', 'حمام']):
                                service_name = 'Hammam'
                                break

                        # Расширенные ключевые слова (работают всегда, не только после списка)
                        if not service_name:  # Только если еще не определена
                            if any(word in msg_lower for word in ['маникюр', 'manicure', 'مانيكير', 'ногти', 'ногт', 'nails', 'nail', 'манікюр']):
                                service_name = 'Manicure'
                                break
                            # Педикюр
                            elif any(word in msg_lower for word in ['педикюр', 'pedicure', 'باديكير', 'педікюр', 'pedi']):
                                service_name = 'Pedicure'
                                break
                            # Волосы/стрижка
                            elif any(word in msg_lower for word in ['волос', 'стрижка', 'стриж', 'hair', 'cut', 'شعر', 'парикмахер', 'stylist', 'окраш', 'краск', 'color']):
                                service_name = 'Hair'
                                break
        
        
        # ✅ Получаем инструкции из БД
        instructions = self.bot_settings.get('booking_availability_instructions', '')
        
        if not service_name:
            conn.close()
            return f"""=== ❓ УТОЧНИ УСЛУГУ ===
            {instructions}"""
        
        # ✅ УСЛУГА ОПРЕДЕЛЕНА - проверяем что она ЕСТЬ в базе
        c.execute("""
            SELECT id, name_ru, price, currency FROM services 
            WHERE (name LIKE ? OR name_ru LIKE ? OR name_ar LIKE ?)
            AND is_active = 1
            LIMIT 1
        """, (f"%{service_name}%", f"%{service_name}%", f"%{service_name}%"))
        service_row = c.fetchone()
        
        if not service_row:
            conn.close()
            
            # ⚠️ Услуги нет - предложи то что есть
            if 'makeup' in service_name.lower() or 'макияж' in service_name.lower():
                return """=== 💄 УТОЧНЕНИЕ ===
                У нас только перманентный макияж 😊
                Брови 1100 AED или губы 1200 AED?
                Или интересует что-то другое?"""
            
            return f"""=== 🤔 УТОЧНЕНИЕ ===
            {service_name} не нашла в списке
            Может маникюр, педикюр, стрижка, массаж?"""
        
        service_id = service_row[0]
        employees = get_employees_by_service(service_id)
        
        if not employees:
            conn.close()
            return f"⚠️ Нет мастеров для услуги '{service_name}'"
        
        # Определяем дату
        if preferred_date:
            target_date = preferred_date
        else:
            target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        try:
            date_obj = datetime.strptime(target_date, "%Y-%m-%d")
            date_display = date_obj.strftime("%d.%m (%A)")
        except:
            date_display = target_date
        
        availability_text = f"""=== 📅 МАСТЕРА ДЛЯ '{service_name.upper()}' НА {date_display.upper()} ===
    
    {instructions}
    
    ДОСТУПНЫЕ МАСТЕРА:
    
    """
        
        # Показываем мастеров с временем
        for emp in employees[:5]:
            emp_id = emp[0]
            emp_name = emp[1]
            
            # Локализация имени
            name_ru = emp[13] if len(emp) > 13 else None
            name_ar = emp[14] if len(emp) > 14 else None
            
            if client_language == 'ru':
                emp_name_display = name_ru or emp_name
            elif client_language == 'ar':
                emp_name_display = name_ar or emp_name
            else:
                emp_name_display = emp_name
            
            # Генерируем слоты
            c.execute("""
                SELECT start_time, end_time
                FROM employee_schedule
                WHERE employee_id = ? AND is_active = 1
                LIMIT 1
            """, (emp_id,))
            schedule = c.fetchone()
            
            if schedule:
                start_hour = int(schedule[0].split(':')[0])
                slots = []
                for i in range(3):
                    hour = start_hour + (i * 2)
                    if hour < 21:
                        slots.append(f"{hour:02d}:00")
                
                if slots:
                    availability_text += f"• {emp_name_display}: {', '.join(slots)}\n"
        
        booking_url = self.salon.get('booking_url', '')
        availability_text += f"\n📲 Или выберите сами: {booking_url}"
        
        conn.close()
        return availability_text