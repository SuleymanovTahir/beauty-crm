"""
Миграция: Таблица листа ожидания (#17 - Умная очередь ожидания)
"""
import sqlite3
from config import DATABASE_NAME
from logger import log_info, log_error

def add_waitlist_table():
    """Создать таблицу booking_waitlist"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("🔧 Adding booking_waitlist table...", "migration")
        
        c.execute('''CREATE TABLE IF NOT EXISTS booking_waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            service TEXT NOT NULL,
            preferred_date DATE NOT NULL,
            preferred_time TIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notified INTEGER DEFAULT 0,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )''')
        
        # Индекс для быстрого поиска
        c.execute('''CREATE INDEX IF NOT EXISTS idx_waitlist_lookup 
                     ON booking_waitlist(service, preferred_date, preferred_time, notified)''')
        
        conn.commit()
        log_info("✅ booking_waitlist table created", "migration")
        
    except Exception as e:
        log_error(f"❌ Error creating booking_waitlist table: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()