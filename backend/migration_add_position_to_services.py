#!/usr/bin/env python3
"""
Миграция: Добавление position_id в services

Позволяет указать какая должность мастера может выполнять услугу.
NULL или 0 = любой мастер может выполнять
"""
import sqlite3
import os
from datetime import datetime

DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'salon_bot.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    print("🔧 Adding position_id to services table...")

    # Проверяем есть ли уже колонка
    c.execute("PRAGMA table_info(services)")
    columns = [col[1] for col in c.fetchall()]

    if 'position_id' not in columns:
        # Добавляем новую колонку
        c.execute("""
            ALTER TABLE services
            ADD COLUMN position_id INTEGER DEFAULT NULL
        """)
        print("✅ Added position_id column to services")

        # Создаем индекс для быстрого поиска
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_services_position
            ON services(position_id)
        """)
        print("✅ Created index on position_id")

        conn.commit()
        print("\n🎉 Migration completed successfully!")
        print("ℹ️  Теперь вы можете указать должность для каждой услуги")
        print("ℹ️  NULL или 0 = любой мастер может выполнять")
    else:
        print("⚠️  Column position_id already exists")
        print("ℹ️  Миграция уже применена")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()
