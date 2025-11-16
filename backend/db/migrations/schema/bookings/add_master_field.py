"""
Миграция: Добавление поля master в таблицу bookings
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def add_master_field_to_bookings():
    """Добавить поле master в таблицу bookings"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("🔧 Adding master field to bookings...", "migration")
        
        # Проверяем есть ли уже поле
        c.execute("PRAGMA table_info(bookings)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'master' not in columns:
            c.execute("ALTER TABLE bookings ADD COLUMN master TEXT")
            log_info("✅ master field added to bookings", "migration")
        else:
            log_info("⏭️ master field already exists", "migration")
        
        conn.commit()
        
    except Exception as e:
        log_error(f"❌ Error adding master field: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_master_field_to_bookings()