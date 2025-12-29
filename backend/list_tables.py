from db.connection import get_db_connection

def list_tables():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = c.fetchall()
    print("Tables:", [t[0] for t in tables])
    conn.close()

if __name__ == "__main__":
    list_tables()
