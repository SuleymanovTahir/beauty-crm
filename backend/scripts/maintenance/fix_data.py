from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_all_fixes():
    """Entry point for centralized maintenance runner"""
    return run_fix()

def run_fix():
    print("🚀 Running system data maintenance...")

    conn = get_db_connection()
    c = conn.cursor()

    # Advisory lock to prevent multiple workers from running maintenance simultaneously
    c.execute("SELECT pg_try_advisory_lock(12346)")  # Different lock ID from init_database (12345)
    got_lock = c.fetchone()[0]
    if not got_lock:
        log_info("⏳ Another process is running maintenance, skipping...", "maintenance")
        conn.close()
        return True  # Return success - maintenance is being done by another worker

    try:
        # ONE-TIME CLEANUP: Remove duplicate reviews and clear bad banner/employee data
        log_info("🧹 Running data cleanup and synchronization...", "maintenance")

        # 1. Delete duplicate reviews - keep only one per unique (author_name, text)
        c.execute("""
            DELETE FROM public_reviews
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM public_reviews
                GROUP BY author_name, text
            )
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Removed {c.rowcount} duplicate reviews", "maintenance")

        # 2. Clear all banners with wrong/missing image paths
        c.execute("""
            DELETE FROM public_banners
            WHERE image_url IS NULL
               OR image_url LIKE '%/employees/%'
               OR image_url LIKE '/static/images/%'
               OR (image_url NOT LIKE '/static/uploads/%' AND image_url NOT LIKE '/landing-images/%')
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Removed {c.rowcount} banners with invalid paths", "maintenance")

        # 3. Clear employee photos that don't exist (404 paths)
        c.execute("""
            UPDATE users SET photo = NULL
            WHERE photo IS NOT NULL
              AND photo LIKE '%/employees/%'
              AND is_service_provider = TRUE
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Cleared {c.rowcount} missing employee photos", "maintenance")

        # 4. Sync Banners - Ensure all banners have images
        c.execute("SELECT id, image_url FROM public_banners")
        existing_banners = c.fetchall()
        if not existing_banners:
            log_info("🚩 Seeding initial banners...", "maintenance")
            c.execute("""
                INSERT INTO public_banners (image_url, title, subtitle, is_active, display_order)
                VALUES ('/landing-images/banners/banner1.webp', 'Салон красоты в Дубае', 'Искусство преображения', TRUE, 1)
            """)
            log_info("   ✅ Re-populated banners", "maintenance")
        else:
            # Fix any banners with missing/empty image_url
            for b_id, img_url in existing_banners:
                if not img_url or img_url.strip() == "":
                    # Better assignment based on found files
                    if b_id == 1:
                        new_img = "/landing-images/faces/banner.webp"
                    elif b_id == 2:
                        new_img = "/landing-images/banners/banner2.webp"
                    elif b_id == 3:
                        new_img = "/landing-images/banners/banner1.webp"
                    else:
                        new_img = "/landing-images/banners/banner1.webp"
                    
                    c.execute("UPDATE public_banners SET image_url = %s WHERE id = %s", (new_img, b_id))
            log_info("🚩 Verified banner images", "maintenance")

        # 5. Sync Employee Photos & Detailed Info
        log_info("👨‍💼 Updating employee photos, bios and status...", "maintenance")
        employee_data = {
            'gulcehre': {
                'full_name': 'Касымова Гульчехре',
                'photo': '/landing-images/staff/Gulya.webp',
                'nickname': 'Gulya',
                'bio': 'Гуля — признанный эксперт в области маникюра, депиляции и профессионального ухода за лицом с 8-летним опытом. Благодаря совершенному владению техниками эстетического преображения и вниманию к деталям, она создает безупречные образы, обеспечивая каждому клиенту высочайший уровень заботы и профессиональный подход.',
                'specialization': 'Ногтевой сервис, Депиляция, Косметология, Массаж',
                'years_of_experience': 8
            },
            'mestan': {
                'full_name': 'Amandurdyyeva Mestan',
                'photo': '/landing-images/staff/Mestan.webp',
                'nickname': 'Mestan',
                'bio': 'Местан — уникальный мастер, сочетающий в себе талант топ-стилиста и эксперта по перманентному макияжу. Ее глубокие знания позволяют создавать законченные и безупречные образы, подчеркивающие вашу индивидуальность.',
                'specialization': 'Стилист по волосам, Перманентный макияж',
                'years_of_experience': 18
            },
            'sabri': {
                'full_name': 'Мохаммед Сабри',
                'photo': '/landing-images/staff/Simo.webp',
                'nickname': 'Simo',
                'bio': 'Симо является ведущим экспертом нашего салона в области премиального ухода и сложного колорирования. Его многолетний международный опыт и авторские методики гарантируют результат высочайшего класса.',
                'specialization': 'Топ-стилист, Колорист',
                'years_of_experience': 10
            },
            'jennifer': {
                'full_name': 'Перадилья Дженнифер',
                'photo': '/landing-images/staff/Jennifer.webp',
                'nickname': 'Jennifer',
                'bio': 'Дженнифер воплощает в себе талант многопрофильного специалиста. Она виртуозно выполняет как базовые, так и сложные бьюти-процедуры, обеспечивая комплексный и гармоничный подход к вашему преображению.',
                'specialization': 'Универсальный мастер красоты',
                'years_of_experience': 12
            },
            'lyazat': {
                'full_name': 'Kozhabay Lyazat',
                'photo': '/landing-images/staff/Lyazzat.webp',
                'nickname': 'Lyazat',
                'bio': 'Лязат — истинный перфекционист в индустрии ногтевого сервиса. Обладая безупречным вкусом и вниманием к деталям, она создает идеальный маникюр и педикюр, заботясь об эстетике и здоровье ваших рук.',
                'specialization': 'Ногтевой сервис',
                'years_of_experience': 5
            }
        }
        
        for username, data in employee_data.items():
            c.execute("""
                UPDATE users SET 
                    full_name = %s,
                    photo = %s, 
                    nickname = %s,
                    bio = %s,
                    specialization = %s,
                    years_of_experience = %s,
                    is_active = TRUE, 
                    is_service_provider = TRUE, 
                    is_public_visible = TRUE 
                WHERE username = %s OR full_name = %s
            """, (
                data['full_name'], data['photo'], data['nickname'], 
                data['bio'], data['specialization'], data['years_of_experience'],
                username, data['full_name']
            ))
        log_info("   ✅ Synchronized all employee detailed info", "maintenance")

        # 8. Merge duplicate employees (DEEP CLEANUP & DELETION)
        log_info("👥 Merging duplicate employees (Final Cleanup)...", "maintenance")
        
        staff_targets = [
            {'username': 'gulcehre', 'alternates': ['kasymova_gulcehre', 'gulya', 'gulcehre_archived'], 'names': ['Kasymova Gulcehre', 'Гульчехра', 'Гуля', 'Касымова Гульчере']},
            {'username': 'jennifer', 'alternates': ['peradilla_jennifer', 'jennifer_archived'], 'names': ['Peradilla Jennifer', 'Перадилья Дженнифер', 'Дженнифер']},
            {'username': 'mestan', 'alternates': ['amandurdyyeva_mestan', 'mestan_archived'], 'names': ['Amandurdyyeva Mestan', 'Амандурдыева Местан', 'Местан']},
            {'username': 'sabri', 'alternates': ['mohamed_sabri', 'sabri_archived', 'simo'], 'names': ['Mohamed Sabri', 'Мохамед Сабри', 'Мохаммед Сабри', 'Симо']},
            {'username': 'lyazat', 'alternates': ['kozhabay_lyazat', 'lyazat_archived'], 'names': ['Kozhabay Lyazat', 'Кожабай Лязат', 'Лязат']}
        ]

        for target in staff_targets:
            # Try to find the record that SHOULD be the master (Active one)
            c.execute("SELECT id FROM users WHERE username = %s AND is_active = TRUE LIMIT 1", (target['username'],))
            res = c.fetchone()
            if not res:
                # Find by any of the names and is_active
                c.execute("SELECT id FROM users WHERE full_name = ANY(%s) AND is_active = TRUE ORDER BY id DESC LIMIT 1", (target['names'],))
                res = c.fetchone()
                if not res: continue
                master_id = res[0]
            else:
                master_id = res[0]

            # Find ALL other users who might be duplicates
            c.execute("""
                SELECT id FROM users 
                WHERE (username IN %s OR username ILIKE ANY(%s) OR full_name = ANY(%s) OR full_name ILIKE ANY(%s)) 
                  AND id != %s
                  AND role NOT IN ('client', 'guest')
            """, (tuple(target['alternates'] + [target['username']]), 
                  [f"%{a}%" for a in target['alternates']], 
                  target['names'],
                  [f"%{n}%" for n in target['names']], 
                  master_id))
            
            duplicate_ids = [r[0] for r in c.fetchall()]

            for source_id in duplicate_ids:
                # Transfer data
                c.execute("""
                    UPDATE users t
                    SET 
                        bio = COALESCE(t.bio, s.bio),
                        specialization = COALESCE(t.specialization, s.specialization),
                        experience = COALESCE(t.experience, s.experience),
                        years_of_experience = COALESCE(t.years_of_experience, s.years_of_experience),
                        photo = COALESCE(t.photo, s.photo),
                        gender = COALESCE(t.gender, s.gender)
                    FROM users s
                    WHERE t.id = %s AND s.id = %s
                """, (master_id, source_id))
                
                # Re-assign related records
                tables_to_fix = [
                    ('bookings', 'employee_id'),
                    ('user_services', 'user_id'),
                    ('user_schedule', 'user_id'),
                    ('messages', 'sender_id'),
                    ('client_images', 'employee_id'),
                    ('payroll_transactions', 'employee_id'),
                    ('employee_documents', 'employee_id'),
                    ('notification_settings', 'user_id'),
                    ('attendance', 'employee_id'),
                    ('work_sessions', 'employee_id'),
                    ('salary_payments', 'employee_id'),
                    ('inventory_logs', 'user_id'),
                    ('broadcast_receivers', 'user_id'),
                    ('user_permissions', 'user_id')
                ]
                
                for table, col in tables_to_fix:
                    # Check if both table and column exist in public schema
                    c.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                              AND table_name = %s 
                              AND column_name = %s
                        )
                    """, (table, col))
                    if c.fetchone()[0]:
                         c.execute(f"UPDATE {table} SET {col} = %s WHERE {col} = %s", (master_id, source_id))
                         if c.rowcount > 0:
                             log_info(f"      🔗 Reassigned {c.rowcount} records from {table}", "maintenance")
                
                # DELETE DUPLICATE
                c.execute("DELETE FROM users WHERE id = %s", (source_id,))
                log_info(f"   🗑️ Deleted duplicate ID: {source_id}", "maintenance")

        log_info("   ✅ Finished deep cleanup and deletion of staff duplicates", "maintenance")
        
        # 9. Ensure only providers are public
        c.execute("""
            UPDATE users SET is_public_visible = FALSE
            WHERE is_service_provider = FALSE AND is_public_visible = TRUE
        """)
        
        # 10. Fix service names capitalization
        log_info("✏️  Fixing service names capitalization...", "maintenance")
        c.execute("""
            UPDATE services SET name = INITCAP(name) WHERE name ~ '^[а-яa-z]';
        """)

        # 12. Fix Usernames and Full Names for Active Staff
        log_info("👤 Synchronizing staff with credentials...", "maintenance")
        import os
        from utils.utils import hash_password, verify_password

        staff_fixes = [
            ('gulcehre', 'Касымова Гульчехре'),
            ('jennifer', 'Перадилья Дженнифер'),
            ('mestan', 'Amandurdyyeva Mestan'),
            ('sabri', 'Мохаммед Сабри'),
            ('lyazat', 'Kozhabay Lyazat')
        ]
        
        credentials_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "staff_credentials.txt")
        passwords = {}
        if os.path.exists(credentials_path):
            try:
                with open(credentials_path, "r", encoding="utf-8") as f:
                    curr_u = None
                    for line in f:
                        line = line.strip()
                        if line.startswith("Username: "): curr_u = line.replace("Username: ", "")
                        elif line.startswith("Password: ") and curr_u:
                            passwords[curr_u] = line.replace("Password: ", "")
                            curr_u = None
            except: pass

        for pref_u, pref_f in staff_fixes:
            c.execute("SELECT id, password_hash FROM users WHERE full_name = %s OR username = %s LIMIT 1", (pref_f, pref_u))
            u_data = c.fetchone()
            if u_data:
                u_id = u_data[0]
                c.execute("UPDATE users SET username = %s, full_name = %s, is_active = TRUE WHERE id = %s", (pref_u, pref_f, u_id))
                if pref_u in passwords:
                    if not u_data[1] or not verify_password(passwords[pref_u], u_data[1]):
                        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_password(passwords[pref_u]), u_id))

        # Sync admin
        c.execute("SELECT id, password_hash FROM users WHERE username = 'admin'")
        admin_data = c.fetchone()
        if admin_data and 'admin' in passwords:
            if not admin_data[1] or not verify_password(passwords['admin'], admin_data[1]):
                c.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (hash_password(passwords['admin']),))

        conn.commit()
        log_info("🏆 Data maintenance completed successfully!", "maintenance")
        return True

    except Exception as e:
        log_error(f"❌ Maintenance failed: {e}", "maintenance")
        try: conn.rollback()
        except: pass
        return False
    finally:
        try: c.execute("SELECT pg_advisory_unlock(12346)")
        except: pass
        try: conn.close()
        except: pass

if __name__ == "__main__":
    run_fix()
