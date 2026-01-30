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
        # This runs once to fix existing issues, then CRM is source of truth
        log_info("🧹 Running one-time data cleanup...", "maintenance")

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
               OR image_url NOT LIKE '/static/uploads/%'
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Removed {c.rowcount} banners with invalid paths", "maintenance")

        # 3. Clear employee photos that don't exist (404 paths)
        # User should upload photos via CRM Staff section
        c.execute("""
            UPDATE users SET photo = NULL
            WHERE photo IS NOT NULL
              AND photo LIKE '%/employees/%'
              AND is_service_provider = TRUE
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Cleared {c.rowcount} missing employee photos (upload via CRM)", "maintenance")

        # NOTE: Public content (FAQ, Reviews, Banners) is now managed via CRM admin panel
        # DO NOT auto-restore from locales - CRM is the source of truth
        log_info("📦 Skipping public content restore (CRM is source of truth)", "maintenance")
        
        # NOTE: Review avatars are now managed via CRM - skipping auto-clear
        log_info("👤 Skipping review avatar changes (CRM managed)", "maintenance")
        
        # 4. Employee photos and details - now managed via CRM Staff section
        # Only set experience/bio if NOT already set (don't overwrite CRM data)
        log_info("👨‍💼 Setting default employee details (won't overwrite existing)...", "maintenance")
        c.execute("""
            -- Only set bio/experience if currently NULL (preserve CRM edits)
            UPDATE users SET
                years_of_experience = COALESCE(years_of_experience, 18),
                bio = COALESCE(bio, 'Топ-стилист с международным опытом.')
            WHERE full_name = 'Amandurdyyeva Mestan' AND (years_of_experience IS NULL OR bio IS NULL);

            UPDATE users SET
                years_of_experience = COALESCE(years_of_experience, 10),
                bio = COALESCE(bio, 'Талантливый стилист.')
            WHERE full_name = 'Mohamed Sabri' AND (years_of_experience IS NULL OR bio IS NULL);

            UPDATE users SET
                years_of_experience = COALESCE(years_of_experience, 12),
                bio = COALESCE(bio, 'Мастер-универсал высшей категории.')
            WHERE full_name = 'Peradilla Jennifer' AND (years_of_experience IS NULL OR bio IS NULL);

            UPDATE users SET
                years_of_experience = COALESCE(years_of_experience, 8),
                bio = COALESCE(bio, 'Опытный мастер ногтевого сервиса.')
            WHERE full_name = 'Kasymova Gulcehre' AND (years_of_experience IS NULL OR bio IS NULL);

            UPDATE users SET
                years_of_experience = COALESCE(years_of_experience, 5),
                bio = COALESCE(bio, 'Аккуратный и внимательный мастер.')
            WHERE full_name = 'Kozhabay Lyazat' AND (years_of_experience IS NULL OR bio IS NULL);

            -- NOTE: Employee photos should be uploaded via CRM Staff section
            -- DO NOT set photo paths here - they are managed via CRM

            -- Hide Director from public list (Tursunay)
            UPDATE users SET is_public_visible = FALSE, is_service_provider = FALSE WHERE full_name = 'Турсунай';
        """)
        
        # 5. Gallery is now managed via CRM Public Content > Gallery
        # Only add salon photos if completely empty (for initial setup)
        log_info("🎨 Checking gallery...", "maintenance")

        c.execute("SELECT COUNT(*) FROM public_gallery WHERE category = 'salon'")
        salon_count = c.fetchone()[0]

        if salon_count == 0:
            log_info("   Adding initial salon interior photos...", "maintenance")
            c.execute("""
                INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active) VALUES
                ('/static/uploads/images/salon/salon_main.webp', 'Интерьер салона', 'Уютная атмосфера нашего салона', 'salon', 1, TRUE),
                ('/static/uploads/images/salon/moroccan_bath.webp', 'SPA зона', 'Зона релаксации и отдыха', 'salon', 2, TRUE),
                ('/static/uploads/images/salon/hair_studio.webp', 'Парикмахерский зал', 'Профессиональное оборудование', 'salon', 3, TRUE),
                ('/static/uploads/images/salon/nail_salon.webp', 'Зона маникюра', 'Комфортные рабочие места', 'salon', 4, TRUE),
                ('/static/uploads/images/salon/massage_room.webp', 'Кабинет массажа', 'Расслабляющая обстановка', 'salon', 5, TRUE)
            """)
            log_info("   ✅ Added 5 initial salon photos", "maintenance")
        else:
            log_info("   Gallery already has data - skipping (CRM managed)", "maintenance")

        # NOTE: Portfolio, services, and faces categories should be managed via CRM Gallery tab
        # Use import_all_images.py script to bulk import from upload folders if needed

        # 6. Fix service names capitalization (Professional terminology)
        log_info("✏️  Fixing service names capitalization...", "maintenance")
        c.execute("""
            UPDATE services SET name = 'Пилинг' WHERE name = 'пилинг';
            UPDATE services SET name = INITCAP(name) WHERE name ~ '^[а-яa-z]';
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Capitalized {c.rowcount} service names", "maintenance")


        # 6. Deduplicate Achievement Templates
        log_info("🧹 Cleaning up duplicate achievements...", "maintenance")
        c.execute("""
            DELETE FROM client_achievements 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM client_achievements 
                WHERE client_id = 'template'
                GROUP BY achievement_type, COALESCE(title, '')
            ) AND client_id = 'template';
        """)
        log_info(f"✅ Removed {c.rowcount} redundant templates", "maintenance")

        # 7. Staff Schedule Generation
        log_info("📅 Verifying staff schedules...", "maintenance")
        c.execute("SELECT id, full_name FROM users WHERE role IN ('master', 'employee', 'director', 'admin') AND is_active = TRUE")
        users = c.fetchall()
        
        gen_count = 0
        for user in users:
            uid = user[0]
            for day in range(7):
                c.execute("SELECT id FROM user_schedule WHERE user_id = %s AND day_of_week = %s", (uid, day))
                if not c.fetchone():
                    c.execute("""
                        INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                        VALUES (%s, %s, '10:30', '21:00', true)
                    """, (uid, day))
                    gen_count += 1
        
        if gen_count > 0:
            log_info(f"✅ Generated {gen_count} missing shifts", "maintenance")
        else:
            log_info("🗓️ All staff schedules are complete", "maintenance")

        # 8. Schedule Uniqueness check
        c.execute("""
            DELETE FROM user_schedule 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM user_schedule 
                GROUP BY user_id, day_of_week
            );
        """)

        # 9. Sync Service Positions (Migration from position_id to service_positions)
        log_info("🔗 Syncing service positions...", "maintenance")
        c.execute("""
            INSERT INTO service_positions (service_id, position_id)
            SELECT id, position_id 
            FROM services 
            WHERE position_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)
        if c.rowcount > 0:
            log_info(f"✅ Synced {c.rowcount} primary positions to service_positions mapping", "maintenance")

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
