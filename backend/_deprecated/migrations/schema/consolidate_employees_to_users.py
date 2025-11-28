"""
Migration: Consolidate employees table into users table

This migration:
1. Adds employee-specific fields to users table
2. Migrates data from employees to users
3. Renames employee_schedule to user_schedule
4. Renames employee_services to user_services
5. Drops employees table
"""

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning, log_error


def consolidate_employees_to_users():
    """
    Consolidate employees table into users table
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("🔄 Начало миграции: объединение employees в users", "migration")
        
        # Step 1: Add employee fields to users table
        log_info("   📋 Шаг 1: Добавление полей в таблицу users", "migration")
        
        employee_fields = [
            ("photo", "TEXT"),
            ("bio", "TEXT"),
            ("instagram_employee", "TEXT"),  # renamed to avoid conflict with existing instagram
            ("experience", "TEXT"),
            ("specialization", "TEXT"),
            ("years_of_experience", "INTEGER"),
            ("certificates", "TEXT"),
            ("is_service_provider", "INTEGER DEFAULT 1"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("name_ru", "TEXT"),
            ("name_ar", "TEXT"),
            ("position_ru", "TEXT"),
            ("position_ar", "TEXT"),
        ]
        
        for field_name, field_type in employee_fields:
            try:
                c.execute(f"ALTER TABLE users ADD COLUMN {field_name} {field_type}")
                log_info(f"      ✅ Добавлено поле: {field_name}", "migration")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    log_info(f"      ⏭️  Поле {field_name} уже существует", "migration")
                else:
                    raise
        
        # Step 2: Migrate data from employees to users
        log_info("   📋 Шаг 2: Миграция данных из employees в users", "migration")
        
        # Get all employees
        c.execute("SELECT * FROM employees")
        employees = c.fetchall()
        
        # Get column names
        c.execute("PRAGMA table_info(employees)")
        employee_columns = {row[1]: row[0] for row in c.fetchall()}
        
        migrated_count = 0
        created_count = 0
        
        for employee in employees:
            emp_id = employee[employee_columns['id']]
            full_name = employee[employee_columns['full_name']]
            
            # Try to find matching user by employee_id link
            c.execute("SELECT id FROM users WHERE employee_id = ?", (emp_id,))
            user_row = c.fetchone()
            
            if user_row:
                # Update existing user with employee data
                user_id = user_row[0]
                
                update_fields = {
                    'photo': employee[employee_columns['photo']] if 'photo' in employee_columns else None,
                    'bio': employee[employee_columns['bio']] if 'bio' in employee_columns else None,
                    'instagram_employee': employee[employee_columns['instagram']] if 'instagram' in employee_columns else None,
                    'experience': employee[employee_columns['experience']] if 'experience' in employee_columns else None,
                    'specialization': employee[employee_columns['specialization']] if 'specialization' in employee_columns else None,
                    'years_of_experience': employee[employee_columns['years_of_experience']] if 'years_of_experience' in employee_columns else None,
                    'certificates': employee[employee_columns['certificates']] if 'certificates' in employee_columns else None,
                    'is_service_provider': employee[employee_columns['is_service_provider']] if 'is_service_provider' in employee_columns else 1,
                    'sort_order': employee[employee_columns['sort_order']] if 'sort_order' in employee_columns else 0,
                    'name_ru': employee[employee_columns['name_ru']] if 'name_ru' in employee_columns else None,
                    'name_ar': employee[employee_columns['name_ar']] if 'name_ar' in employee_columns else None,
                    'position': employee[employee_columns['position']] if 'position' in employee_columns else None,
                    'position_ru': employee[employee_columns['position_ru']] if 'position_ru' in employee_columns else None,
                    'position_ar': employee[employee_columns['position_ar']] if 'position_ar' in employee_columns else None,
                    'phone': (employee[employee_columns['phone']] if 'phone' in employee_columns else None) or (employee[employee_columns['phone_number']] if 'phone_number' in employee_columns else None),
                    'email': employee[employee_columns['email']] if 'email' in employee_columns else None,
                    'is_active': employee[employee_columns['is_active']] if 'is_active' in employee_columns else 1,
                }
                
                # Build UPDATE query
                set_clause = ", ".join([f"{k} = ?" for k in update_fields.keys()])
                values = list(update_fields.values()) + [user_id]
                
                c.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
                
                log_info(f"      ✅ Обновлён пользователь: {full_name} (user_id={user_id})", "migration")
                migrated_count += 1
            else:
                # Create new user for orphaned employee
                log_warning(f"      ⚠️  Сотрудник {full_name} не привязан к пользователю, создаём нового", "migration")
                
                # Generate username from full_name
                username = full_name.lower().replace(" ", "_")
                
                # Check if username exists
                c.execute("SELECT id FROM users WHERE username = ?", (username,))
                if c.fetchone():
                    username = f"{username}_{emp_id}"
                
                c.execute("""
                    INSERT INTO users (
                        username, password_hash, full_name, role, position,
                        photo, bio, instagram_employee, experience, specialization,
                        years_of_experience, certificates, is_service_provider,
                        sort_order, name_ru, name_ar, position_ru, position_ar,
                        phone, email, is_active, employee_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    username,
                    "placeholder_hash",  # Will need to reset password
                    full_name,
                    "employee",
                    employee[employee_columns.get('position')],
                    employee[employee_columns.get('photo')],
                    employee[employee_columns.get('bio')],
                    employee[employee_columns.get('instagram')],
                    employee[employee_columns.get('experience')],
                    employee[employee_columns.get('specialization')],
                    employee[employee_columns.get('years_of_experience')],
                    employee[employee_columns.get('certificates')],
                    employee[employee_columns.get('is_service_provider', 1)],
                    employee[employee_columns.get('sort_order', 0)],
                    employee[employee_columns.get('name_ru')],
                    employee[employee_columns.get('name_ar')],
                    employee[employee_columns.get('position_ru')],
                    employee[employee_columns.get('position_ar')],
                    employee[employee_columns.get('phone')] or employee[employee_columns.get('phone_number')],
                    employee[employee_columns.get('email')],
                    employee[employee_columns.get('is_active', 1)],
                    emp_id
                ))
                
                new_user_id = c.lastrowid
                log_info(f"      ✅ Создан пользователь: {full_name} (user_id={new_user_id})", "migration")
                created_count += 1
        
        log_info(f"   ✅ Мигрировано: {migrated_count}, создано: {created_count}", "migration")
        
        # Step 3: Rename employee_schedule to user_schedule
        log_info("   📋 Шаг 3: Переименование employee_schedule → user_schedule", "migration")
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT,
                end_time TEXT,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Check if employee_schedule exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_schedule'")
        if c.fetchone():
            # Copy data from employee_schedule to user_schedule
            c.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                SELECT u.id, es.day_of_week, es.start_time, es.end_time, es.is_active
                FROM employee_schedule es
                JOIN users u ON u.employee_id = es.employee_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM user_schedule us 
                    WHERE us.user_id = u.id AND us.day_of_week = es.day_of_week
                )
            """)
            schedule_count = c.rowcount
            log_info(f"      ✅ Скопировано {schedule_count} записей расписания", "migration")
        else:
            schedule_count = 0
            log_info(f"      ℹ️  Таблица employee_schedule не найдена, пропускаем", "migration")
        
        # Step 4: Rename employee_services to user_services
        log_info("   📋 Шаг 4: Переименование employee_services → user_services", "migration")
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                UNIQUE(user_id, service_id)
            )
        """)
        
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_services_user ON user_services(user_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_services_service ON user_services(service_id)")
        
        # Check if employee_services exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employee_services'")
        if c.fetchone():
            # Copy data from employee_services to user_services
            c.execute("""
                INSERT OR IGNORE INTO user_services (user_id, service_id)
                SELECT u.id, es.service_id
                FROM employee_services es
                JOIN users u ON u.employee_id = es.employee_id
            """)
            services_count = c.rowcount
            log_info(f"      ✅ Скопировано {services_count} связей услуг", "migration")
        else:
            services_count = 0
            log_info(f"      ℹ️  Таблица employee_services не найдена, пропускаем", "migration")
        
        # Step 5: Create other user_* tables
        log_info("   📋 Шаг 5: Создание дополнительных таблиц", "migration")
        
        # user_salary_settings
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_salary_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                salary_type TEXT DEFAULT 'percentage',
                base_salary REAL DEFAULT 0,
                percentage REAL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # user_time_off
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_time_off (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date_from TEXT NOT NULL,
                date_to TEXT NOT NULL,
                reason TEXT,
                type TEXT DEFAULT 'vacation',
                created_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # user_certificates
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                issued_date TEXT,
                expiry_date TEXT,
                file_path TEXT,
                created_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        log_info(f"      ✅ Созданы таблицы: user_salary_settings, user_time_off, user_certificates", "migration")
        
        # Step 6: Drop old tables if they exist
        log_info("   📋 Шаг 6: Удаление старых таблиц", "migration")
        
        c.execute("DROP TABLE IF EXISTS employee_schedule")
        log_info("      ✅ Удалена таблица employee_schedule", "migration")
        
        c.execute("DROP TABLE IF EXISTS employee_services")
        log_info("      ✅ Удалена таблица employee_services", "migration")
        
        c.execute("DROP TABLE IF EXISTS employees")
        log_info("      ✅ Удалена таблица employees", "migration")
        
        conn.commit()
        conn.close()
        
        log_info("✅ Миграция завершена успешно!", "migration")
        log_info(f"   📊 Итого: {migrated_count + created_count} пользователей, {schedule_count} расписаний, {services_count} услуг", "migration")
        
        return {
            "success": True,
            "migrated": migrated_count,
            "created": created_count,
            "schedules": schedule_count,
            "services": services_count
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        conn.rollback()
        conn.close()
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    result = consolidate_employees_to_users()
    print(result)
