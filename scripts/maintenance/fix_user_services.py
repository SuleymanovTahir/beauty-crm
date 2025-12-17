
import sys
import os
import re
from difflib import get_close_matches

# Add parent dir to path to allow importing from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

# --- STRICT DATA ---
SIMO_DATA = [
    {"name": "Hair Cut Kids", "price": 60, "duration": 50, "online": True},
    {"name": "Blow Dry", "price": 100, "duration": 60, "online": True},
    {"name": "Hair wash", "price": 60, "duration": 30, "online": False},
    {"name": "Hair cut", "price": 175, "duration": 60, "online": False},
    {"name": "Trimming without wash", "price": 80, "duration": 60, "online": False},
    {"name": "Hair style", "price": 225, "duration": 60, "online": False},
    {"name": "Hair cut and blow dry", "price": 250, "duration": 60, "online": False},
    {"name": "Roots Color and blow dry", "price": 200, "duration": 60, "online": True},
    {"name": "Full Head Color and blow dry", "price": 350, "duration": 120, "online": True},
    {"name": "Balayage+Cut+hair style", "price": 400, "duration": 120, "online": False},
    {"name": "Ombre, shatush, air-touch", "price": 1000, "duration": 120, "online": True},
    {"name": "Balayage", "price": 700, "duration": 60, "online": False},
    {"name": "Roots bleach and blow dry", "price": 350, "duration": 60, "online": False},
    {"name": "Toner and blow dry", "price": 300, "duration": 60, "online": False},
    {"name": "Bleach hair", "price": 1300, "duration": 60, "online": False},
    {"name": "Hair Treatment", "price": 600, "duration": 180, "online": True},
    {"name": "Natural Treatment", "price": 200, "duration": 60, "online": True},
    {"name": "Hair extension (only removal)", "price": 1500, "duration": 60, "online": False},
    {"name": "Hair extensions (1 ca)", "price": 10, "duration": 60, "online": False},
]

# Shared Manicure List for Lyazzat, Gulya, Jennifer
MANICURE_COMMON = [
    {"name": "Manicure basic", "price": 80, "duration": 60, "online": True},
    {"name": "Pedicure basic", "price": 100, "duration": 60, "online": True},
    {"name": "Manicure classic", "price": 100, "duration": 60, "online": True},
    {"name": "Pedicure classic", "price": 120, "duration": 60, "online": True},
    {"name": "Manicure gel", "price": 130, "duration": 60, "online": True},
    {"name": "Pedicure gel", "price": 160, "duration": 60, "online": True},
    {"name": "Spa manicure", "price": 50, "duration": 60, "online": True},
    {"name": "Remove classic", "price": 30, "duration": 60, "online": True},
    {"name": "Remove gel", "price": 25, "duration": 60, "online": True},
    {"name": "Change gel", "price": 100, "duration": 60, "online": True},
    {"name": "Spa pedicure", "price": 60, "duration": 60, "online": True},
    {"name": "Change classic polish", "price": 40, "duration": 60, "online": True},
    {"name": "French", "price": 30, "duration": 60, "online": False},
    {"name": "Hard gel", "price": 30, "duration": 60, "online": False},
    {"name": "Baby manicure", "price": 50, "duration": 60, "online": False},
    {"name": "Japanese manicure", "price": 100, "duration": 90, "online": True},
    {"name": "Nail design", "price": 30, "duration": 60, "online": False},
    {"name": "Починка 1 ноготь", "price": 35, "duration": 60, "online": False},
    {"name": "Накладные ногти", "price": 250, "duration": 60, "online": False},
    {"name": "Gel overlay", "price": 250, "duration": 60, "online": False},
    {"name": "Gel extension", "price": 350, "duration": 60, "online": False},
    {"name": "Acrylic overlay", "price": 300, "duration": 60, "online": False},
    {"name": "Acrylic extension", "price": 380, "duration": 60, "online": False},
    {"name": "Remove nail extensions", "price": 50, "duration": 60, "online": True},
    {"name": "Podology", "price": 200, "duration": 60, "online": False}, # Added to common
    
    # ORPHANED / PROMO ITEMS (Added to all 3)
    {"name": "Promotion overlay manicure", "price": 145, "duration": 90, "online": False},
    {"name": "Promo mani pedi 250", "price": 125, "duration": 60, "online": False}, # Fuzzy match should catch "Promo mani pedi 250 ..."
    {"name": "Combo basic 150", "price": 75, "duration": 60, "online": False},
    {"name": "Promo 390", "price": 390, "duration": 60, "online": False},
]

LYAZZAT_DATA = MANICURE_COMMON + [] # Lyazzat is pure nails

