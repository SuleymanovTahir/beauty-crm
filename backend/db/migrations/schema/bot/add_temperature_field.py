"""
Миграция: Поле temperature в clients (#21 - Сегментация по температуре)
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def add_temperature_field():
    """Добавить поле temperature в таблицу clients"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("🔧 Adding temperature field to clients...", "migration")
        
        # Проверяем есть ли уже поле
        c.execute("PRAGMA table_info(clients)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'temperature' not in columns:
            c.execute("ALTER TABLE clients ADD COLUMN temperature TEXT DEFAULT 'cold'")
            log_info("✅ temperature field added", "migration")
        else:
            log_info("⏭️ temperature field already exists", "migration")
        
        conn.commit()
        
    except Exception as e:
        log_error(f"❌ Error adding temperature field: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()