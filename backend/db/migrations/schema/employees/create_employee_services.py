"""
Миграция: Создание таблицы employee_services
Связь многие-ко-многим между сотрудниками и услугами
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def create_employee_services_table():
    """Создать таблицу employee_services"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Создаём таблицу связей
        c.execute("""
            CREATE TABLE IF NOT EXISTS employee_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                UNIQUE(employee_id, service_id)
            )
        """)

        log_info("✅ Таблица employee_services создана", "migration")

        # Создадим индексы для производительности
        c.execute("CREATE INDEX IF NOT EXISTS idx_employee_services_employee ON employee_services(employee_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_employee_services_service ON employee_services(service_id)")

        log_info("✅ Индексы созданы", "migration")

        conn.commit()

        # Автоматически заполним связи для всех сотрудников и услуг
        c.execute("SELECT COUNT(*) FROM employees")
        emp_count = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM services")
        svc_count = c.fetchone()[0]

        if emp_count > 0 and svc_count > 0:
            # Связываем всех сотрудников со всеми услугами по умолчанию
            c.execute("""
                INSERT OR IGNORE INTO employee_services (employee_id, service_id)
                SELECT e.id, s.id
                FROM employees e
                CROSS JOIN services s
                WHERE e.is_active = 1 AND s.is_active = 1
            """)

            rows_added = c.rowcount
            conn.commit()
            log_info(f"✅ Создано {rows_added} связей сотрудников с услугами", "migration")

        log_info("✅ Миграция employee_services завершена", "migration")
        return True

    except Exception as e:
        log_error(f"❌ Ошибка при создании employee_services: {e}", "migration")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_employee_services_table()
