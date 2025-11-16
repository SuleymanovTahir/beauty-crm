#!/usr/bin/env python3
"""
Простой скрипт для добавления полей настроек уведомлений
"""
import sqlite3
import os

# Путь к базе данных
DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'salon_bot.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    # Проверяем, какие поля уже существуют
    c.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in c.fetchall()]

    fields_to_add = [
        ('notify_telegram', 'INTEGER DEFAULT 1'),
        ('notify_email', 'INTEGER DEFAULT 1'),
        ('notify_whatsapp', 'INTEGER DEFAULT 0'),
        ('notify_on_new_booking', 'INTEGER DEFAULT 1'),
        ('notify_on_booking_change', 'INTEGER DEFAULT 1'),
        ('notify_on_booking_cancel', 'INTEGER DEFAULT 1'),
    ]

    for field_name, field_type in fields_to_add:
        if field_name not in columns:
            c.execute(f"ALTER TABLE users ADD COLUMN {field_name} {field_type}")
            print(f"✅ Поле {field_name} добавлено в таблицу users")
        else:
            print(f"ℹ️  Поле {field_name} уже существует")

    conn.commit()
    print("\n✅ Миграция настроек уведомлений завершена успешно!")

except Exception as e:
    print(f"❌ Ошибка: {e}")
    conn.rollback()
finally:
    conn.close()
