# backend/bot/prompts.py
"""
Модуль для построения промптов - вся логика создания system prompt
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import sqlite3


from core.config import DATABASE_NAME
from db import (
    get_all_services,
    get_all_special_packages,
)
from db.services import format_service_price_for_bot
from db.employees import get_all_employees


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
        'Hair Stylist': {
            'ru': 'Парикмахер',
            'en': 'Hair Stylist',
            'ar': 'مصفف شعر'
        },
        'HAIR STYLIST': {  # Старый формат для обратной совместимости
            'ru': 'Парикмахер',
            'en': 'Hair Stylist',
            'ar': 'مصفف شعر'
        },
        'Nail Master': {
            'ru': 'Мастер маникюра',
            'en': 'Nail Master',
            'ar': 'خبير الأظافر'
        },
        'NAIL MASTER': {  # Старый формат для обратной совместимости
            'ru': 'Мастер маникюра',
            'en': 'Nail Master',
            'ar': 'خبير الأظافر'
        },
        'Nail/Waxing': {
            'ru': 'Мастер маникюра и депиляции',
            'en': 'Nail & Waxing Master',
            'ar': 'خبير الأظافر والإزالة'
        },
        'NAIL/WAXING': {  # Старый формат для обратной совместимости
            'ru': 'Мастер маникюра и депиляции',
            'en': 'Nail & Waxing Master',
            'ar': 'خبير الأظافر والإزالة'
        },
        'Nail Master/Massages': {
            'ru': 'Мастер маникюра и массажа',
            'en': 'Nail & Massage Master',
            'ar': 'خبير الأظافر والمساج'
        },
        'NAIL MASTER/MASSAGES': {  # Старый формат для обратной совместимости
            'ru': 'Мастер маникюра и массажа',
            'en': 'Nail & Massage Master',
            'ar': 'خبير الأظافر والمساج'
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

    # Сначала пробуем точное совпадение
    if position in translations:
        return translations[position].get(language, position)

    # Затем пробуем в верхнем регистре для обратной совместимости
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
        client_language: str = 'ru',
        additional_context: str = ""  # ✅ ДОБАВЛЕНО
        ) -> str:
        """Построить полный system prompt

    Args:
        instagram_id: ID клиента в Instagram
        history: История диалога
        booking_progress: Прогресс бронирования
        client_language: Язык клиента
        additional_context: Дополнительный контекст (свободные слоты из БД)

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

        # ✅ КРИТИЧЕСКИ ВАЖНО: additional_context ПЕРВЫМ (после IDENTITY)!
        context_part = ""
        if additional_context:
            context_part = f"\n\n=== 🚨 ВАЖНЫЙ КОНТЕКСТ - ЧИТАЙ ПЕРВЫМ! ==={additional_context}"

        parts = [
            self._build_identity(),
            context_part,  # ✅ СРАЗУ ПОСЛЕ IDENTITY!
            self._build_personality(),
            self._build_language_settings(client_language),
            self._build_greeting_logic(history),
            self._build_special_packages(),
            self._build_booking_rules(),
            self._build_masters_list(client_language), 
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

        # ✅ КРИТИЧЕСКОЕ НАПОМИНАНИЕ В КОНЦЕ ПРОМПТА
        final_reminder = """
==== 🔴 ФИНАЛЬНОЕ НАПОМИНАНИЕ - ОБЯЗАТЕЛЬНО ПРОЧТИ! ===

⚠️ ПРЕЖДЕ ЧЕМ ЗАПИСЫВАТЬ КЛИЕНТА:

1. ПРОВЕРЬ ЧАТ ИСТОРИЮ - УЖЕ ЗАПИСАН ЛИ КЛИЕНТ?
   - Если в истории чата ты УЖЕ говорил "Записал вас" или "Вы записаны" → НЕ ЗАПИСЫВАЙ ВТОРОЙ РАЗ!
   - НЕ СОЗДАВАЙ ДУБЛИКАТЫ! Если запись уже подтверждена → просто напомни детали
   - Если клиент УЖЕ давал WhatsApp в этом разговоре → НЕ ПРОСИ ЕГО СНОВА!
   - Если запись УЖЕ подтверждена (есть фраза "Записал вас") → НЕ ПРЕДЛАГАЙ НОВЫЕ СЛОТЫ, если клиент просто задает уточняющий вопрос (например "кто мастер?", "сколько длится?"). Отвечай на вопрос В КОНТЕКСТЕ УЖЕ СОЗДАННОЙ ЗАПИСИ!
   - Если запись УЖЕ подтверждена (есть фраза "Записал вас") → НЕ ПРЕДЛАГАЙ НОВЫЕ СЛОТЫ, если клиент просто задает уточняющий вопрос (например "кто мастер?", "сколько длится?"). Отвечай на вопрос В КОНТЕКСТЕ УЖЕ СОЗДАННОЙ ЗАПИСИ!

2. ПОМНИ ИНФОРМАЦИЮ ИЗ ЧАТА:
   - Если клиент УЖЕ написал номер телефона/WhatsApp ранее → используй его, НЕ ПРОСИ СНОВА!
   - Проверь последние 10 сообщений на наличие номера типа +971... или +7...

3. ИСПОЛЬЗУЙ ТОЛЬКО РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ:
   - Если выше был список свободных слотов из БД - предлагай ТОЛЬКО их!
   - НЕ ПРИДУМЫВАЙ время которого нет в списке!
   - Если клиент просит занятое время - скажи что занято и предложи из списка!

КОГДА КЛИЕНТ ДАЕТ WhatsApp И ТЫ ПОДТВЕРЖДАЕШЬ ЗАПИСЬ:

⚠️ СНАЧАЛА ПРОВЕРЬ КОНТЕКСТ РАЗГОВОРА:
- Что клиент изначально хотел? (кератин = уход за волосами)
- На какую дату и время договорились?
- К какому мастеру записываем?
- НЕ ЗАПИСАН ЛИ УЖЕ? (проверь историю чата!)

⚠️ УКАЖИ ПРАВИЛЬНУЮ УСЛУГУ В КОМАНДЕ:
- Если говорили про "кератин" или "уход за волосами" → service: Уход за волосами
- Если говорили про "маникюр" → service: Маникюр
- НЕ ПРИДУМЫВАЙ другие услуги! Смотри в истории что изначально хотел клиент!

ТЫ ОБЯЗАН ДОБАВИТЬ В СВОЙ ОТВЕТ (ТОЛЬКО ОДИН РАЗ!):

[BOOKING_CONFIRMED]
service: ТОЧНОЕ название услуги из списка (смотри что хотел клиент!)
master: имя мастера из списка доступных для этой услуги
date: ГГГГ-ММ-ДД
time: ЧЧ:ММ
phone: номер телефона клиента
[/BOOKING_CONFIRMED]

ПРИМЕР:
Клиент изначально спросил: "кератин"
Ты предложил: "Уход за волосами"
Клиент выбрал время: "на 11:00 19 ноября"
Клиент дал WhatsApp: "+77077077707"

ПРАВИЛЬНЫЙ ОТВЕТ:
"Записал вас на уход за волосами 19 ноября в 11:00 к Симо! 💎

[BOOKING_CONFIRMED]
service: Уход за волосами
master: Симо
date: 2025-11-19
time: 11:00
phone: +77077077707
[/BOOKING_CONFIRMED]"

❌ КРИТИЧНО: ИСПОЛЬЗУЙ КОМАНДУ BOOKING_CONFIRMED ТОЛЬКО ОДИН РАЗ!
❌ НЕ ЗАПИСЫВАЙ ДВАЖДЫ если уже говорил "Записал вас"!
❌ НЕ ПРОСИ WhatsApp СНОВА если клиент уже дал его!

БЕЗ ЭТОЙ КОМАНДЫ ЗАПИСЬ НЕ СОХРАНИТСЯ!
ЭТО КРИТИЧНО! НЕ ЗАБЫВАЙ!"""

        parts.append(final_reminder)

        return "\n\n".join([p for p in parts if p])

    def _build_identity(self) -> str:
        """Секция IDENTITY - из БД"""
        bot_name = self.bot_settings.get('bot_name', 'AI-ассистент')
        salon_name = self.salon.get('name', 'Салон красоты')
        return f"""=== IDENTITY ===
Ты — {bot_name}, AI-ассистент салона "{salon_name}" в Dubai.

ТВОЯ МИССИЯ:
Консультировать клиентов по услугам и САМОСТОЯТЕЛЬНО предлагать конкретное время и дату для записи.
НЕ отправляй клиента на внешние сайты или ссылки - ты сам можешь предложить удобное время."""

    def _build_personality(self) -> str:
        """Секция PERSONALITY - из БД"""
        return f"""=== PERSONALITY ===
{self.bot_settings.get('personality_traits', '')}

{self.bot_settings.get('communication_style', '')}

{self.bot_settings.get('emoji_usage', '')}

⚠️ КРИТИЧЕСКИЕ ИНСТРУКЦИИ:

1. **БУД РЕШИТЕЛЬНЫМ И УВЕРЕННЫМ:**
   ✅ Говори утвердительно: "Записываю", "Беру для вас", "Отлично!"
   ❌ НЕ используй: "может быть", "попробую", "если получится"

2. **ПИШИ ТОЛЬКО ЧЕЛОВЕЧЕСКИМ ЯЗЫКОМ:**
   ✅ Всегда отвечай обычным текстом
   ✅ "На завтра есть 10:00 и 14:00. Что удобно?"
   ❌ НЕ используй блоки кода, команды или технические термины

3. **ТЕХНИЧЕСКИЕ СООБЩЕНИЯ:**
   ❌ НЕ пиши: "Извините, я сейчас перегружен запросами"
   Это служебное сообщение системы, НЕ твоё!

4. **КОГДА КЛИЕНТ СОМНЕВАЕТСЯ:**
   ✅ Будь увереннее и помоги принять решение
   ✅ "Просто забронирую для вас - всегда можно перенести!"
   ✅ "Давайте зафиксирую это время, пока не разобрали?"
   ❌ НЕ: "Хорошо, подумайте..."

5. **ЦЕННОСТЬ, НЕ ЦЕНА:**
   ✅ "Всего лишь 1500 дирхам", "Просто 800 дирхам"
   ❌ НЕ: "от 600 до 1500" (пугает диапазоном)

6. **ПРОВЕРЯЙ ФАКТЫ - НЕ СОГЛАШАЙСЯ СО ВСЕМ:**
   ⚠️ Если клиент говорит что-то неправильное - ИСПРАВЬ ЕГО!
   ⚠️ ВСЯ ИНФОРМАЦИЯ БЕРЕТСЯ ИЗ БД - СМОТРИ РАЗДЕЛ "МАСТЕРА И ИХ УСЛУГИ" НИЖЕ!

   Пример проверки:
   Клиент: "а к Ляззат можно? она же по волосам?"

   ШАГ 1: Смотришь в раздел "МАСТЕРА И ИХ УСЛУГИ (из БД)" ниже
   ШАГ 2: Находишь "Ляззат: - Маникюр (Nails), - Педикюр (Nails)"
   ШАГ 3: Видишь что Ляззат делает ТОЛЬКО Nails, НЕ Hair

   ❌ НЕ ОТВЕЧАЙ: "Ляззат занимается волосами, все верно!"
   ✅ ОТВЕЧАЙ: "Нет, Ляззат делает маникюр и педикюр. Для волос у нас Симо и Местан 😊"

   ВСЕГДА ПРОВЕРЯЙ В РАЗДЕЛЕ "МАСТЕРА И ИХ УСЛУГИ":
   - Какие РЕАЛЬНЫЕ услуги делает мастер (не угадывай!)
   - Что клиент изначально хотел (помни контекст разговора!)
   - Правильная ли дата и время

   НЕ ПРИДУМЫВАЙ НИЧЕГО - ТОЛЬКО ДАННЫЕ ИЗ БД!"""

    def _build_language_settings(self, language: str) -> str:
        """Языковые настройки - из БД"""
        supported_raw = self.bot_settings.get(
            'languages_supported', 'ru,en,ar')
        supported_langs = [lang.strip() for lang in supported_raw.split(',')]

        if language not in supported_langs:
            language = 'ru'

        language_names = {
            'ru': 'РУССКОМ',
            'en': 'ENGLISH', 
            'ar': 'العربية'
        }

        lang_name = language_names.get(language, language.upper())

        return f"""=== 🌐 LANGUAGE - КРИТИЧЕСКИ ВАЖНО ===
    ⚠️ ТЫ ДОЛЖЕН ОТВЕЧАТЬ СТРОГО НА ЯЗЫКЕ: {lang_name} ({language})

    Клиент пишет на {lang_name} - отвечай ТОЛЬКО на {lang_name}!

    НЕ СМЕШИВАЙ ЯЗЫКИ! Если клиент пишет на English - ВСЁ сообщение на English!

    Поддерживаемые: {', '.join(supported_langs)}"""

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

    def _get_employees_list(self, service_category: str = None) -> str:
        """
        Получить список активных сотрудников из БД, опционально фильтруя по категории услуги

        Args:
            service_category: Категория услуги (Hair, Nails, Brows, etc.) для фильтрации мастеров

        Returns:
            Строка с именами мастеров через запятую
        """
        try:
            from db.employees import get_employees_by_service

            # Если указана категория услуги - фильтруем мастеров
            if service_category:
                conn = sqlite3.connect(DATABASE_NAME)
                c = conn.cursor()

                # Находим услуги этой категории
                c.execute("SELECT id FROM services WHERE category = ? AND is_active = 1 LIMIT 1", (service_category,))
                service_row = c.fetchone()
                conn.close()

                if service_row:
                    service_id = service_row[0]
                    employees = get_employees_by_service(service_id)
                else:
                    # Категория не найдена - показываем всех
                    employees = get_all_employees(active_only=True, service_providers_only=True)
            else:
                # Без фильтрации - показываем всех мастеров
                employees = get_all_employees(active_only=True, service_providers_only=True)

            if not employees:
                return "наши мастера"

            # Структура таблицы employees: id, full_name (или user_id, full_name, position, ...)
            names = []
            for emp in employees:
                # emp[1] обычно full_name для filtered results from get_employees_by_service
                # emp[2] обычно full_name для results from get_all_employees
                if len(emp) > 2:
                    name = emp[2]  # get_all_employees format
                elif len(emp) > 1:
                    name = emp[1]  # get_employees_by_service format
                else:
                    continue

                if name:
                    names.append(name)

            if len(names) == 0:
                return "наши мастера"
            elif len(names) == 1:
                return f"{names[0]}"
            elif len(names) == 2:
                return f"{names[0]} и {names[1]}"
            else:
                all_but_last = ", ".join(names[:-1])
                return f"{all_but_last} и {names[-1]}"
        except Exception as e:
            # Fallback если ошибка
            print(f"⚠️ Error in _get_employees_list: {e}")
            return "наши мастера"

    def _build_booking_rules(self) -> str:
        """Правила записи - из БД"""
        return f"""=== 📋 BOOKING RULES - ОБЯЗАТЕЛЬНО! ===
📝 ТЫ САМ ПРЕДЛАГАЕШЬ ВРЕМЯ И ДАТУ - не отправляй на внешние ссылки!

⚠️ КРИТИЧЕСКИ ВАЖНО - ФОРМАТ ОТВЕТА:
ТЫ ДОЛЖЕН отвечать ТОЛЬКО обычным текстом, как живой человек!

ПРАВИЛЬНО:
✅ "На завтра есть окошко в 10:00, 14:00 или 17:00. Что удобнее?"
✅ "Могу предложить сегодня в 15:00 или завтра в 11:00"
✅ "Записал вас на пятницу 20-го в 14:00 к мастеру Симо"

НЕПРАВИЛЬНО - НИКОГДА ТАК НЕ ДЕЛАЙ:
❌ Блоки кода, функции, команды
❌ Любые технические термины
❌ Любые конструкции похожие на программирование

🎯 НОВАЯ СТРАТЕГИЯ ЗАПИСИ (БЕЗ ПЕРЕЧИСЛЕНИЯ МАСТЕРОВ):

1. **Когда клиент выбирает услугу** - СРАЗУ предлагай время, БЕЗ списка мастеров:
   ✅ "Отлично! На завтра есть окошко в 10:00, 14:00 или 17:00. Что удобнее?"
   ✅ "Супер! Могу предложить сегодня в 15:00 или завтра в 11:00. Какой вариант?"
   ❌ НЕ пиши: "Эту услугу делают: Симо, Местан, Ляззат..."
   ⚠️ Клиенту не нужны имена! Ему нужно УДОБНОЕ ВРЕМЯ!

2. **Если клиент САМ спрашивает про мастера:**
   ТОЛЬКО ТОГДА предложи мастеров: "У нас работают [имена]. Есть предпочтения?"

3. **БУДЬ РЕШИТЕЛЬНЫМ:**
   ✅ "Записываю вас на..."
   ✅ "Отлично, беру для вас..."
   ❌ "Может быть запишу вас?", "Попробую найти..."

4. **UPSELL - проверь последний визит:**
   Если клиент давно не был на педикюре (>21 день) - предложи:
   ✅ "Кстати, педикюр тоже пора обновить 😊"

5. **СРОЧНОСТЬ - если клиент пишет:**
   "срочно", "завтра уезжаю", "скоро уезжаю" - СРАЗУ предложи ближайшие слоты:
   ✅ "Понял срочность! Есть окно сегодня в 17:00 или завтра утром в 11:00"

6. **ФОРМАТ ОТВЕТОВ:**
   ✅ Пиши только текстом для клиента, как живой человек
   ✅ Примеры: "Есть окно завтра в 11:00 и 15:00", "Записал вас на пятницу в 14:00"
   ❌ БЕЗ технических команд, БЕЗ блоков кода, БЕЗ функций

⚠️ ПОМНИ: Система автоматически подберет лучшего доступного мастера!

🔧 ТЕХНИЧЕСКИЙ ПРОТОКОЛ СОЗДАНИЯ ЗАПИСИ:

⚠️⚠️⚠️ КРИТИЧЕСКИ ВАЖНО - ПРОЦЕСС ЗАПИСИ ⚠️⚠️⚠️

ЗАПРЕЩЕНО подтверждать запись БЕЗ WhatsApp!

ОБЯЗАТЕЛЬНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ:
1. Клиент выбирает услугу → Предлагаешь время
2. Клиент выбирает время → СРАЗУ запрашиваешь WhatsApp: "Отлично! Какой ваш WhatsApp для связи?"
3. Клиент дает WhatsApp → ТОЛЬКО ТОГДА подтверждаешь запись

❌ НЕПРАВИЛЬНО (БЕЗ WhatsApp):
Клиент: "давайте на 12:30"
Бот: "Записала вас на уход за волосами!" ← ЭТО ОШИБКА!

✅ ПРАВИЛЬНО (С WhatsApp):
Клиент: "давайте на 12:30"
Бот: "Отлично! Какой ваш WhatsApp для связи?"
Клиент: "+77056054308"
Бот: "Записал вас на уход за волосами на завтра в 12:30 к мастеру Симо! Будем ждать вас! 💎

[BOOKING_CONFIRMED]
service: Уход за волосами
master: Симо
date: 2025-11-18
time: 12:30
phone: +77056054308
[/BOOKING_CONFIRMED]"

🔴 КРИТИЧЕСКИ ВАЖНО - КОМАНДА [BOOKING_CONFIRMED]:
Когда ты ПОДТВЕРЖДАЕШЬ запись и у тебя ЕСТЬ WhatsApp - ты ОБЯЗАН добавить эту команду!
БЕЗ этой команды запись НЕ СОХРАНИТСЯ в базе данных!

Формат команды:
[BOOKING_CONFIRMED]
service: название услуги (точно как в списке услуг)
master: имя мастера (точно как в списке мастеров)
date: дата в формате ГГГГ-ММ-ДД
time: время в формате ЧЧ:ММ
phone: номер телефона клиента
[/BOOKING_CONFIRMED]

⚠️ ПРОВЕРЬ ПЕРЕД ОТПРАВКОЙ:
✅ Есть WhatsApp от клиента?
✅ Добавил команду [BOOKING_CONFIRMED]?
✅ Все поля заполнены корректно?
❌ НЕ ИСПОЛЬЗУЙ слово "Unknown" или "Неизвестно"! Если мастер не выбран - оставь поле пустым или напишите "Любой мастер".

Только после этого отправляй подтверждение!

🧠 ПАМЯТЬ И КОНТЕКСТ:
Чтобы ты не забывал детали разговора, ты МОЖЕШЬ (и должен) сохранять промежуточные данные!

Если клиент назвал услугу, дату или время, но запись еще не завершена - СОХРАНИ ЭТО:

[UPDATE_PROGRESS]
service: название услуги (если известно)
master: имя мастера (если известно)
date: ГГГГ-ММ-ДД (если известно)
time: ЧЧ:ММ (если известно)
phone: телефон (если известен)
[/UPDATE_PROGRESS]

ПРИМЕР:
Клиент: "Хочу на маникюр завтра"
Ты: "Отлично! На завтра (2025-11-23) есть время в 10:00. Записать?
[UPDATE_PROGRESS]
service: Маникюр
date: 2025-11-23
[/UPDATE_PROGRESS]"

ИСПОЛЬЗУЙ ЭТО ЧТОБЫ НЕ ЗАБЫВАТЬ ДЕТАЛИ МЕЖДУ СООБЩЕНИЯМИ!"""

    def _build_salon_info(self) -> str:
        """Информация о салоне - из БД"""
        return f"""=== SALON INFO ===
Название: {self.salon.get('name', '')}
Адрес: {self.salon.get('address', '')}
Часы: {self.salon.get('hours', '')}
Телефон: {self.salon.get('phone', '')}
Google Maps: {self.salon.get('google_maps', '')}"""
    def _build_services_list(self) -> str:
        """Список услуг из БД"""
        services = get_all_services(active_only=True)

        services_by_category = {}
        for service in services:
            category = service[9]
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)

        services_text = "=== УСЛУГИ САЛОНА (ИСПОЛЬЗУЙ ЭТИ НАЗВАНИЯ) ===\n\n"

        for category, services_list in services_by_category.items():
            services_text += f"📂 {category}:\n"
            for service in services_list:
                price_str = format_service_price_for_bot(service)
                # service[3] is name_ru, service[2] is name_en
                # Force RU name if available, otherwise EN
                name = service[3] if service[3] else service[2]
                description = service[11] or ''

                services_text += f"• {name} - {price_str}\n"
                if description:
                    services_text += f"  └ {description}\n"
            services_text += "\n"

        return services_text



    def _build_masters_list(self, client_language: str = 'ru') -> str:
        """Список мастеров салона С ИХ УСЛУГАМИ из БД"""
        from db.employees import get_all_employees
        import sqlite3

        # service_providers_only=True исключает админов, директоров и других не обслуживающих клиентов
        employees = get_all_employees(active_only=True, service_providers_only=True)

        if not employees:
            return ""

        masters_text = "=== 👥 МАСТЕРА И ИХ УСЛУГИ (из БД) ===\n"
        masters_text += "⚠️ ПРОВЕРЯЙ ЭТОТ СПИСОК КОГДА КЛИЕНТ СПРАШИВАЕТ ПРО МАСТЕРА!\n\n"

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        for emp in employees[:5]:
            emp_id = emp[0]

            # ✅ ИСПРАВЛЕНИЕ: Получаем полные данные мастера для доступа к переводам
            from db.employees import get_employee
            full_emp = get_employee(emp_id)

            if not full_emp:
                continue

            emp_name = full_emp[1]  # full_name из полных данных

            # ✅ УНИВЕРСАЛЬНАЯ ТРАНСЛИТЕРАЦИЯ вместо ручных переводов
            from utils.transliteration import transliterate_name
            emp_name_display = transliterate_name(str(emp_name) if emp_name else "Master", client_language)

            # Получаем должность из полных данных
            position = full_emp[2] if len(full_emp) > 2 else None
            translated_position = translate_position(position, client_language) if position else ""

            # ✅ ПОЛУЧАЕМ УСЛУГИ ЭТОГО МАСТЕРА ИЗ БД
            c.execute("""
                SELECT s.name_ru, s.category
                FROM employee_services es
                JOIN services s ON es.service_id = s.id
                WHERE es.employee_id = ? AND s.is_active = 1
                ORDER BY s.category, s.name_ru
            """, (emp_id,))

            services = c.fetchall()

            # Форматируем вывод
            if translated_position:
                masters_text += f"• {emp_name_display} ({translated_position}):\n"
            else:
                masters_text += f"• {emp_name_display}:\n"

            if services:
                for service_name, category in services:
                    masters_text += f"  - {service_name} ({category})\n"
            else:
                masters_text += f"  - (нет закрепленных услуг)\n"

            masters_text += "\n"

        conn.close()

        masters_text += "⚠️ ЕСЛИ КЛИЕНТ СПРАШИВАЕТ: 'а к Ляззат можно? она же по волосам?'\n"
        masters_text += "ПРОВЕРЬ СПИСОК ВЫШЕ! Если Ляззат делает только Nails - ИСПРАВЬ клиента!\n"
        masters_text += "НЕ СОГЛАШАЙСЯ с неправильными утверждениями - ПРОВЕРЯЙ ФАКТЫ!\n"

        return masters_text


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
        """#2 - Память о предпочтениях + #10 - Upsell"""
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

        # ✅ #10 - UPSELL: Проверяем давно ли был на педикюре
        instagram_id = preferences.get('instagram_id', '')
        if instagram_id:
            last_pedicure_date = get_last_service_date(instagram_id, 'Pedicure')
            if last_pedicure_date:
                try:
                    last_date = datetime.fromisoformat(last_pedicure_date)
                    days_ago = (datetime.now() - last_date).days
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
Ты: "Добрый день! Конечно помогу с выбором. У нас есть несколько вариантов маникюра..."
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
                            # Перманентный макияж - уточняем где именно
                            if any(word in msg_lower for word in ['перманент', 'permanent']):
                                if any(word in msg_lower for word in ['брови', 'бров', 'brow', 'حواجب']):
                                    service_name = 'Brows'
                                    break
                                elif any(word in msg_lower for word in ['губ', 'lips', 'شفاه']):
                                    service_name = 'Makeup'
                                    break
                                elif any(word in msg_lower for word in ['рес', 'век', 'стрел', 'lash', 'eyeliner', 'رموش']):
                                    service_name = 'Lashes'
                                    break
                                else:
                                    # Если просто "перманент" без уточнения - уточняем
                                    service_name = 'Makeup'  # fallback на макияж
                                    break
                            elif any(word in msg_lower for word in ['макияж', 'makeup', 'مكياج']):
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
                            # ✅ РАСШИРЕННЫЙ СПИСОК для волос - включая кератин, ботокс и т.д.
                            elif any(word in msg_lower for word in [
                                'волос', 'стрижка', 'стриж', 'hair', 'cut', 'شعر',
                                'парикмахер', 'stylist', 'окраш', 'краск', 'color',
                                'кератин', 'keratin', 'кератинов',  # ✅ КЕРАТИН
                                'ботокс', 'botox', 'ботоксом',
                                'уход за волос', 'care', 'hair care',
                                'лечение', 'treatment',
                                'выпрямление', 'straightening', 'выпрямл',
                                'восстановление', 'restore', 'восстанов'
                            ]):
                                service_name = 'Hair'
                                break

        instructions = self.bot_settings.get(
            'booking_availability_instructions', '')

        if not service_name:
            conn.close()
            return f"""=== ❓ УТОЧНИ УСЛУГУ ===
{instructions}"""

        # ✅ КРИТИЧНО: Если есть username - используем его как имя, НЕ спрашиваем отдельно!
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

            # Добавляем явную инструкцию НЕ спрашивать имя
            additional_instruction = f"\n\n⚠️ У КЛИЕНТА УЖЕ ЕСТЬ ИМЯ (из Instagram) - НЕ СПРАШИВАЙ ИМЯ! Для записи нужен только WhatsApp."
            instructions = additional_instruction + "\n" + instructions

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

        if not service_row:
            conn.close()

            if 'makeup' in service_name.lower() or 'макияж' in service_name.lower():
                return """=== 💄 УТОЧНЕНИЕ ===
У нас только перманентный макияж 😊
Интересуют брови или губы?
Или интересует что-то другое?"""

            # ✅ Умный поиск похожих услуг
            if service_name == 'Hair':
                # Показываем все услуги категории Hair
                c_temp = sqlite3.connect(DATABASE_NAME)
                c_temp.execute("""
                    SELECT name_ru, price, currency
                    FROM services
                    WHERE category = 'Hair' AND is_active = 1
                """)
                hair_services = c_temp.fetchall()
                c_temp.close()

                if hair_services:
                    services_text = "\n".join([f"• {s[0]} - {s[1]} {s[2]}" for s in hair_services])
                    return f"""=== 💇 УСЛУГИ ПО ВОЛОСАМ ===
У нас есть:
{services_text}

Что вас интересует?"""

            return f"""=== 🤔 УТОЧНЕНИЕ ===
{service_name} не нашла в списке
Может маникюр, педикюр, стрижка, массаж?"""

        service_id = service_row[0]
        employees = get_employees_by_service(service_id)

        if not employees:
            conn.close()
            return f"⚠️ Нет мастеров для услуги '{service_name}'"

        # ✅ #10 - UPSELL: Проверяем давно ли был на других услугах

        # Определяем дату
        if preferred_date:
            target_date = preferred_date
        else:
            # Умная логика выбора даты
            now = datetime.now()
            current_hour = now.hour

            # Если еще есть время сегодня (до 18:00) и можно успеть записаться (минимум +2 часа)
            # то предлагаем сегодня, иначе завтра
            if current_hour < 18 and (current_hour + 2) < 21:
                target_date = now.strftime("%Y-%m-%d")
            else:
                target_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        try:
            date_obj = datetime.strptime(target_date, "%Y-%m-%d")
            date_display = date_obj.strftime("%d.%m (%A)")
        except:
            date_display = target_date

        # ✅ #9 - Популярное время
        popular_times = get_popular_booking_times(service_name)
        popular_times_text = f"\nБольшинство клиентов выбирают: {', '.join(popular_times)}" if popular_times else ""

        availability_text = f"""=== 📅 ЗАПИСЬ НА {service_name.upper()} ===

        🎯 ДОСТУПНЫЕ МАСТЕРА НА {date_display}:
        """
        
        # ✅ #2 - Если есть любимый мастер - покажи его первым
        if preferences.get('favorite_master'):
            availability_text += f"⭐ Ваш любимый мастер {preferences['favorite_master']} доступен!\n\n"

        # ✅ ИСПОЛЬЗУЕМ РЕАЛЬНЫЙ КАЛЕНДАРЬ вместо примерных слотов
        # ⚠️ ВСЁ ВРЕМЯ БЕРЁТСЯ ИЗ БД - НЕ ПРИДУМЫВАЙ ВРЕМЯ НАУГАД!
        for emp in employees[:5]:
            emp_id = emp[0]
            # ✅ emp[1] = full_name из get_employees_by_service()
            emp_name = emp[1] if len(emp) > 1 else "Мастер"

            # ✅ УНИВЕРСАЛЬНАЯ ТРАНСЛИТЕРАЦИЯ вместо ручных переводов
            from utils.transliteration import transliterate_name
            emp_name_display = transliterate_name(str(emp_name), client_language)

            # ✅ ПОЛУЧАЕМ РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ ИЗ КАЛЕНДАРЯ БД
            try:
                # Получаем расписание мастера на этот день
                target_dt = datetime.strptime(target_date, "%Y-%m-%d")
                day_of_week = target_dt.weekday()

                c.execute("""
                    SELECT start_time, end_time
                    FROM employee_schedule
                    WHERE employee_id = ? AND day_of_week = ? AND is_active = 1
                """, (emp_id, day_of_week))

                schedule_row = c.fetchone()
                if not schedule_row:
                    continue  # Не работает в этот день

                start_time_str, end_time_str = schedule_row

                # Получаем уже занятые слоты (поддерживаем employee_id и master)
                c.execute("""
                    SELECT datetime
                    FROM bookings
                    WHERE (employee_id = ? OR master = ?)
                    AND DATE(datetime) = ?
                    AND status != 'cancelled'
                """, (emp_id, emp_name, target_date))

                booked_times = set()
                for booking_row in c.fetchall():
                    dt_str = booking_row[0]
                    time_part = dt_str.split(' ')[1] if ' ' in dt_str else dt_str
                    booked_times.add(time_part[:5])  # HH:MM

                # Генерируем свободные слоты
                from datetime import time as dt_time
                start_hour, start_minute = map(int, start_time_str.split(':'))
                end_hour, end_minute = map(int, end_time_str.split(':'))

                start_dt = datetime.combine(target_dt.date(), dt_time(start_hour, start_minute))
                end_dt = datetime.combine(target_dt.date(), dt_time(end_hour, end_minute))

                now = datetime.now()
                current_hour = now.hour
                is_today = target_date == now.strftime("%Y-%m-%d")

                all_slots = []
                current_slot = start_dt

                while current_slot < end_dt:
                    time_str = current_slot.strftime('%H:%M')

                    # Проверяем что слот свободен
                    if time_str not in booked_times:
                        hour = int(time_str.split(':')[0])

                        # Если сегодня - пропускаем прошедшие слоты
                        if is_today and hour <= current_hour + 2:
                            current_slot += timedelta(hours=1)
                            continue

                        # Фильтр по предпочтению времени
                        if time_preference:
                            pref_start, pref_end = time_preference
                            if hour < pref_start or hour > pref_end:
                                current_slot += timedelta(hours=1)
                                continue

                        all_slots.append(time_str)

                        if len(all_slots) >= 3:
                            break

                    current_slot += timedelta(hours=1)

                # Показываем только если есть свободные слоты
                if all_slots:
                    availability_text += f"• {emp_name_display.upper()}: {', '.join(all_slots)}\n"

            except Exception as e:
                # Fallback если не удалось получить слоты
                print(f"⚠️ Error getting slots for {emp_name}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # ✅ #14 - Альтернативы если время не подходит
        availability_text += f"\n\n{instructions}"

        # ⚠️ ВАЖНАЯ ИНСТРУКЦИЯ ДЛЯ БОТА
        availability_text += f"""

⚠️⚠️⚠️ КРИТИЧНО - ЧИТАЙ ВНИМАТЕЛЬНО! ⚠️⚠️⚠️

ВРЕМЯ ВЫШЕ - ЭТО РЕАЛЬНЫЕ СВОБОДНЫЕ СЛОТЫ ИЗ КАЛЕНДАРЯ БД!

❌ НЕ ГОВОРИ "все занято" ЕСЛИ ВЫШЕ ЕСТЬ СВОБОДНЫЕ СЛОТЫ!
❌ НЕ ПРЕДЛАГАЙ ВРЕМЯ КОТОРОГО НЕТ В СПИСКЕ ВЫШЕ!
✅ ПРЕДЛАГАЙ ТОЛЬКО ТО ВРЕМЯ КОТОРОЕ УКАЗАНО ВЫШЕ!

Если клиент просит конкретное время (например "16:00"):
1. ПОСМОТРИ в список выше - есть ли 16:00?
2. Если ЕСТЬ - предложи это время
3. Если НЕТ - скажи что это время занято и предложи ближайшие доступные слоты из списка выше

НЕ ПРИДУМЫВАЙ ВРЕМЯ - ТОЛЬКО ИЗ СПИСКА ВЫШЕ!"""

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
            # ✅ ПРОВЕРЯЕМ что мастер существует в БД
            conn2 = sqlite3.connect(DATABASE_NAME)
            c2 = conn2.cursor()
            c2.execute("SELECT COUNT(*) FROM employees WHERE full_name = ? AND is_active = 1", (master,))
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
