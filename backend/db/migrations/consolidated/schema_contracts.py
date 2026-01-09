"""
🔧 Миграция: Система Договоров (Contracts)
Создает таблицу для управления договорами с клиентами
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning

def migrate():
    """Создать таблицу contracts"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица договоров
        c.execute('''CREATE TABLE IF NOT EXISTS contracts (
            id SERIAL PRIMARY KEY,
            contract_number TEXT UNIQUE NOT NULL,
            client_id TEXT,
            booking_id INTEGER,
            contract_type TEXT DEFAULT 'service',
            template_name TEXT,
            status TEXT DEFAULT 'draft',
            data JSONB,
            pdf_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            signed_at TIMESTAMP,
            sent_at TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )''')
        
        # Индексы для быстрого поиска
        c.execute('CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_contracts_booking ON contracts(booking_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number)')
        
        # Таблица истории отправки договоров
        c.execute('''CREATE TABLE IF NOT EXISTS contract_delivery_log (
            id SERIAL PRIMARY KEY,
            contract_id INTEGER NOT NULL,
            delivery_method TEXT NOT NULL,
            recipient TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
        )''')
        
        conn.commit()
        log_info("✅ Таблица contracts создана успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка при создании таблицы contracts: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
