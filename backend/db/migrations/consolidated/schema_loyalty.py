"""
Migration to add loyalty system tables:
- Loyalty Transactions
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

        # Create index
        c.execute("CREATE INDEX IF NOT EXISTS idx_loyalty_client ON loyalty_transactions(client_id)")
        print("  ✅ Index on loyalty_transactions(client_id) ensured")

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
