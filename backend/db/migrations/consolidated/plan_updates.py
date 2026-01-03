"""
Migration: Update plans table and add plan_metrics table
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migrate():
    print("🔧 MIGRATING PLANS SYSTEM...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Add comment column if not exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='plans' AND column_name='comment'
        """)
        if not c.fetchone():
            c.execute("ALTER TABLE plans ADD COLUMN comment TEXT")
            print("  ➕ Added 'comment' column to 'plans' table")

        # 2. Add category column if not exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='plans' AND column_name='category'
        """)
        if not c.fetchone():
            c.execute("ALTER TABLE plans ADD COLUMN category TEXT DEFAULT 'general'")
            print("  ➕ Added 'category' column to 'plans' table")

        # 3. Create plan_metrics table
        c.execute("""
            CREATE TABLE IF NOT EXISTS plan_metrics (
                id SERIAL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                name_ru TEXT,
                name_en TEXT,
                description TEXT,
                unit TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ plan_metrics table ensured")

        # 4. Insert default metrics
        default_metrics = [
            ('revenue', 'Доход', 'Revenue', 'AED'),
            ('bookings', 'Количество записей', 'Number of bookings', 'шт'),
            ('new_clients', 'Новые клиенты', 'New clients', 'чел'),
            ('average_check', 'Средний чек', 'Average check', 'AED'),
            ('active_clients', 'Активные клиенты', 'Active clients', 'чел'),
            ('sales', 'Продажи', 'Sales', 'AED')
        ]
        
        for key, name_ru, name_en, unit in default_metrics:
            c.execute("""
                INSERT INTO plan_metrics (key, name, name_ru, name_en, unit)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (key) DO NOTHING
            """, (key, name_en, name_ru, name_en, unit))
        
        conn.commit()
        print("✅ PLANS MIGRATION COMPLETED")
        return True
    except Exception as e:
        log_error(f"Error migrating plans: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
