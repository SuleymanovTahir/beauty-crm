
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migrate():
    """
    Migration: Add dynamic stages for Contracts and Invoices
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Contract Stages
        c.execute("SELECT to_regclass('public.contract_stages')")
        if not c.fetchone()[0]:
            log_info("Creating contract_stages table...", "migrations")
            c.execute("""
                CREATE TABLE contract_stages (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    key VARCHAR(50),
                    order_index INTEGER DEFAULT 0,
                    color VARCHAR(50),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Seed default stages
            default_contract_stages = [
                ('Черновик', 'draft', 0, '#94a3b8'),
                ('Отправлен', 'sent', 1, '#3b82f6'),
                ('Подписан', 'signed', 2, '#22c55e'),
                ('Отменен', 'cancelled', 3, '#ef4444')
            ]
            c.executemany("""
                INSERT INTO contract_stages (name, key, order_index, color) 
                VALUES (%s, %s, %s, %s)
            """, default_contract_stages)

        # 2. Invoice Stages
        c.execute("SELECT to_regclass('public.invoice_stages')")
        if not c.fetchone()[0]:
            log_info("Creating invoice_stages table...", "migrations")
            c.execute("""
                CREATE TABLE invoice_stages (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    key VARCHAR(50),
                    order_index INTEGER DEFAULT 0,
                    color VARCHAR(50),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Seed default stages
            default_invoice_stages = [
                ('Черновик', 'draft', 0, '#94a3b8'),
                ('Отправлен', 'sent', 1, '#3b82f6'),
                ('Оплачен', 'paid', 2, '#22c55e'),
                ('Частично оплачен', 'partially_paid', 3, '#eab308'),
                ('Просрочен', 'overdue', 4, '#f97316'),
                ('Отменен', 'cancelled', 5, '#ef4444')
            ]
            c.executemany("""
                INSERT INTO invoice_stages (name, key, order_index, color) 
                VALUES (%s, %s, %s, %s)
            """, default_invoice_stages)

        # 3. Add stage_id to contracts
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contracts' AND column_name='stage_id'
        """)
        if not c.fetchone():
            log_info("Adding stage_id to contracts...", "migrations")
            c.execute("ALTER TABLE contracts ADD COLUMN stage_id INTEGER REFERENCES contract_stages(id)")
            
            # Migrate existing status to stage_id
            c.execute("SELECT id, key FROM contract_stages")
            stages = c.fetchall()
            for stage_id, key in stages:
                c.execute("UPDATE contracts SET stage_id = %s WHERE status = %s", (stage_id, key))

        # 4. Add stage_id to invoices
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='invoices' AND column_name='stage_id'
        """)
        if not c.fetchone():
            log_info("Adding stage_id to invoices...", "migrations")
            c.execute("ALTER TABLE invoices ADD COLUMN stage_id INTEGER REFERENCES invoice_stages(id)")
            
            # Migrate existing status to stage_id
            c.execute("SELECT id, key FROM invoice_stages")
            stages = c.fetchall()
            for stage_id, key in stages:
                c.execute("UPDATE invoices SET stage_id = %s WHERE status = %s", (stage_id, key))

        conn.commit()
        log_info("✅ Migration for contract/invoice stages completed successfully", "migrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Migration for contract/invoice stages failed: {e}", "migrations")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
