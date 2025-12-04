#!/usr/bin/env python3
"""
Простой скрипт для добавления поля telegram_chat_id
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
    # Проверяем, существует ли уже это поле
    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users'")
    columns = [col[1] for col in c.fetchall()]

    if 'telegram_chat_id' not in columns:
        # Добавляем поле
        c.execute("""
            ALTER TABLE users
            ADD COLUMN telegram_chat_id TEXT DEFAULT NULL
        """)
        conn.commit()
        print("✅ Поле telegram_chat_id добавлено в таблицу users")
    else:
        print("ℹ️  Поле telegram_chat_id уже существует")

except Exception as e:
    print(f"❌ Ошибка: {e}")
    conn.rollback()
    conn.close()
    raise  # Пробрасываем исключение дальше для корректной обработки в run_all_migrations
finally:
    conn.close()
