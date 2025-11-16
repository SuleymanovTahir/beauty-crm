#!/usr/bin/env python3
"""
Миграция: Исправление master_schedule - разрешить NULL для start_time/end_time
Это позволит хранить выходные дни (когда мастер не работает)
"""
import sqlite3
import os

# Путь к базе данных (относительно папки migrations)
DATABASE_NAME = os.path.join(os.path.dirname(__file__), '..', '..', 'salon_bot.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    print("🔧 Fixing master_schedule table to allow NULL times...")

    # Проверяем существует ли таблица
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='master_schedule'")
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, existing_data)
            print(f"✅ Restored {len(existing_data)} existing records")
    else:
        # Таблицы нет - создаем с нуля
        c.execute("""
            CREATE TABLE master_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
finally:
    conn.close()
