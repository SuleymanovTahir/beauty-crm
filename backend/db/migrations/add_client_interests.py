"""
Миграция: Таблица интересов клиентов (#5 - Отслеживание горячих клиентов)
"""
import sqlite3
from config import DATABASE_NAME
from logger import log_info, log_error

def add_client_interests_table():
    """Создать таблицу client_interests"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("🔧 Adding client_interests table...", "migration")
        
        c.execute('''CREATE TABLE IF NOT EXISTS client_interests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            service_name TEXT NOT NULL,
            interest_count INTEGER DEFAULT 1,
            last_asked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )''')
        
        # Индекс для быстрого поиска
        c.execute('''CREATE INDEX IF NOT EXISTS idx_client_interests_lookup 
                     ON client_interests(client_id, service_name)''')
        
        conn.commit()
        log_info("✅ client_interests table created", "migration")
        
    except Exception as e:
        log_error(f"❌ Error creating client_interests table: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()