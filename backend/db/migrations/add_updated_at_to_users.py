from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_migration():
    log_info("Starting migration: add_updated_at_to_users", "migration")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if column exists
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at'")
        if not c.fetchone():
            log_info("Adding updated_at column to users table...", "migration")
            c.execute("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            
            # Populate with created_at or now for existing. created_at might be text slightly formatted, so safest is just current timestamp for initial value if parsing fails, but let's try.
            # Actually created_at IS text in the schema I recall. So casting might be needed.
            # But let's just default to CURRENT_TIMESTAMP for simplicity, as we just want cache busting for future updates.
            # Existing specific timestamps don't matter as much as *having* a timestamp.
            
            conn.commit()
            log_info("✅ Column updated_at added successfully", "migration")
        else:
            log_info("⚠️ Column updated_at already exists", "migration")
            
    except Exception as e:
        conn.rollback()
        log_error(f"Migration failed: {e}", "migration")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
