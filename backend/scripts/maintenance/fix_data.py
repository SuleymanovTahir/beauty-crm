import sys
import os
import psycopg2
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from db.init import init_database

def merge_clients(main_id: str, redundant_id: str):
    """Объединить двух клиентов в одного"""
    print(f"🔗 Merging client '{redundant_id}' into '{main_id}'...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Tables to update (column names might vary, so we handle them carefully)
        tables = [
            ("bookings", "instagram_id"),
            ("bot_analytics", "instagram_id"),
            ("challenge_progress", "client_id"),
            ("client_beauty_metrics", "client_id"),
            ("client_favorite_masters", "client_id"),
            ("client_gallery", "client_id"),
            ("client_interaction_patterns", "client_id"),
            ("client_notifications", "client_instagram_id"),
            ("client_preferences", "client_id"),
            ("client_referrals", "referrer_id"),
            ("client_referrals", "referred_id"),
            ("conversation_context", "client_id"),
            ("conversations", "client_id"),
            ("gallery_photos", "client_id"),
            ("loyalty_transactions", "client_id"),
            ("messenger_messages", "client_id"),
            ("notifications", "client_id"),
            ("referral_campaign_users", "client_id")
        ]
        
        updated_total = 0
        for table, col in tables:
            try:
                # В PostgreSQL ошибка в транзакции прерывает её всю. 
                # Используем SAVEPOINT чтобы игнорировать отсутствие таблиц.
                c.execute(f"SAVEPOINT merge_{table}")
                c.execute(f"UPDATE {table} SET {col} = %s WHERE {col} = %s", (main_id, redundant_id))
                count = c.rowcount
                if count > 0:
                    print(f"  ✅ Updated {count} rows in {table}")
                    updated_total += count
                c.execute(f"RELEASE SAVEPOINT merge_{table}")
            except Exception as e:
                # Если таблицы нет или ошибка - откатываем только этот шаг
                c.execute(f"ROLLBACK TO SAVEPOINT merge_{table}")
                pass
        
        # Finally delete redundant client
        c.execute("DELETE FROM clients WHERE instagram_id = %s", (redundant_id,))
        conn.commit()
        print(f"✅ Merged {updated_total} total records. Duplicate client deleted.")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error merging clients: {e}")
    finally:
        conn.close()

def run_all_fixes():
    print("🔧 Starting data fixes...")
    
    # 0. Initialize database schema if missing
    print("🚀 Initializing database schema...")
    init_database()
    
    # 0. Merge known duplicates
    merge_clients('admin', '1') # Tahir duplication fix
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Populate specialization and position based on services
        print("🔍 Populating specialization and position for service providers...")
        
        c.execute("""
            SELECT id, full_name 
            FROM users 
            WHERE is_service_provider = TRUE 
            AND is_active = TRUE
        """)
        
        service_providers = c.fetchall()
        
        for provider_id, provider_name in service_providers:
            # Get categories of services provided by this user
            c.execute("""
                SELECT s.category 
                FROM user_services us 
                JOIN services s ON us.service_id = s.id 
                WHERE us.user_id = %s 
                GROUP BY s.category
                ORDER BY s.category
            """, (provider_id,))
            
            categories = [row[0] for row in c.fetchall() if row[0]]
            
            if categories:
                specialization = ", ".join(categories)
                # If position is not set, set a reasonable default
                c.execute("SELECT position FROM users WHERE id = %s", (provider_id,))
                current_position = c.fetchone()[0]
                
                new_position = current_position
                if not current_position or current_position == 'Специалист':
                    # Determine position based on number of services or categories
                    if len(categories) >= 3:
                        new_position = "Top Specialist"
                    else:
                        new_position = "Specialist"
                
                print(f"➕ Updating {provider_name}: Position='{new_position}', Spec='{specialization}'")
                
                # Update specialization and position (and translations if needed)
                c.execute("""
                    UPDATE users 
                    SET specialization = %s, position = %s
                    WHERE id = %s
                """, (specialization, new_position, provider_id))
        
        # 2. Fix specific experience and details
        print("🔍 Updating specific employee details by username...")
        
        employee_fixes = [
            ("lyazzat", 7, None),
            ("mestan", 15, "+971 50 180 0346"),
            ("simo", 13, None),
            ("gulya", 9, None),
            ("jennifer", 11, None)
        ]

        for username, exp, phone in employee_fixes:
            if phone:
                c.execute("UPDATE users SET years_of_experience = %s, phone = %s WHERE username = %s", (exp, phone, username))
            else:
                c.execute("UPDATE users SET years_of_experience = %s WHERE username = %s", (exp, username))

        # 3. Create Sales profile: Akbota
        print("🔍 Ensuring Sales profile: Akbota...")
        c.execute("SELECT id FROM users WHERE username = 'Akbota' OR full_name = 'Akbota'")
        akbota = c.fetchone()
        default_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' # For 'defaultPassword123'
        if not akbota:
            c.execute("""
                INSERT INTO users (username, full_name, role, phone, telegram_username, is_active, password_hash)
                VALUES ('Akbota', 'Akbota', 'sales', '+7 778 282 8758', '@bbbas7700', TRUE, %s)
            """, (default_hash,))
        else:
            c.execute("""
                UPDATE users 
                SET role = 'sales', phone = '+7 778 282 8758', telegram_username = '@bbbas7700'
                WHERE id = %s
            """, (akbota[0],))

        # 4. Create second admin profile
        print("🔍 Ensuring second admin profile...")
        c.execute("SELECT id FROM users WHERE telegram_username = '@user783920'")
        admin2 = c.fetchone()
        if not admin2:
            c.execute("""
                INSERT INTO users (username, full_name, role, phone, telegram_username, is_active, password_hash)
                VALUES ('admin2', 'Admin Team', 'admin', '+971 54 797 2882', '@user783920', TRUE, %s)
            """, (default_hash,))
        else:
            c.execute("""
                UPDATE users 
                SET role = 'admin', phone = '+971 54 797 2882'
                WHERE id = %s
            """, (admin2[0],))

        # 5. Generate attractive bios
        print("🔍 Generating attractive bios with more variety...")
        c.execute("SELECT id, full_name, specialization, position FROM users WHERE is_service_provider = TRUE")
        providers = c.fetchall()
        
        import random
        
        bio_templates_ru = [
            "{name} — ведущий эксперт в области {spec}. С опытом работы {experience} лет, создает неповторимые образы, учитывая каждое пожелание гостя.",
            "Профессионализм и творческий подход: {name} специализируется на {spec}. Мастер, для которого нет невыполнимых задач.",
            "Ищете идеальный результат? {name} сочетает в себе талант и глубокие знания в {spec}. Ваш комфорт и красота в надежных руках.",
            "Мастер {name} превращает каждую процедуру в искусство. Специализация: {spec}. Индивидуальный стиль и безупречное качество.",
            "Для {name} красота — это гармония. Эксперт по {spec}, мастер регулярно совершенствует навыки, чтобы радовать вас лучшими техниками."
        ]
        
        bio_templates_en = [
            "{name} is a leading expert in {spec}. With {experience} years of experience, creating unique looks based on every guest's wish.",
            "Professionalism and creativity: {name} specializes in {spec}. A master for whom no task is too complex.",
            "Looking for the perfect result? {name} combines talent and deep knowledge in {spec}. Your comfort and beauty are in safe hands.",
            "{name} turns every procedure into art. Specialization: {spec}. Individual style and flawless quality.",
            "For {name}, beauty is harmony. An expert in {spec}, this specialist regularly improves skills to delight you with the best techniques."
        ]

        for pid, name, spec, pos in providers:
            # Get experience for this user
            c.execute("SELECT years_of_experience FROM users WHERE id = %s", (pid,))
            exp = c.fetchone()[0] or 5
            
            # Select random template
            template_ru = random.choice(bio_templates_ru)
            template_en = random.choice(bio_templates_en)
            
            use_spec = spec or pos or "индустрии красоты"
            use_spec_en = spec or pos or "beauty industry"
            
            bio_ru = template_ru.format(name=name, spec=use_spec, experience=exp)
            bio_en = template_en.format(name=name, spec=use_spec_en, experience=exp)
            
            # Special logic for specific mentions
            if "Hair" in str(use_spec) or "волос" in str(use_spec).lower():
                bio_ru = f"Мастер преображения ваших волос. {name} использует авторские техники окрашивания и ухода, которые подчеркнут вашу индивидуальность."
            elif "Nail" in str(use_spec) or "маникюр" in str(use_spec).lower():
                bio_ru = f"Ваш эксперт по идеальному маникюру. {name} — это тонкое чувство вкуса, безупречная стерильность и внимание к каждой детали."
            
            # Use COALESCE with NULLIF to only set bio if it's empty/null
            c.execute("""
                UPDATE users 
                SET bio = COALESCE(NULLIF(bio, ''), %s), 
                    bio_ru = COALESCE(NULLIF(bio_ru, ''), %s), 
                    bio_en = COALESCE(NULLIF(bio_en, ''), %s)
                WHERE id = %s
            """, (bio_ru, bio_ru, bio_en, pid))

        # 6. Ensure all service providers have at least some specialization text
        print("🔍 Finalizing specialization...")
        c.execute("UPDATE users SET specialization = position WHERE (specialization IS NULL OR specialization = '') AND position IS NOT NULL AND is_service_provider = TRUE")

        # 7. EXPORT CREDENTIALS (Requested by user)
        print("📝 Generating staff credentials file...")
        c.execute("SELECT username, full_name, role, position FROM users WHERE is_active = TRUE")
        users_for_cred = c.fetchall()
        
        cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "staff_credentials.txt")
        # Also copy to frontend/public for easy access or root
        root_cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "staff_credentials.txt")
        
        with open(cred_path, "w", encoding="utf-8") as f:
            f.write("=== STAFF CREDENTIALS (CONFIDENTIAL) ===\n")
            f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("Default Password for new accounts: defaultPassword123\n")
            f.write("-" * 40 + "\n")
            for username, full_name, role, pos in users_for_cred:
                # Password logic used in seeding (username[:4] + '123' for old ones)
                p_hint = f"{username[:4]}123 (likely)" if role != 'sales' and username != 'admin2' else "defaultPassword123"
                if username == 'admin': p_hint = "admin123"
                
                f.write(f"Name: {full_name}\n")
                f.write(f"Login: {username}\n")
                f.write(f"Role: {role}\n")
                f.write(f"Position: {pos or 'N/A'}\n")
                f.write(f"Password Hint: {p_hint}\n")
                f.write("-" * 40 + "\n")
        
        import shutil
        shutil.copy2(cred_path, root_cred_path)
        print(f"✅ Credentials file created at: {root_cred_path}")

        # 8. Set default schedule for all service providers (10:30 - 21:00)
        print("🔍 Setting default schedules (10:30-21:00) for all masters...")
        c.execute("SELECT id, full_name FROM users WHERE is_service_provider = TRUE")
        all_masters = c.fetchall()
        
        for master_id, master_name in all_masters:
            # For each day of the week (0-6)
            for day in range(7):
                c.execute("""
                    INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                    VALUES (%s, %s, %s, %s, TRUE)
                    ON CONFLICT (user_id, day_of_week) DO UPDATE 
                    SET start_time = EXCLUDED.start_time, 
                        end_time = EXCLUDED.end_time, 
                        is_active = TRUE
                """, (master_id, day, "10:30", "21:00"))
        print(f"✅ Set default schedule for {len(all_masters)} masters.")

        # 9. Clean up gallery and fix image paths
        print("🔍 Cleaning up gallery and fixing image paths...")
        # Fix paths (add /images/ if missing)
        c.execute("""
            UPDATE public_banners SET image_url = REPLACE(image_url, '/static/uploads/', '/static/uploads/images/') 
            WHERE image_url LIKE '/static/uploads/%' AND image_url NOT LIKE '/static/uploads/images/%'
        """)
        c.execute("""
            UPDATE gallery_images SET image_path = REPLACE(image_path, '/static/uploads/', '/static/uploads/images/') 
            WHERE image_path LIKE '/static/uploads/%' AND image_path NOT LIKE '/static/uploads/images/%'
        """)
        # Specific fix for salon images if they are in root uploads but not in salon folder
        # (Already handled by previous steps mostly)
        
        # Remove duplicates
        c.execute("""
            DELETE FROM gallery_images a USING gallery_images b 
            WHERE a.id > b.id AND a.image_path = b.image_path
        """)
        print("✅ Gallery cleanup and path fixing completed.")

        # 10. Fix localhost URLs and logo
        print("🔍 Fixing localhost URLs and logo settings...")
        
        # Lists of tables and columns to clean from localhost prefixes
        url_fields = [
            ('public_banners', 'image_url'),
            ('public_reviews', 'avatar_url'),
            ('public_gallery', 'image_url'),
            ('users', 'photo'),
            ('salon_settings', 'logo_url'),
            ('gallery_images', 'image_path')
        ]
        
        for table, col in url_fields:
            try:
                c.execute(f"SAVEPOINT fix_url_{table}")
                c.execute(f"UPDATE {table} SET {col} = REPLACE({col}, 'http://localhost:8000', '') WHERE {col} LIKE 'http://localhost:8000%'")
                c.execute(f"RELEASE SAVEPOINT fix_url_{table}")
            except Exception:
                c.execute(f"ROLLBACK TO SAVEPOINT fix_url_{table}")
        
        # Specific fix for default logo path
        try:
             c.execute("""
                UPDATE salon_settings 
                SET logo_url = '/static/uploads/images/salon/logo.webp' 
                WHERE (logo_url IS NULL OR logo_url = '' OR logo_url = '/assets/logo.webp')
            """)
        except Exception:
            pass

        conn.commit()
        print("✅ Data fixes completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during fixes: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_all_fixes()
