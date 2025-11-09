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
    
    # === ЛИЧНОСТЬ ===
    personality_section = parse_section(content, 'ЛИЧНОСТЬ БОТА', 'ПРАВИЛА О ПРИВЕТСТВИИ')
    if personality_section:
        traits = []
        for line in personality_section.split('\n'):
            line = line.strip()
            if (line.startswith('- ') or line.startswith('• ')) and len(line) > 3:
                traits.append(line[2:])
        if traits:
            settings['personality_traits'] = '\n'.join(traits[:10])
    
    # === ПРИВЕТСТВИЕ ===
    greeting_section = parse_section(content, 'ПРАВИЛА О ПРИВЕТСТВИИ', 'ПРАВИЛА О ЦЕНАХ')
    greeting_quotes = extract_quotes(greeting_section)
    for quote in greeting_quotes:
        if 'Привет' in quote or 'Hello' in quote:
            settings['greeting_message'] = quote
            break
    
    # === ПРОЩАНИЕ ===
    if 'Спасибо за визит' in content:
        farewell_match = re.search(r'(Спасибо за визит[^"\n]{0,100})', content)
        if farewell_match:
            settings['farewell_message'] = farewell_match.group(1).strip()
    
    # === ЦЕНЫ ===
    pricing_section = parse_section(content, 'ПРАВИЛА О ЦЕНАХ', 'ПРАВИЛА О ЗАПИСИ')
    if pricing_section:
        settings['price_explanation'] = 'Мы в премиум-сегменте 💎\nНаши цены отражают качество.'
        
        # Price response template
        if 'Структура ответа' in pricing_section:
            settings['price_response_template'] = '{SERVICE} - {PRICE} {CURRENCY} 💎\n\nВключает: {BENEFITS}\nРезультат: {DURATION}\n\n{EMOTIONAL_HOOK}'
        
        # Premium justification
        premium_quotes = extract_quotes(pricing_section)
        for quote in premium_quotes:
            if 'премиум' in quote and len(quote) > 100:
                settings['premium_justification'] = quote
                break
    
    # === ЗАПИСЬ ===
    booking_section = parse_section(content, 'ПРАВИЛА О ЗАПИСИ', 'ИНФОРМАЦИЯ О САЛОНЕ')
    booking_quotes = extract_quotes(booking_section)
    for quote in booking_quotes:
        if 'AI-ассистент' in quote and 'запись' in quote:
            settings['booking_redirect_message'] = quote
            break
    
    # === FOMO ===
    fomo_section = parse_section(content, 'FOMO ТЕХНИКИ', 'UPSELL')
    fomo_messages = []
    for line in fomo_section.split('\n'):
        if '🔥' in line:
            msg = line.strip().lstrip('🔥 ').strip('"')
            if msg and len(msg) > 10:
                fomo_messages.append(msg)
    if fomo_messages:
        settings['fomo_messages'] = '|'.join(fomo_messages)
    
    # === UPSELL ===
    upsell_section = parse_section(content, 'UPSELL ТЕХНИКИ', 'СОЦИАЛЬНОЕ')
    upsell_quotes = extract_quotes(upsell_section)
    if upsell_quotes:
        settings['upsell_techniques'] = '|'.join(upsell_quotes[:5])
    
    # === СТИЛЬ ===
    comm_section = parse_section(content, 'СТИЛЬ ОБЩЕНИЯ', 'ЯЗЫКОВАЯ')
    if comm_section:
        style_parts = []
        for line in comm_section.split('\n'):
            if '**' in line and ':' in line:
                style_parts.append(line.strip().replace('**', ''))
        if style_parts:
            settings['communication_style'] = '\n'.join(style_parts)
    
    # === ВОЗРАЖЕНИЯ (ДЕТАЛЬНО) ===
    settings['objection_expensive'] = extract_objection(content, 'Дорого')
    settings['objection_think_about_it'] = extract_objection(content, 'Подумаю')
    settings['objection_no_time'] = extract_objection(content, 'Нет времени')
    settings['objection_pain'] = extract_objection(content, 'боли')
    settings['objection_result_doubt'] = extract_objection(content, 'не уверен')
    settings['objection_cheaper_elsewhere'] = extract_objection(content, 'дешевле')
    settings['objection_too_far'] = extract_objection(content, 'далеко')
    settings['objection_consult_husband'] = extract_objection(content, 'мужем')
    settings['objection_first_time'] = extract_objection(content, 'первый раз')
    settings['objection_not_happy'] = extract_objection(content, 'не понравится')
    
    # === ЭМОЦИОНАЛЬНЫЕ ТРИГГЕРЫ ===
    triggers_section = parse_section(content, 'ЭМОЦИОНАЛЬНЫЕ ТРИГГЕРЫ', 'СОЦИАЛЬНОЕ')
    if triggers_section:
        triggers = []
        for line in triggers_section.split('\n'):
            if '💖' in line or '⏰' in line or '💰' in line:
                triggers.append(line.strip())
        if triggers:
            settings['emotional_triggers'] = '\n'.join(triggers)
    
    # === СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО ===
    social_section = parse_section(content, 'СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО', 'ПЕРСОНАЛИЗАЦИЯ')
    if social_section:
        proofs = []
        for line in social_section.split('\n'):
            if line.strip().startswith('✅'):
                proofs.append(line.strip())
        if proofs:
            settings['social_proof_phrases'] = '\n'.join(proofs)
    
    # === ПЕРСОНАЛИЗАЦИЯ ===
    person_section = parse_section(content, 'ПЕРСОНАЛИЗАЦИЯ', 'РАБОТА С ЭМОЦИЯМИ')
    if person_section:
        rules = []
        for line in person_section.split('\n'):
            if line.strip().startswith('-'):
                rules.append(line.strip())
        if rules:
            settings['personalization_rules'] = '\n'.join(rules)
    
    # === ПРИМЕРЫ ДИАЛОГОВ ===
    dialogues_section = parse_section(content, 'СУПЕР-ПРИМЕРЫ ДИАЛОГОВ', 'ФИНАЛЬНЫЙ')
    if dialogues_section:
        settings['example_dialogues'] = dialogues_section[:2000]
    
    # === ЭМОЦИОНАЛЬНЫЕ ОТВЕТЫ ===
    emotional_section = parse_section(content, 'РАБОТА С ЭМОЦИЯМИ', 'НЕ ДЕЛАЙ')
    if emotional_section:
        settings['emotional_responses'] = emotional_section[:800]
    
    # === АНТИПАТТЕРНЫ ===
    anti_section = parse_section(content, 'НЕ ДЕЛАЙ', 'СТИЛЬ ОБЩЕНИЯ')
    if anti_section:
        antipatterns = []
        for line in anti_section.split('\n'):
            if line.strip().startswith('❌'):
                antipatterns.append(line.strip())
        if antipatterns:
            settings['anti_patterns'] = '\n'.join(antipatterns)
    
    # === ГОЛОСОВЫЕ ===
    if 'ГОЛОСОВОЕ СООБЩЕНИЕ' in content:
        voice_match = re.search(r'ГОЛОСОВОЕ СООБЩЕНИЕ.*?"([^"]+)"', content, re.DOTALL)
        if voice_match:
            settings['voice_message_response'] = voice_match.group(1)
    
    # === КОНТЕКСТНЫЕ ПРАВИЛА ===
    contextual_section = parse_section(content, 'СЕЗОННОСТЬ', 'ЛОКАЦИЯ')
    if contextual_section:
        settings['contextual_rules'] = contextual_section[:800]
    
    # === БЕЗОПАСНОСТЬ ===
    safety_section = parse_section(content, 'БЕЗОПАСНОСТЬ И ЭТИКА', 'СЕЗОННОСТЬ')
    if safety_section:
        settings['safety_guidelines'] = safety_section[:1000]
    
    # === ПРИМЕРЫ ОТВЕТОВ ===
    examples_section = parse_section(content, 'ПРИМЕРЫ', 'АЛГОРИТМ')
    if examples_section:
        settings['example_good_responses'] = examples_section[:1000]
    
    # === АЛГОРИТМ ===
    algo_section = parse_section(content, 'АЛГОРИТМ', 'РАБОТА С ВОЗРАЖЕНИЯМИ')
    if algo_section:
        settings['algorithm_actions'] = algo_section[:1200]
    
    # === ЛОКАЦИЯ ===
    location_section = parse_section(content, 'ЛОКАЦИЯ', 'СЕЗОННОСТЬ')
    if location_section:
        settings['location_features'] = location_section[:600]
    
    # === СЕЗОННОСТЬ ===
    season_section = parse_section(content, 'СЕЗОННОСТЬ', 'ЭКСТРЕННЫЕ')
    if season_section:
        settings['seasonality'] = season_section[:600]
    
    # === ЭКСТРЕННЫЕ ===
    emergency_section = parse_section(content, 'ЭКСТРЕННЫЕ СИТУАЦИИ', 'МЕТРИКИ')
    if emergency_section:
        settings['emergency_situations'] = emergency_section[:600]
    
    # === МЕТРИКИ ===
    metrics_section = parse_section(content, 'МЕТРИКИ УСПЕХА', 'КОНЕЦ')
    if metrics_section:
        settings['success_metrics'] = metrics_section[:600]
    
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
    max_message_chars INTEGER DEFAULT 500,
    emoji_usage TEXT,
    languages_supported TEXT DEFAULT 'ru,en,ar',
    objection_handling TEXT,
    negative_handling TEXT,
    safety_guidelines TEXT,        -- ✅ БЕЗ ЛИМИТА
    example_good_responses TEXT,   -- ✅ БЕЗ ЛИМИТА
    algorithm_actions TEXT,        -- ✅ БЕЗ ЛИМИТА
    location_features TEXT,
    seasonality TEXT,
    emergency_situations TEXT,
    success_metrics TEXT,
    objection_expensive TEXT,      -- ✅ БЕЗ ЛИМИТА (2000 символов)
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
    example_dialogues TEXT,        -- ✅ БЕЗ ЛИМИТА (2000 символов)
    emotional_responses TEXT,
    anti_patterns TEXT,
    voice_message_response TEXT,
    contextual_rules TEXT,
    ad_campaign_detection TEXT DEFAULT '',
    pre_booking_data_collection TEXT DEFAULT 'Для записи нужно имя и WhatsApp — это займет секунду! 😊',
    updated_at TEXT)''')

    # ✅ ДОБАВЛЯЕМ КОЛОНКИ если таблица уже существует
    try:
        c.execute("PRAGMA table_info(bot_settings)")
        columns = [row[1] for row in c.fetchall()]
        if 'max_message_length' in columns and 'max_message_chars' not in columns:
        # Создаем новое поле
            c.execute("ALTER TABLE bot_settings ADD COLUMN max_message_chars INTEGER DEFAULT 500")
            # Копируем значение (1 предложение ≈ 100 символов)
            c.execute("UPDATE bot_settings SET max_message_chars = max_message_length * 100")
            print("✅ Поле max_message_chars добавлено")
            conn.commit()
        # ✅ ПРОВЕРЯЕМ ЧТО max_message_chars ЕСТЬ
        if 'max_message_chars' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN max_message_chars INTEGER DEFAULT 500")
            print("✅ Добавлено поле max_message_chars со значением по умолчанию 500")
            conn.commit()
        if 'ad_campaign_detection' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN ad_campaign_detection TEXT DEFAULT ''")
            print("✅ Добавлена колонка ad_campaign_detection")

        if 'pre_booking_data_collection' not in columns:
            c.execute("ALTER TABLE bot_settings ADD COLUMN pre_booking_data_collection TEXT DEFAULT 'Для записи нужно имя и WhatsApp — это займет секунду! 😊'")
            print("✅ Добавлена колонка pre_booking_data_collection")

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