"""
Unified System Migration Runner
Executes core initialization and data maintenance.
"""
import sys
from datetime import datetime
from db.init import init_database
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def create_sessions_table():
    """Create sessions table for user authentication."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            session_token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )''')
        conn.commit()
        log_info("✅ Sessions table created/verified", "migrations")
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Failed to create sessions table: {e}", "migrations")
        raise
    finally:
        conn.close()

def create_chat_history_table():
    """Create chat_history table for messenger conversations."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            instagram_id TEXT REFERENCES clients(instagram_id) ON DELETE CASCADE,
            message TEXT,
            sender TEXT,
            message_type TEXT DEFAULT 'text',
            is_read BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.commit()
        log_info("✅ Chat history table created/verified", "migrations")
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Failed to create chat_history table: {e}", "migrations")
        raise
    finally:
        conn.close()

def run_all_migrations():
    """Main entry point for database health and setup."""
    print_header("SYSTEM INITIALIZATION & SYNC")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: PostgreSQL")

    try:
        # 1. Core Schema Sync
        print_header("CORE SCHEMA INITIALIZATION")
        init_database()

        # 1.5 Create sessions table (auth)
        create_sessions_table()

        # 1.6 Create chat_history table (messaging)
        create_chat_history_table()
        
        # 2. Data Maintenance & Fixed
        print_header("DATA MAINTENANCE")
        try:
            from scripts.maintenance.fix_data import run_all_fixes
            run_all_fixes()
            log_info("✅ Data maintenance tasks completed", "migrations")
        except Exception as e:
            log_error(f"⚠️  Data maintenance skipped: {e}", "migrations")

        # 3. Production Seeding
        print_header("PRODUCTION SEEDING")
        try:
            from scripts.setup.seed_production_data import seed_production_data
            seed_production_data()
            log_info("✅ Production data seeded", "migrations")
        except Exception as e:
            log_error(f"⚠️  Seeding skipped: {e}", "migrations")

        print_header("SYNC COMPLETED SUCCESSFULLY")
        return True

    except Exception as e:
        print(f"\n❌ Critical system setup error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_migrations()
    sys.exit(0 if success else 1)
