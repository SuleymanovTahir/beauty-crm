#!/usr/bin/env python3
"""
Простой скрипт для добавления поля preferred_messenger
"""
import sqlite3
import os

# Путь к базе данных
DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'beauty_crm.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    # Проверяем, существует ли уже это поле
    c.execute("PRAGMA table_info(clients)")
    columns = [col[1] for col in c.fetchall()]

    if 'preferred_messenger' not in columns:
        # Добавляем поле
        c.execute("""
            ALTER TABLE clients
            ADD COLUMN preferred_messenger TEXT DEFAULT NULL
        """)
        conn.commit()
        print("✅ Поле preferred_messenger добавлено в таблицу clients")
    else:
        print("ℹ️  Поле preferred_messenger уже существует")

except Exception as e:
    print(f"❌ Ошибка: {e}")
    conn.rollback()
finally:
    conn.close()
