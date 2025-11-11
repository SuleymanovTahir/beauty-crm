"""
Миграция: создание таблиц для сотрудников салона
"""
import sqlite3
from config import DATABASE_NAME


def create_employees_tables():
    """Создать таблицы для сотрудников"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Таблица сотрудников
    c.execute('''CREATE TABLE IF NOT EXISTS employees
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    position TEXT,
    name_ru TEXT,
    name_ar TEXT,
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
    updated_at TEXT)''')
    
    # Таблица специализаций сотрудников (связь многие-ко-многим с услугами)
    c.execute('''CREATE TABLE IF NOT EXISTS employee_services
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(employee_id, service_id))''')
    
    # Таблица расписания сотрудников
    c.execute('''CREATE TABLE IF NOT EXISTS employee_schedule
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE)''')
    
    # Таблица отпусков/выходных
    c.execute('''CREATE TABLE IF NOT EXISTS employee_time_off
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE)''')
    
    conn.commit()
    conn.close()
    
    print("✅ Таблицы сотрудников созданы")


if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Создание таблиц для сотрудников салона")
    print("=" * 70)
    response = input("\n⚠️  Выполнить миграцию? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        create_employees_tables()
    else:
        print("\n❌ Миграция отменена")