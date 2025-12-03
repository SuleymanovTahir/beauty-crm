#!/usr/bin/env python3
"""
Миграция: Исправление employee_schedule - разрешить NULL для start_time/end_time
Это позволит хранить выходные дни (когда мастер не работает)
"""
from db.connection import get_db_connection
import os
import sys

# Получаем DATABASE_NAME из конфига
if 'DATABASE_NAME' not in globals():
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from core.config import DATABASE_NAME

def migrate():
    conn = get_db_connection()
    # Включаем FK для проверки целостности при пересоздании
    conn.execute("PRAGMA foreign_keys = ON")
    c = conn.cursor()

    try:
        print("🔧 Fixing employee_schedule table to allow NULL times...")

        # Проверяем существует ли таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_schedule'")
        if not c.fetchone():
            print("⚠️ Table employee_schedule not found!")
            return

        print("📋 Backing up existing data...")
        
        # Сохраняем существующие данные
        c.execute("SELECT * FROM employee_schedule")
        existing_data = c.fetchall()

        # Отключаем FK временно для пересоздания таблицы
        conn.execute("PRAGMA foreign_keys = OFF")

        # Удаляем старую таблицу
        c.execute("DROP TABLE employee_schedule")
        print("✅ Old table dropped")

        # Создаем новую таблицу с правильной структурой (start_time/end_time без NOT NULL)
        c.execute("""
            CREATE TABLE employee_schedule (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT,
                end_time TEXT,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        """)
        print("✅ New table created with nullable start_time/end_time")

        # Восстанавливаем данные
        if existing_data:
            # Нужно быть аккуратным с количеством колонок. 
            # В старой таблице: id, employee_id, day_of_week, start_time, end_time, is_active
            # В новой так же.
            c.executemany("""
                INSERT INTO employee_schedule
                (id, employee_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, existing_data)
            print(f"✅ Restored {len(existing_data)} existing records")

        conn.commit()
        print("\n🎉 employee_schedule table fixed successfully!")
        print("ℹ️  Now you can set NULL for start_time/end_time to mark days off")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
