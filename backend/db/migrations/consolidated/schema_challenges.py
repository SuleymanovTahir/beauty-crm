"""
Migration for active challenges table
"""
from db.connection import get_db_connection
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def migrate_challenges_schema(db_path=DATABASE_NAME):
    """Создать/обновить таблицу active_challenges"""
    log_info("🔧 Миграция схемы active_challenges...", "migration")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            CREATE TABLE IF NOT EXISTS active_challenges (
                id SERIAL PRIMARY KEY,
                title_ru TEXT NOT NULL,
                title_en TEXT,
                description_ru TEXT,
                description_en TEXT,
                bonus_points INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        log_info("✅ Таблица active_challenges создана/верифицирована", "migration")
        
        # Seed default challenge if empty
        c.execute("SELECT COUNT(*) FROM active_challenges")
        if c.fetchone()[0] == 0:
            c.execute("""
                INSERT INTO active_challenges (title_ru, title_en, description_ru, description_en, bonus_points)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                "Запишитесь на этой неделе", 
                "Book this week", 
                "Получите 50 бонусных баллов за любую процедуру до конца недели", 
                "Get 50 bonus points for any procedure until the end of the week", 
                50
            ))
            log_info("✅ Seeded default challenge", "migration")
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции active_challenges: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_challenges_schema()
