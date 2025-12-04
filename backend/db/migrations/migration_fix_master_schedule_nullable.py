#!/usr/bin/env python3
"""
Миграция: Исправление master_schedule - разрешить NULL для start_time/end_time
Это позволит хранить выходные дни (когда мастер не работает)
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
    print("🔧 Fixing master_schedule table to allow NULL times...")

    # Проверяем существует ли таблица
    c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' AND tablename='master_schedule'")
    if c.fetchone():
        print("📋 Backing up existing data...")

        # Сохраняем существующие данные
        c.execute("SELECT * FROM master_schedule")
        existing_data = c.fetchall()

        # Удаляем старую таблицу
        c.execute("DROP TABLE master_schedule")
        print("✅ Old table dropped")

        # Создаем новую таблицу с правильной структурой
        c.execute("""
            CREATE TABLE master_schedule (
                id SERIAL PRIMARY KEY,
                master_name TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT,
                end_time TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        print("✅ New table created with nullable start_time/end_time")

        # Восстанавливаем данные
        if existing_data:
            c.executemany("""
                INSERT INTO master_schedule
                (id, master_name, day_of_week, start_time, end_time, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, existing_data)
            print(f"✅ Restored {len(existing_data)} existing records")
    else:
        # Таблицы нет - создаем с нуля
        c.execute("""
            CREATE TABLE master_schedule (
                id SERIAL PRIMARY KEY,
                master_name TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT,
                end_time TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        print("✅ Created new master_schedule table")

    conn.commit()
    print("\n🎉 master_schedule table fixed successfully!")
    print("ℹ️  Now you can set NULL for start_time/end_time to mark days off")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
    conn.close()
    raise  # Пробрасываем исключение дальше для корректной обработки в run_all_migrations
finally:
    conn.close()
