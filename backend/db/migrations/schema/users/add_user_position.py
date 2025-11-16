"""
Миграция: Добавление поля position в таблицу users
Для отображения должностей сотрудников в админ-панели
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def add_user_position():
    """Добавить поле position в таблицу users"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Adding position field to users table...", "migration")

        # Проверяем есть ли уже поле
        c.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in c.fetchall()]

        if 'position' not in columns:
            c.execute("ALTER TABLE users ADD COLUMN position TEXT")
            log_info("✅ position field added to users", "migration")
        else:
            log_info("⏭️ position field already exists", "migration")

        conn.commit()

    except Exception as e:
        log_error(f"❌ Error adding position field: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_user_position()
