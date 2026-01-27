#!/usr/bin/env python3
"""
Скрипт для добавления тестовых данных в БД
Включает полный список услуг и детальную привязку к мастерам
"""
from db.connection import get_db_connection
import sys
import os
from datetime import datetime

# Добавляем backend в путь
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME

# ===== ПОЛНЫЙ ПРАЙС-ЛИСТ (Обновлено 27.01.2026 - Восстановление длительности) =====
SERVICES_DATA = [
    # 1. Manicure
    {'key': 'manicure_pil_classic', 'name': 'Manicure Classic + Polish', 'name_ru': 'Маникюр пилочный + обычное покрытие', 'price': 130, 'duration': 60, 'category': 'Manicure'},
    {'key': 'polish_classic', 'name': 'Classic Polish Only', 'name_ru': 'Покрытие обычным лаком', 'price': 50, 'duration': 30, 'category': 'Manicure'},
    {'key': 'gel_polish_only', 'name': 'Gel Polish Only', 'name_ru': 'Покрытие гель-лаком', 'price': 100, 'duration': 60, 'category': 'Manicure'},
    {'key': 'french_polish', 'name': 'French Polish', 'name_ru': 'Французское покрытие (френч)', 'price': 190, 'duration': 60, 'category': 'Manicure'},
    {'key': 'japanese_manicure', 'name': 'Japanese Manicure', 'name_ru': 'Японский маникюр', 'price': 150, 'duration': 90, 'category': 'Manicure'},
    {'key': 'overlay_biogel', 'name': 'Overlay Biogel', 'name_ru': 'Укрепление биогелем (Overlay)', 'price': 50, 'duration': 60, 'category': 'Manicure'},
    {'key': 'remove_gel', 'name': 'Remove Gel Polish', 'name_ru': 'Снятие гель-лака', 'price': 30, 'duration': 30, 'category': 'Manicure'},
    {'key': 'remove_classic', 'name': 'Remove Classic Polish', 'name_ru': 'Снятие обычного лака', 'price': 20, 'duration': 30, 'category': 'Manicure'},
    {'key': 'remove_extensions', 'name': 'Remove Extensions', 'name_ru': 'Снятие наращивания', 'price': 70, 'duration': 60, 'category': 'Manicure'},
    {'key': 'nail_extensions', 'name': 'Nail Extensions (Gel)', 'name_ru': 'Наращивание ногтей (гель)', 'price': 400, 'duration': 120, 'category': 'Manicure'},
    {'key': 'nail_correction', 'name': 'Extensions Correction', 'name_ru': 'Коррекция наращивания', 'price': 400, 'duration': 120, 'category': 'Manicure'},
    {'key': 'repair_extension', 'name': 'Repair 1 Extension', 'name_ru': 'Ремонт 1 ногтя (наращивание)', 'price': 40, 'duration': 60, 'category': 'Manicure'},
    {'key': 'repair_gel', 'name': 'Repair 1 Gel Nail', 'name_ru': 'Ремонт 1 ногтя (гель-лак)', 'price': 20, 'duration': 60, 'category': 'Manicure'},
    {'key': 'manicure_combined', 'name': 'Combined Manicure', 'name_ru': 'Классический маникюр (комби/аппарат)', 'price': 110, 'duration': 60, 'category': 'Manicure'},
    {'key': 'manicure_gel_polish', 'name': 'Combined Manicure + Gel', 'name_ru': 'Классический маникюр + гель-лак', 'price': 160, 'duration': 60, 'category': 'Manicure'},
    {'key': 'nail_shaping', 'name': 'Nail Shaping', 'name_ru': 'Придание формы ногтям', 'price': 45, 'duration': 60, 'category': 'Manicure'},

    # 2. Pedicure
    {'key': 'pedicure_smart', 'name': 'Smart Pedicure Basic', 'name_ru': 'Базовый педикюр (Smart-техника)', 'price': 130, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'pedicure_smart_polish', 'name': 'Smart Pedicure + Polish', 'name_ru': 'Классический педикюр + обычный лак (Smart)', 'price': 150, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'pedicure_gel', 'name': 'Pedicure + Gel Polish', 'name_ru': 'Педикюр с покрытием гель-лак', 'price': 190, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'change_gel_pedicure', 'name': 'Change Gel Polish (Pedi)', 'name_ru': 'Смена гель-лака (педикюр)', 'price': 100, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'change_classic_pedicure', 'name': 'Change Polish (Pedi)', 'name_ru': 'Смена обычного лака (педикюр)', 'price': 50, 'duration': 60, 'category': 'Pedicure'},
    {'key': 'combo_mani_pedi_gel', 'name': 'Combo Mani+Pedi (Gel)', 'name_ru': 'Комбо: Маникюр + Педикюр (гель-лак)', 'price': 350, 'duration': 120, 'category': 'Combo'},

    # 3. Hair
    # 3.1 Blow Dry
    {'key': 'blowdry_short', 'name': 'Blow Dry (Short)', 'name_ru': 'Укладка на брашинг (Короткие)', 'price': 200, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'blowdry_medium', 'name': 'Blow Dry (Medium)', 'name_ru': 'Укладка на брашинг (Средние)', 'price': 250, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'blowdry_long', 'name': 'Blow Dry (Long)', 'name_ru': 'Укладка на брашинг (Длинные)', 'price': 280, 'duration': 60, 'category': 'Hair Styling'},
    # 3.2 Styling
    {'key': 'styling_short', 'name': 'Styling Iron/Waves (Short)', 'name_ru': 'Укладка утюжок/волны (Короткие)', 'price': 230, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'styling_medium', 'name': 'Styling Iron/Waves (Medium)', 'name_ru': 'Укладка утюжок/волны (Средние)', 'price': 260, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'styling_long', 'name': 'Styling Iron/Waves (Long)', 'name_ru': 'Укладка утюжок/волны (Длинные)', 'price': 300, 'duration': 60, 'category': 'Hair Styling'},
    # 3.3 Cut & Care
    {'key': 'evening_hairstyle', 'name': 'Evening Hairstyle', 'name_ru': 'Вечерняя прическа', 'price': 625, 'min_price': 450, 'max_price': 800, 'duration': 60, 'category': 'Hair Styling'},
    {'key': 'hair_wash', 'name': 'Hair Wash', 'name_ru': 'Мытье головы', 'price': 70, 'duration': 30, 'category': 'Hair Care'},
    {'key': 'hair_trim', 'name': 'Hair Trim Only', 'name_ru': 'Стрижка (только срез)', 'price': 150, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'hair_cut_full', 'name': 'Cut + Wash + Styling', 'name_ru': 'Стрижка + Мытье + Укладка', 'price': 350, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'hair_cut_wash', 'name': 'Cut + Wash', 'name_ru': 'Стрижка + Мытье', 'price': 200, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'express_hair_form', 'name': 'Express Form (No Wash)', 'name_ru': 'Экспресс-форма (без мытья)', 'price': 150, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'bangs_cut', 'name': 'Bangs Cut', 'name_ru': 'Челка', 'price': 100, 'duration': 60, 'category': 'Hair Cut'},
    {'key': 'kids_cut', 'name': 'Kids Cut', 'name_ru': 'Детская стрижка', 'price': 100, 'duration': 40, 'category': 'Hair Cut'},
    # 3.4 Color
    {'key': 'roots_color', 'name': 'Roots Coloring', 'name_ru': 'Окрашивание корней', 'price': 250, 'duration': 60, 'category': 'Hair Color'},
    {'key': 'toning', 'name': 'Toning', 'name_ru': 'Тонирование', 'price': 300, 'min_price': 250, 'max_price': 350, 'duration': 60, 'category': 'Hair Color'},
    {'key': 'one_tone_short', 'name': 'One Tone (Short)', 'name_ru': 'В один тон (короткие)', 'price': 350, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'one_tone_medium', 'name': 'One Tone (Medium)', 'name_ru': 'В один тон (средние)', 'price': 400, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'one_tone_long', 'name': 'One Tone (Long)', 'name_ru': 'В один тон (длинные)', 'price': 675, 'min_price': 550, 'max_price': 800, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'total_blonde', 'name': 'Total Blonde', 'name_ru': 'Тотальный блонд', 'price': 1250, 'min_price': 1000, 'max_price': 1500, 'duration': 120, 'category': 'Hair Color'},
    {'key': 'complex_color', 'name': 'Complex Color (Ombre/Balayage)', 'name_ru': 'Сложное (Омбре/Балаяж/Мелирование)', 'price': 1250, 'min_price': 1000, 'max_price': 1500, 'duration': 120, 'category': 'Hair Color'},

    # 4. Massage & SPA
    {'key': 'massage_head', 'name': 'Head Massage (60 min)', 'name_ru': 'Массаж головы (60 мин)', 'price': 100, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_extremities', 'name': 'Extremities Massage (60 min)', 'name_ru': 'Массаж (ноги/стопы/руки) (60 мин)', 'price': 150, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_body', 'name': 'Body Massage (60 min)', 'name_ru': 'Массаж тела (60 мин)', 'price': 250, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_sculptural', 'name': 'Sculptural Body Massage', 'name_ru': 'Скульптурный массаж тела', 'price': 370, 'duration': 60, 'category': 'Massage'},
    {'key': 'massage_anticellulite', 'name': 'Anti-cellulite Massage (60 min)', 'name_ru': 'Антицеллюлитный массаж (60 мин)', 'price': 300, 'duration': 60, 'category': 'Massage'},
    {'key': 'moroccan_bath', 'name': 'Moroccan Bath SPA', 'name_ru': 'Марокканская баня (Time of Relax SPA)', 'price': 250, 'duration': 30, 'category': 'SPA'},

    # 5. Waxing / Sugaring
    {'key': 'full_bikini', 'name': 'Full Bikini', 'name_ru': 'Глубокое бикини', 'price': 150, 'duration': 60, 'category': 'Waxing'},
    {'key': 'bikini_line', 'name': 'Bikini Line', 'name_ru': 'Линия бикини', 'price': 100, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_legs', 'name': 'Full Legs', 'name_ru': 'Ноги полностью', 'price': 150, 'duration': 60, 'category': 'Waxing'},
    {'key': 'half_legs', 'name': 'Half Legs (Lower)', 'name_ru': 'Ноги (голени)', 'price': 80, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_arms', 'name': 'Full Arms', 'name_ru': 'Руки полностью', 'price': 80, 'duration': 60, 'category': 'Waxing'},
    {'key': 'half_arms', 'name': 'Half Arms', 'name_ru': 'Руки до локтя', 'price': 50, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_body_wax', 'name': 'Full Body Waxing', 'name_ru': 'Все тело', 'price': 400, 'duration': 60, 'category': 'Waxing'},
    {'key': 'underarms', 'name': 'Underarms Waxing', 'name_ru': 'Подмышки', 'price': 50, 'duration': 60, 'category': 'Waxing'},
    {'key': 'full_face_wax', 'name': 'Full Face Waxing', 'name_ru': 'Лицо полностью', 'price': 90, 'duration': 60, 'category': 'Waxing'},
    {'key': 'cheeks_wax', 'name': 'Cheeks Waxing', 'name_ru': 'Щеки', 'price': 40, 'duration': 60, 'category': 'Waxing'},
    {'key': 'upper_lip_wax', 'name': 'Upper Lip Waxing', 'name_ru': 'Верхняя губа', 'price': 30, 'duration': 60, 'category': 'Waxing'},
    {'key': 'chin_wax', 'name': 'Chin Waxing', 'name_ru': 'Подбородок', 'price': 30, 'duration': 60, 'category': 'Waxing'},

    # 6. Cosmetology
    {'key': 'deep_facial_cleaning', 'name': 'Deep Facial Cleaning', 'name_ru': 'Глубокая чистка лица', 'price': 400, 'duration': 60, 'category': 'Cosmetology'},
    {'key': 'medical_facial', 'name': 'Medical Facial (Problem Skin)', 'name_ru': 'Мед. чистка лица (проблемная кожа)', 'price': 450, 'duration': 60, 'category': 'Cosmetology'},
    {'key': 'face_lift_massage', 'name': 'Lifting Massage + Mask', 'name_ru': 'Лифтинг-массаж лица + маска', 'price': 250, 'duration': 30, 'category': 'Cosmetology'},
    {'key': 'peeling', 'name': 'Peeling', 'name_ru': 'Пилинг', 'price': 350, 'min_price': 300, 'max_price': 400, 'duration': 60, 'category': 'Cosmetology'},

    # 7. Lashes & Brows
    {'key': 'lashes_classic', 'name': 'Classic Lash Extensions', 'name_ru': 'Наращивание (Классика)', 'price': 200, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_2d', 'name': '2D Lash Extensions', 'name_ru': 'Наращивание (2D объем)', 'price': 250, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_3d', 'name': '3D Lash Extensions', 'name_ru': 'Наращивание (3D объем)', 'price': 300, 'duration': 120, 'category': 'Lashes'},
    {'key': 'lashes_mega', 'name': '4-5D Lash Extensions (Mega)', 'name_ru': 'Наращивание (4-5D объем)', 'price': 350, 'duration': 120, 'category': 'Lashes'},
    {'key': 'kim_style_effect', 'name': 'Kim Style Effect / L, M Curves', 'name_ru': 'Эффект Kim Style / Изгибы L, M', 'price': 30, 'duration': 60, 'category': 'Lashes'},
    {'key': 'remove_lashes', 'name': 'Remove Lashes', 'name_ru': 'Снятие ресниц', 'price': 50, 'duration': 60, 'category': 'Lashes'},
    {'key': 'brow_lami', 'name': 'Brow Lamination', 'name_ru': 'Ламинирование бровей', 'price': 200, 'duration': 60, 'category': 'Brows'},
    {'key': 'lash_lami', 'name': 'Lash Lamination', 'name_ru': 'Ламинирование ресниц', 'price': 200, 'duration': 60, 'category': 'Lashes'},
    {'key': 'combo_lami', 'name': 'Combo Lash + Brow Lami', 'name_ru': 'Комбо: Ламинирование ресниц + бровей', 'price': 300, 'duration': 60, 'category': 'Combo'},
    {'key': 'brow_coloring', 'name': 'Brow Coloring', 'name_ru': 'Окрашивание бровей', 'price': 40, 'duration': 60, 'category': 'Brows'},
    {'key': 'brow_correction', 'name': 'Brow Correction', 'name_ru': 'Коррекция формы бровей', 'price': 40, 'duration': 60, 'category': 'Brows'},

    # Permanent Makeup (From earlier matrix, keep for Mestan)
    {'key': 'permanent_lips', 'name': 'Permanent Lips', 'name_ru': 'Перманентный макияж губ', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'permanent_brows', 'name': 'Permanent Brows', 'name_ru': 'Перманентный макияж бровей', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'lashliner', 'name': 'Lashliner', 'name_ru': 'Межресничная стрелка', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'eyeliner', 'name': 'Eyeliner', 'name_ru': 'Подводка для глаз', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
    {'key': 'permanent_correction', 'name': 'Permanent Makeup Correction', 'name_ru': 'Коррекция перманентного макияжа', 'price': 800, 'duration': 120, 'category': 'Permanent Makeup'},
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
        {'username': 'sabri', 'full_name': 'Mohamed Sabri', 'role': 'admin', 'is_service_provider': True},
        {'username': 'mestan', 'full_name': 'Amandurdyyeva Mestan', 'role': 'admin', 'is_service_provider': True},
        {'username': 'jennifer', 'full_name': 'Peradilla Jennifer', 'role': 'admin', 'is_service_provider': True},
        {'username': 'gulcehre', 'full_name': 'Kasymova Gulcehre', 'role': 'admin', 'is_service_provider': True},
        {'username': 'lyazat', 'full_name': 'Kozhabay Lyazat', 'role': 'admin', 'is_service_provider': True},
        {'username': 'tursunay', 'full_name': 'Турсунай', 'role': 'director', 'is_service_provider': False}
    ]

    for u in required_users:
        c.execute("SELECT id FROM users WHERE full_name = %s", (u['full_name'],))
        if not c.fetchone():
            c.execute("""
                INSERT INTO users (username, full_name, email, role, password_hash, is_service_provider, is_active, email_verified)
                VALUES (%s, %s, %s, %s, 'hashed_secret', %s, TRUE, TRUE)
            """, (u['username'], u['full_name'], f"{u['username']}@example.com", u['role'], u['is_service_provider']))
            print(f"➕ Created user: {u['full_name']}")

    master_ids = {}
    c.execute("SELECT id, full_name, role FROM users WHERE is_service_provider = TRUE OR role = 'director'")
    for row in c.fetchall():
        master_ids[row['full_name']] = row['id']
    
    # 2. Add Services
    c.execute("DELETE FROM user_services")
    c.execute("DELETE FROM services")
    
    service_db_ids = {}
    for s in SERVICES_DATA:
        c.execute("""
            INSERT INTO services (
                service_key, name, name_ru, name_en, category, price, 
                min_price, max_price, currency, duration, is_active, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'AED', %s, TRUE, %s, %s)
            RETURNING id
        """, (
            s['key'], s['name'], s['name_ru'], s['name'], s['category'],
            s.get('price'), s.get('min_price'), s.get('max_price'), s.get('duration'), now, now
        ))
        service_db_ids[s['key']] = c.fetchone()['id']

    # 3. Master Mapping
    service_map = {
        'Mohamed Sabri': hair_keys,
        'Amandurdyyeva Mestan': hair_keys + lash_keys + pmu_keys,
        'Peradilla Jennifer': wax_keys + mani_keys + pedi_keys + spa_keys,
        'Kasymova Gulcehre': mani_keys + pedi_keys + wax_keys + spa_keys,
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

    # 5. Public Content (Reviews & FAQ)
    print("📢 Seeding Public Reviews...")
    c.execute("DELETE FROM public_reviews")
    c.execute("""
        INSERT INTO public_reviews (author_name, rating, text_ru, text_en, is_active, display_order)
        VALUES 
        ('Anna K.', 5, 'Лучший салон в Дубае! Мастера супер.', 'Best salon in Dubai! Masters are super.', TRUE, 1),
        ('Sarah M.', 5, 'Очень понравился маникюр. Рекомендую!', 'Loved the manicure. Highly recommend!', TRUE, 2),
        ('Elena V.', 5, 'Перманентный макияж сделали идеально.', 'Permanent makeup was done perfectly.', TRUE, 3)
    """)

    print("❓ Seeding FAQ...")
    c.execute("DELETE FROM public_faq")
    c.execute("""
        INSERT INTO public_faq (question_ru, question_en, answer_ru, answer_en, category, is_active, display_order)
        VALUES 
        ('Как записаться?', 'How to book?', 'Вы можете записаться через сайт или WhatsApp.', 'You can book via website or WhatsApp.', 'general', TRUE, 1),
        ('Есть ли парковка?', 'Is there parking?', 'Да, у нас есть бесплатная парковка для клиентов.', 'Yes, we have free parking for clients.', 'general', TRUE, 2),
        ('Какие бренды используете?', 'What brands do you use?', 'Мы используем Luxio, Fedua и другие премиум бренды.', 'We use Luxio, Fedua and other premium brands.', 'products', TRUE, 3)
    """)

    print("🖼️ Seeding Public Gallery...")
    c.execute("DELETE FROM public_gallery")
    c.execute("""
        INSERT INTO public_gallery (image_url, title_ru, title_en, category, display_order)
        VALUES 
        ('/static/images/portfolio/nail1.jpg', 'Классический маникюр', 'Classic Manicure', 'nails', 1),
        ('/static/images/portfolio/nail2.jpg', 'Дизайн ногтей', 'Nail Art', 'nails', 2),
        ('/static/images/portfolio/hair1.jpg', 'Окрашивание', 'Hair Coloring', 'hair', 3)
    """)

    print("🎉 Seeding Public Banners...")
    c.execute("DELETE FROM public_banners")
    c.execute("""
        INSERT INTO public_banners (title_ru, title_en, subtitle_ru, subtitle_en, image_url, is_active, display_order)
        VALUES 
        ('Скидка 20% на первое посещение', '20% OFF First Visit', 'Только в этом месяце', 'Only this month', '/static/images/banners/banner1.jpg', TRUE, 1),
        ('Новая услуга: Smart Педикюр', 'New: Smart Pedicure', 'Попробуйте инновацию', 'Try the innovation', '/static/images/banners/banner2.jpg', TRUE, 2)
    """)

    conn.commit()
    conn.close()
    print("\n🏁 RESTORED DATA SEEDED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_data()