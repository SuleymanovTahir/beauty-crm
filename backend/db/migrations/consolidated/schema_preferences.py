"""
Migration: Client Preferences & Context Tables
"""
from db.connection import get_db_connection

def migrate_preferences(db_name=None):
    """
    Apply schema changes for client preferences and context
    """
    print("\n" + "="*60)
    print("🧠 PREFERENCES SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        print("🔧 Creating client preferences tables...")

        # Client Preferences
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_preferences (
                id SERIAL PRIMARY KEY,
                client_id TEXT UNIQUE NOT NULL,
                preferred_master TEXT,
                preferred_service TEXT,
                preferred_day_of_week INTEGER,
                preferred_time_of_day TEXT,
                allergies TEXT,
                special_notes TEXT,
                auto_book_enabled INTEGER DEFAULT 0,
                auto_book_interval_weeks INTEGER DEFAULT 4,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        print("  ✅ client_preferences table ensured")

        # Conversation Context
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversation_context (
                id SERIAL PRIMARY KEY,
                client_id TEXT NOT NULL,
                context_type TEXT NOT NULL,
                context_data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        print("  ✅ conversation_context table ensured")

        # Interaction Patterns
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_interaction_patterns (
                id SERIAL PRIMARY KEY,
                client_id TEXT NOT NULL,
                interaction_type TEXT,
                pattern_data TEXT,
                confidence_score REAL,
                last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        print("  ✅ client_interaction_patterns table ensured")

        conn.commit()
        print("  ✅ Preferences schema applied successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error during preferences migration: {e}")
        conn.rollback()
        raise e
    finally:
        conn.close()
