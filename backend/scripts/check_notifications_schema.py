import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import get_db_connection

def check_schema():
    print("Checking 'notifications' table schema...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications'
        """)
        columns = c.fetchall()
        
        found_read = False
        found_is_read = False
        
        print("\nColumns found:")
        for col_name, data_type in columns:
            print(f" - {col_name} ({data_type})")
            if col_name == 'read':
                found_read = True
            if col_name == 'is_read':
                found_is_read = True
                
        print("\nAnalysis:")
        if found_read:
            print("🚨 ALERT: 'read' column exists! This is likely the cause of issues if code expects 'is_read' or vice versa.")
        if found_is_read:
            print("✅ 'is_read' column exists (Correct).")
        
        if not found_read and not found_is_read:
            print("❌ NEITHER 'read' nor 'is_read' found! Table is broken.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_schema()
