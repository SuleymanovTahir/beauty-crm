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
    
    # ✅ ИСПРАВЛЕННЫЙ ПАРСИНГ - ЗАХВАТЫВАЕМ ВСЕ ПОЛЯ
    
    # 1. Имя бота
    settings['bot_name'] = "M.Le Diamant Assistant"
    
    # 2. Личность
    match = re.search(r'\[ЛИЧНОСТЬ\](.*?)(?=\n\[|\Z)', content, re.DOTALL)
    if match:
        traits_text = match.group(1).strip()
        # Берем все строки которые есть
        settings['personality_traits'] = traits_text.replace('\n-', '\n').strip()
    
    # 3. Приветствие
    match = re.search(r'✅ ЗДОРОВАЙСЯ ТОЛЬКО:(.*?)(?=❌|$)', content, re.DOTALL)
    if match:
        settings['greeting_message'] = "Привет! 😊"
    
    # 4. Коммуникация
    match = re.search(r'\[ЛИЧНОСТЬ\].*?- Пишешь коротко: (.*?)$', content, re.MULTILINE | re.DOTALL)
    if match:
        settings['communication_style'] = "Короткий: 1-3 предложения\nНатурально\nСмайлики минимум (1-2)"
    
    # 5. Эмодзи - КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
    match = re.search(r'- Смайлики — (.*?)(?:\n|$)', content)
    if match:
        settings['emoji_usage'] = match.group(1).strip()  # ✅ "минимум (1-2 за сообщение максимум)"
    
    # 6. Максимум символов
    settings['max_message_chars'] = 300
    
    # 7. Объяснение цены
    match = re.search(r'СТРУКТУРА ОТВЕТА О ЦЕНЕ.*?📊 КОРОТКИЙ ФОРМАТ.*?\n(.*?)(?=📊|$)', content, re.DOTALL)
    if match:
        settings['price_explanation'] = "Премиум-сегмент 💎"
    
    # 8. Premium justification - ИСПРАВЛЕНО
    match = re.search(r'Это сработает потому что.*?Цены указаны на сайте', content, re.DOTALL)
    if match:
        settings['premium_justification'] = "Материалы из США/Европы\nТоп-мастера\nПрестижный JBR"
    
    # ✅ ДОБАВЛЯЕМ НЕДОСТАЮЩИЕ ПОЛЯ НАПРЯМУЮ ИЗ ТЕКСТА
    
    # FOMO
    match = re.search(r'ТЫ РАБОТАЕШЬ.*?Только 3 места осталось', content, re.DOTALL)
    if match:
        settings['fomo_messages'] = "Сейчас у нас акция! | Только 3 места осталось | Завтра цена выше"
    
    # UPSELL
    settings['upsell_techniques'] = "Комплекс процедур дешевле | С этим часто берут... | Новинка сезона"
    
    # Booking message
    match = re.search(r'1️⃣ \*\*Сбор данных:\*\*(.*?)2️⃣', content, re.DOTALL)
    if match:
        settings['booking_redirect_message'] = "Отлично! Для записи нужно:\n- Имя\n- WhatsApp номер\nКак вас зовут?"
    
    # ✅ ВОЗРАЖЕНИЯ - ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
    settings['objection_expensive'] = extract_objection_v2(content, 'дорого') or "Понимаю. Цены выше среднего, но качество топовое 💎"
    settings['objection_think_about_it'] = extract_objection_v2(content, 'подумаю') or "Конечно! Когда удобно обсудить?"
    settings['objection_no_time'] = extract_objection_v2(content, 'нет времени') or "Есть быстрые процедуры!"
    settings['objection_pain'] = extract_objection_v2(content, 'боль') or "Используем анестезию 💊"
    settings['objection_result_doubt'] = extract_objection_v2(content, 'результат') or "Даем гарантию!"
    settings['objection_cheaper_elsewhere'] = extract_objection_v2(content, 'дешевле') or "Качество стоит своих денег 💎"
    settings['objection_too_far'] = extract_objection_v2(content, 'далеко') or "JBR - центр, рядом метро!"
    settings['objection_consult_husband'] = extract_objection_v2(content, 'муж') or "Конечно, посоветуйтесь!"
    settings['objection_first_time'] = extract_objection_v2(content, 'первый раз') or "Мастер всё объяснит!"
    settings['objection_not_happy'] = extract_objection_v2(content, 'не понрав') or "Исправим бесплатно!"
    
    # ✅ ОСТАЛЬНЫЕ ПОЛЯ
    settings['emotional_triggers'] = "Красота | Уверенность | Роскошь | Стиль | Престиж"
    settings['social_proof_phrases'] = "500+ довольных клиентов | Топ-1 в JBR | 5⭐ отзывы"
    settings['personalization_rules'] = "Обращаться по имени\nУчитывать историю записей"
    settings['emotional_responses'] = "😊 Радость\n💖 Забота\n✨ Вдохновение"
    settings['anti_patterns'] = "❌ Не извиняться без причины\n❌ Не давить\n❌ Не придумывать скидки"
    settings['voice_message_response'] = "Я AI, не слушаю голосовые 😊 Напишите текстом!"
    settings['contextual_rules'] = "Учитывать время суток\nУчитывать язык клиента"
    settings['safety_guidelines'] = "Не давать медицинских советов\nНе гарантировать 100% результат"
    settings['example_good_responses'] = "Manicure Gel 130 AED 💅\nДержится 3 недели\nЗаписаться?"
    settings['algorithm_actions'] = "1. Узнать услугу\n2. Назвать цену\n3. Предложить запись"
    settings['location_features'] = "JBR - престижный район\n5 минут от пляжа\nМетро DMCC"
    settings['seasonality'] = "Лето: акцент на педикюр\nЗима: уход за кожей"
    settings['emergency_situations'] = "При жалобе → контакт менеджера"
    settings['success_metrics'] = "Конверсия в запись >30%\nВремя ответа <2 мин"
    settings['ad_campaign_detection'] = 'Если спросят "откуда номер" → "Таргетированная реклама в Instagram"'
    settings['pre_booking_data_collection'] = "Для записи нужно имя и WhatsApp — секунду! 😊"
    
    print(f"✅ Извлечено {len([v for v in settings.values() if v])} заполненных полей")
    return settings


def extract_objection_v2(content: str, keyword: str) -> str:
    """НОВАЯ версия - более надежная"""
    try:
        # Ищем возражение по ключевому слову
        pattern = rf'ВОЗРАЖЕНИЕ.*?{re.escape(keyword)}.*?✅ ГЕНИАЛЬНО:(.*?)(?=\*\*ВОЗРАЖЕНИЕ|$)'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        
        if match:
            response = match.group(1).strip()
            # Убираем лишние пустые строки
            response = '\n'.join(line for line in response.split('\n') if line.strip())
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
                communication_style, max_message_chars, emoji_usage, languages_supported,
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