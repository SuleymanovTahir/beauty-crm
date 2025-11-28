import sqlite3
import os


DATABASE_NAME = "salon_bot.db"

def check_data():
    if not os.path.exists(DATABASE_NAME):
        print(f"Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("\n--- CHECKING SERVICES TABLE ---")
    c.execute("SELECT count(*) as total FROM services")
    total = c.fetchone()['total']
    
    c.execute("SELECT count(*) as missing_price FROM services WHERE price IS NULL")
    missing_price = c.fetchone()['missing_price']
    
    c.execute("SELECT count(*) as missing_duration FROM services WHERE duration IS NULL")
    missing_duration = c.fetchone()['missing_duration']
    
    print(f"Total services: {total}")
    print(f"Missing price: {missing_price}")
    print(f"Missing duration: {missing_duration}")
    
    if missing_duration > 0:
        print("\nServices with MISSING DURATION:")
        c.execute("SELECT name, category FROM services WHERE duration IS NULL")
        for row in c.fetchall():
            print(f"- {row['name']} ({row['category']})")

    print("\n--- CHECKING USER_SERVICES (Employee Assignments) ---")
    c.execute("SELECT count(*) as total FROM user_services")
    total_us = c.fetchone()['total']
    print(f"Total assignments: {total_us}")
    
    # Check for assignments where BOTH user_service and service have NULLs (should be impossible if services are fixed)
    c.execute("""
        SELECT s.name, u.full_name 
        FROM user_services us
        JOIN services s ON us.service_id = s.id
        JOIN users u ON us.user_id = u.id
        WHERE COALESCE(us.price, s.price) IS NULL 
           OR COALESCE(us.duration, s.duration) IS NULL
    """)
    broken_assignments = c.fetchall()
    
    if broken_assignments:
        print(f"\n❌ FOUND {len(broken_assignments)} BROKEN ASSIGNMENTS (No price/duration source):")
        for row in broken_assignments:
            print(f"- {row['full_name']}: {row['name']}")
    else:
        print("\n✅ All assignments have a valid Price and Duration source (either from Employee override or Base Service).")

    conn.close()

if __name__ == "__main__":
    try:
        from tabulate import tabulate
    except ImportError:
        # Fallback if tabulate is not installed
        pass
    check_data()
