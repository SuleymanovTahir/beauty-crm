"""
🔧 Миграция: Система Счетов (Invoices)
Создает таблицу для управления счетами клиентам
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning

def migrate():
    """Создать таблицу invoices"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица счетов
        c.execute('''CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            invoice_number TEXT UNIQUE NOT NULL,
            client_id TEXT,
            booking_id INTEGER,
            status TEXT DEFAULT 'draft',
            total_amount REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'AED',
            items JSONB,
            notes TEXT,
            due_date DATE,
            pdf_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            paid_at TIMESTAMP,
            sent_at TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )''')
        
        # Индексы
        c.execute('CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)')
        
        # Таблица платежей по счетам
        c.execute('''CREATE TABLE IF NOT EXISTS invoice_payments (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT,
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            created_by INTEGER,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )''')
        
        # Таблица истории отправки счетов
        c.execute('''CREATE TABLE IF NOT EXISTS invoice_delivery_log (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER NOT NULL,
            delivery_method TEXT NOT NULL,
            recipient TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )''')
        
        conn.commit()
        log_info("✅ Таблица invoices создана успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка при создании таблицы invoices: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
