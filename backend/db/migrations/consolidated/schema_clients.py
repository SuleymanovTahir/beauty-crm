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
            'reminder_date': 'TIMESTAMP',
            'total_visits': 'INTEGER DEFAULT 0',
        }
        
        # Add missing columns or fix types
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE clients ADD COLUMN {column_name} {column_type}")
                added_count += 1
            else:
                # Специальная обработка для типов если колонка уже есть (PostgreSQL)
                if column_name == 'loyalty_points':
                    # Проверяем тип
                    c.execute("SELECT data_type FROM information_schema.columns WHERE table_name='clients' AND column_name='loyalty_points'")
                    if c.fetchone()[0] == 'boolean':
                        print("  🔧 Converting loyalty_points from BOOLEAN to INTEGER")
                        c.execute("ALTER TABLE clients ALTER COLUMN loyalty_points DROP DEFAULT")
                        c.execute("ALTER TABLE clients ALTER COLUMN loyalty_points TYPE INTEGER USING (CASE WHEN loyalty_points THEN 1 ELSE 0 END)")
                        c.execute("ALTER TABLE clients ALTER COLUMN loyalty_points SET DEFAULT 0")
                
                if column_name == 'total_visits':
                    c.execute("SELECT data_type FROM information_schema.columns WHERE table_name='clients' AND column_name='total_visits'")
                    if c.fetchone()[0] == 'boolean':
                        print("  🔧 Converting total_visits from BOOLEAN to INTEGER")
                        c.execute("ALTER TABLE clients ALTER COLUMN total_visits DROP DEFAULT")
                        c.execute("ALTER TABLE clients ALTER COLUMN total_visits TYPE INTEGER USING (CASE WHEN total_visits THEN 1 ELSE 0 END)")
                        c.execute("ALTER TABLE clients ALTER COLUMN total_visits SET DEFAULT 0")
        
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
        c.execute("CREATE INDEX IF NOT EXISTS idx_clients_reminder_date ON clients(reminder_date)")
        print("  ✅ Analytics and reminder indexes ensured")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        try:
            conn.rollback()
        except:
            pass
        raise
    finally:
        try:
            conn.close()
        except:
            pass

if __name__ == "__main__":
    migrate_clients_schema()
