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
        # Allowing /landing-images/ now
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

        # 5. Sync Employee Photos
        log_info("👨‍💼 Updating employee photos and public status...", "maintenance")
        employee_photos = {
            'Amandurdyyeva Mestan': '/landing-images/staff/Mestan.webp',
            'Simo (Mohamed Sabri)': '/landing-images/staff/Simo.webp',
            'Peradilla Jennifer': '/landing-images/staff/Jennifer.webp',
            'Kasymova Gulcehre': '/landing-images/staff/Gulya.webp',
            'Kozhabay Lyazat': '/landing-images/staff/Lyazzat.webp'
        }
        
        # First, ensure these names are correctly set in the DB
        c.execute("UPDATE users SET full_name = 'Simo (Mohamed Sabri)' WHERE full_name = 'Mohamed Sabri' OR username = 'sabri'")
        
        for name, photo_path in employee_photos.items():
            c.execute("""
                UPDATE users SET 
                    photo = %s, 
                    is_active = TRUE, 
                    is_service_provider = TRUE, 
                    is_public_visible = TRUE 
                WHERE full_name = %s OR (full_name = 'Mohamed Sabri' AND %s = 'Simo (Mohamed Sabri)')
            """, (photo_path, name, name))
        log_info("   ✅ Updated employee photos, visibility and status", "maintenance")
        
        # 5.1 Sync Nicknames for employees (As per USER's objective for public display)
        log_info("📛 Updating employee nicknames...", "maintenance")
        employee_nicknames = {
            'sabri': 'Simo',
            'gulcehre': 'Gulya',
            'mestan': 'Mestan',
            'jennifer': 'Jennifer',
            'lyazat': 'Lyazat'
        }
        for uname, nname in employee_nicknames.items():
            c.execute("UPDATE users SET nickname = %s WHERE username = %s OR username = %s", (nname, uname, f"{uname}_archived"))
        log_info("   ✅ Synchronized employee nicknames", "maintenance")

        # 6. Clear and Re-populate Gallery (Only if empty)
        c.execute("SELECT COUNT(*) FROM public_gallery")
        if c.fetchone()[0] == 0:
            log_info("🎨 Syncing gallery...", "maintenance")
            
            # Salon photos (MATCHING EXACT CASE FROM SERVER)
            salon_photos = [
                ('1.webp', 'Интерьер салона'), ('2.webp', 'SPA зона'), ('4.webp', 'Парикмахерский зал'),
                ('8.webp', 'Детали интерьера'), ('9.webp', 'Зона ожидания'), ('Hair Styling Studio.webp', 'Парикмахерский зал'),
                ('Massage Room (2).webp', 'Кабинет массажа'), ('Massage Room.webp', 'Кабинет массажа'),
                ('Moroccan Bath.webp', 'Марокканская баня'), ('Nail Salon.webp', 'Зона маникюра')
            ]
            for img, title in salon_photos:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, 'salon', 0, TRUE)
                """, (f'/landing-images/salon/{img}', title, title))

            # Portfolio photos
            portfolio_photos = [
                ('Hair.webp', 'Стильная укладка'), ('Manicure.webp', 'Классический маникюр'),
                ('Permanent_lips.webp', 'Перманентный макияж губ'), ('Hair2.webp', 'Стрижка и окрашивание')
            ]
            for img, title in portfolio_photos:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, 'portfolio', 0, TRUE)
                """, (f'/landing-images/portfolio/{img}', title, title))

            # Services photos
            services_photos = [
                ('Manicure_4.webp', 'Маникюр'), ('Face_massage.webp', 'Массаж лица'),
                ('Permanent_lashes.webp', 'Перманент ресниц'), ('Spa.webp', 'SPA'),
                ('Haircut.webp', 'Стрижка')
            ]
            for img, title in services_photos:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, 'services', 0, TRUE)
                """, (f'/landing-images/services/{img}', title, title))

            log_info(f"   ✅ Re-populated gallery with {len(salon_photos) + len(portfolio_photos) + len(services_photos)} items", "maintenance")
        else:
            log_info("🎨 Gallery already exists, skipping seed", "maintenance")

        # 8. Merge duplicate employees (PRO-ACTIVE DEDUPLICATION)
        log_info("👥 Merging duplicate employees (Deep Cleanup)...", "maintenance")
        
        staff_targets = [
            {'username': 'gulcehre', 'alternates': ['kasymova_gulcehre', 'gulya', 'gulcehre_archived'], 'names': ['Kasymova Gulcehre', 'Гульчехра', 'Гуля']},
            {'username': 'jennifer', 'alternates': ['peradilla_jennifer', 'jennifer_archived'], 'names': ['Peradilla Jennifer', 'Перадилья Дженнифер', 'Дженнифер']},
            {'username': 'mestan', 'alternates': ['amandurdyyeva_mestan', 'mestan_archived'], 'names': ['Amandurdyyeva Mestan', 'Амандурдыева Местан', 'Местан']},
            {'username': 'sabri', 'alternates': ['mohamed_sabri', 'sabri_archived'], 'names': ['Mohamed Sabri', 'Мохамед Сабри', 'Мохаммед Сабри', 'Симо']},
            {'username': 'lyazat', 'alternates': ['kozhabay_lyazat', 'lyazat_archived'], 'names': ['Kozhabay Lyazat', 'Кожабай Лязат', 'Лязат']}
        ]

        # First, ensure target usernames are set for the BEST records
        for target in staff_targets:
            # Try to find the record that SHOULD be the master
            # Priority: 1. Correct username, 2. Highest ID with correct full name
            c.execute("SELECT id FROM users WHERE username = %s LIMIT 1", (target['username'],))
            res = c.fetchone()
            if not res:
                # Find by any of the names
                c.execute("SELECT id FROM users WHERE full_name ILIKE ANY(%s) ORDER BY id DESC LIMIT 1", (target['names'],))
                res = c.fetchone()
                if not res: continue
                master_id = res[0]
                c.execute("UPDATE users SET username = %s, is_active = TRUE WHERE id = %s", (target['username'], master_id))
            else:
                master_id = res[0]

            # 2. Find ALL other active users who might be duplicates (same name or known alternates)
            # Use ILIKE and ANY for broad matching
            c.execute("""
                SELECT id FROM users 
                WHERE (username IN %s OR username ILIKE ANY(%s) OR full_name ILIKE ANY(%s)) 
                  AND id != %s
                  AND role NOT IN ('client', 'guest')
            """, (tuple(target['alternates'] + [target['username']]), 
                  [f"%{a}%" for a in target['alternates']], 
                  [f"%{n}%" for n in target['names']], 
                  master_id))
            
            duplicate_ids = [r[0] for r in c.fetchall()]

            for source_id in duplicate_ids:
                # Log the merge
                c.execute("SELECT username, full_name FROM users WHERE id = %s", (source_id,))
                s_info = c.fetchone()
                log_info(f"   🔄 Merging duplicate: {s_info[0]} ({s_info[1]}) -> {target['username']}", "maintenance")

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
                
                # Transfer services
                c.execute("""
                    INSERT INTO user_services (user_id, service_id)
                    SELECT %s, service_id 
                    FROM user_services 
                    WHERE user_id = %s
                    ON CONFLICT DO NOTHING
                """, (master_id, source_id))
                
                # DEACTIVATE DUPLICATE
                c.execute("UPDATE users SET is_active = FALSE, is_public_visible = FALSE, is_service_provider = FALSE WHERE id = %s", (source_id,))

        log_info("   ✅ Finished deep cleanup of staff duplicates", "maintenance")
        
        # 9. Ensure only providers are public
        c.execute("""
            UPDATE users SET is_public_visible = FALSE
            WHERE is_service_provider = FALSE AND is_public_visible = TRUE
        """)
        
        # Hide Director (Tursunay)
        c.execute("UPDATE users SET is_public_visible = FALSE, is_service_provider = FALSE WHERE full_name = 'Турсунай'")

        # 10. Fix service names capitalization
        log_info("✏️  Fixing service names capitalization...", "maintenance")
        c.execute("""
            UPDATE services SET name = 'Пилинг' WHERE name = 'пилинг';
            UPDATE services SET name = INITCAP(name) WHERE name ~ '^[а-яa-z]';
        """)

        # 11. Sync Service Positions
        log_info("🔗 Syncing service positions...", "maintenance")
        c.execute("""
            INSERT INTO service_positions (service_id, position_id)
            SELECT id, position_id 
            FROM services 
            WHERE position_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)

        # 12. Fix Usernames and Full Names for Active Staff
        log_info("👤 Fixing staff usernames and names...", "maintenance")
        import os
        from utils.utils import hash_password

        # Structure: (preferred_username, preferred_full_name)
        staff_fixes = [
            ('gulcehre', 'Kasymova Gulcehre'),
            ('jennifer', 'Peradilla Jennifer'),
            ('mestan', 'Amandurdyyeva Mestan'),
            ('sabri', 'Simo (Mohamed Sabri)'),
            ('lyazat', 'Kozhabay Lyazat')
        ]
        
        # Load credentials from file
        credentials_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "staff_credentials.txt")
        passwords = {}
        if os.path.exists(credentials_path):
            try:
                with open(credentials_path, "r", encoding="utf-8") as f:
                    current_username = None
                    for line in f:
                        line = line.strip()
                        if line.startswith("Username: "):
                            current_username = line.replace("Username: ", "")
                        elif line.startswith("Password: ") and current_username:
                            passwords[current_username] = line.replace("Password: ", "")
                            current_username = None
                log_info(f"   📂 Loaded {len(passwords)} passwords from credentials file", "maintenance")
            except Exception as e:
                log_error(f"   ❌ Failed to read credentials: {e}", "maintenance")

        for preferred_username, preferred_full_name in staff_fixes:
            # Update user by full_name
            c.execute("SELECT id, username, password_hash FROM users WHERE full_name = %s", (preferred_full_name,))
            user_data = c.fetchone()
            
            if user_data:
                target_id = user_data[0]
                current_username = user_data[1]
                current_hash_in_db = user_data[2]
                
                # Update username if different
                if current_username != preferred_username:
                    c.execute("UPDATE users SET username = %s, is_active = TRUE WHERE id = %s", 
                              (preferred_username, target_id))
                    log_info(f"   ✅ Updated username to {preferred_username} for {preferred_full_name}", "maintenance")
                
                # Apply password from staff_credentials.txt only IF DIFFERENT
                if preferred_username in passwords:
                    current_pwd_in_file = passwords[preferred_username]
                    from utils.utils import verify_password
                    
                    if not current_hash_in_db or not verify_password(current_pwd_in_file, current_hash_in_db):
                        new_hash = hash_password(current_pwd_in_file)
                        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, target_id))
                        log_info(f"   ✅ Password SYNCED for {preferred_username} (ID: {target_id})", "maintenance")
                    else:
                        log_info(f"   ✅ Password OK for {preferred_username} (ID: {target_id})", "maintenance")
            else:
                log_error(f"   ❌ User with name {preferred_full_name} not found!", "maintenance")

        # Sync admin password if in file and DIFFERENT
        if 'admin' in passwords:
            c.execute("SELECT id, password_hash FROM users WHERE username = 'admin'")
            admin_data = c.fetchone()
            if admin_data:
                from utils.utils import verify_password
                if not admin_data[1] or not verify_password(passwords['admin'], admin_data[1]):
                    c.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (hash_password(passwords['admin']),))
                    log_info("   ✅ Admin password SYNCED from credentials file", "maintenance")
                else:
                    log_info("   ✅ Admin password OK", "maintenance")

        conn.commit()
        log_info("🏆 Data maintenance completed successfully!", "maintenance")
        return True

    except Exception as e:
        log_error(f"❌ Maintenance failed: {e}", "maintenance")
        try:
            conn.rollback()
        except:
            pass
        return False
    finally:
        # Release advisory lock
        try:
            c.execute("SELECT pg_advisory_unlock(12346)")
        except:
            pass
        try:
            conn.close()
        except:
            pass


if __name__ == "__main__":
    run_fix()
