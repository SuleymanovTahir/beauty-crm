from db.connection import get_db_connection
import psycopg2

def apply_fixes():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Disable service provider status for Tursunay
        print("👤 Updating Tursunay status...")
        c.execute("""
            UPDATE users 
            SET is_service_provider = FALSE 
            WHERE full_name LIKE '%Tursunay%' OR full_name LIKE '%Турсунай%'
        """)
        print(f"   Rows affected: {c.rowcount}")

        # 2. Add telegram_id column if missing
        print("\n🔧 Checking telegram_id column...")
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'telegram_id'")
        if not c.fetchone():
            print("   Column missing. Adding telegram_id...")
            c.execute("ALTER TABLE clients ADD COLUMN telegram_id text")
            print("   ✅ Column added.")
        else:
            print("   ✅ Column currently exists.")
            
        conn.commit()
        print("\n✅ All fixes applied successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error applying fixes: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    apply_fixes()