GULYA_DATA = MANICURE_COMMON + [
    # WAXING (Gulya is "Waxing Master")
    {"name": "Full legs", "price": 150, "duration": 60, "online": True},
    {"name": "Half legs", "price": 80, "duration": 60, "online": True},
    {"name": "Full arms", "price": 80, "duration": 60, "online": True},
    {"name": "Half arms", "price": 50, "duration": 60, "online": True},
    {"name": "Full body", "price": 400, "duration": 60, "online": True},
    {"name": "Bikini line", "price": 100, "duration": 60, "online": True},
    {"name": "Under arms", "price": 50, "duration": 60, "online": False},
    {"name": "Full bikini", "price": 150, "duration": 60, "online": False},
    {"name": "Brazilian", "price": 120, "duration": 60, "online": True},
    {"name": "Full face", "price": 90, "duration": 60, "online": True},
    {"name": "Cheeks", "price": 40, "duration": 60, "online": True},
    {"name": "Upper lip", "price": 30, "duration": 60, "online": True},
    {"name": "Chin", "price": 30, "duration": 60, "online": True},
    
    # ORPHANED WAXING (Explicitly adding legacy duplicates just in case)
    {"name": "Full Body Waxing", "price": 400, "duration": 60, "online": True},
    {"name": "Underarms", "price": 50, "duration": 60, "online": False},
    {"name": "Upper Lips", "price": 30, "duration": 60, "online": True},
]

JENNIFER_DATA = MANICURE_COMMON + [
    # Jennifer is Nail/Massages. 
    # Attempting to assign Massage services if they exist (Universal logic might cover it, 
    # but let's be strict if we find them)
    {"name": "Massage", "price": 100, "duration": 60, "online": True}, # Generic placeholder
]

STRICT_USERS_MAP = {
    "simo": {"data": SIMO_DATA, "categories": ["Hair"]},
    "lyazzat": {"data": LYAZZAT_DATA, "categories": ["Nails", "Lashes", "Brows", "Permanent Makeup", "Promo"]},
    "gulya": {"data": GULYA_DATA, "categories": ["Nails", "Waxing", "Lashes", "Brows", "Permanent Makeup", "Promo"]},
    "jennifer": {"data": JENNIFER_DATA, "categories": ["Nails", "Massage", "Promo"]}
}

def load_services_by_category(cursor):
    """Map Category -> List of Service IDs"""
    cursor.execute("SELECT id, category FROM services")
    cats = {}
    for row in cursor.fetchall():
        sid, cat = row
        if cat:
            if cat not in cats: cats[cat] = []
            cats[cat].append(sid)
    return cats

def load_services(cursor):
    """Load all services from DB into a dict {name_lower: {id, name}}"""
    cursor.execute("SELECT id, name, name_en, name_ru FROM services")
    db_services = {}
    
    for row in cursor.fetchall():
        sid, name, name_en, name_ru = row
        # Index by all possible names
        if name: db_services[name.lower().strip()] = {"id": sid, "name": name}
        if name_en: db_services[name_en.lower().strip()] = {"id": sid, "name": name}
        if name_ru: db_services[name_ru.lower().strip()] = {"id": sid, "name": name}
    
    return db_services

def find_service(search_name, db_services):
    """Find service ID by name using exact match then fuzzy match"""
    search_lower = search_name.lower().strip()
    
    # 1. Exact match
    if search_lower in db_services:
        return db_services[search_lower]
    
    # 2. Contains match (e.g. "Promo mani pedi 250 ..." matching "Promo mani pedi 250")
    # Simplify search name by removing "..."
    clean_search = search_lower.replace("...", "").strip()
    for db_name in db_services:
        # ONLY if the search term is INSIDE the DB name (e.g. user sais "Promo..." and DB has "Promo Full")
        if clean_search in db_name:
            return db_services[db_name]
            
    # 3. Fuzzy match
    keys = list(db_services.keys())
    matches = get_close_matches(search_lower, keys, n=1, cutoff=0.6)
    if matches:
        return db_services[matches[0]]
        
    return None

