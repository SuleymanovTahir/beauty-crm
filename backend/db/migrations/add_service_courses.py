"""
Миграция: Таблица курсовых процедур (#11 - Напоминание о курсовых процедурах)
"""
import sqlite3
from config import DATABASE_NAME
from logger import log_info, log_error

def add_service_courses_table():
    """Создать таблицу service_courses"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        log_info("🔧 Adding service_courses table...", "migration")
        
        c.execute('''CREATE TABLE IF NOT EXISTS service_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_name TEXT NOT NULL UNIQUE,
            total_sessions INTEGER NOT NULL,
            discount_percent REAL DEFAULT 0
        )''')
        
        # Добавляем примеры курсов
        courses = [
            ('Massage', 5, 15.0),
            ('Facial', 6, 20.0),
            ('Hair Treatment', 4, 10.0),
        ]
        
        for service, sessions, discount in courses:
            c.execute("""INSERT OR IGNORE INTO service_courses 
                         (service_name, total_sessions, discount_percent)
                         VALUES (?, ?, ?)""",
                      (service, sessions, discount))
        
        conn.commit()
        log_info("✅ service_courses table created with sample data", "migration")
        
    except Exception as e:
        log_error(f"❌ Error creating service_courses table: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()