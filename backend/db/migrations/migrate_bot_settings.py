from typing import Optional
from config import DATABASE_NAME
import sqlite3
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


INSTRUCTIONS_FILE = "bot/bot_instructions_file.txt"
# ===== ДЕФОЛТНЫЕ ЗНАЧЕНИЯ =====
DEFAULT_SETTINGS = {
    "bot_name": "M.Le Diamant Assistant",
    "personality_traits": "Профессионал с международным опытом. Уверенный, харизматичный, НЕ навязчивый. Пишу коротко: 1-3 предложения максимум. Натурально, без искусственности.",
    "greeting_message": "Привет! 😊 Добро пожаловать в M.Le Diamant!",
    "farewell_message": "Спасибо! До встречи! 💖",
    "price_explanation": "Мы в премиум-сегменте 💎",
    "communication_style": "Короткий: 1-3 предложения\nНатурально\nСмайлики минимум (1-2)",
    "max_message_chars": 300,
    "emoji_usage": "минимум (1-2 на сообщение)",
    "languages_supported": "ru,en,ar",

    # ===== ЦЕНЫ И ПРОДАЖИ =====
    "price_response_template": "[Услуга] [цена] AED 💎\n[Что входит/результат в 1 строку]\nЗаписаться?",

    "premium_justification": """Это работает потому что:
- Используем материалы из США/Европы (не китайские аналоги)
- Мастера с международными сертификатами
- Стерильность на уровне медклиники
- Гарантия результата до 2 лет
- Топ-1 по отзывам в JBR""",

    "fomo_messages": "Сегодня только 2 окна|Завтра уже заполнено|Этот мастер расписан на месяц|Акция до конца недели",

    "upsell_techniques": "С педикюром будет комплект|Многие берут сразу курс из 3х|Можно добавить уход|Советую взять с массажем",

    "booking_redirect_message": """Отлично! Для записи нужно:
- Имя
- WhatsApp номер

Как вас зовут?""",

    # ===== ВОЗРАЖЕНИЯ =====
    "objection_expensive": """Понимаю, цена выше среднего.

Но мы НЕ масс-маркет 💎

Используем материалы из США (CND, OPI). Мастера обучались в Европе. Стерильность как в медклинике.

Результат держится в 2 раза дольше. По факту выгоднее чем переделывать каждые 2 недели.

У нас 500+ постоянных клиентов которые ценят качество. Записаться?""",

    "objection_think_about_it": """Конечно! Это правильно взвесить решение.

Пока думаете — могу показать отзывы клиентов?
Или портфолио мастеров в Instagram Highlights.

P.S. Окна на этой неделе почти заполнены. Если передумаете — сразу пишите, найдём время 😊""",

    "objection_no_time": """Вы удивитесь, но это один из самых быстрых способов выглядеть отлично!

Gelish маникюр — 60 минут.
Держится 3 недели без коррекции.

= Экономите 2+ часа в месяц vs обычный лак

Работаем до 21:00, можно после работы. Записать?""",

    "objection_pain": """Отличный вопрос!

Используем САМЫЕ тонкие иглы (премиум класс). Наносим обезболивающий крем.

Клиенты говорят: "Ожидала хуже, терпимо". Многие даже засыпают 😊

Мастер работает аккуратно. Если нужен перерыв — скажете.

Попробуете?""",

    "objection_result_doubt": """Понимаю сомнения!

У нас 5⭐ рейтинг и 200+ отзывов в Google/Instagram.

Даём ГАРАНТИЮ на работу. Если что-то не устроит в первые 7 дней — бесплатно исправим.

Мастер покажет примеры работ до записи. Обсудите детально что хотите.

Запишемся на консультацию сначала?""",

    "objection_cheaper_elsewhere": """Да, есть и дешевле.

НО:
❌ Китайские материалы (аллергия, быстро слезает)
❌ Нестерильные инструменты (грибок, инфекции)
❌ Без опыта мастера (испортят и придётся переделывать дороже)

Мы — премиум 💎
✅ США/Европа материалы
✅ Автоклав (медицинская стерильность)  
✅ 500+ довольных клиентов

Лучше 1 раз качественно, чем 3 раза переделывать. Согласны?""",

    "objection_too_far": """JBR — самый удобный район!

📍 5 минут от метро DMCC
🚗 Бесплатная парковка
🏖️ Рядом пляж и The Walk

Многие совмещают:
Маникюр → прогулка по набережной → кофе в Marina Mall

Превращайте рутину в отдых 😊

К тому же результат держится 3 недели = ездить реже.

Записать?""",

    "objection_consult_husband": """Конечно! Это важное решение.

Покажите мужу наш Instagram — там реальные фото работ.
Или отзывы клиентов.

Кстати, у нас много клиентов приходят парами — пока жена на процедуре, муж может погулять по Marina 😊

Окна на этой неделе заполняются быстро. Как решите — сразу пишите!""",

    "objection_first_time": """Отлично что решились попробовать! 🎉

Для первого раза это идеально:
✅ Мастер объяснит каждый шаг  
✅ Можете задать любые вопросы
✅ Начнём с чего-то простого

95% клиентов после первого раза становятся постоянными.

Начнём с консультации? Мастер покажет примеры и подберёт что подойдёт именно вам.""",

    "objection_not_happy": """Полностью понимаю опасения!

У нас ГАРАНТИЯ:
Если в первые 7 дней что-то не устроит — БЕСПЛАТНО переделаем или вернём деньги.

Перед процедурой мастер:
1. Покажет примеры работ
2. Обсудит детально ваши пожелания  
3. Подберёт идеальный вариант

За 3 года НИ ОДНОГО случая возврата денег. Все остаются довольны 😊

Рискнём?""",

    # ===== ПРОЧЕЕ =====
    "emotional_triggers": "Красота | Уверенность | Роскошь | Стиль | Престиж | Статус",
    "social_proof_phrases": "500+ довольных клиентов | Топ-1 в JBR | 5⭐ отзывы | Рекомендуют друзьям",
    "voice_message_response": "Я AI, не слушаю голосовые 😊 Напишите текстом!",
    "ad_campaign_detection": "Мы используем таргетированную рекламу в Instagram/Facebook для продвижения наших услуг в Dubai. Если не хотите получать наши сообщения - дайте знать, удалим из базы.",
    "pre_booking_data_collection": "Для записи нужно имя и WhatsApp — это займет секунду! 😊",
    
    "booking_time_logic": """🎯 ЛОГИКА ВЫБОРА ВРЕМЕНИ:

A) Проверь пожелания клиента:
   - Указал дату? → предлагай эту дату
   - Указал время? → предлагай это время
   - Указал мастера? → смотри когда этот мастер работает
   - Указал часть дня ("после обеда", "утром")? → фильтруй по времени

B) Проверь историю клиента:
   - В какое время обычно записывался
   - В какой день недели
   - К какому мастеру ходил

C) Анализируй текущее время:
   - Клиент пишет утром → НЕ предлагай через час (не успеет)
   - Предлагай через 3-4 часа минимум ИЛИ на другие дни
   - Исключение: клиент сам пишет "хочу сейчас прийти"

D) Предлагай КОНКРЕТНОЕ время:
   ❌ "Когда вам удобно?"
   ❌ "Какое время интересно?"
   ✅ "Есть завтра в 15:00 у Дианы или послезавтра в 11:00 у Натальи. Что подходит?"
   ✅ "Ближайшее окно — сегодня в 17:00 у Марии. Успеете?"

E) Если хочет к конкретному мастеру:
   "Динара работает 25го в 14:00 и 16:30, 26го в 11:00 и 15:00. Какое время?"

F) Если НЕ подошло предложенное время:
   "Тогда есть [день] в [время] у [мастер]. Подойдет?"
   → Предлагай следующие 2-3 варианта

G) 🧠 ВКЛЮЧАЙ СМЕКАЛКУ - НЕ СДАВАЙСЯ!
   → Дата важна? → предложи другого мастера
   → Мастер важен? → предложи другую дату
   → Запись далеко? → предложи другую процедуру сейчас
   
💡 КЛИЕНТЫ ГОТОВЫ ЖДАТЬ И ИДТИ НА КОМПРОМИСС — ГЛАВНОЕ ПОКАЗАТЬ ЧТО ТЫ СТАРАЕШЬСЯ ПОМОЧЬ!""",

    "booking_data_collection": """Отлично! Для записи нужно:
- Имя
- WhatsApp номер

Как вас зовут?

После получения имени:
"Спасибо, [Имя]! WhatsApp номер?"

Затем предлагай конкретное время из расписания.""",

    "booking_availability_instructions": """🎯 ЛОГИКА ПОКАЗА МАСТЕРОВ:

1️⃣ ЕСЛИ УСЛУГА НЕ ОПРЕДЕЛЕНА:
Клиент спрашивает про запись, но НЕ указал услугу.

ОБЯЗАТЕЛЬНО СПРОСИ:
"Какая услуга вас интересует?
- Маникюр 💅
- Педикюр 🦶
- Стрижка/Окрашивание волос ✂️
- Массаж 💆
- Другое?"

⚠️ НЕ показывай всех мастеров подряд!
⚠️ НЕ начинай сбор данных!

2️⃣ ЕСЛИ УСЛУГА ОПРЕДЕЛЕНА:
Покажи ТОЛЬКО мастеров этой услуги с КОНКРЕТНЫМ временем.

ПРАВИЛЬНЫЙ ФОРМАТ:
"На [дата] по [услуга] есть:
- [Имя мастера]: 11:00, 14:00, 17:00
- [Имя мастера]: 10:00, 15:00, 18:30

Какое время подходит?"

3️⃣ КРИТИЧЕСКИ ВАЖНО:
❌ НЕ пиши "Для записи нужны имя и WhatsApp" - РАНО!
❌ НЕ показывай мастеров других услуг!
✅ Дождись когда клиент ВЫБЕРЕТ время, ПОТОМ начинай сбор данных!

💡 Имена мастеров показывай на языке клиента (если есть перевод в БД)""",

    "safety_guidelines": """🚨 НЕ ПРИДУМЫВАЙ:
- Скидки, акции, специальные цены
- Даты и время записи
- Информацию которой нет в базе данных
→ Если в БД нет активных спецпакетов = акций НЕТ!

⚠️ НДС 5%:
- Все цены БЕЗ НДС
- Упоминай НДС ТОЛЬКО если клиент спрашивает финальную стоимость
- Формула: "1000 AED + 5% НДС = 1050 AED итого"

🔒 ТАРГЕТИРОВАННАЯ РЕКЛАМА:
- Если клиент спрашивает "откуда у вас мой номер" или "как вы меня нашли"
- Ответ: "Мы используем таргетированную рекламу в Instagram/Facebook для продвижения наших услуг в Dubai. Если не хотите получать наши сообщения - дайте знать, удалим из базы"
- НЕ извиняйся, это нормальная практика""",

    "example_good_responses": "Manicure Gel 130 AED 💅\nДержится 3 недели\nЗаписаться?",
    "algorithm_actions": "1. Узнать услугу\n2. Назвать цену\n3. Предложить запись",
    "location_features": "JBR - престижный район\n5 минут от пляжа\nМетро DMCC",
    "seasonality": "Лето: акцент на педикюр\nЗима: уход за кожей",
    "emergency_situations": "При жалобе → контакт менеджера",
    "success_metrics": "Конверсия в запись >30%\nВремя ответа <2 мин",
    "personalization_rules": "Обращаться по имени\nУчитывать историю записей",
    "emotional_responses": "😊 Радость\n💖 Забота\n✨ Вдохновение",
    "anti_patterns": "❌ Не извиняться без причины\n❌ Не давить\n❌ Не придумывать скидки",
    "contextual_rules": "Учитывать время суток\nУчитывать язык клиента",
    "example_dialogues": "",
    "objection_handling": "",
    "negative_handling": "",
    "auto_cancel_discounts": "Не предлагай скидки и специальные предложения автоматически. Предлагай их только если клиент явно интересуется скидками.",
    "comment_reply_settings": "{}",
    "manager_consultation_prompt": "",
}