def apply_strict_import(conn, c):
    """Apply strict service lists for known users"""
    print("\n📦 Applying STRICT Data Import...")
    db_services = load_services(c)
    services_by_cat = load_services_by_category(c)
    
    for username, info in STRICT_USERS_MAP.items():
        data_list = info['data']
        allowed_cats = info['categories']
        
        print(f"   Processing User: {username}")
        c.execute("SELECT id FROM users WHERE username = %s", (username,))
        u_row = c.fetchone()
        if not u_row:
            print(f"   ⚠️ User {username} not found! Skipping.")
            continue
        user_id = u_row[0]
        
        # Clear existing
        c.execute("DELETE FROM user_services WHERE user_id = %s", (user_id,))
        
        assigned_services = set()
        
        # 1. Strict List Assignment
        count_strict = 0
        for svc_data in data_list:
            service_obj = find_service(svc_data['name'], db_services)
            if service_obj:
                sid = service_obj['id']
                if sid in assigned_services: continue
                try:
                    c.execute("""
                        INSERT INTO user_services 
                        (user_id, service_id, price, duration, is_online_booking_enabled)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, service_id) DO UPDATE SET
                        price = EXCLUDED.price,
                        duration = EXCLUDED.duration,
                        is_online_booking_enabled = EXCLUDED.is_online_booking_enabled
                    """, (user_id, sid, svc_data['price'], svc_data['duration'], svc_data['online']))
                    assigned_services.add(sid)
                    count_strict += 1
                except Exception as e:
                    print(f"      ❌ Error {svc_data['name']}: {e}")
            else:
                pass # print(f"      ⚠️ Not found: {svc_data['name']}")
        
        # 2. Fill-in Category Assignment
        # User said "Write ALL to...". So we find services in categories not yet assigned.
        count_fill = 0
        print(f"      🔍 Fill-in Check for {username}: Allowed Cats={allowed_cats}")
        for cat in allowed_cats:
            if cat in services_by_cat:
                sids = services_by_cat[cat]
                print(f"         > Cat '{cat}' found with {len(sids)} services.")
                for sid in sids:
                    if sid not in assigned_services:
                        # Assign with defaults (we don't have custom price)
                        try:
                            c.execute("""
                                INSERT INTO user_services (user_id, service_id, is_online_booking_enabled)
                                SELECT %s, %s, TRUE FROM services WHERE id = %s
                                ON CONFLICT (user_id, service_id) DO NOTHING
                            """, (user_id, sid, sid))
                            assigned_services.add(sid)
                            count_fill += 1
                            # print(f"            + Added fill-in service ID {sid}")
                        except Exception as e:
                            print(f"            ❌ Fill-in Error ID {sid}: {e}")
            else:
                print(f"         ⚠️ Cat '{cat}' NOT in DB!")
        
        # Ensure is_service_provider
        c.execute("UPDATE users SET is_service_provider = TRUE WHERE id = %s", (user_id,))
        print(f"   ✅ Assigned {len(assigned_services)} services to {username} ({count_strict} strict, {count_fill} fill-in)")

def fix_user_services():
    print("🔧 Starting User Services Fix (Combined Mode)...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Clean up Directors
        c.execute("UPDATE users SET is_service_provider = FALSE WHERE role IN ('director', 'admin')")
        c.execute("DELETE FROM user_services WHERE user_id IN (SELECT id FROM users WHERE role IN ('director', 'admin'))")
        print("   ✅ Fixed Directors.")

        # 2. Run STRICT logic for specific users
        apply_strict_import(conn, c)
        conn.commit()

        # 3. Run UNIVERSAL logic for everyone else
        print("\n🌍 Running Universal Logic for other users...")
        
        # Helper: Get all services by category
        c.execute("SELECT id, category FROM services")
        services_by_category = {}
        for row in c.fetchall():
            cat = row[1]
            if cat:
                if cat not in services_by_category: services_by_category[cat] = []
                services_by_category[cat].append(row[0])
        
        # Fetch users NOT in strict list
        placeholders = ','.join(["%s"] * len(STRICT_USERS_MAP))
        c.execute(f"SELECT id, username, full_name, position FROM users WHERE is_active = TRUE AND role != 'director' AND username NOT IN ({placeholders})", list(STRICT_USERS_MAP.keys()))
        other_users = c.fetchall()
        
        for user in other_users:
            user_id, username, full_name, position = user
            position = position or ""
            # print(f"   👤 Processing {username} ({position})...")
            
            allowed_categories = []
            pos_lower = position.lower()
            if 'hair' in pos_lower: allowed_categories.append('Hair')
            if 'nail' in pos_lower: allowed_categories.extend(['Nails', 'Lashes', 'Brows', 'Permanent Makeup'])
            if 'waxing' in pos_lower: allowed_categories.append('Waxing')
            if 'massage' in pos_lower: allowed_categories.append('Massage')
            
            if not allowed_categories: continue
            
            allowed_service_ids = []
            for cat in set(allowed_categories):
                if cat in services_by_category: allowed_service_ids.extend(services_by_category[cat])
                
            if not allowed_service_ids: continue
            
            # Delete invalid
            placeholders = ','.join(['%s'] * len(allowed_service_ids))
            c.execute(f"DELETE FROM user_services WHERE user_id = %s AND service_id NOT IN ({placeholders})", [user_id] + allowed_service_ids)
            
            # Insert missing general
            for sid in allowed_service_ids:
                c.execute("""
                    INSERT INTO user_services (user_id, service_id, is_online_booking_enabled)
                    SELECT %s, %s, TRUE FROM services WHERE id = %s
                    ON CONFLICT (user_id, service_id) DO NOTHING
                """, (user_id, sid, sid))
            
            c.execute("UPDATE users SET is_service_provider = TRUE WHERE id = %s", (user_id,))
            
        conn.commit()
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
