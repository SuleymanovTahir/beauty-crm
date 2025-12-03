from db.connection import get_db_connection
conn = get_db_connection()
c = conn.cursor()
c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='broadcast_history'")
print(c.fetchall())
conn.close()
