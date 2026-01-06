from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def apply_currencies_schema():
    conn = get_db_connection()
    c = conn.cursor()
    try:
        log_info("Applying currencies schema migration...", "db_migration")

        # Create currencies table
        c.execute("""
            CREATE TABLE IF NOT EXISTS currencies (
                code VARCHAR(10) PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Insert default currencies if empty
        c.execute("SELECT COUNT(*) FROM currencies")
        if c.fetchone()[0] == 0:
            currencies = [
                ('AED', 'UAE Dirham', 'AED'),
                ('USD', 'US Dollar', '$'),
                ('EUR', 'Euro', '€'),
                ('RUB', 'Russian Ruble', '₽'),
                ('KZT', 'Kazakhstani Tenge', '₸')
            ]
            c.executemany("""
                INSERT INTO currencies (code, name, symbol) VALUES (%s, %s, %s)
            """, currencies)
            log_info("Default currencies inserted", "db_migration")

        conn.commit()
        log_info("Currencies schema migration completed successfully", "db_migration")
        return True
    except Exception as e:
        log_error(f"Error applying currencies schema migration: {e}", "db_migration")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    apply_currencies_schema()
