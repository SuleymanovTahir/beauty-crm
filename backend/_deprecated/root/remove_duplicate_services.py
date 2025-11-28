#!/usr/bin/env python3
"""
Remove duplicate services, keeping the one with assignments or higher price
"""
import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

# Manual mapping: which duplicate to keep
DUPLICATES_TO_REMOVE = [
    206,  # Балаяж 700 AED (keep 143: 950 AED)
    214,  # Детская стрижка 60 AED (keep 138: 70 AED)
    220,  # Окрашивание бровей 40 AED (duplicate, keep 158)
    215,  # Укладка 100 AED (keep 137: 125 AED)
    146,  # Уход за волосами 1050 AED (keep 116: 1500 AED range)
    212,  # Уход за волосами 600 AED (keep 116: 1500 AED range)
]

def remove_duplicates():
    if not os.path.exists(DATABASE_NAME):
        print(f"Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("🗑️  Removing duplicate services...\n")
    
    for service_id in DUPLICATES_TO_REMOVE:
        # Get service info
        c.execute("SELECT name_ru, price FROM services WHERE id = ?", (service_id,))
        svc = c.fetchone()
        
        if not svc:
            print(f"  ⚠️  Service ID {service_id} not found, skipping...")
            continue
        
        # Check if it's assigned to any employees
        c.execute("SELECT COUNT(*) as count FROM user_services WHERE service_id = ?", (service_id,))
        assignments = c.fetchone()['count']
        
        if assignments > 0:
            print(f"  ⚠️  Service '{svc['name_ru']}' (ID {service_id}) has {assignments} assignments!")
            print(f"      Removing assignments first...")
            c.execute("DELETE FROM user_services WHERE service_id = ?", (service_id,))
        
        # Delete the service
        c.execute("DELETE FROM services WHERE id = ?", (service_id,))
        print(f"  ✅ Removed: {svc['name_ru']} (ID {service_id}, {svc['price']} AED)")

    conn.commit()
    conn.close()
    
    print(f"\n✅ Cleanup complete! Removed {len(DUPLICATES_TO_REMOVE)} duplicate services.")

if __name__ == "__main__":
    remove_duplicates()
