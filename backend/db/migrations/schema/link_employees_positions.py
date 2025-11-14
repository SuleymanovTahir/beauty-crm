"""
Миграция: Связывание таблиц employees и positions
Добавляет position_id в employees и мигрирует существующие данные
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error
from datetime import datetime

def link_employees_positions():
    """Добавить position_id в employees и перенести данные"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Linking employees with positions...", "migration")

        # Проверяем есть ли уже колонка position_id
        c.execute("PRAGMA table_info(employees)")
        columns = [col[1] for col in c.fetchall()]

        if 'position_id' in columns:
            log_info("⏭️ Column position_id already exists, skipping", "migration")
            return True

        # 1. Создаем временную таблицу с новой структурой
        log_info("📝 Creating temporary table...", "migration")
        c.execute('''CREATE TABLE employees_new
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      full_name TEXT NOT NULL,
                      name_ru TEXT,
                      name_ar TEXT,
                      position TEXT,
                      position_id INTEGER,
                      position_ru TEXT,
                      position_ar TEXT,
                      experience TEXT,
                      photo TEXT,
                      bio TEXT,
                      phone TEXT,
                      email TEXT,
                      instagram TEXT,
                      is_active INTEGER DEFAULT 1,
                      sort_order INTEGER DEFAULT 0,
                      created_at TEXT,
                      updated_at TEXT,
                      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL)''')

        # 2. Копируем данные
        log_info("📋 Copying data...", "migration")
        c.execute('''INSERT INTO employees_new
                     SELECT id, full_name, name_ru, name_ar, position, NULL,
                            position_ru, position_ar, experience, photo, bio,
                            phone, email, instagram, is_active, sort_order,
                            created_at, updated_at
                     FROM employees''')

        # 3. Пытаемся сопоставить существующие должности с таблицей positions
        log_info("🔗 Matching existing positions...", "migration")
        c.execute("SELECT id, position FROM employees_new WHERE position IS NOT NULL AND position != ''")
        employees_with_positions = c.fetchall()

        matched = 0
        for emp_id, position_text in employees_with_positions:
            # Ищем подходящую должность в таблице positions
            c.execute("""SELECT id FROM positions
                         WHERE name LIKE ? OR name_en LIKE ? OR name_ar LIKE ?
                         LIMIT 1""",
                     (f"%{position_text}%", f"%{position_text}%", f"%{position_text}%"))
            result = c.fetchone()

            if result:
                position_id = result[0]
                c.execute("UPDATE employees_new SET position_id = ? WHERE id = ?",
                         (position_id, emp_id))
                matched += 1

        log_info(f"✅ Matched {matched} positions", "migration")

        # 4. Удаляем старую таблицу и переименовываем новую
        log_info("🔄 Replacing old table...", "migration")
        c.execute("DROP TABLE employees")
        c.execute("ALTER TABLE employees_new RENAME TO employees")

        # 5. Пересоздаем связанные таблицы с правильными внешними ключами
        log_info("🔗 Recreating related tables...", "migration")

        # Сохраняем данные employee_services
        c.execute("SELECT employee_id, service_id FROM employee_services")
        services_data = c.fetchall()

        c.execute("DROP TABLE IF EXISTS employee_services")
        c.execute('''CREATE TABLE employee_services
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      employee_id INTEGER NOT NULL,
                      service_id INTEGER NOT NULL,
                      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                      UNIQUE(employee_id, service_id))''')

        # Восстанавливаем данные
        for emp_id, serv_id in services_data:
            c.execute("INSERT OR IGNORE INTO employee_services (employee_id, service_id) VALUES (?, ?)",
                     (emp_id, serv_id))

        # Сохраняем данные employee_schedule
        c.execute("SELECT employee_id, day_of_week, start_time, end_time, is_active FROM employee_schedule")
        schedule_data = c.fetchall()

        c.execute("DROP TABLE IF EXISTS employee_schedule")
        c.execute('''CREATE TABLE employee_schedule
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      employee_id INTEGER NOT NULL,
                      day_of_week INTEGER NOT NULL,
                      start_time TEXT NOT NULL,
                      end_time TEXT NOT NULL,
                      is_active INTEGER DEFAULT 1,
                      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE)''')

        # Восстанавливаем данные
        for emp_id, day, start, end, active in schedule_data:
            c.execute("""INSERT INTO employee_schedule
                         (employee_id, day_of_week, start_time, end_time, is_active)
                         VALUES (?, ?, ?, ?, ?)""",
                     (emp_id, day, start, end, active))

        # Сохраняем данные employee_time_off
        c.execute("SELECT employee_id, date_from, date_to, reason FROM employee_time_off")
        timeoff_data = c.fetchall()

        c.execute("DROP TABLE IF EXISTS employee_time_off")
        c.execute('''CREATE TABLE employee_time_off
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      employee_id INTEGER NOT NULL,
                      date_from TEXT NOT NULL,
                      date_to TEXT NOT NULL,
                      reason TEXT,
                      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE)''')

        # Восстанавливаем данные
        for emp_id, date_from, date_to, reason in timeoff_data:
            c.execute("""INSERT INTO employee_time_off
                         (employee_id, date_from, date_to, reason)
                         VALUES (?, ?, ?, ?)""",
                     (emp_id, date_from, date_to, reason))

        conn.commit()
        log_info("✅ Employees successfully linked with positions", "migration")
        return True

    except Exception as e:
        log_error(f"❌ Error linking employees with positions: {e}", "migration")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Связывание employees и positions")
    print("=" * 70)
    link_employees_positions()
    print("=" * 70)
