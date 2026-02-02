from db.connection import get_db_connection

def inspect_table():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'")
    rows = c.fetchall()
    print("Columns in clients:")
    for row in rows:
        print(f" - {row[0]}: {row[1]}")
    conn.close()

if __name__ == "__main__":
    inspect_table()
