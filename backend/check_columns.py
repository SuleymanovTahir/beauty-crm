
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db_connection

def check_columns():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='notifications'")
    columns = [row[0] for row in c.fetchall()]
    print(f"Columns in `notifications` table: {columns}")
    
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='chat_history'")
    columns = [row[0] for row in c.fetchall()]
    print(f"Columns in `chat_history` table: {columns}")
    
    conn.close()

if __name__ == "__main__":
    check_columns()
