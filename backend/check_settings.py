from db.connection import get_db_connection

def check_settings():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM salon_settings LIMIT 1;")
    if c.description:
        print("Columns:", [desc[0] for desc in c.description])
    
    c.execute("SELECT * FROM salon_settings LIMIT 5;")
    row = c.fetchone()
    print("hours_weekdays:", row[0] if row else "Not Found")
    
    # Also check all settings just in case
    c.execute("SELECT id, hours_weekdays FROM salon_settings;")
    rows = c.fetchall()
    print("\nSettings:")
    for r in rows:
        print(f"ID: {r[0]}, hours_weekdays: {r[1]}")
        
    conn.close()

if __name__ == "__main__":
    check_settings()
