"""
Миграция: Таблицы для интеграции с маркетплейсами
"""
from db.connection import get_db_connection
from utils.logger import log_info

def migrate_marketplace_integrations():
    """Создать таблицы для интеграций с маркетплейсами"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        log_info("🔧 Creating marketplace integration tables...", "migration")
        
        # Таблица провайдеров маркетплейсов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace_providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                api_key TEXT,
                api_secret TEXT,
                webhook_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                sync_enabled BOOLEAN DEFAULT FALSE,
                settings JSONB,
                last_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        log_info("✅ Table marketplace_providers created", "migration")
        
        # Таблица записей из маркетплейсов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace_bookings (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL,
                external_id TEXT,
                raw_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, external_id)
            )
        """)
        log_info("✅ Table marketplace_bookings created", "migration")
        
        # Таблица отзывов из маркетплейсов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketplace_reviews (
                id SERIAL PRIMARY KEY,
                provider VARCHAR(50) NOT NULL,
                external_id TEXT,
                author_name VARCHAR(255),
                rating INTEGER,
                text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                raw_data JSONB,
                UNIQUE(provider, external_id)
            )
        """)
        log_info("✅ Table marketplace_reviews created", "migration")
        
        # Индексы
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_provider 
            ON marketplace_bookings(provider)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_booking 
            ON marketplace_bookings(booking_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_provider 
            ON marketplace_reviews(provider)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_rating 
            ON marketplace_reviews(rating)
        """)
        
        conn.commit()
        log_info("✅ Marketplace integration tables migration completed", "migration")
        
    except Exception as e:
        conn.rollback()
        log_info(f"❌ Error in marketplace integration migration: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_marketplace_integrations()
