#!/usr/bin/env python3
"""
Скрипт для добавления тестовых данных в БД
Включает полный список услуг и детальную привязку к мастерам
"""
import sys
import os
import random
import string
from datetime import datetime

# Добавляем backend в путь
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.connection import get_db_connection

from core.config import DATABASE_NAME
from utils.utils import hash_password

# ===== ПОЛНЫЙ ПРАЙС-ЛИСТ (Обновлено 27.01.2026 - Восстановление длительности) =====
SERVICES_DATA = [
    # 1. Manicure
    {'key': 'manicure_pil_classic', 'name': 'Manicure Classic + Polish', 'price': 130, 'duration': 60, 'category': 'Manicure'},
    {'key': 'polish_classic', 'name': 'Classic Polish Only', 'price': 50, 'duration': 30, 'category': 'Manicure'},
    {'key': 'gel_polish_only', 'name': 'Gel Polish Only', 'price': 100, 'duration': 60, 'category': 'Manicure'},
    {'key': 'french_polish', 'name': 'French Polish', 'price': 190, 'duration': 60, 'category': 'Manicure'},
    {'key': 'japanese_manicure', 'name': 'Japanese Manicure', 'price': 150, 'duration': 90, 'category': 'Manicure'},
    {'key': 'overlay_biogel', 'name': 'Overlay Biogel', 'price': 50, 'duration': 60, 'category': 'Manicure'},
    {'key': 'remove_gel', 'name': 'Remove Gel Polish', 'price': 30, 'duration': 30, 'category': 'Manicure'},
    {'key': 'remove_classic', 'name': 'Remove Classic Polish', 'price': 20, 'duration': 30, 'category': 'Manicure'},
    {'key': 'remove_extensions', 'name': 'Remove Extensions', 'price': 70, 'duration': 60, 'category': 'Manicure'},
    {'key': 'nail_extensions', 'name': 'Nail Extensions (Gel)', 'price': 400, 'duration': 120, 'category': 'Manicure'},
    {'key': 'nail_correction', 'name': 'Extensions Correction', 'price': 400, 'duration': 120, 'category': 'Manicure'},
    {'key': 'repair_extension', 'name': 'Extension Correction (1 Nail)', 'price': 40, 'duration': 60, 'category': 'Manicure'},
    {'key': 'repair_gel', 'name': 'Gel Nail Correction (1 Nail)', 'price': 20, 'duration': 60, 'category': 'Manicure'},
    {'key': 'manicure_combined', 'name': 'Combined Manicure', 'price': 110, 'duration': 60, 'category': 'Manicure'},
    {'key': 'manicure_gel_polish', 'name': 'Combined Manicure + Gel', 'price': 160, 'duration': 60, 'category': 'Manicure'},
    {'key': 'nail_shaping', 'name': 'Nail Shaping', 'price': 45, 'duration': 60, 'category': 'Manicure'},

    # 2. Pedicure
    {'key': 'pedicure_smart', 'name': 'Smart Pedicure Basic', 'price': 130, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'pedicure_smart_polish', 'name': 'Smart Pedicure + Polish', 'price': 150, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'pedicure_gel', 'name': 'Pedicure + Gel Polish', 'price': 190, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'change_gel_pedicure', 'name': 'Change Gel Polish (Pedi)', 'price': 100, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'change_classic_pedicure', 'name': 'Change Polish (Pedi)', 'price': 50, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'combo_mani_pedi_gel', 'name': 'Combo Mani+Pedi (Gel)', 'price': 350, 'duration': 120, 'category': 'Combo'},

    # 3. Hair
    # 3.1 Blow Dry
    {'key': 'blowdry_short', 'name': 'Blow Dry (Short)', 'price': 200, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'blowdry_medium', 'name': 'Blow Dry (Medium)', 'price': 250, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'blowdry_long', 'name': 'Blow Dry (Long)', 'price': 280, 'duration': 60, 'category': 'Hair Styling'},
    # 3.2 Styling
    {'key': 'styling_short', 'name': 'Styling Iron/Waves (Short)', 'price': 230, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'styling_medium', 'name': 'Styling Iron/Waves (Medium)', 'price': 260, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'styling_long', 'name': 'Styling Iron/Waves (Long)', 'price': 300, 'duration': 60, 'category': 'Hair Styling'},
    # 3.3 Cut & Care
    {'key': 'evening_hairstyle', 'name': 'Evening Hairstyle', 'price': 625, 'min_price': 450, 'max_price': 800, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'hair_wash', 'name': 'Hair Wash', 'price': 70, 'duration': 30, 'category': 'Hair Care'},
    {'key': 'hair_trim', 'name': 'Hair Trim Only', 'price': 150, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'hair_cut_full', 'name': 'Cut + Wash + Styling', 'price': 350, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'hair_cut_wash', 'name': 'Cut + Wash', 'price': 200, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'express_hair_form', 'name': 'Express Form (No Wash)', 'price': 150, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'bangs_cut', 'name': 'Bangs Cut', 'price': 100, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'kids_cut', 'name': 'Kids Cut', 'price': 100, 'duration': 40, 'category': 'Hair Cut'},
    # 3.4 Color
    {'key': 'roots_color', 'name': 'Roots Coloring', 'price': 250, 'duration': 60, 'category': 'Hair Color'},
    {'key': 'toning', 'name': 'Toning', 'price': 300, 'min_price': 250, 'max_price': 350, 'duration': 60, 'category': 'Hair Color'},
    {'key': 'one_tone_short', 'name': 'One Tone (Short)', 'price': 350, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'one_tone_medium', 'name': 'One Tone (Medium)', 'price': 400, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'one_tone_long', 'name': 'One Tone (Long)', 'price': 675, 'min_price': 550, 'max_price': 800, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'total_blonde', 'name': 'Total Blonde', 'price': 1250, 'min_price': 1000, 'max_price': 1500, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'complex_color', 'name': 'Complex Color (Ombre/Balayage)', 'price': 1250, 'min_price': 1000, 'max_price': 1500, 'duration': 120, 'category': 'Hair Color'},

    # 4. Massage & SPA
    {'key': 'massage_head', 'name': 'Head Massage (60 min)', 'price': 100, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_extremities', 'name': 'Extremities Massage (60 min)', 'price': 150, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_body', 'name': 'Body Massage (60 min)', 'price': 250, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_sculptural', 'name': 'Sculptural Body Massage', 'price': 370, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_anticellulite', 'name': 'Anti-cellulite Massage (60 min)', 'price': 300, 'duration': 60, 'category': 'Massage'},
    {'key': 'moroccan_bath', 'name': 'Moroccan Bath SPA', 'price': 250, 'duration': 30, 'category': 'SPA'},

    # 5. Waxing / Sugaring
    {'key': 'full_bikini', 'name': 'Full Bikini', 'price': 150, 'duration': 60, 'category': 'Waxing'},
    {'key': 'bikini_line', 'name': 'Bikini Line', 'price': 100, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_legs', 'name': 'Full Legs', 'price': 150, 'duration': 60, 'category': 'Waxing'},
    {'key': 'half_legs', 'name': 'Half Legs (Lower)', 'price': 80, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_arms', 'name': 'Full Arms', 'price': 80, 'duration': 60, 'category': 'Waxing'},
    {'key': 'half_arms', 'name': 'Half Arms', 'price': 50, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_body_wax', 'name': 'Full Body Waxing', 'price': 400, 'duration': 60, 'category': 'Waxing'},
    {'key': 'underarms', 'name': 'Underarms Waxing', 'price': 50, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_face_wax', 'name': 'Full Face Waxing', 'price': 90, 'duration': 60, 'category': 'Waxing'},
    {'key': 'cheeks_wax', 'name': 'Cheeks Waxing', 'price': 40, 'duration': 60, 'category': 'Waxing'},
    {'key': 'upper_lip_wax', 'name': 'Upper Lip Waxing', 'price': 30, 'duration': 60, 'category': 'Waxing'},
    {'key': 'chin_wax', 'name': 'Chin Waxing', 'price': 30, 'duration': 60, 'category': 'Waxing'},

    # 6. Cosmetology
    {'key': 'deep_facial_cleaning', 'name': 'Deep Facial Cleaning', 'price': 400, 'duration': 60, 'category': 'Cosmetology'},
    {'key': 'medical_facial', 'name': 'Medical Facial (Problem Skin)', 'price': 450, 'duration': 60, 'category': 'Cosmetology'},
    {'key': 'face_lift_massage', 'name': 'Lifting Massage + Mask', 'price': 250, 'duration': 30, 'category': 'Cosmetology'},
    {'key': 'peeling', 'name': 'Peeling', 'price': 350, 'min_price': 300, 'max_price': 400, 'duration': 60, 'category': 'Cosmetology'},

    # 7. Lashes & Brows
    {'key': 'lashes_classic', 'name': 'Classic Lash Extensions', 'price': 200, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_2d', 'name': '2D Lash Extensions', 'price': 250, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_3d', 'name': '3D Lash Extensions', 'price': 300, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_mega', 'name': '4-5D Lash Extensions (Mega)', 'price': 350, 'duration': 120, 'category': 'Lashes'},
    {'key': 'kim_style_effect', 'name': 'Kim Style Effect / L, M Curves', 'price': 30, 'duration': 60, 'category': 'Lashes'},
    {'key': 'remove_lashes', 'name': 'Remove Lashes', 'price': 50, 'duration': 60, 'category': 'Lashes'},
    {'key': 'brow_lami', 'name': 'Brow Lamination', 'price': 200, 'duration': 60, 'category': 'Brows'},
    {'key': 'lash_lami', 'name': 'Lash Lamination', 'price': 200, 'duration': 60, 'category': 'Lashes'},
    {'key': 'combo_lami', 'name': 'Combo Lash + Brow Lami', 'price': 300, 'duration': 60, 'category': 'Combo'},
    {'key': 'brow_coloring', 'name': 'Brow Coloring', 'price': 40, 'duration': 60, 'category': 'Brows'},
    {'key': 'brow_correction', 'name': 'Brow Correction', 'price': 40, 'duration': 60, 'category': 'Brows'},

    # Permanent Makeup (From earlier matrix, keep for Mestan)
    {'key': 'permanent_lips', 'name': 'Permanent Lips', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'permanent_brows', 'name': 'Permanent Brows', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'lashliner', 'name': 'Lashliner', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'eyeliner', 'name': 'Eyeliner', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'permanent_correction', 'name': 'Permanent Makeup Correction', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
]

# Map categories/keys to masters for realistic seeding
mani_keys = [s['key'] for s in SERVICES_DATA if s['category'] == 'Manicure']
pedi_keys = [s['key'] for s in SERVICES_DATA if s['category'] == 'Pedicure']
hair_keys = [s['key'] for s in SERVICES_DATA if s['category'] in ['Hair Styling', 'Hair Cut', 'Hair Color', 'Hair Care']]
spa_keys = [s['key'] for s in SERVICES_DATA if s['category'] in ['Massage', 'SPA', 'Cosmetology']]
wax_keys = [s['key'] for s in SERVICES_DATA if s['category'] == 'Waxing']
lash_keys = [s['key'] for s in SERVICES_DATA if s['category'] in ['Lashes', 'Brows']]
pmu_keys = [s['key'] for s in SERVICES_DATA if s['category'] == 'Permanent Makeup']

def seed_data():
    from psycopg2.extras import RealDictCursor
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=RealDictCursor)
    now = datetime.now()

    print("=" * 70)
    print("RE-SEEDING WITH RESTORED DURATIONS (V2.1)")
    print("=" * 70)

    # 1. Masters & Users (Ensure they exist)
    required_users = [
        {'username': 'admin', 'full_name': 'Admin', 'role': 'director', 'is_service_provider': False, 'position': 'Owner'},
        {'username': 'sabri', 'full_name': 'Мохаммед Сабри', 'role': 'employee', 'is_service_provider': True, 'position': 'Топ-стилист'},
        {'username': 'mestan', 'full_name': 'Amandurdyyeva Mestan', 'role': 'employee', 'is_service_provider': True, 'position': 'Стилист по волосам и Мастер по перманентному макияжу'},
        {'username': 'jennifer', 'full_name': 'Перадилья Дженнифер', 'role': 'employee', 'is_service_provider': True, 'position': 'Мастер универсальной красоты'},
        {'username': 'gulcehre', 'full_name': 'Касымова Гульчехре', 'role': 'employee', 'is_service_provider': True, 'position': 'Мастер маникюра и депиляции, ухода за лицом'},
        {'username': 'lyazat', 'full_name': 'Kozhabay Lyazat', 'role': 'employee', 'is_service_provider': True, 'position': 'Мастер маникюра'},
        {'username': 'tursunay', 'full_name': 'Турсунай', 'role': 'director', 'is_service_provider': False, 'position': 'Owner'}
    ]

    # Файл для сохранения паролей
    credentials_path = os.path.join(backend_dir, "staff_credentials.txt")

    # Загружаем существующие пароли из файла (если есть)
    existing_passwords = {}
    if os.path.exists(credentials_path):
        try:
            with open(credentials_path, "r", encoding="utf-8") as f:
                current_username = None
                for line in f:
                    line = line.strip()
                    if line.startswith("Username: "):
                        current_username = line.replace("Username: ", "")
                    elif line.startswith("Password: ") and current_username:
                        existing_passwords[current_username] = line.replace("Password: ", "")
                        current_username = None
        except Exception as e:
            print(f"⚠️  Could not read existing credentials: {e}")

    # Фиксированные пароли (SSOT)
    FIXED_PASSWORDS = {
        'admin': '8&&cY*xY#T',
        'sabri': '1d5Fx$Ud8$',
        'mestan': 'z2tkD5^gJh',
        'jennifer': 'dff&aW&q2@',
        'gulcehre': 'Hj#GH9ieZx',
        'lyazat': 'nJOn!2Fgmd',
        'tursunay': 'hZ&!Ci1P6K'
    }

    # 1.8. User Sync logic improved to avoid duplicates
    for u in required_users:
        # Check by ID first (if we have a known ID map) or by specific unique criteria
        # For this script we rely on username as the primary unique key for staff
        c.execute("SELECT id, password_hash, full_name, username FROM users WHERE username = %s OR full_name = %s ORDER BY id ASC", (u['username'], u['full_name']))
        matches = c.fetchall()
        
        main_user = None
        if matches:
            # If multiple matches, find the best one (usually the one with the correct username)
            for m in matches:
                if m['username'] == u['username']:
                    main_user = m
                    break
            if not main_user:
                main_user = matches[0]
            
            # Deactivate other duplicates if they exist
            if len(matches) > 1:
                duplicate_ids = [m['id'] for m in matches if m['id'] != main_user['id']]
                c.execute("UPDATE users SET is_active = FALSE, is_public_visible = FALSE WHERE id IN %s", (tuple(duplicate_ids),))
                print(f"⚠️  Deactivated {len(duplicate_ids)} duplicates for {u['full_name']}")

        # Map password
        raw_password = FIXED_PASSWORDS.get(u['username']) or existing_passwords.get(u['username'])
        if not raw_password:
            # Только для совершенно новых пользователей, которых нет в списке выше
            chars = string.ascii_letters + string.digits + "!@#$%^&*"
            raw_password = ''.join(random.choice(chars) for _ in range(12))
            
        hashed_pwd = hash_password(raw_password)

        if not main_user:
            c.execute("""
                INSERT INTO users (username, full_name, email, role, password_hash, is_service_provider, is_active, email_verified, position)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE, %s)
            """, (u['username'], u['full_name'], f"{u['username']}@example.com", u['role'], hashed_pwd, u['is_service_provider'], u['position']))
            print(f"➕ Created user: {u['full_name']} ({u['position']})")
        else:
            c.execute("""
                UPDATE users SET 
                    full_name = %s,
                    password_hash = %s,
                    role = %s,
                    position = %s,
                    is_active = TRUE,
                    is_service_provider = %s
                WHERE id = %s
            """, (u['full_name'], hashed_pwd, u['role'], u['position'], u['is_service_provider'], main_user['id']))
            print(f"🔄 Synced: {u['full_name']} (ID: {main_user['id']})")

    # Обновляем файл staff_credentials.txt актуальными данными
    with open(credentials_path, "w", encoding="utf-8") as cred_file:
        cred_file.write(f"=== USERS CREDENTIALS (Fixed & Active) ===\n\n")
        for u in required_users:
            pwd = FIXED_PASSWORDS.get(u['username']) or "Check Database"
            cred_file.write(f"Role: {u['role']}\n")
            cred_file.write(f"Name: {u['full_name']}\n")
            cred_file.write(f"Username: {u['username']}\n")
            cred_file.write(f"Password: {pwd}\n")
            cred_file.write("-" * 30 + "\n")

    print(f"✅ Credentials saved to: {credentials_path}")

    master_ids = {}
    c.execute("SELECT id, full_name, role FROM users WHERE is_service_provider = TRUE OR role = 'director'")
    for row in c.fetchall():
        master_ids[row['full_name']] = row['id']
    
    # 2. Add Services
    # c.execute("DELETE FROM user_services") # No, don't delete everything blindly if we want to be safe
    # Better: just sync
    
    # Check if we should delete all services first (standard for this script)
    c.execute("DELETE FROM user_services")
    c.execute("DELETE FROM services")
    
    service_db_ids = {}
    for s in SERVICES_DATA:
        c.execute("""
            INSERT INTO services (
                service_key, name, category, price, 
                min_price, max_price, currency, duration, is_active, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'AED', %s, TRUE, %s, %s)
            RETURNING id
        """, (
            s['key'], s['name'], s['category'],
            s.get('price'), s.get('min_price'), s.get('max_price'), s.get('duration'), now, now
        ))
        service_db_ids[s['key']] = c.fetchone()['id']

    # 3. Master Mapping
    service_map = {
        'Мохаммед Сабри': hair_keys,
        'Amandurdyyeva Mestan': hair_keys + lash_keys + pmu_keys,
        'Перадилья Дженнифер': wax_keys + mani_keys + pedi_keys + spa_keys,
        'Касымова Гульчехре': mani_keys + pedi_keys + wax_keys + spa_keys,
        'Kozhabay Lyazat': mani_keys + pedi_keys,
        'Турсунай': [] # Director
    }

    for name, keys in service_map.items():
        if name in master_ids:
            mid = master_ids[name]
            for skey in keys:
                if skey in service_db_ids:
                    # Online booking disabled for specific services per salon matrix
                    online_disabled_keys = ['underarms', 'full_bikini', 'hair_wash', 'hair_cut_full', 'complex_color']
                    online_enabled = (skey not in online_disabled_keys)
                    
                    s_data = next(s for s in SERVICES_DATA if s['key'] == skey)
                    c.execute("""
                        INSERT INTO user_services (
                            user_id, service_id, price, price_min, price_max, duration, is_online_booking_enabled
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        mid, service_db_ids[skey], s_data.get('price'), 
                        s_data.get('min_price'), s_data.get('max_price'), s_data.get('duration'), online_enabled
                    ))
            print(f"✅ {name}: mapped {len(keys)} services")

    # 4. Schedule
    c.execute("DELETE FROM user_schedule")
    for name, mid in master_ids.items():
        for day in range(6): # Mon-Sat
            c.execute("INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active) VALUES (%s, %s, '10:30', '21:00', TRUE)", (mid, day))

    # 5. Public Content (Reviews, FAQ, Banners, Gallery) - MANAGED BY restore_all_public_data.py
    print("📢 Skipping Public Content (managed by restore_all_public_data.py)")
    print("   💡 Для восстановления публичного контента запустите:")
    print("   python3 backend/scripts/maintenance/restore_all_public_data.py")


    print("🏢 Seeding Salon Settings...")
    salon_name = os.getenv('SALON_NAME', 'M.Le Diamant')
    c.execute("""
        INSERT INTO salon_settings (
            id, name, city, country, address, 
            phone, whatsapp, instagram, hours_weekdays, hours_weekends, currency
        )
        VALUES (1, %s, 'Dubai', 'UAE', 'JBR, Dubai', '+971500000000', '+971500000000', 'salon_test', '10:30 - 21:00', '10:30 - 21:00', 'AED')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    """, (salon_name,))

    conn.commit()
    conn.close()
    print("\n🏁 RESTORED DATA SEEDED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_data()
