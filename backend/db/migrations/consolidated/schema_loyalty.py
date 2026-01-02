"""
Migration to add loyalty system tables:
- Loyalty Transactions
- Loyalty Category Rules (Multipliers)
"""
from db.connection import get_db_connection

def migrate_loyalty_schema():
    """
    Apply schema changes for loyalty system
    """
    print("\n" + "="*60)
    print("💎 LOYALTY SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Create loyalty_transactions table
        print("  🔧 Checking loyalty_transactions table...")
        c.execute("""
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id SERIAL PRIMARY KEY,
                client_id TEXT REFERENCES clients(instagram_id),
                amount INTEGER NOT NULL,
                reason TEXT,
                source TEXT DEFAULT 'system', -- system, booking, referral, manual
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Table loyalty_transactions ensured")

        # Create loyalty_category_rules table
        print("  🔧 Checking loyalty_category_rules table...")
        c.execute("""
            CREATE TABLE IF NOT EXISTS loyalty_category_rules (
                category TEXT PRIMARY KEY,
                points_multiplier REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Table loyalty_category_rules ensured")

        # Create index
        c.execute("CREATE INDEX IF NOT EXISTS idx_loyalty_client ON loyalty_transactions(client_id)")
        print("  ✅ Index on loyalty_transactions(client_id) ensured")

        # Check salon_settings for loyalty_points_conversion_rate
        print("  Checking salon_settings for loyalty_points_conversion_rate...")
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings' AND column_name='loyalty_points_conversion_rate'
        """)
        if not c.fetchone():
            print("  ➕ Adding loyalty_points_conversion_rate column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN loyalty_points_conversion_rate REAL DEFAULT 0.1")
        else:
            print("  ✅ Column loyalty_points_conversion_rate exists")

        print("  ✅ Loyalty schema applied successfully")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error during loyalty migration: {e}")
        conn.rollback()
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_loyalty_schema()
