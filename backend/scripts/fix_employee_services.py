#!/usr/bin/env python3
"""
Fix Employee Services Assignment
Properly assigns services to employees based on their positions with correct prices
"""
import sqlite3
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME


def fix_employee_services():
    """Fix employee service assignments with proper prices"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("=" * 70)
    print("FIXING EMPLOYEE SERVICES ASSIGNMENT")
    print("=" * 70)

    try:
        # 1. Get all service providers
        print("\n1. LOADING EMPLOYEES:")
        print("-" * 70)
        c.execute("""
            SELECT id, full_name, position 
            FROM users 
            WHERE is_service_provider = 1 
            ORDER BY full_name
        """)
        employees = c.fetchall()
        
        if not employees:
            print("⚠️  No service providers found!")
            return
        
        for emp in employees:
            print(f"   {emp['full_name']:20s} - {emp['position']}")

        # 2. Get all services by category
        print("\n2. LOADING SERVICES:")
        print("-" * 70)
        c.execute("""
            SELECT id, name, name_ru, category, price, min_price, max_price, duration
            FROM services
            WHERE is_active = 1
            ORDER BY category, name_ru
        """)
        services = c.fetchall()
        
        # Build category mapping
        services_by_category = {}
        for service in services:
            category = service['category']
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(service)
        
        for category, svc_list in services_by_category.items():
            print(f"   {category:15s}: {len(svc_list)} services")

        # 3. Position to categories mapping
        # 3. Position to categories mapping
        # Special handling for specific employees by name
        jennifer_services = [
            # Hair (2)
            'Hair wash', 'Hair Treatment',
            # Facial (4)
            'Deep Facial Cleaning 60 min', 'Medical Facial Cleaning', 'Facial Massage', 'Peeling',
            # Nails (17)
            'Manicure Basic', 'Spa Manicure', 'Manicure Classic', 'Manicure Gel', 'Japanese Manicure', 
            'Baby Manicure', 'Change Classic Polish', 'Change Gel', 'Pedicure Basic', 'Spa Pedicure', 
            'Pedicure Classic', 'Pedicure Gel', 'Remove Old Gel', 'Remove Classic Polish', 'Time Of Relax SPA', 
            'Hard Gel', 'French',
            # Nail Extension (1)
            'Remove nail extensions',
            # Lashes/Brows (1)
            'Eyebrow Shaping',
            # Massage (13)
            'Head Massage 40min', 'Massage (legs/feet/hands) 40min', 'Back Massage 30min', 
            'Body Massage 40min', 'Sculpture Body Massage', 'Anti-Cellulite Massage 60min', 
            'Moroccan Bathhouse 60min', 'Moroccan Bath Loofa', 'Hotstone Massage', 
            'Package of 5 Massages',
            # Promo (4)
            'Promotion overlay manicure, pedicure 290 aed', 'Promo mani pedi 250 без укрепления', 
            'Combo basic 150', 'Promo 390',
            # Waxing (6)
            'Full Legs', 'Half Legs', 'Full Arms', 'Half Arms', 'Full Body Waxing', 'Underarms'
        ]

        employee_specific_services = {
            'JENNIFER': jennifer_services
        }
        
        employee_specific_categories = {}
        
        position_to_categories = {
            'Hair Stylist': ['Hair'],
            'Nail Master': ['Nails', 'Nail Extension', 'Promo'], # Updated to include new categories
            'Nail Master/Waxing': ['Nails', 'Waxing', 'Nail Extension'],
            'Nail Master/Massage Therapist': ['Nails', 'Massage', 'Nail Extension'],
            'Владелец': []  # Owner - skip (admin role)
        }

        # 4. Clear existing assignments
        print("\n3. CLEARING EXISTING ASSIGNMENTS:")
        print("-" * 70)
        c.execute("DELETE FROM user_services")
        deleted = c.rowcount
        print(f"   ✅ Deleted {deleted} existing assignments")

        # 5. Assign services to employees
        print("\n4. ASSIGNING SERVICES:")
        print("-" * 70)
        
        total_assigned = 0
        
        for emp in employees:
            emp_id = emp['id']
            emp_name = emp['full_name']
            position = emp['position']
            
            print(f"\n   👤 {emp_name} ({position})")
            
            # Check if this employee has specific SERVICE assignments
            if emp_name in employee_specific_services:
                specific_services = employee_specific_services[emp_name]
                print(f"      ℹ️  Using {len(specific_services)} specific services for {emp_name}")
                
                for svc_name in specific_services:
                    # Find service by name (fuzzy match or exact)
                    # We need to search across all categories
                    found = False
                    for cat, svc_list in services_by_category.items():
                        for s in svc_list:
                            if s['name'] == svc_name or s['name_ru'] == svc_name:
                                # Assign this service
                                try:
                                    c.execute("""
                                        INSERT INTO user_services 
                                        (user_id, service_id, price, price_min, price_max, duration,
                                         is_online_booking_enabled, is_calendar_enabled)
                                        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
                                    """, (emp_id, s['id'], s['price'], s['min_price'], s['max_price'], s['duration']))
                                    assigned_count += 1
                                    total_assigned += 1
                                    found = True
                                    break
                                except sqlite3.IntegrityError:
                                    pass
                        if found: break
                    
                    if not found:
                        print(f"      ⚠️  Service not found: {svc_name}")
                
                print(f"      📊 Total: {assigned_count} services assigned")
                continue

            # Check if this employee has specific CATEGORY assignments
            if emp_name in employee_specific_categories:
                categories = employee_specific_categories[emp_name]
                print(f"      ℹ️  Using custom categories for {emp_name}")
            else:
                # Get categories for this position
                categories = position_to_categories.get(position, [])
            
            if not categories:
                print(f"      ⏭️  Skipped (admin/owner or unknown position)")
                continue
            
            assigned_count = 0
            
            # Assign all services in these categories
            for category in categories:
                if category not in services_by_category:
                    print(f"      ⚠️  {category}: No services found in database")
                    continue
                
                for service in services_by_category[category]:
                    service_id = service['id']
                    service_name = service['name_ru']
                    price = service['price']
                    price_min = service['min_price']
                    price_max = service['max_price']
                    duration = service['duration']
                    
                    try:
                        c.execute("""
                            INSERT INTO user_services 
                            (user_id, service_id, price, price_min, price_max, duration,
                             is_online_booking_enabled, is_calendar_enabled)
                            VALUES (?, ?, ?, ?, ?, ?, 1, 1)
                        """, (emp_id, service_id, price, price_min, price_max, duration))
                        
                        assigned_count += 1
                        total_assigned += 1
                        
                    except sqlite3.IntegrityError:
                        # Already exists (shouldn't happen since we cleared)
                        pass
                
                print(f"      ✅ {category}: {len(services_by_category[category])} services")
            
            print(f"      📊 Total: {assigned_count} services assigned")

        conn.commit()
        
        # 6. Show final summary
        print("\n" + "=" * 70)
        print("📊 FINAL SUMMARY:")
        print("=" * 70)
        
        c.execute("""
            SELECT u.full_name, u.position, COUNT(us.id) as service_count
            FROM users u
            LEFT JOIN user_services us ON u.id = us.user_id
            WHERE u.is_service_provider = 1
            GROUP BY u.id
            ORDER BY u.full_name
        """)
        
        for row in c.fetchall():
            print(f"   {row['full_name']:20s} ({row['position']:30s}): {row['service_count']:2d} services")
        
        print("\n" + "=" * 70)
        print(f"✅ SUCCESS! Assigned {total_assigned} total services")
        print("=" * 70)
        
        # 7. Verify no NULL prices
        print("\n5. VERIFICATION:")
        print("-" * 70)
        c.execute("""
            SELECT COUNT(*) as count
            FROM user_services
            WHERE price IS NULL OR duration IS NULL
        """)
        null_count = c.fetchone()['count']
        
        if null_count > 0:
            print(f"   ⚠️  WARNING: {null_count} services have NULL price or duration!")
        else:
            print(f"   ✅ All services have prices and durations set")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    fix_employee_services()
