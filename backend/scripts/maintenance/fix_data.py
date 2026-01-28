from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_all_fixes():
    """Entry point for centralized maintenance runner"""
    return run_fix()

def run_fix():
    print("🚀 Running system data maintenance...")
    
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Restore Public Content from locales (Rule 15 compliance)
        log_info("📦 Restoring public content from locales...", "maintenance")
        import json
        from pathlib import Path
        
        backend_dir = Path(__file__).parent.parent.parent
        ru_dynamic = backend_dir.parent / 'frontend' / 'src' / 'locales' / 'ru' / 'dynamic.json'
        
        if ru_dynamic.exists():
            with open(ru_dynamic, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Restore FAQ
            faq_data = {}
            for key, value in data.items():
                if key.startswith('public_faq.'):
                    parts = key.split('.')
                    if len(parts) >= 3:
                        try:
                            faq_id = int(parts[1])
                            field = parts[2].replace('_ru', '').split('.')[0]
                            if faq_id not in faq_data:
                                faq_data[faq_id] = {}
                            faq_data[faq_id][field] = value
                        except ValueError:
                            continue
            
            if faq_data:
                c.execute("DELETE FROM public_faq")
                for faq_id, fields in sorted(faq_data.items()):
                    if 'question' in fields and 'answer' in fields:
                        c.execute("""
                            INSERT INTO public_faq (id, question, answer, category, is_active, display_order)
                            VALUES (%s, %s, %s, 'general', TRUE, 0)
                        """, (faq_id, fields['question'], fields['answer']))
                log_info(f"✅ Restored {len(faq_data)} FAQ items", "maintenance")
            
            # Restore Reviews
            review_data = {}
            for key, value in data.items():
                if key.startswith('public_reviews.'):
                    parts = key.split('.')
                    if len(parts) >= 3:
                        try:
                            review_id = int(parts[1])
                            field = parts[2].replace('_ru', '').split('.')[0]
                            if review_id not in review_data:
                                review_data[review_id] = {}
                            review_data[review_id][field] = value
                        except ValueError:
                            continue
            
            if review_data:
                c.execute("DELETE FROM public_reviews")
                for review_id, fields in sorted(review_data.items()):
                    if 'text' in fields:
                        c.execute("""
                            INSERT INTO public_reviews (id, author_name, text, rating, employee_position, is_active, display_order)
                            VALUES (%s, %s, %s, 5, %s, TRUE, 0)
                        """, (
                            review_id, 
                            fields.get('author_name', 'Клиент'),
                            fields['text'],
                            fields.get('employee_position', 'Мастер')
                        ))
                log_info(f"✅ Restored {len(review_data)} reviews", "maintenance")
            
            # Restore Banners
            banner_data = {}
            for key, value in data.items():
                if key.startswith('public_banners.'):
                    parts = key.split('.')
                    if len(parts) >= 3:
                        try:
                            banner_id = int(parts[1])
                            field = parts[2].replace('_ru', '').split('.')[0]
                            if banner_id not in banner_data:
                                banner_data[banner_id] = {}
                            banner_data[banner_id][field] = value
                        except ValueError:
                            continue
            
            if banner_data:
                c.execute("DELETE FROM public_banners")
                for banner_id, fields in sorted(banner_data.items()):
                    if 'title' in fields:
                        c.execute("""
                            INSERT INTO public_banners (id, title, subtitle, is_active, display_order)
                            VALUES (%s, %s, %s, TRUE, 0)
                        """, (banner_id, fields['title'], fields.get('subtitle', '')))
                log_info(f"✅ Restored {len(banner_data)} banners", "maintenance")
        
        # 2. Add photos for banners
        log_info("🖼️  Adding banner images...", "maintenance")
        c.execute("""
            UPDATE public_banners SET image_url = '/static/uploads/images/banners/banner_main.webp', display_order = 1 WHERE id = 1;
            UPDATE public_banners SET image_url = '/static/uploads/images/branches/branch_dubai_marina_1.webp', display_order = 2 WHERE id = 2; -- Placeholder or use same banner?
            UPDATE public_banners SET image_url = '/static/uploads/images/salon/moroccan_bath.webp', display_order = 3 WHERE id = 3;
            UPDATE public_banners SET image_url = '/static/uploads/images/salon/salon_main.webp', display_order = 4 WHERE id = 14;
            UPDATE public_banners SET image_url = '/static/uploads/images/employees/simo.webp', display_order = 5 WHERE id = 15;
            UPDATE public_banners SET image_url = '/static/uploads/images/employees/jennifer.webp', display_order = 6 WHERE id = 16;
            UPDATE public_banners SET image_url = '/static/uploads/images/employees/mestan.webp', display_order = 7 WHERE id = 17;
            UPDATE public_banners SET image_url = '/static/uploads/images/employees/lyazzat.webp', display_order = 8 WHERE id = 18;
            
            -- Set same main banner for first two if second missing
            UPDATE public_banners SET image_url = '/static/uploads/images/banners/banner_main.webp' WHERE id = 2;
        """)
        
        # 3. Add review avatars
        log_info("👤 Clearing review avatars (using defaults)...", "maintenance")
        c.execute("UPDATE public_reviews SET avatar_url = NULL")
        
        # 4. Add employee photos AND experience/bio
        log_info("👨‍💼 Adding employee photos and details...", "maintenance")
        c.execute("""
            -- Mestan
            UPDATE users SET 
                photo = '/static/uploads/images/employees/mestan.webp',
                years_of_experience = 18,
                bio = 'Топ-стилист с международным опытом. Эксперт по сложным техникам окрашивания и восстановлению волос.'
            WHERE full_name = 'Amandurdyyeva Mestan';

            -- Mohamed
            UPDATE users SET 
                photo = '/static/uploads/images/employees/simo.webp',
                years_of_experience = 10,
                bio = 'Талантливый стилист, создающий неповторимые образы. Специалист по мужским и женским стрижкам.'
            WHERE full_name = 'Mohamed Sabri';

            -- Jennifer
            UPDATE users SET 
                photo = '/static/uploads/images/employees/jennifer.webp',
                years_of_experience = 12,
                bio = 'Мастер-универсал высшей категории. Виртуозно выполняет любые виды стрижек и укладок.'
            WHERE full_name = 'Peradilla Jennifer';

            -- Gulcehre
            UPDATE users SET 
                photo = '/static/uploads/images/employees/gulya.webp',
                years_of_experience = 8,
                bio = 'Опытный мастер ногтевого сервиса. Идеальный маникюр и педикюр любой сложности.'
            WHERE full_name = 'Kasymova Gulcehre';

            -- Lyazat
            UPDATE users SET 
                photo = '/static/uploads/images/employees/lyazzat.webp',
                years_of_experience = 5,
                bio = 'Аккуратный и внимательный мастер. Специализируется на эстетическом маникюре и дизайне.'
            WHERE full_name = 'Kozhabay Lyazat';

            -- Rename Services
            UPDATE services SET name = REPLACE(name, 'Укладка на брашинг', 'Укладка феном');
            UPDATE services SET name = REPLACE(name, 'Укладка утюжок/волны', 'Локоны / Выпрямление');

            -- Hide Director from public list (Tursunay)
            UPDATE users SET is_public_visible = FALSE, is_service_provider = FALSE WHERE full_name = 'Турсунай';
        """)
        
        # 5. Restore gallery (idempotent - adds only missing items)
        log_info("🎨 Restoring gallery...", "maintenance")
        
        # Check if portfolio exists
        c.execute("SELECT COUNT(*) FROM public_gallery WHERE category != 'salon'")
        portfolio_count = c.fetchone()[0]
        
        if portfolio_count == 0:
            log_info("   Adding portfolio photos...", "maintenance")
            c.execute("""
                INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active) VALUES
                ('/static/images/portfolio/волосы.webp', 'Окрашивание блонд', 'Идеальный платиновый блонд', 'hair', 1, TRUE),
                ('/static/images/portfolio/волосы2.webp', 'Стильная укладка', 'Работа нашего топ-стилиста', 'hair', 2, TRUE),
                ('/static/images/portfolio/волосы_блондинка.webp', 'Блонд окрашивание', 'Профессиональное окрашивание', 'hair', 3, TRUE),
                ('/static/images/portfolio/кератин_блондинка.webp', 'Кератиновое выпрямление', 'Гладкие и блестящие волосы', 'hair', 4, TRUE),
                ('/static/images/portfolio/кератин_блондинка_2.webp', 'Кератин', 'Восстановление структуры волос', 'hair', 5, TRUE),
                ('/static/images/portfolio/маникюр.webp', 'Классический маникюр', 'Чистота и идеальная форма', 'nails', 6, TRUE),
                ('/static/images/portfolio/маникюр3.webp', 'Маникюр с дизайном', 'Стильный дизайн ногтей', 'nails', 7, TRUE),
                ('/static/images/portfolio/ногти2.webp', 'Дизайн ногтей', 'Аккуратное покрытие и стильный дизайн', 'nails', 8, TRUE),
                ('/static/images/portfolio/ногти_до_после.webp', 'Преображение ногтей', 'До и после процедуры', 'nails', 9, TRUE),
                ('/static/images/portfolio/спа2.webp', 'SPA-процедуры', 'Релакс и уход за кожей', 'spa', 10, TRUE),
                ('/static/images/portfolio/спа3.webp', 'Марокканская баня', 'Традиционный восточный уход', 'spa', 11, TRUE),
                ('/static/images/portfolio/перманент_губ.webp', 'Перманентный макияж губ', 'Естественный и стойкий результат', 'makeup', 12, TRUE),
                ('/static/images/portfolio/воксинг.webp', 'Депиляция', 'Гладкая кожа надолго', 'waxing', 13, TRUE)
            """)
            log_info("   ✅ Added 13 portfolio photos", "maintenance")
        
        # Check if salon photos exist
        c.execute("SELECT COUNT(*) FROM public_gallery WHERE category = 'salon'")
        salon_count = c.fetchone()[0]
        
        if salon_count == 0:
            log_info("   Adding salon interior photos...", "maintenance")
            c.execute("""
                INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active) VALUES
                ('/static/uploads/images/salon/salon_main.webp', 'Интерьер салона', 'Уютная атмосфера нашего салона', 'salon', 14, TRUE),
                ('/static/uploads/images/salon/moroccan_bath.webp', 'SPA зона', 'Зона релаксации и отдыха', 'salon', 15, TRUE),
                ('/static/uploads/images/salon/hair_studio.webp', 'Парикмахерский зал', 'Профессиональное оборудование', 'salon', 16, TRUE),
                ('/static/uploads/images/salon/nail_salon.webp', 'Зона маникюра', 'Комфортные рабочие места', 'salon', 17, TRUE),
                ('/static/uploads/images/salon/massage_room.webp', 'Кабинет массажа', 'Расслабляющая обстановка', 'salon', 18, TRUE),
                ('/static/uploads/images/salon/salon_details_2.webp', 'Детали интерьера', 'Элементы декора', 'salon', 19, TRUE),
                ('/static/uploads/images/salon/salon_details_4.webp', 'Зона ожидания', 'Комфорт для клиентов', 'salon', 20, TRUE),
                ('/static/uploads/images/salon/salon_details_8.webp', 'Оборудование', 'Современное оснащение', 'salon', 21, TRUE),
                ('/static/uploads/images/salon/salon_details_9.webp', 'Атмосфера', 'Уют и спокойствие', 'salon', 22, TRUE)
            """)
            log_info("   ✅ Added 9 salon photos", "maintenance")

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
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    run_fix()
