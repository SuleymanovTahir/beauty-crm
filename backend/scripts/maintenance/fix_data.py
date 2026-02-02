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

        # 4. Sync Banners (Only if empty)
        c.execute("SELECT COUNT(*) FROM public_banners")
        if c.fetchone()[0] == 0:
            log_info("🚩 Seeding initial banners...", "maintenance")
            c.execute("""
                INSERT INTO public_banners (image_url, title, subtitle, is_active, display_order, bg_pos_desktop_x, bg_pos_desktop_y, bg_pos_mobile_x, bg_pos_mobile_y)
                VALUES ('/landing-images/banners/banner2.webp', 'Салон красоты в Дубае', 'Искусство преображения', TRUE, 1, 50, 50, 50, 50)
            """)
            log_info("   ✅ Re-populated banners", "maintenance")
        else:
            log_info("🚩 Banners already exist, skipping seed", "maintenance")

        # 5. Sync Employee Photos
        log_info("👨‍💼 Updating employee photos...", "maintenance")
        employee_photos = {
            'Amandurdyyeva Mestan': '/landing-images/staff/Местан.webp',
            'Mohamed Sabri': '/landing-images/staff/Симо.webp',
            'Peradilla Jennifer': '/landing-images/staff/Дженнифер.webp',
            'Kasymova Gulcehre': '/landing-images/staff/Гуля.webp',
            'Kozhabay Lyazat': '/landing-images/staff/Ляззат.webp'
        }
        for name, photo_path in employee_photos.items():
            c.execute("UPDATE users SET photo = %s WHERE full_name = %s", (photo_path, name))
        log_info("   ✅ Updated employee photos", "maintenance")

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
                ('Волосы.webp', 'Стильная укладка'), ('Маникюр.webp', 'Классический маникюр'),
                ('Перманент губ.webp', 'Перманентный макияж губ'), ('Волосы2.webp', 'Стрижка и окрашивание')
            ]
            for img, title in portfolio_photos:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, 'portfolio', 0, TRUE)
                """, (f'/landing-images/portfolio/{img}', title, title))

            # Services photos
            services_photos = [
                ('Маникюр 4.webp', 'Маникюр'), ('Массаж лица.webp', 'Массаж лица'),
                ('Перманент ресниц.webp', 'Перманент ресниц'), ('Спа.webp', 'SPA'),
                ('Стрижка .webp', 'Стрижка')
            ]
            for img, title in services_photos:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, 'services', 0, TRUE)
                """, (f'/landing-images/services/{img}', title, title))

            log_info(f"   ✅ Re-populated gallery with {len(salon_photos) + len(portfolio_photos) + len(services_photos)} items", "maintenance")
        else:
            log_info("🎨 Gallery already exists, skipping seed", "maintenance")

        # 7. Ensure non-service-providers are not shown on public site
        c.execute("""
            UPDATE users SET is_public_visible = FALSE
            WHERE is_service_provider = FALSE AND is_public_visible = TRUE
        """)
        
        # Hide Director from public list (Tursunay)
        c.execute("UPDATE users SET is_public_visible = FALSE, is_service_provider = FALSE WHERE full_name = 'Турсунай'")

        # 8. Fix service names capitalization
        log_info("✏️  Fixing service names capitalization...", "maintenance")
        c.execute("""
            UPDATE services SET name = 'Пилинг' WHERE name = 'пилинг';
            UPDATE services SET name = INITCAP(name) WHERE name ~ '^[а-яa-z]';
        """)

        # 9. Sync Service Positions
        log_info("🔗 Syncing service positions...", "maintenance")
        c.execute("""
            INSERT INTO service_positions (service_id, position_id)
            SELECT id, position_id 
            FROM services 
            WHERE position_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)

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
