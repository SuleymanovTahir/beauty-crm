# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import sqlite3

from config import DATABASE_NAME
from db import (
    get_all_services,
    get_all_special_packages,
)
from db.services import format_service_price_for_bot


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
                preferred_date=preferred_date
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
        preferred_date: str = ""
    ) -> str:
        """Построить информацию о доступности мастеров с РАСПИСАНИЕМ"""
        from db.employees import get_employees_by_service, get_all_employees
        from collections import Counter
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # История клиента для персонализации
        c.execute("""
            SELECT service_name, datetime 
            FROM bookings 
            WHERE instagram_id = ? AND status != 'cancelled'
            ORDER BY created_at DESC 
            LIMIT 5
        """, (instagram_id,))
        history_raw = c.fetchall()
        
        history = []
        for row in history_raw:
            try:
                dt = datetime.fromisoformat(row[1])
                history.append({
                    'service': row[0],
                    'weekday': dt.strftime('%A'),
                    'time': dt.strftime('%H:%M')
                })
            except:
                pass
        
        # Поиск employee_id по имени мастера
        employee_id = None
        if master_name:
            employees = get_all_employees(active_only=True)
            for emp in employees:
                if master_name.lower() in emp[1].lower():
                    employee_id = emp[0]
                    break
        
        # Получаем мастеров для услуги
        if service_name:
            c.execute("""
                SELECT id FROM services 
                WHERE name_ru LIKE ? OR name_en LIKE ? OR name_ar LIKE ?
                LIMIT 1
            """, (f"%{service_name}%", f"%{service_name}%", f"%{service_name}%"))
            service_row = c.fetchone()
            
            if service_row:
                service_id = service_row[0]
                employees = get_employees_by_service(service_id)
            else:
                employees = get_all_employees(active_only=True)
            
            availability_text = f"📅 МАСТЕРА ДЛЯ '{service_name.upper()}':\n\n"
            
            for emp in employees[:5]:
                emp_id = emp[0]
                emp_name = emp[1]
                emp_position = emp[2]
                
                availability_text += f"👤 {emp_name}\n"
                availability_text += f"   Должность: {emp_position}\n"
                
                # Получаем специализацию
                c.execute("""
                    SELECT s.name_ru 
                    FROM services s
                    JOIN employee_services es ON s.id = es.service_id
                    WHERE es.employee_id = ?
                    LIMIT 3
                """, (emp_id,))
                services = [row[0] for row in c.fetchall()]
                
                if services:
                    availability_text += f"   Специализация: {', '.join(services)}\n"
                
                # Расписание мастера
                c.execute("""
                    SELECT day_of_week, start_time, end_time
                    FROM employee_schedule
                    WHERE employee_id = ? AND is_active = 1
                    ORDER BY day_of_week
                """, (emp_id,))
                schedule_rows = c.fetchall()
                
                if schedule_rows:
                    days_map = {0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Вс'}
                    schedule_str = ", ".join([
                        f"{days_map[row[0]]} {row[1]}-{row[2]}" 
                        for row in schedule_rows
                    ])
                    availability_text += f"   График: {schedule_str}\n"
                
                # Выходные мастера
                today = datetime.now().strftime("%Y-%m-%d")
                c.execute("""
                    SELECT date_from, date_to, reason
                    FROM employee_time_off
                    WHERE employee_id = ? AND date_to >= ?
                    ORDER BY date_from
                    LIMIT 3
                """, (emp_id, today))
                time_offs = c.fetchall()
                
                if time_offs:
                    for off in time_offs:
                        date_from = datetime.strptime(off[0], "%Y-%m-%d").strftime("%d.%m")
                        date_to = datetime.strptime(off[1], "%Y-%m-%d").strftime("%d.%m")
                        reason = off[2] or "Выходной"
                        availability_text += f"   ❌ Не работает: {date_from}-{date_to} ({reason})\n"
                
                availability_text += "\n"
        else:
            employees = get_all_employees(active_only=True)
            availability_text = "👥 НАШИ МАСТЕРА И ИХ ГРАФИК:\n\n"
            
            for emp in employees[:6]:
                emp_id = emp[0]
                emp_name = emp[1]
                emp_position = emp[2]
                
                availability_text += f"• {emp_name} - {emp_position}\n"
                
                c.execute("""
                    SELECT day_of_week, start_time, end_time
                    FROM employee_schedule
                    WHERE employee_id = ? AND is_active = 1
                    ORDER BY day_of_week
                """, (emp_id,))
                schedule_rows = c.fetchall()
                
                if schedule_rows:
                    days_map = {0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Вс'}
                    schedule_str = ", ".join([
                        f"{days_map[row[0]]} {row[1]}-{row[2]}" 
                        for row in schedule_rows
                    ])
                    availability_text += f"  График: {schedule_str}\n"
                
                availability_text += "\n"
        
        # Анализ истории
        if history:
            weekdays = [h['weekday'] for h in history]
            times = [h['time'] for h in history]
            
            if weekdays:
                preferred_day = Counter(weekdays).most_common(1)[0][0]
                availability_text += f"\n💡 Обычно вы записываетесь в {preferred_day}\n"
            
            if times:
                preferred_time = Counter(times).most_common(1)[0][0]
                availability_text += f"💡 Обычно в {preferred_time}\n"
        
        booking_url = self.salon.get('booking_url', '')
        availability_text += f"\n📲 Записаться онлайн: {booking_url}"
        
        conn.close()
        return availability_text