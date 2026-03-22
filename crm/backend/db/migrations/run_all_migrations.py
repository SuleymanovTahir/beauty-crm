"""
Unified System Migration Runner
Executes core initialization and data maintenance.
"""
import sys
import os
from datetime import datetime

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from db.init import init_database
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

def create_sessions_table():
    """Create sessions table for user authentication."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
            session_token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )''')
        c.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE")
        c.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token_expires ON sessions (session_token, expires_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions (company_id)")
        conn.commit()
        log_info("✅ Sessions table created/verified", "migrations")
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Failed to create sessions table: {e}", "migrations")
        raise
    finally:
        conn.close()

def run_all_migrations():
    """Main entry point for database health and setup."""
    # Advisory lock to prevent multiple workers from running migrations simultaneously
    # Lock ID 99999 covers the ENTIRE migration process (different from init_database's 12345)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT pg_try_advisory_lock(99999)")
    got_lock = c.fetchone()[0]
    if not got_lock:
        log_info("⏳ Another worker is running migrations, skipping...", "migrations")
        conn.close()
        return True  # Return success since another worker will handle it

    print_header("SYSTEM INITIALIZATION & SYNC")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: PostgreSQL")

    try:
        # 1. Core Schema Sync
        print_header("CORE SCHEMA INITIALIZATION")
        init_database()

        # 1.5 Create sessions table (auth)
        create_sessions_table()

        # 1.6 chat_history/message_reactions/password_reset_tokens now live in db.init SSOT
        log_info("⏭️ Legacy chat_history helper skipped; schema comes from db.init", "migrations")
        
        # 2. Optional Data Maintenance
        if _env_flag("RUN_MIGRATION_MAINTENANCE", default=False):
            print_header("DATA MAINTENANCE")
            try:
                from scripts.maintenance.fix_data import run_all_fixes
                run_all_fixes()
                log_info("✅ Data maintenance tasks completed", "migrations")
            except Exception as e:
                log_error(f"⚠️  Data maintenance skipped: {e}", "migrations")
        else:
            log_info("⏭️ Data maintenance skipped (RUN_MIGRATION_MAINTENANCE=false)", "migrations")

        # 3. Legacy seeding scripts removed from universal CRM runtime.
        log_info("⏭️ Legacy prod/test seeding removed from CRM migrations", "migrations")

        # 4. Test staff & companies seeding (dev only, SEED_TEST_DATA=true)
        if _env_flag("SEED_TEST_DATA", default=False):
            try:
                from seed_test_data import main as seed_test_staff
                seed_test_staff()
                log_info("✅ Test staff seeded successfully", "migrations")
            except Exception as e:
                log_error(f"⚠️ Test data seeding skipped: {e}", "migrations")
        else:
            log_info("⏭️ Test staff seeding skipped (SEED_TEST_DATA=false)", "migrations")

        print_header("SYNC COMPLETED SUCCESSFULLY")
        # Release lock before returning (also in finally as backup)
        try:
            c.execute("SELECT pg_advisory_unlock(99999)")
            conn.close()
        except:
            pass
        return True

    except Exception as e:
        print(f"\n❌ Critical system setup error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Release advisory lock
        try:
            c.execute("SELECT pg_advisory_unlock(99999)")
            conn.close()
        except:
            pass

if __name__ == "__main__":
    success = run_all_migrations()
    sys.exit(0 if success else 1)
