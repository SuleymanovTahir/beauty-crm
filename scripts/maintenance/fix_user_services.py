
import sys
import os

# Add parent dir to path to allow importing from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def fix_user_services():
    print("🔧 Starting User Services Fix...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Define mappings (username -> [categories])
        # Based on database job titles
        mapping = {
            'simo': ['Hair'],
            'mestan': ['Hair'],
            'lyazzat': ['Nails', 'Lashes', 'Brows', 'Permanent Makeup'],
            'gulya': ['Nails', 'Waxing', 'Lashes', 'Brows'],
            'jennifer': ['Nails', 'Massage'],
            # 'tursunai': REMOVED - Director, no services
        }
        
        # 0. Fix Tursunai (Director)
        # Disable is_service_provider so she doesn't show in Booking Wizard
        c.execute("UPDATE users SET is_service_provider = FALSE WHERE username = 'tursunai'")
        c.execute("DELETE FROM user_services WHERE user_id = (SELECT id FROM users WHERE username = 'tursunai')")
        print("   ✅ Fixed Tursunai: Removed from service providers and cleared services.")

        # Get all services first to map Category -> [Service IDs]
        c.execute("SELECT id, category FROM services")
        services_by_category = {}
        for row in c.fetchall():
            cat = row[1]
            sid = row[0]
            if cat not in services_by_category:
                services_by_category[cat] = []
            services_by_category[cat].append(sid)
            
        print(f"   📋 Loaded categories: {list(services_by_category.keys())}")

        # Process each user
        for username, categories in mapping.items():
            print(f"   👤 Processing {username}...")
            
            # Get User ID
            c.execute("SELECT id FROM users WHERE username = %s", (username,))
            user_row = c.fetchone()
            if not user_row:
                print(f"      ⚠️ User {username} not found, skipping.")
                continue
            
            user_id = user_row[0]
            
            # collect allowed service IDs
            allowed_service_ids = []
            for cat in categories:
                if cat in services_by_category:
                    allowed_service_ids.extend(services_by_category[cat])
            
            if not allowed_service_ids:
                print(f"      ⚠️ No services found for categories {categories}")
                continue
                
            # 1. DELETE services that are NOT in the allowed list
            # We use NOT IN (...) logic. 
            # If the list is empty, we delete everything.
            
            placeholders = ','.join(['%s'] * len(allowed_service_ids))
            query = f"DELETE FROM user_services WHERE user_id = %s AND service_id NOT IN ({placeholders})"
            c.execute(query, [user_id] + allowed_service_ids)
            deleted = c.rowcount
            
            # 2. INSERT missing services from the allowed list
            # We want them to have ALL services in their categories
            added = 0
            for sid in allowed_service_ids:
                c.execute("""
                    INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled)
                    SELECT %s, %s, price, duration, TRUE
                    FROM services WHERE id = %s
                    ON CONFLICT (user_id, service_id) DO NOTHING
                """, (user_id, sid, sid))
                added += c.rowcount
                
            conn.commit()
            print(f"      ✅ Fixed {username}: Removed {deleted} invalid, Added {added} missing.")

        print("✅ User Services Fix Completed Successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_user_services()
