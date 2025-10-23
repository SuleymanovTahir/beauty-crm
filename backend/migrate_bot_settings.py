#!/usr/bin/env python3
# backend/migrate_bot_settings_fixed.py
# ========================================
# ПРАВИЛЬНАЯ МИГРАЦИЯ: bot_instructions_file.txt → БД
# ========================================
# ✅ Читает bot_instructions_file.txt
# ✅ Читает bot_config.py (дефолты)
# ✅ Заполняет БД ОДИН РАЗ при первом запуске
# ✅ После этого БД = единственный источник истины

import sqlite3
import os
from datetime import datetime

DATABASE_NAME = os.getenv("DATABASE_NAME", "salon_bot.db")

def parse_instructions_file():
    """
    Парсит bot_instructions_file.txt и извлекает секции
    
    Возвращает dict с ключами:
    - personality_traits
    - greeting_message
    - price_explanation
    - и т.д.
    """
    
    # Читаем файл
    try:
        with open('bot_instructions_file.txt', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("⚠️  Файл bot_instructions_file.txt не найден!")
        print("   Используются дефолтные значения из bot_config.py")
        return None
    
    # Парсим секции
    settings = {}
    
    # === ЛИЧНОСТЬ БОТА ===
    if '[ЛИЧНОСТЬ БОТА 2.0]' in content:
        section_start = content.find('[ЛИЧНОСТЬ БОТА 2.0]')
        section_end = content.find('[ПРАВИЛА О ПРИВЕТСТВИИ', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        # Извлекаем traits
        traits_lines = []
        for line in section.split('\n'):
            line = line.strip()
            if line.startswith('- ') and any(word in line for word in ['Обаятельная', 'Эксперт', 'Знаешь']):
                traits_lines.append(line[2:])  # Убираем "- "
        
        if traits_lines:
            settings['personality_traits'] = '\n'.join(traits_lines)
    
    # === ПРИВЕТСТВИЕ ===
    # Ищем в секции [ПРАВИЛА О ПРИВЕТСТВИИ]
    if '**Примеры:**' in content and 'первое сообщение' in content:
        # Найдём пример приветствия
        greeting_start = content.find('✅ "Привет! 😊')
        if greeting_start != -1:
            greeting_end = content.find('"', greeting_start + 3)
            if greeting_end != -1:
                settings['greeting_message'] = content[greeting_start+3:greeting_end]
    
    # === ПРОЩАНИЕ ===
    if '[МИССИЯ]' in content:
        # Прощание обычно в конце, поищем типичную фразу
        if 'Спасибо за визит' in content:
            farewell_start = content.find('Спасибо за визит')
            farewell_end = content.find('"', farewell_start)
            if farewell_end == -1:
                farewell_end = content.find('\n', farewell_start)
            settings['farewell_message'] = content[farewell_start:farewell_end].strip()
    
    # === ЦЕНЫ ===
    if '[ПРАВИЛА О ЦЕНАХ' in content:
        section_start = content.find('[ПРАВИЛА О ЦЕНАХ')
        section_end = content.find('[ПРАВИЛА О ЗАПИСИ', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        # Price explanation
        if '**P (Price)**' in section:
            # Ищем общее объяснение
            if 'Мы в премиум-сегменте' in section:
                settings['price_explanation'] = 'Мы в премиум-сегменте 💎\nНаши цены отражают высокое качество услуг, профессионализм мастеров и используемые материалы.'
        
        # Price response template
        if '**Структура ответа:**' in section:
            template_lines = []
            in_structure = False
            for line in section.split('\n'):
                if '**Структура ответа:**' in line:
                    in_structure = True
                    continue
                if in_structure and line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.')):
                    template_lines.append(line.strip())
                if in_structure and line.strip().startswith('**Примеры'):
                    break
            
            if template_lines:
                settings['price_response_template'] = '\n'.join(template_lines)
        
        # Premium justification - ищем в примере ответа на "дорого"
        if '❌ ПЛОХО: "Это нормальная цена"' in section:
            justif_start = section.find('✅ ГЕНИАЛЬНО:', section.find('❌ ПЛОХО: "Это нормальная цена"'))
            if justif_start != -1:
                justif_end = section.find('---', justif_start)
                if justif_end == -1:
                    justif_end = section.find('**ВОЗРАЖЕНИЕ', justif_start)
                if justif_end != -1:
                    justification = section[justif_start:justif_end].strip()
                    # Убираем "✅ ГЕНИАЛЬНО:"
                    justification = justification.replace('✅ ГЕНИАЛЬНО:', '').strip()
                    # Берём только текст в кавычках
                    if '"' in justification:
                        quote_start = justification.find('"')
                        quote_end = justification.rfind('"')
                        settings['premium_justification'] = justification[quote_start+1:quote_end]
    
    # === ЗАПИСЬ ===
    if '[ПРАВИЛА О ЗАПИСИ' in content:
        section_start = content.find('[ПРАВИЛА О ЗАПИСИ')
        section_end = content.find('[ИНФОРМАЦИЯ О САЛОНЕ]', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        # Booking redirect message
        if '**Формула ответа о записи:**' in section:
            msg_start = section.find('"', section.find('**Формула ответа о записи:**'))
            if msg_start != -1:
                msg_end = section.find('"', msg_start + 1)
                if msg_end != -1:
                    settings['booking_redirect_message'] = section[msg_start+1:msg_end]
    
    # === FOMO ===
    if '[FOMO ТЕХНИКИ' in content:
        section_start = content.find('[FOMO ТЕХНИКИ')
        section_end = content.find('[UPSELL ТЕХНИКИ', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        fomo_messages = []
        for line in section.split('\n'):
            if line.strip().startswith('🔥 "'):
                msg = line.strip()[3:].strip('"')
                fomo_messages.append(msg)
        
        if fomo_messages:
            settings['fomo_messages'] = '|'.join(fomo_messages)
    
    # === UPSELL ===
    if '[UPSELL ТЕХНИКИ' in content:
        section_start = content.find('[UPSELL ТЕХНИКИ')
        section_end = content.find('[СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        upsell_messages = []
        for line in section.split('\n'):
            if '"' in line and ('→' in line or 'Кстати' in line):
                # Извлекаем текст в кавычках
                start = line.find('"')
                end = line.rfind('"')
                if start != -1 and end != -1 and start != end:
                    upsell_messages.append(line[start+1:end])
        
        if upsell_messages:
            settings['upsell_techniques'] = '|'.join(upsell_messages)
    
    # === СТИЛЬ ОБЩЕНИЯ ===
    if '[СТИЛЬ ОБЩЕНИЯ]' in content:
        section_start = content.find('[СТИЛЬ ОБЩЕНИЯ]')
        section_end = content.find('[ЯЗЫКОВАЯ АДАПТАЦИЯ]', section_start)
        if section_end == -1:
            section_end = len(content)
        section = content[section_start:section_end]
        
        comm_style_parts = []
        for line in section.split('\n'):
            if line.strip().startswith('**') and ':' in line:
                comm_style_parts.append(line.strip().replace('**', ''))
        
        if comm_style_parts:
            settings['communication_style'] = '\n'.join(comm_style_parts)
    
    # === ЭМОДЗИ ===
    if 'эмодзи' in content.lower():
        # Поищем правила использования
        settings['emoji_usage'] = 'Умеренное использование (2-3 эмодзи на сообщение). Только уместные эмодзи (💎✨💅🏻💖😊). НЕ перегружай сообщения.'
    
    # === ЯЗЫКИ ===
    if 'РУССКИЙ (основной)' in content:
        settings['languages_supported'] = 'ru,en,ar'  # Дефолт
    
    # === ВОЗРАЖЕНИЯ ===
    if '[РАБОТА С ВОЗРАЖЕНИЯМИ]' in content or 'ВОЗРАЖЕНИЕ:' in content:
        section_start = content.find('ВОЗРАЖЕНИЕ:')
        section_end = content.find('[РАБОТА С НЕГАТИВОМ]', section_start)
        if section_end == -1:
            section_end = content.find('[НЕ ДЕЛАЙ', section_start)
        if section_end != -1:
            settings['objection_handling'] = content[section_start:section_end].strip()
    
    # === НЕГАТИВ ===
    if '[ОБРАБОТКА НЕГАТИВА]' in content or '[РАБОТА С НЕГАТИВОМ]' in content:
        section_start = content.find('[РАБОТА С НЕГАТИВОМ]')
        if section_start == -1:
            section_start = content.find('[ОБРАБОТКА НЕГАТИВА]')
        section_end = content.find('[БЕЗОПАСНОСТЬ', section_start)
        if section_end == -1:
            section_end = content.find('[НЕ ДЕЛАЙ', section_start)
        if section_end != -1:
            settings['negative_handling'] = content[section_start:section_end].strip()
    
    # === БЕЗОПАСНОСТЬ ===
    if 'ЗАПРЕЩЕНО:' in content:
        section_start = content.find('ЗАПРЕЩЕНО:')
        section_end = content.find('ОБЯЗАТЕЛЬНО:', section_start)
        if section_end != -1:
            # Берём и ЗАПРЕЩЕНО и ОБЯЗАТЕЛЬНО
            section_end2 = content.find('[', section_end + 200)  # Ищем следующую секцию
            settings['safety_guidelines'] = content[section_start:section_end2].strip()
    
    # === ПРИМЕРЫ ===
    if '[ПРИМЕРЫ ХОРОШИХ ОТВЕТОВ]' in content or '✅ ОТЛИЧНО:' in content:
        section_start = content.find('✅ ОТЛИЧНО:')
        section_end = content.find('ПРАВИЛО:', section_start)
        if section_end == -1:
            section_end = content.find('[АЛГОРИТМ', section_start)
        if section_end != -1:
            settings['example_good_responses'] = content[section_start:section_end].strip()
    
    # === АЛГОРИТМ ===
    if '[АЛГОРИТМ ДЕЙСТВИЙ]' in content or 'ЭТАП 1:' in content:
        section_start = content.find('ЭТАП 1:')
        section_end = content.find('[ЛОКАЦИЯ', section_start)
        if section_end == -1:
            section_end = content.find('ВАЖНО:', section_start)
        if section_end != -1:
            settings['algorithm_actions'] = content[section_start:section_end].strip()
    
    # === ЛОКАЦИЯ ===
    if '[ЛОКАЦИЯ' in content:
        section_start = content.find('[ЛОКАЦИЯ')
        section_end = content.find('[СЕЗОННОСТЬ]', section_start)
        if section_end == -1:
            section_end = content.find('[', section_start + 100)
        if section_end != -1:
            settings['location_features'] = content[section_start:section_end].strip()
    
    # === СЕЗОННОСТЬ ===
    if '[СЕЗОННОСТЬ]' in content:
        section_start = content.find('[СЕЗОННОСТЬ]')
        section_end = content.find('[ЭКСТРЕННЫЕ', section_start)
        if section_end == -1:
            section_end = content.find('[', section_start + 100)
        if section_end != -1:
            settings['seasonality'] = content[section_start:section_end].strip()
    
    # === ЭКСТРЕННЫЕ ===
    if '[ЭКСТРЕННЫЕ СИТУАЦИИ]' in content:
        section_start = content.find('[ЭКСТРЕННЫЕ СИТУАЦИИ]')
        section_end = content.find('[МЕТРИКИ', section_start)
        if section_end == -1:
            section_end = content.find('[', section_start + 100)
        if section_end != -1:
            settings['emergency_situations'] = content[section_start:section_end].strip()
    
    # === МЕТРИКИ ===
    if '[МЕТРИКИ УСПЕХА]' in content:
        section_start = content.find('[МЕТРИКИ УСПЕХА]')
        section_end = content.find('=== КОНЕЦ', section_start)
        if section_end == -1:
            section_end = len(content)
        settings['success_metrics'] = content[section_start:section_end].strip()
    
    return settings


def load_default_settings():
    """Загрузить дефолтные настройки из bot_config.py"""
    try:
        import sys
        sys.path.append('.')
        from bot_config import BOT_DEFAULT_SETTINGS, SALON_DEFAULT_SETTINGS
        return BOT_DEFAULT_SETTINGS, SALON_DEFAULT_SETTINGS
    except ImportError:
        print("⚠️  Не удалось импортировать bot_config.py")
        return None, None


def create_tables(conn):
    """Создать таблицы если их нет"""
    c = conn.cursor()
    
    # Таблица salon_settings
    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        name_ar TEXT,
        address TEXT,
        address_ar TEXT,
        google_maps TEXT,
        hours TEXT,
        hours_ru TEXT,
        hours_ar TEXT,
        booking_url TEXT,
        phone TEXT,
        email TEXT,
        instagram TEXT,
        whatsapp TEXT,
        bot_name TEXT,
        bot_name_en TEXT,
        bot_name_ar TEXT,
        city TEXT,
        country TEXT,
        timezone TEXT,
        currency TEXT DEFAULT 'AED',
        updated_at TEXT
    )''')
    
    # Таблица bot_settings
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
        max_message_length INTEGER DEFAULT 4,
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
        updated_at TEXT
    )''')
    
    conn.commit()


def migrate_settings():
    """
    Главная функция миграции:
    1. Парсит bot_instructions_file.txt
    2. Берёт дефолты из bot_config.py
    3. Заполняет БД
    """
    
    print("=" * 70)
    print("🚀 МИГРАЦИЯ НАСТРОЕК БОТА В БД")
    print("=" * 70)
    print()
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ База данных {DATABASE_NAME} не найдена!")
        print("   Сначала запустите: python main.py (чтобы создать БД)")
        return 1
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Создать таблицы
    print("📋 Создаю таблицы...")
    create_tables(conn)
    
    # Проверить не заполнены ли уже настройки
    c.execute("SELECT COUNT(*) FROM bot_settings")
    if c.fetchone()[0] > 0:
        print("⚠️  Настройки бота уже существуют в БД!")
        print()
        response = input("   Перезаписать? (yes/no): ")
        if response.lower() not in ['yes', 'y', 'да']:
            print("❌ Миграция отменена")
            conn.close()
            return 0
        print()
    
    # === ШАГ 1: Парсим bot_instructions_file.txt ===
    print("📖 Читаю bot_instructions_file.txt...")
    parsed_settings = parse_instructions_file()
    
    if parsed_settings:
        print(f"   ✅ Извлечено {len(parsed_settings)} настроек из файла")
    else:
        print("   ⚠️  Файл не найден или пуст")
    
    # === ШАГ 2: Загружаем дефолты из bot_config.py ===
    print("📖 Читаю bot_config.py...")
    bot_defaults, salon_defaults = load_default_settings()
    
    if bot_defaults:
        print(f"   ✅ Загружено {len(bot_defaults)} дефолтных настроек")
    else:
        print("   ⚠️  bot_config.py не найден")
    
    # === ШАГ 3: Мержим (приоритет: parsed > defaults) ===
    print()
    print("🔧 Объединяю настройки...")
    
    final_settings = {}
    
    # Начинаем с дефолтов
    if bot_defaults:
        final_settings = bot_defaults.copy()
    
    # Перезаписываем тем что нашли в файле
    if parsed_settings:
        final_settings.update(parsed_settings)
    
    # === ШАГ 4: Заполняем salon_settings ===
    if salon_defaults:
        print("💾 Заполняю salon_settings...")
        now = datetime.now().isoformat()
        
        c.execute("""INSERT OR REPLACE INTO salon_settings (
            id, name, name_ar, address, address_ar, google_maps,
            hours, hours_ru, hours_ar, booking_url, phone, email,
            instagram, whatsapp, bot_name, bot_name_en, bot_name_ar,
            city, country, timezone, currency, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            salon_defaults.get('name'),
            salon_defaults.get('name_ar'),
            salon_defaults.get('address'),
            salon_defaults.get('address_ar'),
            salon_defaults.get('google_maps'),
            salon_defaults.get('hours'),
            salon_defaults.get('hours_ru'),
            salon_defaults.get('hours_ar'),
            salon_defaults.get('booking_url'),
            salon_defaults.get('phone'),
            salon_defaults.get('email'),
            salon_defaults.get('instagram'),
            salon_defaults.get('whatsapp'),
            salon_defaults.get('bot_name'),
            salon_defaults.get('bot_name_en'),
            salon_defaults.get('bot_name_ar'),
            salon_defaults.get('city'),
            salon_defaults.get('country'),
            salon_defaults.get('timezone'),
            salon_defaults.get('currency'),
            now
        ))
        print("   ✅ salon_settings заполнена")
    
    # === ШАГ 5: Заполняем bot_settings ===
    print("💾 Заполняю bot_settings...")
    now = datetime.now().isoformat()
    
    c.execute("""INSERT OR REPLACE INTO bot_settings (
        id, bot_name, personality_traits, greeting_message, farewell_message,
        price_explanation, price_response_template, premium_justification,
        booking_redirect_message, fomo_messages, upsell_techniques,
        communication_style, max_message_length, emoji_usage, languages_supported,
        objection_handling, negative_handling, safety_guidelines,
        example_good_responses, algorithm_actions, location_features,
        seasonality, emergency_situations, success_metrics, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (
        final_settings.get('bot_name', 'Diamant Assistant'),
        final_settings.get('personality_traits', ''),
        final_settings.get('greeting_message', ''),
        final_settings.get('farewell_message', ''),
        final_settings.get('price_explanation', ''),
        final_settings.get('price_response_template', ''),
        final_settings.get('premium_justification', ''),
        final_settings.get('booking_redirect_message', ''),
        final_settings.get('fomo_messages', ''),
        final_settings.get('upsell_techniques', ''),
        final_settings.get('communication_style', ''),
        final_settings.get('max_message_length', 4),
        final_settings.get('emoji_usage', ''),
        final_settings.get('languages_supported', 'ru,en,ar'),
        final_settings.get('objection_handling', ''),
        final_settings.get('negative_handling', ''),
        final_settings.get('safety_guidelines', ''),
        final_settings.get('example_good_responses', ''),
        final_settings.get('algorithm_actions', ''),
        final_settings.get('location_features', ''),
        final_settings.get('seasonality', ''),
        final_settings.get('emergency_situations', ''),
        final_settings.get('success_metrics', ''),
        now
    ))
    
    conn.commit()
    print("   ✅ bot_settings заполнена")
    
    # === Финал ===
    print()
    print("=" * 70)
    print("✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
    print("=" * 70)
    print()
    print("📋 Что дальше:")
    print("   1. Запустите сервер: uvicorn main:app --reload")
    print("   2. Откройте админ-панель: /admin/bot-settings")
    print("   3. Отредактируйте настройки через UI")
    print()
    print("⚠️  ВАЖНО:")
    print("   • БД теперь единственный источник истины")
    print("   • Бот читает настройки ТОЛЬКО из БД")
    print("   • bot_instructions_file.txt больше не используется")
    print("   • bot_config.py больше не используется (только для дефолтов)")
    print()
    print("=" * 70)
    
    conn.close()
    return 0


if __name__ == "__main__":
    exit(migrate_settings())