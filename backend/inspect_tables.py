from db.connection import get_db_connection

def inspect_tables():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Inspect clients table
    print("\n--- CLIENTS TABLE ---")
    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'")
    for row in c.fetchall():
        print(f"{row[0]}: {row[1]}")
        
    # Inspect users table (filtered for Tursunay)
    print("\n--- USERS (Tursunay) ---")
    c.execute("SELECT id, full_name, role, is_service_provider FROM users WHERE full_name LIKE '%Tursunay%' OR full_name LIKE '%Турсунай%'")
    for row in c.fetchall():
        print(f"ID: {row[0]}, Name: {row[1]}, Role: {row[2]}, IsProvider: {row[3]}")

    conn.close()

if __name__ == "__main__":
    inspect_tables()