def extract_quotes(text: str) -> list:
    """Извлечь фразы в кавычках"""
    return re.findall(r'"([^"]*)"', text)


def extract_objection(content: str, objection_keyword: str) -> str:
    """Извлечь конкретное возражение - только ответ бота"""

    pattern = rf'\*\*ВОЗРАЖЕНИЕ.*?{re.escape(objection_keyword)}.*?\*\*'
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)

    if not match:
        return ""

    start_pos = match.end()

    genius_pattern = r'✅\s*ГЕНИАЛЬНО:\s*\n'
    genius_match = re.search(genius_pattern, content[start_pos:])

    if not genius_match:
        return ""

    answer_start = start_pos + genius_match.end()
    rest_content = content[answer_start:]

    end_patterns = [
        r'\n\n\*\*ВОЗРАЖЕНИЕ',
        r'\n---',
        r'\n\n\[',
        r'\n\n#',
    ]

    end_pos = len(rest_content)
    for pattern in end_patterns:
        match = re.search(pattern, rest_content)
        if match and match.start() < end_pos:
            end_pos = match.start()

    response = rest_content[:end_pos].strip()

    # ✅ УБИРАЕМ ДУБЛИКАТЫ
    lines = []
    seen_genialnos = 0
    for line in response.split('\n'):
        line_stripped = line.strip()

        # Пропускаем лишние "✅ ГЕНИАЛЬНО:"
        if line_stripped.startswith('✅ ГЕНИАЛЬНО:'):
            seen_genialnos += 1
            if seen_genialnos > 1:
                continue

        if line_stripped.startswith('❌'):
            continue
        if line_stripped.startswith('**ВОЗРАЖЕНИЕ'):
            break
        lines.append(line)

    response = '\n'.join(lines).strip()

    # ✅ Увеличиваем лимит до 2000
    if len(response) > 2000:
        response = response[:1997] + '...'

    return response


