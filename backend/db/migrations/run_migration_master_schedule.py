#!/usr/bin/env python3
"""
Миграция: Добавление системы расписания мастеров
"""
from db.connection import get_db_connection
import os
import sys
from datetime import datetime

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
    print("🔧 Creating master schedule tables...")

    # Таблица рабочих часов мастера
    c.execute("""
        CREATE TABLE IF NOT EXISTS master_schedule (
            id SERIAL PRIMARY KEY,
            master_name TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,  -- 0=Пн, 6=Вс
            start_time TEXT,               -- HH:MM (NULL = выходной день)
            end_time TEXT,                 -- HH:MM (NULL = выходной день)
            is_active INTEGER DEFAULT 1,   -- Активна ли эта смена
            created_at TEXT,
            updated_at TEXT
        )
    """)
    print("✅ master_schedule table created")

    # Таблица выходных и отпусков
    c.execute("""
        CREATE TABLE IF NOT EXISTS master_time_off (
            id SERIAL PRIMARY KEY,
            master_name TEXT NOT NULL,
            start_date TEXT NOT NULL,      -- YYYY-MM-DD
            end_date TEXT NOT NULL,        -- YYYY-MM-DD
            type TEXT NOT NULL,            -- 'vacation', 'sick_leave', 'day_off'
            reason TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)
    print("✅ master_time_off table created")

    # Таблица доступных слотов времени (для быстрого поиска)
    c.execute("""
        CREATE TABLE IF NOT EXISTS available_slots (
            id SERIAL PRIMARY KEY,
            master_name TEXT NOT NULL,
            date TEXT NOT NULL,            -- YYYY-MM-DD
            time TEXT NOT NULL,            -- HH:MM
            duration_minutes INTEGER DEFAULT 60,
            is_available INTEGER DEFAULT 1,
            booking_id INTEGER,            -- Ссылка на запись, если занят
            created_at TEXT,
            UNIQUE(master_name, date, time)
        )
    """)
    print("✅ available_slots table created")

    conn.commit()
    print("\n🎉 Master schedule migration completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    conn.close()
    raise  # Пробрасываем исключение дальше для корректной обработки в run_all_migrations
finally:
    conn.close()
