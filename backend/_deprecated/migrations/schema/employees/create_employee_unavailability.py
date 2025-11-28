"""
Создание таблицы для учета отсутствий сотрудников (отпуска, больничные, выходные)
"""
import sqlite3
from core.config import DATABASE_NAME

def create_employee_unavailability_table():
    """Создать таблицу employee_unavailability"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Создаем таблицу
    c.execute("""
    CREATE TABLE IF NOT EXISTS employee_unavailability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        start_datetime TEXT NOT NULL,  -- ISO8601: YYYY-MM-DD HH:MM:SS
        end_datetime TEXT NOT NULL,    -- ISO8601: YYYY-MM-DD HH:MM:SS
        type TEXT DEFAULT 'vacation',  -- vacation, sick_leave, day_off, other
        reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
    """)
    
    # Индексы
    c.execute("CREATE INDEX IF NOT EXISTS idx_unavailability_employee ON employee_unavailability(employee_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_unavailability_dates ON employee_unavailability(start_datetime, end_datetime)")
    
    conn.commit()
    conn.close()
    
    print("✅ Таблица employee_unavailability создана")
    return True

def create_employee_unavailability():
    return create_employee_unavailability_table()