def parse_section(content: str, section_name: str, next_section: Optional[str] = None) -> str:
    """Извлечь текст между секциями"""
    try:
        start = content.find(f'[{section_name}]')
        if start == -1:
            start = content.find(section_name)
        if start == -1:
            return ""

        if next_section:
            end = content.find(f'[{next_section}]', start)
            if end == -1:
                end = content.find(next_section, start)
        else:
            end = len(content)

        if end == -1:
            end = len(content)

        text = content[start:end].strip()

        # Убираем заголовок секции
        lines = text.split('\n')
        if lines and lines[0].startswith('['):
            lines = lines[1:]

        return '\n'.join(lines).strip()
    except:
        return ""

# В функции parse_instructions_file() ЗАМЕНИ блок парсинга:


def parse_instructions_file() -> dict:
    """ПОЛНЫЙ парсинг файла"""

    if not os.path.exists(INSTRUCTIONS_FILE):
        print(f"⚠️  Файл {INSTRUCTIONS_FILE} не найден!")
        return DEFAULT_SETTINGS.copy()

    print(f"📖 Читаю {INSTRUCTIONS_FILE}...")

    with open(INSTRUCTIONS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    settings = DEFAULT_SETTINGS.copy()

    # ✅ ПАРСИМ СЕКЦИИ ЦЕЛИКОМ

    # 1. Имя бота
    settings['bot_name'] = "M.Le Diamant Assistant"

    # 2. Личность
    personality_section = parse_section(
        content, '[ЛИЧНОСТЬ]', '[КРИТИЧЕСКИЕ ПРАВИЛА]')
    if personality_section:
        settings['personality_traits'] = personality_section

    # 3. Критические правила
    critical_section = parse_section(
        content, '[КРИТИЧЕСКИЕ ПРАВИЛА]', '[ПРИВЕТСТВИЕ]')
    settings['safety_guidelines'] = critical_section if critical_section else ''

    # 4. Приветствие
    greeting_section = parse_section(
        content, '[ПРИВЕТСТВИЕ]', '[СТРУКТУРА ОТВЕТА О ЦЕНЕ]')
    settings['greeting_message'] = "Привет! 😊 Добро пожаловать в M.Le Diamant!"

    # 5. Смайлики - ПРАВИЛЬНЫЙ ПАРСИНГ
    emoji_match = re.search(r'Смайлики[^\n]*минимум[^(]*\(([^)]+)\)', content)
    if emoji_match:
        settings['emoji_usage'] = f"минимум ({emoji_match.group(1).strip()})"

    # 6. Структура ответа о цене
    price_section = parse_section(
        content, '[СТРУКТУРА ОТВЕТА О ЦЕНЕ]', '[ЗАПИСЬ')
    if price_section:
        # Разбиваем на части
        parts = price_section.split('📊 КОРОТКИЙ ФОРМАТ')
        if len(parts) > 1:
            template_text = parts[1].split('📊 ПРАВИЛА ЦЕН')[
                0] if '📊 ПРАВИЛА ЦЕН' in parts[1] else parts[1]
            settings['price_response_template'] = template_text.strip()
    # 6.5. Логика записи и предложения времени
    # 6.5. Логика записи и предложения времени - БЕРЕМ ИЗ ФАЙЛА
    # Ищем секцию с 3️⃣ ПРЕДЛОЖЕНИЕ ВРЕМЕНИ
    time_logic_match = re.search(
        r'3️⃣\s*\*\*ПРЕДЛОЖЕНИЕ ВРЕМЕНИ:\*\*(.*?)(?=4️⃣|\[АКЦИИ)', content, re.DOTALL)
    if time_logic_match:
        time_logic = time_logic_match.group(1).strip()
        settings['booking_time_logic'] = time_logic[:3000]  # Увеличил лимит
        print(
            f"   ✅ Извлечена логика предложения времени ({len(time_logic)} символов)")
    else:
        # Если не нашли - используем из DEFAULT_SETTINGS
        print(f"   ⚠️  Логика времени не найдена в файле, использую дефолт")

    # Ищем секцию 1️⃣ Сбор данных
    booking_data_match = re.search(
        r'1️⃣\s*\*\*Сбор данных:\*\*(.*?)(?=2️⃣|3️⃣)', content, re.DOTALL)
    if booking_data_match:
        booking_data = booking_data_match.group(1).strip()
        settings['booking_data_collection'] = booking_data[:1000]
        print(
            f"   ✅ Извлечен алгоритм сбора данных ({len(booking_data)} символов)")
    else:
        print(f"   ⚠️  Алгоритм сбора данных не найден, использую дефолт")
    # 7. Premium обоснование
    premium_match = re.search(
        r'Это сработает потому что[^:]*:(.*?)(?=\[|$)', content, re.DOTALL)
    if premium_match:
        lines = [l.strip() for l in premium_match.group(1).strip().split(
            '\n') if l.strip() and not l.startswith('[')]
        settings['premium_justification'] = '\n'.join(
            lines[:5])  # Первые 5 строк

    # 8. Возражения - используем существующую функцию
    objections = {
        'objection_expensive': 'дорого',
        'objection_think_about_it': 'подумаю',
        'objection_no_time': 'нет времени',
        'objection_pain': 'боль',
        'objection_result_doubt': 'результат',
        'objection_cheaper_elsewhere': 'дешевле',
        'objection_too_far': 'далеко',
        'objection_consult_husband': 'муж',
        'objection_first_time': 'первый раз',
        'objection_not_happy': 'не понрав'
    }

    for key, keyword in objections.items():
        extracted = extract_objection_v2(content, keyword)
        # Проверка что нашли нормальный текст
        if extracted and len(extracted) > 50:
            settings[key] = extracted
        else:
            # Используем дефолт из DEFAULT_SETTINGS
            settings[key] = DEFAULT_SETTINGS.get(key, '')
            print(
                f"   ⚠️  Возражение '{keyword}' не найдено, использую дефолт")

    # 9. Эмоциональные триггеры
    emotional_section = parse_section(content, '[КОРОТКИЕ ОТВЕТЫ]', '[ЯЗЫКИ]')
    if emotional_section:
        settings['emotional_triggers'] = "Красота | Уверенность | Роскошь | Стиль | Престиж"
    language_section = parse_section(content, '[ЯЗЫКИ]', '[НЕГАТИВ]')
    if language_section and 'русский' in language_section.lower():
        # Если секция есть, оставляем дефолт
        pass

    # 10. Социальное доказательство
    settings['social_proof_phrases'] = "500+ довольных клиентов | Топ-1 в JBR | 5⭐ отзывы"
    if 'languages_supported' not in settings:
        settings['languages_supported'] = 'ru,en,ar'
    # 11. FOMO сообщения
    fomo_match = re.search(r'FOMO[^\n]*\n([^\[]+)', content)
    if fomo_match:
        settings['fomo_messages'] = fomo_match.group(1).strip()

    # 12. Upsell техники
    upsell_match = re.search(r'UPSELL[^\n]*\n([^\[]+)', content)
    if upsell_match:
        settings['upsell_techniques'] = upsell_match.group(1).strip()

    # 13. Остальные поля из DEFAULT_SETTINGS
    settings[
        'communication_style'] = "Короткий: 1-3 предложения\nНатурально\nСмайлики минимум (1-2)"

    # ✅ ГАРАНТИРОВАННО БЕРЕМ ИЗ DEFAULT_SETTINGS

    if 'booking_data_collection' not in settings or not settings.get('booking_data_collection'):
        settings['booking_data_collection'] = DEFAULT_SETTINGS['booking_data_collection']
        print(f"   ✅ Использую booking_data_collection из DEFAULT_SETTINGS")
    else:
        print(
            f"   ✅ booking_data_collection найдена в файле ({len(settings['booking_data_collection'])} символов)")

    if 'booking_time_logic' not in settings:
        settings['booking_time_logic'] = """A) Проверь пожелания клиента
        B) Проверь историю клиента
        C) Анализируй текущее время
        D) Предлагай КОНКРЕТНОЕ время
        E) Если хочет к конкретному мастеру
        F) Если НЕ подошло предложенное время
        G) ВКЛЮЧАЙ СМЕКАЛКУ - НЕ СДАВАЙСЯ!
        H) ЗОЛОТОЕ ПРАВИЛО"""
    settings['personalization_rules'] = "Обращаться по имени\nУчитывать историю записей"
    settings['emotional_responses'] = "😊 Радость\n💖 Забота\n✨ Вдохновение"
    settings['anti_patterns'] = "❌ Не извиняться без причины\n❌ Не давить\n❌ Не придумывать скидки"
    settings['voice_message_response'] = "Я AI, не слушаю голосовые 😊 Напишите текстом!"
    settings['contextual_rules'] = "Учитывать время суток\nУчитывать язык клиента"
    settings['example_good_responses'] = "Manicure Gel 130 AED 💅\nДержится 3 недели\nЗаписаться?"
    settings['algorithm_actions'] = "1. Узнать услугу\n2. Назвать цену\n3. Предложить запись"
    settings['location_features'] = "JBR - престижный район\n5 минут от пляжа\nМетро DMCC"
    settings['seasonality'] = "Лето: акцент на педикюр\nЗима: уход за кожей"
    settings['emergency_situations'] = "При жалобе → контакт менеджера"
    settings['success_metrics'] = "Конверсия в запись >30%\nВремя ответа <2 мин"
    settings['ad_campaign_detection'] = 'Если спросят "откуда номер" → "Таргетированная реклама в Instagram"'
    settings['pre_booking_data_collection'] = "Для записи нужно имя и WhatsApp — секунду! 😊"

    print(
        f"✅ Извлечено {len([v for v in settings.values() if v])} заполненных полей")
    required_fields = {
        'languages_supported': 'ru,en,ar',
        'max_message_chars': 300,
        'emoji_usage': 'минимум (1-2 на сообщение)',
    }

    for field, default_value in required_fields.items():
        if field not in settings or not settings[field]:
            settings[field] = default_value
            print(f"   ⚠️  Добавлено дефолтное значение для {field}")

    print(
        f"✅ Извлечено {len([v for v in settings.values() if v])} заполненных полей")

    if 'booking_availability_instructions' not in settings:
        settings['booking_availability_instructions'] = DEFAULT_SETTINGS['booking_availability_instructions']

    return settings


def extract_objection_improved(content: str, keyword: str) -> str:
    """УЛУЧШЕННАЯ версия извлечения возражений"""
    try:
        # Ищем блок возражения
        pattern = rf'ВОЗРАЖЕНИЕ.*?{re.escape(keyword)}.*?✅\s*ГЕНИАЛЬНО:\s*\n(.*?)(?=\*\*ВОЗРАЖЕНИЕ|\[|$)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)

        if match:
            response = match.group(1).strip()

            # Убираем лишние маркеры
            response = re.sub(r'❌.*?\n', '', response)
            response = re.sub(r'✅ ГЕНИАЛЬНО:', '', response)

            # Убираем пустые строки
            lines = [line for line in response.split('\n') if line.strip()]
            response = '\n'.join(lines)

            # Ограничиваем длину
            if len(response) > 2000:
                response = response[:1997] + '...'

            return response
        else:
            print(f"⚠️  Возражение '{keyword}' не найдено")
            return ""
    except Exception as e:
        print(f"⚠️  Ошибка парсинга возражения '{keyword}': {e}")
        return ""


def extract_objection_v2(content: str, keyword: str) -> str:
    """НОВАЯ версия - более надежная"""
    try:
        # Ищем возражение по ключевому слову
        pattern = rf'ВОЗРАЖЕНИЕ.*?{re.escape(keyword)}.*?✅ ГЕНИАЛЬНО:(.*?)(?=\*\*ВОЗРАЖЕНИЕ|$)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)

        if match:
            response = match.group(1).strip()
            # Убираем лишние пустые строки
            response = '\n'.join(
                line for line in response.split('\n') if line.strip())
            # Ограничиваем длину
            if len(response) > 2000:
                response = response[:1997] + '...'
            return response
    except Exception as e:
        print(f"⚠️  Ошибка парсинга возражения '{keyword}': {e}")

    return ""


def create_tables(conn):
    """Создать таблицы"""
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        address TEXT,
        google_maps TEXT,
        hours TEXT,
        hours_ru TEXT,
        hours_ar TEXT,
        booking_url TEXT,
        phone TEXT,
        bot_name TEXT,
        city TEXT DEFAULT 'Dubai',
        country TEXT DEFAULT 'UAE',
        timezone TEXT DEFAULT 'Asia/Dubai',
        currency TEXT DEFAULT 'AED',
        updated_at TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS bot_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bot_name TEXT NOT NULL,
        personality_traits TEXT,
        greeting_message TEXT,
        farewell_message TEXT,
        price_explanation TEXT,
        price_response_template TEXT,
        premium_justification TEXT,
        booking_redirect_message TEXT,
        fomo_messages TEXT,
        upsell_techniques TEXT,
        communication_style TEXT,
        max_message_chars INTEGER DEFAULT 300,
        emoji_usage TEXT,
        languages_supported TEXT DEFAULT 'ru,en,ar',
        objection_handling TEXT,
        negative_handling TEXT,
        safety_guidelines TEXT,
        example_good_responses TEXT,
        algorithm_actions TEXT,
        location_features TEXT,
        seasonality TEXT,
        emergency_situations TEXT,
        success_metrics TEXT,
        objection_expensive TEXT,
        objection_think_about_it TEXT,
        objection_no_time TEXT,
        objection_pain TEXT,
        objection_result_doubt TEXT,
        objection_cheaper_elsewhere TEXT,
        objection_too_far TEXT,
        objection_consult_husband TEXT,
        objection_first_time TEXT,
        objection_not_happy TEXT,
        emotional_triggers TEXT,
        social_proof_phrases TEXT,
        personalization_rules TEXT,
        example_dialogues TEXT,
        emotional_responses TEXT,
        anti_patterns TEXT,
        voice_message_response TEXT,
        contextual_rules TEXT,
        ad_campaign_detection TEXT DEFAULT '',
        pre_booking_data_collection TEXT DEFAULT 'Для записи нужно имя и WhatsApp — это займет секунду! 😊',
        manager_consultation_prompt TEXT,
        booking_time_logic TEXT,
        booking_data_collection TEXT,
        booking_availability_instructions TEXT,
        updated_at TEXT
    )''')

    # ✅ ДОБАВЛЯЕМ ПРОВЕРКУ И СОЗДАНИЕ КОЛОНКИ max_message_chars
    try:
        c.execute("PRAGMA table_info(bot_settings)")
        columns = [row[1] for row in c.fetchall()]

        if 'max_message_chars' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN max_message_chars INTEGER DEFAULT 300")
            print("✅ Добавлено поле max_message_chars")
            conn.commit()

        if 'ad_campaign_detection' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN ad_campaign_detection TEXT DEFAULT ''")
            print("✅ Добавлена колонка ad_campaign_detection")
            conn.commit()

        if 'pre_booking_data_collection' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN pre_booking_data_collection TEXT DEFAULT 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'")
            print("✅ Добавлена колонка pre_booking_data_collection")
            conn.commit()

        if 'manager_consultation_prompt' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN manager_consultation_prompt TEXT")
            print("✅ Добавлена колонка manager_consultation_prompt")
            conn.commit()
        if 'booking_time_logic' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN booking_time_logic TEXT")
            print("✅ Добавлена колонка booking_time_logic")
            conn.commit()

        if 'booking_data_collection' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN booking_data_collection TEXT")
            print("✅ Добавлена колонка booking_data_collection")
            conn.commit()
        if 'booking_availability_instructions' not in columns:
            c.execute(
                "ALTER TABLE bot_settings ADD COLUMN booking_availability_instructions TEXT")
            print("✅ Добавлена колонка booking_availability_instructions")
            conn.commit()
    except Exception as e:
        print(f"⚠️  Ошибка при добавлении колонок: {e}")


    conn.commit()


def migrate_settings():
    """Главная функция"""

    print("=" * 70)
    print("🚀 ПОЛНАЯ МИГРАЦИЯ НАСТРОЕК БОТА")
    print("=" * 70)
    print()

    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД {DATABASE_NAME} не найдена!")
        return 1

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    create_tables(conn)

    # Проверяем существующие настройки
    c.execute("SELECT COUNT(*) FROM bot_settings")
    existing = c.fetchone()[0]

    if existing > 0:
        print("⚠️  Настройки уже есть в БД!")
        print("   Будут ОБНОВЛЕНЫ все поля из bot_instructions_file.txt")
        response = input("   Продолжить обновление? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            conn.close()
            print("\n❌ Миграция отменена")
            return 0
    else:
        print("📝 Создаём новые настройки...")

    # Парсим файл инструкций
    settings = parse_instructions_file()
    now = datetime.now().isoformat()

    # === SALON SETTINGS ===
    print("\n⏭️  Пропускаем salon_settings (используй migrate_salon_settings.py)")

    # === BOT SETTINGS ===
    print("\n💾 Заполняю bot_settings (все поля)...")
    try:
        if existing > 0:
            # ОБНОВЛЕНИЕ
            c.execute("""UPDATE bot_settings SET
            bot_name = ?,
            personality_traits = ?,
            greeting_message = ?,
            farewell_message = ?,
            price_explanation = ?,
            price_response_template = ?,
            premium_justification = ?,
            booking_redirect_message = ?,
            fomo_messages = ?,
            upsell_techniques = ?,
            communication_style = ?,
            max_message_chars = ?, 
            emoji_usage = ?,
            languages_supported = ?,
            objection_expensive = ?,
            objection_think_about_it = ?,
            objection_no_time = ?,
            objection_pain = ?,
            objection_result_doubt = ?,
            objection_cheaper_elsewhere = ?,
            objection_too_far = ?,
            objection_consult_husband = ?,
            objection_first_time = ?,
            objection_not_happy = ?,
            emotional_triggers = ?,
            social_proof_phrases = ?,
            personalization_rules = ?,
            example_dialogues = ?,
            emotional_responses = ?,
            anti_patterns = ?,
            voice_message_response = ?,
            contextual_rules = ?,
            safety_guidelines = ?,
            example_good_responses = ?,
            algorithm_actions = ?,
            location_features = ?,
            seasonality = ?,
            emergency_situations = ?,
            success_metrics = ?,
            ad_campaign_detection = ?,
            pre_booking_data_collection = ?,
            booking_time_logic = ?,
            booking_data_collection = ?,
            booking_availability_instructions = ?,
            updated_at = ?
            WHERE id = 1""",
                      (
                          settings['bot_name'],
                          settings['personality_traits'],
                          settings['greeting_message'],
                          settings['farewell_message'],
                          settings['price_explanation'],
                          settings.get('price_response_template', ''),
                          settings.get('premium_justification', ''),
                          settings.get('booking_redirect_message', ''),
                          settings.get('fomo_messages', ''),
                          settings.get('upsell_techniques', ''),
                          settings['communication_style'],
                          settings['max_message_chars'],
                          settings['emoji_usage'],
                          settings['languages_supported'],
                          settings.get('objection_expensive', ''),
                          settings.get('objection_think_about_it', ''),
                          settings.get('objection_no_time', ''),
                          settings.get('objection_pain', ''),
                          settings.get('objection_result_doubt', ''),
                          settings.get('objection_cheaper_elsewhere', ''),
                          settings.get('objection_too_far', ''),
                          settings.get('objection_consult_husband', ''),
                          settings.get('objection_first_time', ''),
                          settings.get('objection_not_happy', ''),
                          settings.get('emotional_triggers', ''),
                          settings.get('social_proof_phrases', ''),
                          settings.get('personalization_rules', ''),
                          settings.get('example_dialogues', ''),
                          settings.get('emotional_responses', ''),
                          settings.get('anti_patterns', ''),
                          settings.get('voice_message_response', ''),
                          settings.get('contextual_rules', ''),
                          settings.get('safety_guidelines', ''),
                          settings.get('example_good_responses', ''),
                          settings.get('algorithm_actions', ''),
                          settings.get('location_features', ''),
                          settings.get('seasonality', ''),
                          settings.get('emergency_situations', ''),
                          settings.get('success_metrics', ''),
                          settings.get('ad_campaign_detection', ''),
                          settings.get('pre_booking_data_collection',
                                       'Для записи нужно имя и WhatsApp — это займет секунду! 😊'),
                          settings.get('booking_time_logic',
                                       DEFAULT_SETTINGS['booking_time_logic']),
                          settings.get('booking_data_collection',
                                       DEFAULT_SETTINGS['booking_data_collection']),
                          settings.get('booking_availability_instructions',
                                       # ✅ ДОБАВЬ
                                       DEFAULT_SETTINGS['booking_availability_instructions']),
                          now
                      ))
            print("   ✅ bot_settings обновлены (40 полей)")
        else:
            # СОЗДАНИЕ
            c.execute("""INSERT INTO bot_settings (
                id, bot_name, personality_traits, greeting_message, farewell_message,
                price_explanation, price_response_template, premium_justification,
                booking_redirect_message, fomo_messages, upsell_techniques,
                communication_style, max_message_chars, emoji_usage, languages_supported,
                objection_expensive, objection_think_about_it, objection_no_time,
                objection_pain, objection_result_doubt, objection_cheaper_elsewhere,
                objection_too_far, objection_consult_husband, objection_first_time,
                objection_not_happy, emotional_triggers, social_proof_phrases,
                personalization_rules, example_dialogues, emotional_responses,
                anti_patterns, voice_message_response, contextual_rules,
                safety_guidelines, example_good_responses, algorithm_actions,
                location_features, seasonality, emergency_situations, success_metrics,
                ad_campaign_detection, pre_booking_data_collection, booking_time_logic, booking_data_collection,
                booking_availability_instructions, updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                      (
                          settings['bot_name'],
                          settings['personality_traits'],
                          settings['greeting_message'],
                          settings['farewell_message'],
                          settings['price_explanation'],
                          settings.get('price_response_template', ''),
                          settings.get('premium_justification', ''),
                          settings.get('booking_redirect_message', ''),
                          settings.get('fomo_messages', ''),
                          settings.get('upsell_techniques', ''),
                          settings['communication_style'],
                          settings['max_message_chars'],
                          settings['emoji_usage'],
                          settings['languages_supported'],
                          settings.get('objection_expensive', ''),
                          settings.get('objection_think_about_it', ''),
                          settings.get('objection_no_time', ''),
                          settings.get('objection_pain', ''),
                          settings.get('objection_result_doubt', ''),
                          settings.get('objection_cheaper_elsewhere', ''),
                          settings.get('objection_too_far', ''),
                          settings.get('objection_consult_husband', ''),
                          settings.get('objection_first_time', ''),
                          settings.get('objection_not_happy', ''),
                          settings.get('emotional_triggers', ''),
                          settings.get('social_proof_phrases', ''),
                          settings.get('personalization_rules', ''),
                          settings.get('example_dialogues', ''),
                          settings.get('emotional_responses', ''),
                          settings.get('anti_patterns', ''),
                          settings.get('voice_message_response', ''),
                          settings.get('contextual_rules', ''),
                          settings.get('safety_guidelines', ''),
                          settings.get('example_good_responses', ''),
                          settings.get('algorithm_actions', ''),
                          settings.get('location_features', ''),
                          settings.get('seasonality', ''),
                          settings.get('emergency_situations', ''),
                          settings.get('success_metrics', ''),
                          settings.get('ad_campaign_detection', ''),
                          settings.get('pre_booking_data_collection',
                                       'Для записи нужно имя и WhatsApp — это займет секунду! 😊'),
                          settings.get('booking_time_logic', ''),
                          settings.get('booking_data_collection', ''),
                          settings.get(
                              'booking_availability_instructions', ''),
                          now
                      ))
            print("   ✅ bot_settings созданы (40 полей)")
    except Exception as e:
        print(f"   ❌ Ошибка bot_settings: {e}")
        import traceback
        traceback.print_exc()

    conn.commit()
    conn.close()

    print()
    print("=" * 70)
    print("✅ МИГРАЦИЯ ЗАВЕРШЕНА!")
    print("📋 Результат:")
    print(f"   • bot_settings: {'обновлены' if existing > 0 else 'созданы'}")
    print()
    print("🔧 Что дальше:")
    print("   1. Запустите сервер: uvicorn main:app --reload")
    print("   2. Откройте: http://localhost:8000/admin/bot-settings")
    print("=" * 70)
    print()

    return 0
