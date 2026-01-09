"""
Миграция: Таблицы для интеграции с платежными системами
"""
from db.connection import get_db_connection
from utils.logger import log_info

def migrate_payment_integrations():
    """Создать таблицы для платежных интеграций"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        log_info("🔧 Creating payment integration tables...", "migration")
        
        # Таблица провайдеров платежей
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                api_key TEXT,
                secret_key TEXT,
                webhook_secret TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                settings JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        log_info("✅ Table payment_providers created", "migration")
        
        # Таблица транзакций
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'AED',
                provider VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                provider_transaction_id TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT
            )
        """)
        log_info("✅ Table payment_transactions created", "migration")
        
        # Индексы
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice 
            ON payment_transactions(invoice_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
            ON payment_transactions(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider 
            ON payment_transactions(provider)
        """)
        
        conn.commit()
        log_info("✅ Payment integration tables migration completed", "migration")
        
    except Exception as e:
        conn.rollback()
        log_info(f"❌ Error in payment integration migration: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_payment_integrations()
