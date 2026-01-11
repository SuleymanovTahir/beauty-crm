"""
Migration for Admin Features: Loyalty Tiers, Notifications, Settings, Gallery
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migrate_admin_features_schema():
    """Создать/обновить таблицы для админских функций"""
    log_info("🔧 Миграция схемы Admin Features (Loyalty, Notifications, Settings)...", "migration")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. LOYALTY TIERS
        c.execute("""
            CREATE TABLE IF NOT EXISTS loyalty_tiers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                min_points INTEGER DEFAULT 0,
                discount NUMERIC(5,2) DEFAULT 0,
                color VARCHAR(20) DEFAULT '#CD7F32',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Seed default tiers
        c.execute("SELECT COUNT(*) FROM loyalty_tiers")
        if c.fetchone()[0] == 0:
            default_tiers = [
                ('Bronze', 0, 0, '#CD7F32'),
                ('Silver', 1000, 5, '#C0C0C0'),
                ('Gold', 5000, 10, '#FFD700'),
                ('Platinum', 10000, 15, '#E5E4E2')
            ]
            for tier in default_tiers:
                c.execute("INSERT INTO loyalty_tiers (name, min_points, discount, color) VALUES (%s, %s, %s, %s)", tier)
            log_info("✅ Seeded default loyalty tiers", "migration")

        # Add transaction_type to loyalty_transactions if missing
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='loyalty_transactions'")
        lt_cols = {row[0] for row in c.fetchall()}
        if 'transaction_type' not in lt_cols:
            c.execute("ALTER TABLE loyalty_transactions ADD COLUMN transaction_type VARCHAR(20) DEFAULT 'adjust'")
            print("  ➕ Added transaction_type to loyalty_transactions")
        if 'points' not in lt_cols:
            # Code uses .points instead of .amount in some places? 
            # Let's check admin_features.py lines 309, 332
            # Yes, it uses 'points'. Let's rename amount or add points as alias.
            # Usually better to add column or rename.
            if 'amount' in lt_cols:
                 c.execute("ALTER TABLE loyalty_transactions RENAME COLUMN amount TO points")
                 print("  🔧 Renamed amount to points in loyalty_transactions")
            else:
                 c.execute("ALTER TABLE loyalty_transactions ADD COLUMN points INTEGER DEFAULT 0")
                 print("  ➕ Added points to loyalty_transactions")

        # 2. NOTIFICATIONS
        c.execute("""
            CREATE TABLE IF NOT EXISTS notification_history (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                message TEXT,
                notification_type VARCHAR(20) DEFAULT 'push',
                recipients_count INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP
            )
        """)
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS notification_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                message TEXT,
                notification_type VARCHAR(20) DEFAULT 'push',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 3. SETTINGS
        c.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4. REFERRALS (Add status column if missing)
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='client_referrals'")
        ref_cols = {row[0] for row in c.fetchall()}
        if 'status' not in ref_cols:
            c.execute("ALTER TABLE client_referrals ADD COLUMN status VARCHAR(20) DEFAULT 'pending'")
            print("  ➕ Added status to client_referrals")
        if 'points_awarded' not in ref_cols:
            c.execute("ALTER TABLE client_referrals ADD COLUMN points_awarded INTEGER DEFAULT 0")
            print("  ➕ Added points_awarded to client_referrals")
        if 'completed_at' not in ref_cols:
            c.execute("ALTER TABLE client_referrals ADD COLUMN completed_at TIMESTAMP")
            print("  ➕ Added completed_at to client_referrals")

        # 5. GALLERY (Advanced)
        c.execute("""
            CREATE TABLE IF NOT EXISTS gallery_photos (
                id SERIAL PRIMARY KEY,
                url VARCHAR(500) NOT NULL,
                title VARCHAR(255),
                description TEXT,
                category VARCHAR(50) DEFAULT 'other',
                uploaded_by VARCHAR(255),
                client_id TEXT REFERENCES clients(instagram_id) ON DELETE SET NULL,
                is_featured BOOLEAN DEFAULT FALSE,
                views INTEGER DEFAULT 0,
                before_photo_url VARCHAR(500),
                after_photo_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indices
        c.execute("CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_gallery_photos_featured ON gallery_photos(is_featured)")

        conn.commit()
        log_info("✅ Схема Admin Features верифицирована", "migration")
        return True
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции Admin Features: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_admin_features_schema()
