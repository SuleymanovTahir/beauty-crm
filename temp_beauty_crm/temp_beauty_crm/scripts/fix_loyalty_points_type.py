"""
Fix script to change loyalty_points from BOOLEAN to INTEGER
"""
from db.connection import get_db_connection

def fix_loyalty_column():
    print("🔧 Fixing loyalty_points column type...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Drop and recreate
        print("  Dropping wrong column...")
        c.execute("ALTER TABLE clients DROP COLUMN IF EXISTS loyalty_points")
        
        print("  Adding correct column...")
        c.execute("ALTER TABLE clients ADD COLUMN loyalty_points INTEGER DEFAULT 0")
        
        conn.commit()
        print("✅ Column fixed successfully")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_loyalty_column()
