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
                challenge_type VARCHAR(50) DEFAULT 'visits',
                target_value INTEGER DEFAULT 0,
                bonus_points INTEGER DEFAULT 0,
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Add missing columns if table already exists
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='active_challenges'")
        existing_cols = {row[0] for row in c.fetchall()}
        
        challenges_new_cols = {
            'challenge_type': "VARCHAR(50) DEFAULT 'visits'",
            'target_value': 'INTEGER DEFAULT 0',
            'start_date': 'DATE',
            'end_date': 'DATE'
        }
        
        for col, col_type in challenges_new_cols.items():
            if col not in existing_cols:
                print(f"  ➕ Adding column to active_challenges: {col}")
                c.execute(f"ALTER TABLE active_challenges ADD COLUMN {col} {col_type}")

        # Create challenge_progress table
        c.execute("""
            CREATE TABLE IF NOT EXISTS challenge_progress (
                id SERIAL PRIMARY KEY,
                challenge_id INTEGER REFERENCES active_challenges(id) ON DELETE CASCADE,
                client_id TEXT REFERENCES clients(instagram_id) ON DELETE CASCADE,
                current_value INTEGER DEFAULT 0,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(challenge_id, client_id)
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_challenge_progress_client ON challenge_progress(client_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id)")
        
        log_info("✅ Таблицы челленджей верифицированы", "migration")
        
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
