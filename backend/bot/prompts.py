# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple
from datetime import datetime

from db import (
    get_all_services,
    get_all_special_packages,
    find_special_package_by_keywords
)

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
Консультировать клиентов по услугам, рассказывать о преимуществах и НАПРАВЛЯТЬ на онлайн-запись через YClients!"""
    
    def _build_personality(self) -> str:
        """Секция PERSONALITY"""
        return f"""=== PERSONALITY ===
{self.bot_settings['personality_traits']}

СТИЛЬ ОБЩЕНИЯ:
{self.bot_settings['communication_style']}

- Максимум {self.bot_settings['max_message_length']} предложений
- Эмодзи: {self.bot_settings['emoji_usage']}"""
    
    def _build_language_settings(self, language: str) -> str:
        """Языковые настройки"""
        lang_map = {
            'ru': "ЯЗЫК: Русский (основной) - отвечай по-русски",
            'en': "ЯЗЫК: English - respond in English", 
            'ar': "ЯЗЫК: العربية - الرد بالعربية"
        }
        
        lang_instruction = lang_map.get(language, lang_map['ru'])
        supported = self.bot_settings.get('languages_supported', 'ru,en,ar')
        
        return f"""=== LANGUAGE ===
{lang_instruction}

Поддерживаемые языки: {supported}
⚠️ ВСЕГДА отвечай на том же языке, на котором написал клиент!"""
    
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
- Будь краткой и по делу (2-3 предложения)"""
    
    def _should_greet(self, history: List[Tuple]) -> bool:
        """Определить нужно ли здороваться"""
        if len(history) <= 1:
            return True
        
        # Логика из core.py
        # ... (та же логика что в SalonBot.should_greet)
        return False
    
    def _build_voice_handling(self) -> str:
        """Обработка голосовых сообщений"""
        voice_response = self.bot_settings.get(
            'voice_message_response',
            'Извините, я AI-помощник и не могу прослушивать голосовые 😊'
        )
        return f"""=== ГОЛОСОВЫЕ СООБЩЕНИЯ ===
ТЫ НЕ МОЖЕШЬ прослушивать голосовые - ты AI!

Если клиент отправил голосовое, скажи:
"{voice_response}
Пожалуйста, напишите текстом!"""
    
    def _build_special_packages(self) -> str:
        """Специальные пакеты"""
        packages = get_all_special_packages(active_only=True)
        
        if not packages:
            return ""
        
        packages_text = "=== СПЕЦИАЛЬНЫЕ ПАКЕТЫ ===\n\n"
        
        for pkg in packages:
            pkg_name = pkg[2]  # name_ru
            orig_price = pkg[5]
            special_price = pkg[6]
            currency = pkg[7]
            discount = pkg[8]
            desc = pkg[4] or ""
            keywords = pkg[11]
            
            packages_text += f"""🔥 {pkg_name}
  Обычная цена: {orig_price} {currency}
  Специальная цена: {special_price} {currency} (скидка {discount}%!)
  Описание: {desc}
  Ключевые слова: {keywords}
  ⚠️ Если клиент упоминает эти слова - предложи ЭТОТ пакет!

"""
        
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
            
            services_by_category[category].append({
                'name': service[2],
                'name_ru': service[3] or service[2],
                'price': f"{service[5]} {service[6]}",
                'description': service[9] or ''
            })
        
        services_text = "=== УСЛУГИ САЛОНА ===\n\n"
        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            for service in services_list:
                services_text += f"• {service['name_ru']} - {service['price']}\n"
                if service['description']:
                    services_text += f"  └ {service['description']}\n"
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
        return f"""⚡ АЛГОРИТМ ДЕЙСТВИЙ:
{self.bot_settings['algorithm_actions']}"""
    
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
        if not anti_patterns:
            return """🚫 НЕ ДЕЛАЙ:
- НЕ повторяй приветствия
- НЕ пиши длинные тексты
- НЕ собирай данные для записи
- НЕ придумывай цены"""
        
        return f"""🚫 НЕ ДЕЛАЙ:
{anti_patterns}"""