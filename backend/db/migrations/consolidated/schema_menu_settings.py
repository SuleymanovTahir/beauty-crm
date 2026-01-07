import logging
from db.connection import get_db_connection

def run_migration():
    """
    Create menu_settings table for storing user menu customization.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        logging.info("Creating menu_settings table...")
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS menu_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50),
                menu_order JSONB,
                hidden_items JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id),
                UNIQUE(role)
            );
        """)
        
        # Add index for faster lookups
        c.execute("CREATE INDEX IF NOT EXISTS idx_menu_settings_user ON menu_settings(user_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_menu_settings_role ON menu_settings(role);")
        
        conn.commit()
        logging.info("✅ menu_settings table created successfully.")
        return True
        
    except Exception as e:
        logging.error(f"❌ Error creating menu_settings table: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
