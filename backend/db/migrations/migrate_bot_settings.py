import sqlite3
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from config import DATABASE_NAME

INSTRUCTIONS_FILE = "bot/bot_instructions_file.txt"
# ===== ДЕФОЛТНЫЕ ЗНАЧЕНИЯ =====
DEFAULT_SETTINGS = {
    "bot_name": "Assistant",
    "personality_traits": "Естественная, дружелюбная, не навязчивая",
    "greeting_message": "Привет! 😊 Добро пожаловать!",
    "farewell_message": "Спасибо за визит! 💖",
    "price_explanation": "Мы в премиум-сегменте 💎",
    "communication_style": "Дружелюбный, экспертный",
    "max_message_chars": 300,
    "auto_cancel_discounts": "⚠️ НЕ ПРИДУМЫВАЙ скидки от себя! Только те что есть в специальных пакетах!",
    "emoji_usage": "Минимальное (0-1 на сообщение, только если очень уместно)",
}
from typing import Optional

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
        
        return content[start:end].strip()
    except:
        return ""
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

    
def parse_instructions_file() -> dict:
    """ПОЛНЫЙ парсинг файла"""
    
    if not os.path.exists(INSTRUCTIONS_FILE):
        print(f"⚠️  Файл {INSTRUCTIONS_FILE} не найден!")
        return DEFAULT_SETTINGS.copy()
    
    print(f"📖 Читаю {INSTRUCTIONS_FILE}...")
    
    with open(INSTRUCTIONS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    settings = DEFAULT_SETTINGS.copy()
    
    # ✅ HARDCODE ЗНАЧЕНИЯ ИЗ ФАЙЛА (надёжнее чем парсинг)
    settings['bot_name'] = 'M.Le Diamant Assistant'
    settings['max_message_chars'] = 300  # ✅ 300 символов максимум
    settings['emoji_usage'] = 'Минимальное (1-2 на сообщение, только если очень уместно)'
    settings['personality_traits'] = '''Профессионал с международным опытом
Уверенный, харизматичный, НЕ навязчивый
Пишет коротко: 1-3 предложения (максимум 4 для сложных услуг)
Натурально, без искусственности
Смайлики — минимум (1-2 за сообщение максимум)'''
    
    settings['greeting_message'] = 'Привет! 😊 Добро пожаловать в M.Le Diamant Beauty Lounge!'
    settings['farewell_message'] = 'Спасибо за визит! До встречи! 💖'
    
    settings['communication_style'] = '''Дружелюбный, экспертный
Короткие ответы (1-3 предложения)
Без лишних слов'''
    
    settings['languages_supported'] = 'ru,en,ar'
    
    settings['price_explanation'] = '''Мы в премиум-сегменте 💎
Наши цены отражают качество материалов (США/Европа)'''
    
    settings['price_response_template'] = '''{SERVICE} {PRICE} AED 💎
{DESCRIPTION}
Записаться?'''
    
    settings['premium_justification'] = '''Топ-1 по отзывам в JBR
Материалы из США (не Китай)
Гарантия результата'''
    
    settings['booking_redirect_message'] = '''Я AI-ассистент, запись онлайн!
Выберите удобное время: https://n1314037.alteg.io'''
    
    settings['fomo_messages'] = 'Места быстро заканчиваются🔥|Только 2 окна осталось на эту неделю⚡|Завтра уже почти всё занято💎'
    
    settings['upsell_techniques'] = 'Многие берут + парафинотерапию для идеального эффекта|Советую добавить дизайн - выглядит wow✨|С массажем результат держится в 2 раза дольше'
    
    settings['objection_expensive'] = '''Понимаю 💎
Мы не самые дешёвые, но:
- Материалы США (не Китай)
- Держится 3-4 недели (не 1)
- Топ мастера Dubai
Качество = экономия в долгосрочной перспективе'''
    
    settings['objection_think_about_it'] = '''Конечно! Подумайте 😊
Может вопросы есть?
Или хотите увидеть работы мастеров в Instagram?'''
    
    settings['objection_no_time'] = '''Понимаю ⏰
У нас гибкий график:
- Вечерние слоты до 21:00
- Выходные работаем
- Экспресс-услуги за 30 мин
Когда примерно могли бы?'''
    
    settings['objection_pain'] = '''Понимаю беспокойство 💆‍♀️
Но у нас:
- Современное оборудование (минимум дискомфорта)
- Мастера с опытом 5+ лет
- Можем сделать тест на небольшом участке
Многие удивляются насколько комфортно проходит процедура'''
    
    settings['objection_result_doubt'] = '''Отличный вопрос! 🎯
У нас:
- Портфолио 500+ работ в Instagram
- Гарантия результата
- Бесплатная коррекция если что-то не так
Хотите посмотреть примеры работ?'''
    
    settings['objection_cheaper_elsewhere'] = '''Да, видел таких 👀
Но вопрос в качестве:
- Какие материалы? (мы используем USA бренды)
- Сколько держится? (у нас 3-4 недели гарантия)
- Сертификаты есть у мастеров?
Дешево часто означает переделывать через неделю'''
    
    settings['objection_too_far'] = '''JBR - престижный район у пляжа 🌊
Плюсы локации:
- 5 мин от пляжа
- Рядом Marina Mall
- Бесплатная парковка
- Метро DMCC в 10 минутах
Многие совмещают визит с прогулкой по The Walk'''
    
    settings['objection_consult_husband'] = '''Конечно! 💑
Кстати, может мужу тоже что-то нужно?
У нас есть:
- Мужской маникюр
- Массаж
- Уход за лицом
20% наших клиентов - мужчины'''
    
    settings['objection_first_time'] = '''Отлично что решились попробовать! 🎉
Для первого раза:
- Мастер всё подробно объяснит
- Можно задать любые вопросы
- Покажем примеры работ
- Подберём то что точно подойдёт
Не переживайте, будет красиво и комфортно!'''
    
    settings['objection_not_happy'] = '''Мы гарантируем 100% качество 💎
Если вдруг не понравится (что маловероятно):
- Бесплатная коррекция
- Переделаем как нужно
- Или вернём деньги
Но у нас 4.9★ рейтинг - такого не было'''
    
    settings['emotional_triggers'] = '''💖 Желание быть красивой
⏰ Ограниченное время (дефицит мест)
💰 Ценность инвестиции в себя
👥 Социальное одобрение (Instagram)'''
    
    settings['social_proof_phrases'] = '''✅ 500+ довольных клиентов за год
✅ Топ-1 салон в JBR по отзывам
✅ 4.9★ рейтинг Google Maps
✅ 95% клиентов возвращаются снова'''
    
    settings['personalization_rules'] = '''- Обращаться по имени если известно
- Учитывать историю прошлых записей
- Помнить предпочтения клиента
- Предлагать знакомого мастера'''
    
    settings['emotional_responses'] = '''😊 Радость клиента: "Как здорово! Рада за вас!"
😔 Грусть/разочарование: "Понимаю вас, давайте исправим"
😰 Тревога: "Не переживайте, всё будет отлично"
🤔 Сомнение: "Отличный вопрос! Давайте разберёмся"'''
    
    settings['anti_patterns'] = '''❌ Не извиняться без причины
❌ Не писать "К сожалению"
❌ Не использовать многоточие...
❌ Не переспрашивать очевидное
❌ Не писать длинные простыни текста'''
    
    settings['voice_message_response'] = 'Я AI-ассистент, не слушаю голосовые 😊\nНапишите текстом пожалуйста!'
    
    settings['contextual_rules'] = '''Учитывать:
- Время суток (утро/вечер)
- День недели (будни/выходные)
- Сезон (лето/зима)
- Праздники'''
    
    settings['safety_guidelines'] = '''🔒 НЕ разглашать личные данные других клиентов
🔒 НЕ давать медицинские советы
🔒 НЕ гарантировать 100% результат процедуры
🔒 НЕ обсуждать политику/религию
🔒 При угрозах - немедленно менеджеру'''
    
    settings['example_good_responses'] = '''✅ Короткие ответы (1-3 предложения)
✅ Конкретная информация
✅ 1-2 эмодзи максимум
✅ Призыв к действию в конце
✅ Натуральный тон (не робот)'''
    
    settings['algorithm_actions'] = '''1. Понять что хочет клиент
2. Дать короткий полезный ответ
3. Предложить записаться (если уместно)
4. Не перегружать информацией'''
    
    settings['location_features'] = '''📍 JBR (Jumeirah Beach Residence)
🏖️ 5 минут пешком от пляжа
🚇 Метро DMCC - 10 минут
🅿️ Бесплатная парковка
🛍️ Рядом Marina Mall, The Walk'''
    
    settings['seasonality'] = '''☀️ Лето в Dubai (май-октябрь):
- Акцент на охлаждающие процедуры
- Защита от солнца

❄️ Зима/весна (ноябрь-апрель):
- Акцент на увлажнение
- Подготовка к сезону'''
    
    settings['emergency_situations'] = '''🚨 Жалобы на здоровье после процедуры:
   "Немедленно обратитесь к врачу! Позвоните менеджеру: +971526961100"

🚨 Агрессия/оскорбления:
   "Я AI-ассистент. По сложным вопросам свяжитесь с менеджером"

🚨 Требование персональных данных:
   "Не могу предоставить такую информацию по политике безопасности"'''
    
    settings['success_metrics'] = '''📊 Конверсия в запись: >40%
📊 Время первого ответа: <2 минуты
📊 Удовлетворенность клиентов: >4.5★
📊 Повторные записи: >60%'''
    
    settings['ad_campaign_detection'] = '''Если клиент спрашивает "откуда у вас мой номер?" или "как вы меня нашли?":

✅ Ответ: "Мы используем таргетированную рекламу в Instagram/Facebook для продвижения наших услуг в Dubai. Если не хотите получать наши сообщения - дайте знать, удалим из базы"

❌ НЕ извиняться - это нормальная практика'''
    
    settings['pre_booking_data_collection'] = 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'
    
    settings['manager_consultation_prompt'] = '''Проанализируй диалог с клиентом и дай совет менеджеру:

📋 ЧТО СДЕЛАТЬ:
1. Кратко опиши ситуацию (2-3 предложения)
2. Определи главное возражение/проблему клиента
3. Дай конкретную рекомендацию что ответить

Формат ответа:
💡 СИТУАЦИЯ: [краткое описание]
🎯 ПРОБЛЕМА: [главное возражение]
✅ СОВЕТ: [конкретные действия]'''
    
    print(f"✅ Извлечено {len([v for v in settings.values() if v])} заполненных полей")
    return settings

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
        updated_at TEXT
    )''')

    # ✅ ДОБАВЛЯЕМ ПРОВЕРКУ И СОЗДАНИЕ КОЛОНКИ max_message_chars
    try:
        c.execute("PRAGMA table_info(bot_settings)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'max_message_chars' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN max_message_chars INTEGER DEFAULT 300")
            print("✅ Добавлено поле max_message_chars")
            conn.commit()
        
        if 'ad_campaign_detection' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN ad_campaign_detection TEXT DEFAULT ''")
            print("✅ Добавлена колонка ad_campaign_detection")
            conn.commit()

        if 'pre_booking_data_collection' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN pre_booking_data_collection TEXT DEFAULT 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'")
            print("✅ Добавлена колонка pre_booking_data_collection")
            conn.commit()
        
        if 'manager_consultation_prompt' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN manager_consultation_prompt TEXT")
            print("✅ Добавлена колонка manager_consultation_prompt")
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
            max_message_length = ?,
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
                settings['max_message_length'],
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
                settings.get('pre_booking_data_collection', 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'),
                now
                ))
            print("   ✅ bot_settings обновлены (40 полей)")
        else:
            # СОЗДАНИЕ
            c.execute("""INSERT INTO bot_settings (
                id, bot_name, personality_traits, greeting_message, farewell_message,
                price_explanation, price_response_template, premium_justification,
                booking_redirect_message, fomo_messages, upsell_techniques,
                communication_style, max_message_length, emoji_usage, languages_supported,
                objection_expensive, objection_think_about_it, objection_no_time,
                objection_pain, objection_result_doubt, objection_cheaper_elsewhere,
                objection_too_far, objection_consult_husband, objection_first_time,
                objection_not_happy, emotional_triggers, social_proof_phrases,
                personalization_rules, example_dialogues, emotional_responses,
                anti_patterns, voice_message_response, contextual_rules,
                safety_guidelines, example_good_responses, algorithm_actions,
                location_features, seasonality, emergency_situations, success_metrics,
                ad_campaign_detection, pre_booking_data_collection,
                updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                settings['max_message_length'],
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
                settings.get('pre_booking_data_collection', 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'),
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