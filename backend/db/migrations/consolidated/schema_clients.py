"""
Consolidated Clients Schema Migration
All schema changes for clients table in one place
"""
from db.connection import get_db_connection

def migrate_clients_schema():
    """
    Apply all clients table schema changes
    """
    print("\n" + "="*60)
    print("🔧 CLIENTS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'clients\'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'telegram_id': 'TEXT',
            'referral_code': 'TEXT',
            'total_saved': 'REAL DEFAULT 0',
            'account_balance': 'REAL DEFAULT 0',
            'loyalty_points': 'INTEGER DEFAULT 0', # Changed from BOOLEAN to match usage as points
            'notes': 'TEXT',
            'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP',
            'preferred_messenger': "TEXT DEFAULT 'instagram'",
            'preferences': 'TEXT',
            'interests': 'TEXT',
            'birthday': 'TEXT',
            'gender': 'TEXT',
            'source': 'TEXT',
            'language': 'TEXT DEFAULT \'ru\'',
            'last_retention_reminder_at': 'TIMESTAMP',  # To track retention ping
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE clients ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        # Create conversations table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                client_id TEXT NOT NULL,
                message TEXT NOT NULL,
                sender TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        print("  ✅ conversations table ensured")

        # Create client_email_verifications table if not exists
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_email_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP,
                attempts INTEGER DEFAULT 0
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_email_verif_email ON client_email_verifications (email)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_email_verif_code ON client_email_verifications (code)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON client_email_verifications (expires_at)")
        print("  ✅ client_email_verifications table ensured")
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to clients table")
        else:
            print("\n✅ All columns already exist")
            
        # Create indexes for analytics
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)")
        print("  ✅ Analytics indexes ensured")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_clients_schema()
