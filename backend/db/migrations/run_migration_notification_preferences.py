#!/usr/bin/env python3
"""
Простой скрипт для добавления полей настроек уведомлений
"""
from db.connection import get_db_connection
import os
import sys

# Получаем DATABASE_NAME из конфига (если запускается напрямую)
# или используем переданный из run_all_migrations.py
if 'DATABASE_NAME' not in globals():
    # Добавляем backend в путь для импорта
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from core.config import DATABASE_NAME

conn = get_db_connection()
c = conn.cursor()

try:
    # Проверяем, какие поля уже существуют
    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users'")
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
    conn.close()
    raise  # Пробрасываем исключение дальше для корректной обработки в run_all_migrations
finally:
    conn.close()
