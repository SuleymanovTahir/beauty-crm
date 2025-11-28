#!/usr/bin/env python3
"""
Check employee services and their online booking status
"""
import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def check_employee_services():
    if not os.path.exists(DATABASE_NAME):
        print(f"Database {DATABASE_NAME} not found!")
        return

    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Get all employees
    c.execute("""
        SELECT id, full_name 
        FROM users 
        WHERE is_service_provider = 1 AND is_active = 1
        ORDER BY full_name
    """)
    
    employees = c.fetchall()
    
    for emp in employees:
        print(f"\n{'='*80}")
        print(f"Employee: {emp['full_name']} (ID: {emp['id']})")
        print(f"{'='*80}")
        
        # Get their services
        c.execute("""
            SELECT 
                s.name, s.name_ru, s.category,
                COALESCE(us.price, s.price) as price,
                us.price_min, us.price_max,
                COALESCE(us.duration, s.duration) as duration,
                us.is_online_booking_enabled,
                us.is_calendar_enabled
            FROM services s
            JOIN user_services us ON s.id = us.service_id
            WHERE us.user_id = ? AND s.is_active = 1
            ORDER BY s.category, s.name
        """, (emp['id'],))
        
        services = c.fetchall()
        
        online_enabled = sum(1 for s in services if s['is_online_booking_enabled'])
        online_disabled = sum(1 for s in services if not s['is_online_booking_enabled'])
        
        print(f"Total services: {len(services)}")
        print(f"Online booking ENABLED: {online_enabled}")
        print(f"Online booking DISABLED: {online_disabled}")
        
        if online_disabled > 0:
            print(f"\n⚠️  Services with DISABLED online booking:")
            for s in services:
                if not s['is_online_booking_enabled']:
                    price_str = f"{s['price_min']}-{s['price_max']}" if s['price_min'] and s['price_max'] else str(s['price'])
                    print(f"  - {s['name_ru'] or s['name']} ({s['category']}) - {price_str} AED - Duration: {s['duration']}")
    
    conn.close()

if __name__ == "__main__":
    check_employee_services()
