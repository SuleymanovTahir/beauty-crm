#!/usr/bin/env python3
# migrate_bot_settings.py
# Скрипт для создания/обновления таблицы bot_settings

import sqlite3
import os

# Путь к базе данных
DATABASE_NAME = 'salon_bot.db'

# Проверяем существование БД
if not os.path.exists(DATABASE_NAME):
    print(f"❌ База данных {DATABASE_NAME} не найдена!")
    print(f"   Убедитесь, что вы запускаете скрипт из директории backend/")
    exit(1)

print(f"✅ Найдена база данных: {DATABASE_NAME}")
print("=" * 70)

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

# ===== ШАГ 1: СОЗДАТЬ ТАБЛИЦУ ЕСЛИ ЕЁ НЕТ =====
print("\n📋 Шаг 1: Проверка существования таблицы bot_settings...")

try:
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bot_settings'")
    table_exists = c.fetchone() is not None
    
    if not table_exists:
        print("⚠️  Таблица bot_settings не найдена. Создаём...")
        
        c.execute('''CREATE TABLE bot_settings
                     (id INTEGER PRIMARY KEY,
                      bot_name TEXT,
                      personality_traits TEXT,
                      greeting_message TEXT,
                      farewell_message TEXT,
                      price_explanation TEXT,
                      salon_name TEXT,
                      salon_address TEXT,
                      salon_phone TEXT,
                      salon_hours TEXT,
                      booking_url TEXT,
                      google_maps_link TEXT,
                      communication_style TEXT,
                      max_message_length INTEGER DEFAULT 4,
                      price_response_template TEXT,
                      booking_redirect_message TEXT,
                      premium_justification TEXT,
                      fomo_messages TEXT,
                      upsell_techniques TEXT,
                      languages_supported TEXT DEFAULT 'ru,en,ar',
                      emoji_usage TEXT,
                      objection_handling TEXT,
                      safety_guidelines TEXT,
                      example_good_responses TEXT,
                      algorithm_actions TEXT,
                      negative_handling TEXT,
                      location_features TEXT,
                      seasonality TEXT,
                      emergency_situations TEXT,
                      success_metrics TEXT)''')
        
        conn.commit()
        print("✅ Таблица bot_settings успешно создана со всеми полями!")
        
        # Вставить дефолтные значения
        print("\n📝 Вставка дефолтных значений...")
        c.execute("""INSERT INTO bot_settings (id) VALUES (1)""")
        conn.commit()
        print("✅ Дефолтная запись создана (id=1)")
    else:
        print("✅ Таблица bot_settings уже существует")
        
except Exception as e:
    print(f"❌ Ошибка при создании таблицы: {e}")
    conn.rollback()