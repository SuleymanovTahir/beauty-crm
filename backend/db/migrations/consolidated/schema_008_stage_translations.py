
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migrate():
    """
    Migration 008: Add translation columns to pipeline_stages and invoice_stages
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    languages = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
    tables = ['pipeline_stages', 'invoice_stages']
    
    try:
        for table in tables:
            # Check if table exists
            c.execute(f"SELECT to_regclass('public.{table}')")
            if not c.fetchone()[0]:
                log_info(f"Table {table} not found, skipping.", "migrations")
                continue
                
            # Get existing columns
            c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
            columns = {row[0] for row in c.fetchall()}
            
            # Add name_{lang} columns
            for lang in languages:
                col_name = f"name_{lang}"
                if col_name not in columns:
                    log_info(f"Adding column {col_name} to {table}...", "migrations")
                    c.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} VARCHAR(255)")
        
        conn.commit()
        log_info("✅ Migration 008: Stage translations columns added successfully", "migrations")
        return True
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Migration 008 failed: {e}", "migrations")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
