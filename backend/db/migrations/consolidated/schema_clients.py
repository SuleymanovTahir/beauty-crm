"""
Consolidated Clients Schema Migration
All schema changes for clients table in one place
"""
from db.connection import get_db_connection


def migrate_clients_schema(db_path="salon_bot.db"):
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
            'account_balance': 'REAL DEFAULT 0',
            'loyalty_points': 'BOOLEAN DEFAULT FALSE',
            'notes': 'TEXT',
            'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP',
            'preferred_messenger': "TEXT DEFAULT \'instagram\'",
            'preferences': 'TEXT',
            'interests': 'TEXT',
            'birthday': 'TEXT',
            'gender': 'TEXT',
            'source': 'TEXT',
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
