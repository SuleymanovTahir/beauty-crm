#!/usr/bin/env python3
"""
Простой скрипт для добавления поля telegram_chat_id
"""
import sqlite3
import os

# Путь к базе данных
DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'salon_bot.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    # Проверяем, существует ли уже это поле
    c.execute("PRAGMA table_info(users)")
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
finally:
    conn.close()
