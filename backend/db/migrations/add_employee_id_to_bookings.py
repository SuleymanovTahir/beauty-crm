"""
Миграция: добавление поля employee_id в таблицу bookings
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_employee_id_field():
    """Добавить поле employee_id в таблицу bookings"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, есть ли уже поле employee_id
        c.execute("PRAGMA table_info(bookings)")
        columns = [row[1] for row in c.fetchall()]

        if 'employee_id' not in columns:
            log_info("Добавление поля employee_id в bookings...", "migration")

            # Добавляем поле employee_id
            c.execute("""
                ALTER TABLE bookings
                ADD COLUMN employee_id INTEGER
            """)

            conn.commit()
            log_info("✅ Поле employee_id добавлено в bookings", "migration")
        else:
            log_info("✅ Поле employee_id уже существует в bookings", "migration")

    except Exception as e:
        log_error(f"Ошибка при добавлении employee_id: {e}", "migration")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    add_employee_id_field()
