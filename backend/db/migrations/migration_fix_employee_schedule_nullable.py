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
    c = conn.cursor()

    try:
        print("🔧 Fixing employee_schedule table to allow NULL times...")

        # PostgreSQL way to allow NULL
        c.execute("ALTER TABLE employee_schedule ALTER COLUMN start_time DROP NOT NULL")
        c.execute("ALTER TABLE employee_schedule ALTER COLUMN end_time DROP NOT NULL")
        
        print("✅ Columns start_time and end_time are now nullable")

        conn.commit()
        print("\n🎉 employee_schedule table fixed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
