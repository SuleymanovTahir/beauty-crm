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
            SELECT id, service_key, name, name_ru, category, price, min_price, max_price, duration
            FROM services
            WHERE is_active = 1
            ORDER BY category, name_ru
        """)
        services = c.fetchall()
        
        # Build category mapping
        services_by_category = {}
        for s in services:
            category = s['category']
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append(s)
        
        for category, svc_list in services_by_category.items():
            print(f"   {category:15s}: {len(svc_list)} services")

        # 3. Position to categories mapping
        # 3. Position to categories mapping
        # 3. Position to categories mapping
        # 3. Position to categories mapping
        # Special handling for specific employees by name (using service_key for stability)
        
        # JENNIFER
        jennifer_keys = [
            # Combo
            'combo_basic_150', 'promo_390',
            # Waxing/Sugaring
            'full_legs', 'half_legs', 'full_arms', 'half_arms', 'full_body', 'underarms',
            # Massage
            'back_massage', 'body_massage', 'hotstone_massage', 'anticellulite_massage',
            'back_massage_5_10', 'classic_general_massage', 'anti_cellulite_massage_extra',
            'sculpture_massage', 'moroccan_loofa', 'moroccan_bath', 'head_massage',
            'legs_hands_massage', 'neck_shoulder_30min',
            # Manicure/Pedicure
            'manicure_no_polish', 'pedicure_no_polish', 'manicure_normal', 'pedicure_normal',
            'gelish_manicure', 'pedicure_gelish', 'spa_manicure', 'remove_classic',
            'remove_gel', 'change_gel', 'spa_pedicure', 'change_classic_polish',
            'french', 'hard_gel', 'baby_manicure', 'japanese_manicure', 'nail_repair_1',
            # Promo
            'promo_overlay_290', 'promo_mani_pedi_250',
            # Skin Care
            'face_lift_massage', 'medical_facial', 'peeling', 'deep_facial_cleaning',
            # Hair / Removal
            'hair_wash', 'hair_treatment_range', 'remove_lashes', 'remove_nail_extensions'
        ]

        # SIMO
        simo_keys = [
            # Coloring
            'ombre_shatush_airtouch', 'balayage_simple', 'roots_bleach_blow_dry',
            'toner_blow_dry', 'bleach_hair', 'roots_color_blow_dry',
            'full_head_color_blow_dry', 'balayage_cut_style',
            # Hair Care
            'hair_treatment_range', 'natural_treatment',
            # Hair Extension
            'hair_extension_correction', 'hair_extension_capsule',
            # Cuts & Styles
            'hair_cut_kids', 'blow_dry_range', 'hair_wash', 'hair_cut_simple',
            'trimming_no_wash', 'hair_style', 'hair_cut_blow_dry'
        ]

        # MESTAN (Same as Simo + Brows + Promo)
        mestan_keys = simo_keys + [
            'eyebrows_coloring', 'blow_dry_package_5', 'promo_390'
        ]

        # LYAZZAT
        lyazzat_keys = [
            # Extension/Strengthening
            'gel_overlay', 'gel_extension', 'acrylic_overlay', 'acrylic_extension',
            # Manicure/Pedicure (All 19 services - listing explicitly to be safe)
            'manicure_no_polish', 'pedicure_no_polish', 'manicure_normal', 'pedicure_normal',
            'gelish_manicure', 'pedicure_gelish', 'spa_manicure', 'remove_classic',
            'remove_gel', 'change_gel', 'spa_pedicure', 'change_classic_polish',
            'french', 'hard_gel', 'baby_manicure', 'japanese_manicure', 'nail_repair_1',
            'time_of_relax_spa', 'remove_nail_extensions', # Kept one instance
            # Promo
            'promo_overlay_290', 'promo_mani_pedi_250', 'combo_basic_150', 'promo_390'
        ]

        # GULYA
        gulya_keys = [
            # Waxing/Sugaring
            'full_legs', 'full_arms', 'half_arms', 'full_body', 'bikini_line',
            'underarms', 'full_bikini', 'brazilian', 'full_face', 'cheeks',
            'upper_lips', 'chin', # Fixed upper_lip -> upper_lips
            # Manicure/Pedicure (All 20 services)
            'manicure_no_polish', 'pedicure_no_polish', 'manicure_normal', 'pedicure_normal',
            'gelish_manicure', 'pedicure_gelish', 'spa_manicure', 'remove_classic',
            'remove_gel', 'change_gel', 'spa_pedicure', 'change_classic_polish',
            'french', 'hard_gel', 'baby_manicure', 'japanese_manicure', 'nail_repair_1',
            'time_of_relax_spa', 
            # Extension
            'acrylic_overlay', 'acrylic_extension', 'remove_nail_extensions',
            # Extra
            'podology',
            # Promo
            'promo_overlay_290', 'promo_mani_pedi_250', 'combo_basic_150', 'promo_390'
        ]

        employee_specific_services = {
            'JENNIFER': jennifer_keys,
            'SIMO': simo_keys,
            'MESTAN': mestan_keys,
            'LYAZZAT': lyazzat_keys,
            'GULYA': gulya_keys
        }
        
        employee_specific_categories = {}
        
        position_to_categories = {
            'Hair Stylist': ['Hair'],
            'Nail Master': ['Nails', 'Nail Extension', 'Promo'],
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
            
            assigned_count = 0
            
            # Check if this employee has specific SERVICE assignments
            if emp_name in employee_specific_services:
                specific_keys = employee_specific_services[emp_name]
                print(f"      ℹ️  Using {len(specific_keys)} specific services for {emp_name}")
                
                for key in specific_keys:
                    # Find service by key
                    found = False
                    for cat, svc_list in services_by_category.items():
                        for s in svc_list:
                            # Match by service_key (preferred) or name (fallback)
                            if s['service_key'] == key:
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
                        print(f"      ⚠️  Service not found: {key}")
                
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
