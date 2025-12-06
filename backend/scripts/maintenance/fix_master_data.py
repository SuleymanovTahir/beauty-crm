import os
import sys
import io
import csv
import re

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection

import io
import csv
import re

def parse_duration(duration_str):
    """Parse duration string to minutes.
    Examples: 
    '01 ч 00 м' -> 60
    '30m' -> 30
    '00 ч 30 м / 00 ч 50 м' -> 30 (take first)
    """
    if not duration_str: return 60
    
    # Normalize
    d = duration_str.lower().strip()
    
    # Handle "01 ч 30 м" format
    hours = 0
    minutes = 0
    
    # Try Regex for "X ч Y м"
    match = re.search(r'(\d+)\s*ч', d)
    if match:
        hours = int(match.group(1))
    
    match = re.search(r'(\d+)\s*м', d)
    if match:
        minutes = int(match.group(1))
        
    total = hours * 60 + minutes
    
    if total > 0:
        return total
        
    # Fallback/Simple integers
    digits = re.findall(r'\d+', d)
    if digits:
        return int(digits[0])
        
    return 60

def fix_master_data():
    conn = get_db_connection()
    c = conn.cursor()

    print("🔧 Starting FULL master data sync (Services + Assignments)...")

    # CSV Data from User
    # CSV Data Path
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = os.path.join(base_dir, 'data', 'services_master_matrix.csv')
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found at: {csv_path}")
        return

    print(f"📂 Reading data from: {csv_path}")
    with open(csv_path, 'r', encoding='utf-8') as f:
        csv_data = f.read()

    # master_indices removed (Dynamic parsing used)

    # Category Mapping (CSV -> DB)
    cat_map = {
        'Hair wash': 'Hair',
        'Highlights': 'Hair',
        'Hair Treatment': 'Hair',
        'Eyelashes/Eyebrows': 'Brows', # or Lashes
        'Manicure/Pedicure': 'Nails',
        'Nail Extension': 'Nails',
        'Waxing/Sugaring': 'Waxing',
        'Massage': 'Massage', # Will need creation if not exists
        'Skin Care': 'Facial',
        'Promo': 'Promo'
    }

    # Name Mapping (CSV -> Existing DB Service Name)
    name_overrides = {
        'pilng': 'Peeling',
        'piling': 'Peeling',
        'eyebrows coloring': 'Eyebrow Coloring',
        'deep facial cleaning': 'Deep Facial Cleaning 60 min',
        'manicure basic': 'Manicure Basic',
        'japanese manicure': 'Japanese Manicure',
        'full head color and blow dry': 'Full Head Color',
        'balayage+cut+hair style': 'Balayage',
        'ombre, shatush, air-touch': 'Ombre/Shatush/Air-Touch',
        'face lift massage with mask': 'Facial Massage'
    }

    
    # 3. Parse CSV with DictReader for robustness
    reader = csv.DictReader(io.StringIO(csv_data))
    
    # Dynamically correct keys if BOM or whitespace exists
    reader.fieldnames = [f.strip() for f in reader.fieldnames]
    
    # Identify Master Columns (All columns that are NOT metadata)
    metadata_cols = {'Category', 'Service', 'Price', 'Duration'}
    master_columns = [col for col in reader.fieldnames if col not in metadata_cols]
    
    print(f"   👥 Found Masters in CSV: {master_columns}")
    
    # Map CSV Header Name -> DB ID
    master_ids = {}
    for csv_name in master_columns:
        # DB lookup (Case insensitive)
        c.execute("SELECT id, full_name FROM users WHERE lower(full_name) = %s", (csv_name.lower(),))
        row = c.fetchone()
        if row:
            master_ids[csv_name] = row[0]
            # Clear existing services for sync
            c.execute("DELETE FROM user_services WHERE user_id = %s", (row[0],))
        else:
            print(f"   ⚠️  Master '{csv_name}' in CSV not found in DB users!")

    # Services Cache
    c.execute("SELECT id, name FROM services WHERE is_active = TRUE")
    db_services = {row[1].lower().strip(): row[0] for row in c.fetchall()}

    current_category = "Hair"
    created_services_count = 0
    assigned_count = 0
    
    for row in reader:
        # Safe access to dict keys
        cat_raw = row.get('Category', '').strip()
        if cat_raw:
            current_category = cat_map.get(cat_raw, cat_raw)
        
        service_name = row.get('Service', '').strip()
        if not service_name: continue # data row empty?

        price_raw = row.get('Price', '').strip().replace('"','').replace(',','')
        duration_raw = row.get('Duration', '').strip()
        
        # Parse Price
        price_min = None
        price_max = None
        price = 0
        
        # ... (Same price parsing logic)
        if '-' in price_raw:
            parts = price_raw.split('-')
            try:
                price_min = int(float(parts[0].strip()))
                price_max = int(float(parts[1].strip()))
                price = price_min
            except: pass
        else:
            try:
                clean_price = re.sub(r'[^\d]', '', price_raw)
                if clean_price: price = int(clean_price)
            except: pass

        # Parse Duration
        duration = parse_duration(duration_raw)

        # FIND OR CREATE SERVICE
        lookup_name = name_overrides.get(service_name.lower(), service_name).lower()
        sid = db_services.get(lookup_name)
        
        if not sid:
            # Create Service
            safe_name = re.sub(r'[^\w\s]', '', service_name).replace(' ', '_').lower()
            service_key = f"key_{safe_name}"

            print(f"✨ Creating new service: [{current_category}] {service_name} (key={service_key}, price={price}, duration={duration})")
            c.execute("""
                INSERT INTO services (name, service_key, category, price, duration, is_active, description)
                VALUES (%s, %s, %s, %s, %s, TRUE, 'Imported from CSV')
                RETURNING id
            """, (service_name, service_key, current_category, price, duration))
            sid = c.fetchone()[0]
            db_services[service_name.lower()] = sid # Update cache
            created_services_count += 1
        
        # ASSIGN TO MASTERS (Dynamic Loop)
        for master_col in master_columns:
            status = row.get(master_col, '').strip().lower()
            uid = master_ids.get(master_col)
            
            if uid and status == 'on':
                c.execute("""
                    INSERT INTO user_services 
                    (user_id, service_id, price, price_min, price_max, duration, is_online_booking_enabled)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                """, (uid, sid, price, price_min, price_max, duration))
                assigned_count += 1


    # Cleanup Director
    c.execute("UPDATE users SET full_name_ru = 'Турсунай' WHERE full_name = 'Турсунай'")
    c.execute("DELETE FROM user_services WHERE user_id = (SELECT id FROM users WHERE full_name = 'Турсунай')")

    # conn.commit()
    # conn.close()
    print(f"\n✅ Sync Complete: {created_services_count} new services created, {assigned_count} master links assigned.")

    
    # ----------------------------------------------------
    # 5. DYNAMIC ROLE-BASED TEMPLATE GENERATION
    # ----------------------------------------------------
    print("\n🎭 Building Role Templates from assigned data...")
    
    # We build templates based on the specific masters defined by the user as "Golden Masters"
    # Hair -> Mestan (uid from master_indices[4])
    # Nails -> Lyazzat (uid from master_indices[7])
    # Esthetician -> Gulya (uid from master_indices[8])
    # Massage -> Jennifer (uid from master_indices[5]) *User asked for separate massage role, using Jennifer's massage subset
    
    templates = {
        'hair stylist': [],
        'nail master': [],
        'nails': [], # Alias
        'esthetician': [], # Cleaning, Peeling, Waxing
        'waxing': [],      # Explicit waxing
        'massage therapist': [],
        'masseur': [],
        'massage': []
    }

    # Fetch assigned services for templates
    def get_services_for_user(u_id):
        if not u_id: return []
        c.execute("SELECT service_id, price, duration FROM user_services WHERE user_id = %s", (u_id,))
        return c.fetchall() # [(sid, price, dur), ...]

    # Hair -> Mestan
    mestan_id = master_ids.get('Mestan') # Case sensitive if CSV header is capitalized
    if mestan_id:
        # Filter for Hair category only to be safe? 
        # User said "Default services Mestan has". Mestan has Hair, Keratin, Perm.
        # We can just take everything Mestan has as the "Hair Stylist" template.
        templates['hair stylist'] = get_services_for_user(mestan_id)
        print(f"   💇‍♀️ Hair Template: {len(templates['hair stylist'])} services (Source: Mestan)")

    # NAILS (Lyazzat)
    lyazzat_id = master_ids.get('Lyazzat')
    if lyazzat_id:
        templates['nail master'] = get_services_for_user(lyazzat_id)
        templates['nails'] = templates['nail master']
        print(f"   💅 Nail Template: {len(templates['nail master'])} services (Source: Lyazzat)")

    # ESTHETICIAN (Gum of Gulya + Peeling/Cleaning)
    # User said: "Depilation, Peeling, Cleaning which Gulya has".
    # We assigned Peeling/Cleaning to Gulya in the CSV step above.
    gulya_id = master_ids.get('Gulya')
    # ...
    
    # MASSAGE (Jennifer)
    jennifer_id = master_ids.get('Jennifer')
    if gulya_id:
        # We want everything Gulya has EXCLUDING Nails (since she is multi-role in CSV but we want pure Esthetician template)
        # Fetch Gulya's services
        all_gulya = get_services_for_user(gulya_id)
        
        # Filter out "Nails" category services
        esthet_services = []
        for s_curr in all_gulya:
            sid = s_curr[0]
            c.execute("SELECT category FROM services WHERE id = %s", (sid,))
            cat = c.fetchone()[0]
            if cat.lower() not in ['nails', 'nail extension']:
                esthet_services.append(s_curr)
        
        templates['esthetician'] = esthet_services
        templates['waxing'] = esthet_services # Alias
        print(f"   🧖‍♀️ Esthetician Template: {len(templates['esthetician'])} services (Source: Gulya sans Nails)")

    # MASSAGE
    # User said "Separate massage position".
    # Source: Jennifer has massage services in CSV.
    jennifer_id = master_ids.get('Jennifer')
    if jennifer_id:
        all_jen = get_services_for_user(jennifer_id)
        massage_services = []
        for s_curr in all_jen:
            sid = s_curr[0]
            c.execute("SELECT category FROM services WHERE id = %s", (sid,))
            cat = c.fetchone()[0]
            if cat.lower() == 'massage':
                massage_services.append(s_curr)
        
        templates['massage therapist'] = massage_services
        templates['masseur'] = massage_services
        templates['massage'] = massage_services
        print(f"   💆‍♀️ Massage Template: {len(templates['massage therapist'])} services (Source: Jennifer's Massage subset)")

    # ----------------------------------------------------
    # 6. SYNC ROLES FOR ALL USERS
    # ----------------------------------------------------
    print("\n🔄 Syncing User Roles & Defaults...")
    
    c.execute("SELECT id, full_name, position FROM users WHERE is_active = TRUE")
    users = c.fetchall()
    
    for u_id, u_name, u_pos in users:
        if not u_pos: continue
        
        # Parse roles: "Nail Master / Massage Therapist" -> ["nail master", "massage therapist"]
        # Normalize: lowercase, strip, remove special chars?
        # Simple split by '/' or ','
        raw_roles = re.split(r'[,/]', u_pos)
        roles = [r.strip().lower() for r in raw_roles if r.strip()]
        
        if not roles: continue

        user_services = []
        for role in roles:
            # Flexible matching
            # e.g. "Senior Nail Master" -> contains "nail master" or "nails"
            matched_template = None
            
            if 'hair' in role or 'stylist' in role:
                matched_template = templates.get('hair stylist')
            elif 'nail' in role:
                matched_template = templates.get('nail master')
            elif 'massage' in role:
                matched_template = templates.get('massage therapist')
            elif 'wax' in role or 'depil' in role or 'esthet' in role or 'cosmet' in role:
                matched_template = templates.get('esthetician')
                
            if matched_template:
                # print(f"   - {u_name}: Role '{role}' matches template with {len(matched_template)} services")
                user_services.extend(matched_template)
            # else:
                # print(f"   - {u_name}: Role '{role}' has no template match")

        if user_services:
            # Apply assignments (INSERT IGNORE style)
            # user_services is list of (sid, price, duration)
            added_count = 0
            for sid, price, duration in user_services:
                # Check if exists
                c.execute("SELECT 1 FROM user_services WHERE user_id = %s AND service_id = %s", (u_id, sid))
                if not c.fetchone():
                    c.execute("""
                        INSERT INTO user_services 
                        (user_id, service_id, price, price_min, price_max, duration, is_online_booking_enabled)
                        VALUES (%s, %s, %s, NULL, NULL, %s, TRUE)
                    """, (u_id, sid, price, duration))
                    added_count += 1
            
            if added_count > 0:
                print(f"   ✅ {u_name}: Added {added_count} default services based on roles: {roles}")

    print(f"\n✅ Sync Complete: {created_services_count} new services created, {assigned_count} master links assigned (CSV), Default Roles applied.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_master_data()
