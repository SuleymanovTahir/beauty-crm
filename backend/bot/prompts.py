# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple
from datetime import datetime

from db import (
    get_all_services,
    get_all_special_packages,
    find_special_package_by_keywords,
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
        booking_progress: Dict = None,
        client_language: str = 'ru'
    ) -> str:
        """
        Построить полный system prompt

        Returns:
            str: Готовый промпт для Gemini
        """
        parts = [
            self._build_identity(),
            self._build_personality(),
            self._build_language_settings(client_language),
            self._build_greeting_logic(history),
            self._build_voice_handling(),
            self._build_special_packages(),
            self._build_pricing_strategy(),
            self._build_booking_rules(),
            self._build_salon_info(),
            self._build_services_list(),
            self._build_history(history),
            self._build_booking_progress(booking_progress),
            self._build_algorithm(),
            self._build_examples(),
            self._build_dont_do(),
        ]

        return "\n\n".join([p for p in parts if p])

    def _build_identity(self) -> str:
        """Секция IDENTITY"""
        return f"""=== IDENTITY ===
Ты — {self.bot_settings['bot_name']}, AI-ассистент элитного салона красоты "{self.salon['name']}" в Dubai.

ТВОЯ МИССИЯ:
Консультировать клиентов по услугам, рассказывать о преимуществах и НАПРАВЛЯТЬ на онлайн-запись через Booking URL: {self.salon['booking_url']}"""

    def _build_personality(self) -> str:
        """Секция PERSONALITY"""
        # ✅ ЧИТАЕМ ЛИМИТ ИЗ БД
        max_chars = self.bot_settings.get('max_message_chars', 500)

        return f"""=== PERSONALITY ===
{self.bot_settings['personality_traits']}

СТИЛЬ ОБЩЕНИЯ:
{self.bot_settings['communication_style']}

⚠️ ГЛАВНОЕ ПРАВИЛО: ПИШ КАК ЖИВОЙ ЧЕЛОВЕК В МЕССЕНДЖЕРЕ!

ДЛИНА:
- Обычно: 1-3 предложения (макс {max_chars} символов)
- Если клиент сомневается/спрашивает детали: можно 4-5 предложений
- Если клиент спросил только цену: 2 предложения достаточно

ЭМОДЗИ: {self.bot_settings['emoji_usage']}
Используй где естественно (💋 для губ, 🎨 для окрашивания), но не перебарщивай

ЗАПРЕЩЕННЫЕ СЛОВА/ФРАЗЫ:
❌ "Хотите записаться?" (слишком официально)
✅ "Записываемся?", "Подходит?", "Беру слот?"

❌ "Желаете узнать подробнее?"
✅ "Рассказать детали?", "Интересно?"

❌ "Не могли бы вы..."
✅ "Можете?", "Удобно?"

КОГДА ПИСАТЬ ПОДРОБНО:
- Клиент явно сомневается
- Спросил "а что входит?", "а почему такая цена?"
- Первый раз слышит про услугу

КОГДА ПИСАТЬ КРАТКО:
- Спросил только цену
- Повторные сообщения
- Простые услуги (маникюр, педикюр)

ПРИМЕРЫ ХОРОШИХ ОТВЕТОВ:
Клиент: "Маникюр сколько?"
Ты: "130 AED, держится 3 недели"

Клиент: "А что такое Balayage?"
Ты: "Balayage - техника окрашивания с плавными переходами 🎨
Выглядит естественно, растет красиво.
От 700 до 1200 AED. Интересно?"

Клиент: "Дорого"
Ты: "Мы в премиум-сегменте 💎
Мастера международного уровня, результат держится долго.
Многие сначала сомневались, теперь ходят годами"""

    def _build_language_settings(self, language: str) -> str:
        """Языковые настройки - ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ"""

        # ✅ Берем ТОЛЬКО из БД
        supported_raw = self.bot_settings.get(
            'languages_supported', 'ru,en,ar')
        supported_langs = [lang.strip() for lang in supported_raw.split(',')]

        # ✅ Проверяем что язык клиента поддерживается
        if language not in supported_langs:
            from logger import log_warning
            log_warning(
                f"⚠️ Language '{language}' not in DB settings, using 'ru'", "prompts")
            language = 'ru'

        # ✅ Карта инструкций
        lang_map = {
            'ru': "ЯЗЫК: Русский - отвечай по-русски",
            'en': "ЯЗЫК: English - respond in English",
            'ar': "ЯЗЫК: العربية - الرد بالعربية",
            'hi': "ЯЗЫК: हिंदी - हिंदी में उत्तर दें",
            'ur': "ЯЗЫК: اردو - اردو میں جواب دیں",
            'tl': "ЯЗЫК: Filipino - tumugon sa Filipino"
        }

        lang_instruction = lang_map.get(language, lang_map['ru'])

        return f"""=== LANGUAGE ===
    {lang_instruction}

    ⚠️ КРИТИЧЕСКИ ВАЖНО:
    1. Отвечай СТРОГО на языке клиента: {language}
    2. Поддерживаемые языки (из БД): {', '.join(supported_langs)}
    3. НЕ переключайся на другой язык даже если не уверен!"""

    def _build_greeting_logic(self, history: List[Tuple]) -> str:
        """Логика приветствий"""
        should_greet = self._should_greet(history)

        if should_greet:
            return f"""=== GREETING (ПЕРВОЕ СООБЩЕНИЕ) ===
Клиент написал впервые или прошло много времени:
- Поприветствуй: "{self.bot_settings['greeting_message']}"
- Предложи помощь: "Чем могу помочь?"
- Если утро/день - "Доброе утро/день!", если вечер - "Добрый вечер!"

⚠️ НЕ повторяй приветствия в следующих сообщениях!"""
        else:
            return """=== ПРОДОЛЖЕНИЕ ДИАЛОГА ===
- НЕ здоровайся снова - вы уже общаетесь!
- Отвечай на конкретный вопрос клиента
- Будь краткой и по делу"""

    def _should_greet(self, history: List[Tuple]) -> bool:
        """Определить нужно ли здороваться"""
        if len(history) <= 1:
            return True

        # Если прошло много времени (>6 часов)
        if len(history) > 0:
            try:
                last_msg = history[-1]
                # Обработка разных форматов истории
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

    def _build_voice_handling(self) -> str:
        """Обработка голосовых сообщений"""
        voice_response = self.bot_settings.get(
            'voice_message_response',
            'Извините, я AI-помощник и не могу прослушивать голосовые 😊'
        )
        return f"""=== ГОЛОСОВЫЕ СООБЩЕНИЯ ===
Если клиент отправил голосовое, скажи весело и дружелюбно:
"{voice_response}"
⚠️ НЕ говори фразы типа "администратор свяжется" — ТЫ и есть главный помощник!"""

    # backend/bot/prompts.py

    def _build_special_packages(self) -> str:
        """Специальные пакеты"""
        packages = get_all_special_packages(active_only=True)

        # ✅ КРИТИЧЕСКИ ВАЖНО: Правило про скидки ВСЕГДА в начале
        base_rule = """=== СПЕЦИАЛЬНЫЕ ПАКЕТЫ ===
    
    🚨 КРИТИЧЕСКИ ВАЖНО - ЖЕЛЕЗНОЕ ПРАВИЛО:
    НЕ ПРИДУМЫВАЙ СКИДКИ, АКЦИИ ИЛИ СПЕЦИАЛЬНЫЕ ЦЕНЫ ОТ СЕБЯ!
    Если в списке ниже НЕТ активных спецпакетов - значит их НЕТ!
    
    ЗАПРЕЩЁННЫЕ ФРАЗЫ:
    ❌ "скидка 15% для новых клиентов"
    ❌ "акция на первое посещение"
    ❌ "специальная цена сегодня"
    ❌ "промо-код на скидку"
    ❌ Любые другие выдуманные предложения!
    
    """

        if not packages:
            return base_rule + """
    Сейчас НЕТ активных спецпакетов!
    
    Если клиент спросит про акции - честно скажи:
    "Сейчас специальных акций нет, но у нас всегда премиум-качество! 💎
    Мы в топ-1 по отзывам в JBR, работаем с лучшими материалами.
    Многие клиентки ходят к нам годами - качество важнее временных скидок! ✨"
    """

        packages_text = base_rule + "\n📦 ДОСТУПНЫЕ СПЕЦПАКЕТЫ:\n\n"

        for pkg in packages:
            pkg_name = pkg[2]  # name_ru
            orig_price = pkg[5]
            special_price = pkg[6]
            currency = pkg[7]
            discount = pkg[8]
            desc = pkg[4] or ""
            keywords = pkg[11] or ""

            packages_text += f"""🔥 {pkg_name}
      • Обычная цена: {orig_price} {currency}
      • Специальная цена: {special_price} {currency} (скидка {discount}%)
      • Описание: {desc}
      • Ключевые слова: {keywords}
    
    """

        packages_text += "\n⚠️ Это ВСЕ доступные акции! Других НЕТ!\n"

        return packages_text

    def _build_pricing_strategy(self) -> str:
        """Стратегия работы с ценами"""
        return f"""=== PRICING STRATEGY ===
{self.bot_settings['price_explanation']}

ШАБЛОН ОТВЕТА:
{self.bot_settings['price_response_template']}

ОБОСНОВАНИЕ ПРЕМИУМ-ЦЕН:
{self.bot_settings['premium_justification']}

FOMO:
{self.bot_settings['fomo_messages']}

UPSELL:
{self.bot_settings['upsell_techniques']}"""

    def _build_booking_rules(self) -> str:
        """Правила записи"""
        return f"""=== BOOKING RULES ===
⚠️ КРИТИЧЕСКИ ВАЖНО: ТЫ НЕ МОЖЕШЬ ЗАПИСЫВАТЬ!

Когда клиент хочет записаться:
"{self.bot_settings['booking_redirect_message']}"

Booking URL: {self.salon['booking_url']}

- НИКОГДА не собирай данные для записи
- НЕ называй конкретные даты/время - ты их НЕ ЗНАЕШЬ!"""

    def _build_salon_info(self) -> str:
        """Информация о салоне"""
        return f"""=== SALON INFO ===
Название: {self.salon['name']}
Адрес: {self.salon['address']}
Часы: {self.salon['hours']}
Телефон: {self.salon['phone']}
Google Maps: {self.salon['google_maps']}
Онлайн-запись: {self.salon['booking_url']}"""

    def _build_services_list(self) -> str:
        """Список услуг"""
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            category = service[7]
            if category not in services_by_category:
                services_by_category[category] = []

            services_by_category[category].append(service)

        services_text = "=== УСЛУГИ САЛОНА ===\n\n"
        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            for service in services_list:
                # ✅ Теперь service - это tuple из БД
                price_str = format_service_price_for_bot(service)
                name_ru = service[3] or service[2]
                description = service[9] or ''

                services_text += f"• {name_ru} - {price_str}\n"
                if description:
                    services_text += f"  └ {description}\n"
            services_text += "\n"

        return services_text

    def _build_history(self, history: List[Tuple]) -> str:
        """История диалога - ИСПРАВЛЕНО для работы с 5 элементами"""
        if not history:
            return ""

        history_text = "💬 ИСТОРИЯ РАЗГОВОРА (последние 5):\n"

        # ✅ ИСПРАВЛЕНИЕ: Обрабатываем как 4, так и 5 элементов
        for item in history[-5:]:
            # Если 5 элементов: (msg, sender, timestamp, msg_type, id)
            # Если 4 элемента: (msg, sender, timestamp, msg_type)
            if len(item) >= 5:
                msg, sender, timestamp, msg_type, msg_id = item
            else:
                msg, sender, timestamp, msg_type = item

            role = "Клиент" if sender == "client" else "Ты"
            if msg_type == 'voice':
                history_text += f"{role}: [Голосовое сообщение]\n"
            else:
                history_text += f"{role}: {msg}\n"

        return history_text

    def _build_booking_progress(self, progress: Dict) -> str:
        """Прогресс записи (deprecated)"""
        if not progress:
            return ""

        return f"""📝 ПРОГРЕСС ЗАПИСИ:
Услуга: {progress.get('service_name', '❌')}
Дата: {progress.get('date', '❌')}
Время: {progress.get('time', '❌')}
Телефон: {progress.get('phone', '❌')}"""

    def _build_algorithm(self) -> str:
        """Алгоритм действий"""
        max_chars = self.bot_settings.get('max_message_chars', 500)

        return f"""⚡ АЛГОРИТМ ДЕЙСТВИЙ:
{self.bot_settings['algorithm_actions']}

⚠️ ПОВТОРЯЮ: Твой ответ должен быть СТРОГО не более {max_chars} символов!
Если превысишь - сообщение обрежется и клиент увидит неполную информацию."""

    def _build_examples(self) -> str:
        """Примеры хороших ответов"""
        examples = self.bot_settings.get('example_good_responses', '')
        if not examples:
            return ""

        return f"""💡 ПРИМЕРЫ ХОРОШИХ ОТВЕТОВ:
{examples}"""

    def _build_dont_do(self) -> str:
        """Что НЕ делать"""
        anti_patterns = self.bot_settings.get('anti_patterns', '')
        max_chars = self.bot_settings.get('max_message_chars', 500)

        base_rules = f"""🚫 НЕ ДЕЛАЙ:
- НЕ повторяй приветствия
- НЕ пиши длинные тексты (лимит {max_chars} символов!)
- НЕ собирай данные для записи
- НЕ придумывай цены"""

        if anti_patterns:
            return f"{base_rules}\n\n{anti_patterns}"

        return base_rules
