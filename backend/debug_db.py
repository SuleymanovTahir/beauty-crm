import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.connection import get_db_connection

conn = get_db_connection()
c = conn.cursor()
try:
    c.execute("CREATE TABLE IF NOT EXISTS connection_test (id serial PRIMARY KEY, val text);")
    c.execute("INSERT INTO connection_test (val) VALUES ('from_script');")
    conn.commit()
    print("✅ Table created and row inserted.")
    
    c.execute("SELECT current_database(), current_user;")
    db, user = c.fetchone()
    print(f"📊 Connected to: {db} as {user}")
finally:
    conn.close()
