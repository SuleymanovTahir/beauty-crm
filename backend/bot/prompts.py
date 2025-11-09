# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime

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
        
        # Инициализируем booking_progress если не передан
        if booking_progress is None:
            booking_progress = {}
        
        # ✅ ИЗВЛЕКАЕМ ДАННЫЕ ИЗ booking_progress
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

{self.bot_settings.get('emoji_usage', '')}"""

    def _build_language_settings(self, language: str) -> str:
        """Языковые настройки - из БД
        
        Args:
            language: Код языка клиента
            
        Returns:
            Текст с языковыми настройками
        """
        supported_raw = self.bot_settings.get('languages_supported', 'ru,en,ar')
        supported_langs = [lang.strip() for lang in supported_raw.split(',')]

        if language not in supported_langs:
            language = 'ru'

        return f"""=== LANGUAGE ===
Отвечай на языке: {language}
Поддерживаемые языки: {', '.join(supported_langs)}"""

    def _build_greeting_logic(self, history: List[Tuple]) -> str:
        """Логика приветствий - из БД
        
        Args:
            history: История диалога
            
        Returns:
            Текст с логикой приветствия
        """
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
        """Определить нужно ли здороваться
        
        Args:
            history: История диалога
            
        Returns:
            True если нужно поздороваться
        """
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

                if time_diff.total_seconds() > 21600:  # 6 часов
                    return True
            except:
                pass

        return False

    def _build_special_packages(self) -> str:
        """Специальные пакеты из БД
        
        Returns:
            Текст со списком специальных пакетов
        """
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
            pkg_name = pkg[2]  # name_ru
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
        """Правила записи - из БД
        
        Returns:
            Текст с правилами бронирования
        """
        booking_msg = self.bot_settings.get(
            'booking_redirect_message',
            'Запись онлайн: {BOOKING_URL}'
        )
        
        booking_url = self.salon.get('booking_url', '')
        
        return f"""=== BOOKING RULES ===
{booking_msg.replace('{BOOKING_URL}', booking_url)}"""

    def _build_salon_info(self) -> str:
        """Информация о салоне - из БД
        
        Returns:
            Текст с информацией о салоне
        """
        return f"""=== SALON INFO ===
Название: {self.salon.get('name', '')}
Адрес: {self.salon.get('address', '')}
Часы: {self.salon.get('hours', '')}
Телефон: {self.salon.get('phone', '')}
Google Maps: {self.salon.get('google_maps', '')}
Онлайн-запись: {self.salon.get('booking_url', '')}"""

    def _build_services_list(self) -> str:
        """Список услуг из БД
        
        Returns:
            Текст со списком услуг по категориям
        """
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            category = service[9]  # category
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)

        services_text = "=== УСЛУГИ САЛОНА ===\n\n"
        
        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            for service in services_list:
                price_str = format_service_price_for_bot(service)
                name_ru = service[3] or service[2]
                description = service[11] or ''  # description_ru

                services_text += f"• {name_ru} - {price_str}\n"
                if description:
                    services_text += f"  └ {description}\n"
            services_text += "\n"

        return services_text

    def _build_history(self, history: List[Tuple]) -> str:
        """История диалога
        
        Args:
            history: История сообщений
            
        Returns:
            Текст с последними сообщениями из истории
        """
        if not history:
            return ""

        history_text = "💬 ИСТОРИЯ (последние 5):\n"

        for item in history[-5:]:
            if len(item) >= 5:
                msg, sender, timestamp, msg_type, msg_id = item
            else:
                msg, sender, timestamp, msg_type = item

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
        """Построить информацию о доступности с расширенным поиском
        
        Args:
            instagram_id: ID клиента в Instagram
            service_name: Название услуги для фильтрации
            master_name: Имя мастера для фильтрации
            preferred_date: Предпочтительная дата в формате YYYY-MM-DD
            
        Returns:
            Текст с информацией о доступных слотах
        """
        from db.schedule import get_available_slots, get_client_booking_history
        from db.masters import get_master_by_name
        
        master_id = None
        if master_name:
            master = get_master_by_name(master_name)
            if master:
                master_id = master[0]
        
        # История для анализа предпочтений
        history = get_client_booking_history(instagram_id, limit=5)
        
        # ✅ СНАЧАЛА ИЩЕМ НА 2 НЕДЕЛИ
        slots = get_available_slots(
            service_name=service_name,
            master_id=master_id,
            date_from=preferred_date or datetime.now().strftime("%Y-%m-%d"),
            days_ahead=14,
            limit=15
        )
        
        # ✅ ЕСЛИ НЕТ - ИЩЕМ НА МЕСЯЦ
        if not slots:
            slots = get_available_slots(
                service_name=service_name,
                master_id=master_id,
                date_from=preferred_date or datetime.now().strftime("%Y-%m-%d"),
                days_ahead=30,
                limit=15
            )
        
        # ✅ ЕСЛИ НЕТ - ИЩЕМ НА 2 МЕСЯЦА (максимум)
        if not slots:
            slots = get_available_slots(
                service_name=service_name,
                master_id=master_id,
                date_from=preferred_date or datetime.now().strftime("%Y-%m-%d"),
                days_ahead=60,
                limit=15
            )
        
        # ✅ ЕСЛИ ВСЕ ЕЩЕ НЕТ - ЗНАЧИТ РЕАЛЬНО ПРОБЛЕМА
        if not slots:
            phone = self.salon.get('phone', '[PHONE]')
            return f"""⚠️ К сожалению, все мастера заняты на ближайшие 2 месяца.
        
