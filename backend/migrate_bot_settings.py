#!/usr/bin/env python3
# fix_bot_settings_table.py
# ========================================
# ИСПРАВЛЕНИЕ СТРУКТУРЫ ТАБЛИЦЫ bot_settings
# ========================================

import sqlite3
import os
from datetime import datetime

DATABASE_NAME = os.getenv("DATABASE_NAME", "salon_bot.db")

# Список всех необходимых колонок
REQUIRED_COLUMNS = [
    ('bot_name', 'TEXT NOT NULL'),
    ('personality_traits', 'TEXT'),
    ('greeting_message', 'TEXT'),
    ('farewell_message', 'TEXT'),
    ('price_explanation', 'TEXT'),
    ('price_response_template', 'TEXT'),  # ← Эта колонка отсутствует
    ('premium_justification', 'TEXT'),
    ('booking_redirect_message', 'TEXT'),
    ('fomo_messages', 'TEXT'),
    ('upsell_techniques', 'TEXT'),
    ('communication_style', 'TEXT'),
    ('max_message_length', 'INTEGER DEFAULT 4'),
    ('emoji_usage', 'TEXT'),
    ('languages_supported', 'TEXT DEFAULT "ru,en,ar"'),
    ('objection_handling', 'TEXT'),
    ('negative_handling', 'TEXT'),
    ('safety_guidelines', 'TEXT'),
    ('example_good_responses', 'TEXT'),
    ('algorithm_actions', 'TEXT'),
    ('location_features', 'TEXT'),
    ('seasonality', 'TEXT'),
    ('emergency_situations', 'TEXT'),
    ('success_metrics', 'TEXT'),
    ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
]

def get_existing_columns(conn, table_name):
    """Получить список существующих колонок"""
    c = conn.cursor()
    c.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in c.fetchall()]
    return columns

def add_missing_columns(conn, table_name):
    """Добавить недостающие колонки"""
    c = conn.cursor()
    
    existing_columns = get_existing_columns(conn, table_name)
    print(f"📋 Существующие колонки: {len(existing_columns)}")
    
    added = 0
    for col_name, col_type in REQUIRED_COLUMNS:
        if col_name not in existing_columns:
            print(f"   ➕ Добавляю колонку: {col_name}")
            try:
                c.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                conn.commit()
                added += 1
            except sqlite3.OperationalError as e:
                print(f"   ⚠️  Ошибка добавления {col_name}: {e}")
    
    return added

def recreate_table(conn):
    """Пересоздать таблицу с правильной структурой"""
    c = conn.cursor()
    
    print("🔄 Создаю резервную копию данных...")
    
    # Сохраняем существующие данные
    c.execute("SELECT * FROM bot_settings")
    old_data = c.fetchone()
    
    print("🗑️  Удаляю старую таблицу...")
    c.execute("DROP TABLE IF EXISTS bot_settings")
    
    print("📦 Создаю новую таблицу с правильной структурой...")
    c.execute('''CREATE TABLE bot_settings (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    if old_data:
        print("💾 Восстанавливаю данные...")
        # Восстанавливаем то что можно
        # (используем только те колонки которые были в старой таблице)
        c.execute("""INSERT INTO bot_settings 
                     (id, bot_name, personality_traits, greeting_message, 
                      farewell_message, price_explanation)
                     VALUES (1, ?, ?, ?, ?, ?)""",
                  (old_data[1] if len(old_data) > 1 else 'Diamant Assistant',
                   old_data[2] if len(old_data) > 2 else None,
                   old_data[3] if len(old_data) > 3 else None,
                   old_data[4] if len(old_data) > 4 else None,
                   old_data[5] if len(old_data) > 5 else None))
    
    conn.commit()
    print("✅ Таблица пересоздана!")

def main():
    print("=" * 70)
    print("🔧 ИСПРАВЛЕНИЕ СТРУКТУРЫ ТАБЛИЦЫ bot_settings")
    print("=" * 70)
    print(f"📂 База данных: {DATABASE_NAME}\n")
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ База данных {DATABASE_NAME} не найдена!")
        return 1
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Проверяем существует ли таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bot_settings'")
        if not c.fetchone():
            print("⚠️  Таблица bot_settings не существует!")
            print("   Запустите: python migrate_bot_settings.py")
            conn.close()
            return 1
        
        print("📋 Проверяю структуру таблицы...\n")
        
        existing_columns = get_existing_columns(conn, 'bot_settings')
        required_column_names = [col[0] for col in REQUIRED_COLUMNS]
        missing_columns = [col for col in required_column_names if col not in existing_columns]
        
        print(f"✅ Существующих колонок: {len(existing_columns)}")
        print(f"📌 Требуется колонок: {len(required_column_names)}")
        print(f"❌ Отсутствует колонок: {len(missing_columns)}\n")
        
        if not missing_columns:
            print("✅ Все колонки на месте! Исправление не требуется.")
            conn.close()
            return 0
        
        print("🔍 Отсутствующие колонки:")
        for col in missing_columns:
            print(f"   • {col}")
        print()
        
        # Предлагаем варианты исправления
        print("Выберите метод исправления:")
        print("1) Добавить недостающие колонки (рекомендуется)")
        print("2) Пересоздать таблицу (все данные будут потеряны!)")
        print("3) Отмена")
        
        choice = input("\nВаш выбор (1/2/3): ").strip()
        
        if choice == '1':
            print("\n🔧 Добавляю недостающие колонки...\n")
            added = add_missing_columns(conn, 'bot_settings')
            print(f"\n✅ Добавлено колонок: {added}")
            
        elif choice == '2':
            confirm = input("\n⚠️  ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ! Продолжить? (yes/no): ").strip().lower()
            if confirm == 'yes':
                recreate_table(conn)
            else:
                print("❌ Отменено")
                conn.close()
                return 1
                
        else:
            print("❌ Отменено")
            conn.close()
            return 1
        
        # Проверка
        print("\n🔍 Финальная проверка...\n")
        existing_columns = get_existing_columns(conn, 'bot_settings')
        missing_columns = [col for col in required_column_names if col not in existing_columns]
        
        print(f"✅ Колонок в таблице: {len(existing_columns)}")
        print(f"❌ Отсутствует: {len(missing_columns)}")
        
        if not missing_columns:
            print("\n" + "=" * 70)
            print("✅ СТРУКТУРА ТАБЛИЦЫ ИСПРАВЛЕНА!")
            print("=" * 70)
            print("\n📋 Следующие шаги:")
            print("1. Запустите: python migrate_bot_settings.py")
            print("2. Выберите 'y' для обновления данных")
            print("=" * 70 + "\n")
        else:
            print(f"\n⚠️  Всё ещё отсутствуют колонки: {missing_columns}")
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())