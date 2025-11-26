#!/usr/bin/env python3
"""
Find duplicate services by name_ru
"""
import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def find_duplicates():
    if not os.path.exists(DATABASE_NAME):
        print(f"Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Find services with duplicate name_ru
    c.execute("""
        SELECT name_ru, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(price) as prices
        FROM services
        WHERE is_active = 1
        GROUP BY name_ru
        HAVING count > 1
        ORDER BY name_ru
    """)
    
    duplicates = c.fetchall()
    
    if not duplicates:
        print("✅ No duplicates found!")
    else:
        print(f"⚠️  Found {len(duplicates)} duplicate service names:\n")
        for dup in duplicates:
            ids = dup['ids'].split(',')
            prices = dup['prices'].split(',')
            print(f"Service: {dup['name_ru']}")
            print(f"  Count: {dup['count']}")
            for i, (service_id, price) in enumerate(zip(ids, prices)):
                print(f"  - ID {service_id}: {price} AED")
            print()

    conn.close()

if __name__ == "__main__":
    find_duplicates()