Рекомендую:
- Позвонить напрямую: {phone} - возможно освободится окно
- Оставить контакт - мы позвоним когда появится свободное время"""
        
        # Анализируем историю для предпочтений
        preferred_time = None
        preferred_weekday = None
        preferred_master = None
        
        if history:
            times = [h['time'] for h in history if 'time' in h]
            if times:
                from collections import Counter
                time_counts = Counter(times)
                preferred_time = time_counts.most_common(1)[0][0] if time_counts else None
            
            weekdays = [h['weekday'] for h in history if 'weekday' in h]
            if weekdays:
                from collections import Counter
                weekday_counts = Counter(weekdays)
                preferred_weekday = weekday_counts.most_common(1)[0][0] if weekday_counts else None
            
            masters = [h['master'] for h in history if h.get('master')]
            if masters:
                from collections import Counter
                master_counts = Counter(masters)
                preferred_master = master_counts.most_common(1)[0][0] if master_counts else None
        
        # ✅ ФОРМИРУЕМ ТЕКСТ - ПОКАЗЫВАЕМ ЧТО ЕСТЬ
        availability_text = "📅 СВОБОДНЫЕ ОКНА:\n\n"
        
        # ✅ ОПРЕДЕЛЯЕМ ВРЕМЕННОЙ ПЕРИОД
        first_slot_date = datetime.strptime(slots[0]['date'], "%Y-%m-%d")
        today = datetime.now()
        days_diff = (first_slot_date - today).days
        
        if days_diff <= 7:
            period_note = ""  # Не пишем ничего - это нормально
        elif days_diff <= 14:
            period_note = "\n💡 Ближайшие дни заполнены, показываю через 1-2 недели\n"
        elif days_diff <= 30:
            period_note = "\n💡 Ближайшие недели заполнены, показываю свободные окна через месяц\n"
        else:
            period_note = "\n💡 Мастера очень загружены, но есть окна через 1-2 месяца\n"
        
        availability_text += period_note + "\n"
        
        # Группируем по дням
        slots_by_date = {}
        for slot in slots:
            date = slot['date']
            if date not in slots_by_date:
                slots_by_date[date] = []
            slots_by_date[date].append(slot)
        
        # Показываем первые 3 дня
        for date, day_slots in list(slots_by_date.items())[:3]:
            try:
                dt = datetime.strptime(date, "%Y-%m-%d")
                date_formatted = dt.strftime("%d.%m (%A)")
            except:
                date_formatted = date
            
            availability_text += f"📆 {date_formatted}:\n"
            
            for slot in day_slots[:4]:  # Максимум 4 слота в день
                time_range = f"{slot['time_start']}-{slot['time_end']}"
                master = slot['master_name']
                
                # Отмечаем предпочтения
                marker = ""
                if preferred_master and master == preferred_master:
                    marker = " ⭐"
                elif preferred_time and slot['time_start'] == preferred_time:
                    marker = " 🕐"
                
                availability_text += f"  • {time_range} - {master}{marker}\n"
            
            availability_text += "\n"
        
        # Подсказки о предпочтениях
        if preferred_master:
            availability_text += f"\n💡 Обычно вы записываетесь к {preferred_master}\n"
        if preferred_time:
            availability_text += f"💡 Обычно в {preferred_time}\n"
        
        return availability_text