#!/usr/bin/env python3
# migrate_bot_settings.py
# Скрипт для добавления новых колонок в таблицу bot_settings

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

# Список новых колонок с дефолтными значениями
new_columns = [
    ("price_response_template", "TEXT", None),
    ("booking_redirect_message", "TEXT", None),
    ("premium_justification", "TEXT", None),
    ("fomo_messages", "TEXT", None),
    ("upsell_techniques", "TEXT", None),
    ("languages_supported", "TEXT", "'ru,en,ar'"),
    ("emoji_usage", "TEXT", None),
    ("objection_handling", "TEXT", None),
    ("safety_guidelines", "TEXT", None),
    ("example_good_responses", "TEXT", None),
    ("algorithm_actions", "TEXT", None),
    ("negative_handling", "TEXT", None),
    ("location_features", "TEXT", None),
    ("seasonality", "TEXT", None),
    ("emergency_situations", "TEXT", None),
    ("success_metrics", "TEXT", None)
]

print("🔄 Начинаем миграцию...\n")

success_count = 0
skip_count = 0
error_count = 0

# Добавляем каждую колонку
for column_name, column_type, default_value in new_columns:
    try:
        if default_value:
            sql = f"ALTER TABLE bot_settings ADD COLUMN {column_name} {column_type} DEFAULT {default_value}"
        else:
            sql = f"ALTER TABLE bot_settings ADD COLUMN {column_name} {column_type}"
        
        c.execute(sql)
        print(f"✅ Добавлена колонка: {column_name} ({column_type})")
        success_count += 1
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"⚠️  Колонка уже существует: {column_name}")
            skip_count += 1
        else:
            print(f"❌ Ошибка при добавлении {column_name}: {e}")
            error_count += 1

conn.commit()

print("\n" + "=" * 70)
print("📊 Результаты миграции:")
print(f"   ✅ Успешно добавлено: {success_count} колонок")
print(f"   ⚠️  Уже существовало:  {skip_count} колонок")
print(f"   ❌ Ошибок:            {error_count}")

# Проверяем финальную структуру таблицы
print("\n" + "=" * 70)
print("🔍 Проверка структуры таблицы bot_settings:\n")

c.execute("PRAGMA table_info(bot_settings)")
columns = c.fetchall()

print(f"📋 Всего колонок: {len(columns)}\n")
for col in columns:
    col_id, col_name, col_type, not_null, default_val, pk = col
    default_str = f" DEFAULT {default_val}" if default_val else ""
    print(f"   {col_id:2d}. {col_name:30s} {col_type:10s}{default_str}")

conn.close()

print("\n" + "=" * 70)
if error_count == 0:
    print("✅ Миграция успешно завершена!")
else:
    print("⚠️  Миграция завершена с ошибками. Проверьте вывод выше.")

print("\n💡 Теперь можно запустить приложение:")
print("   python main.py")
print("=" * 70)