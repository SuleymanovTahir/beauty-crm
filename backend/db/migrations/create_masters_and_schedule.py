# backend/db/migrations/create_masters_and_schedule.py
"""
Миграция: Создание таблиц мастеров и расписания
"""
import sqlite3
from datetime import datetime
from config import DATABASE_NAME


def create_masters_and_schedule_tables():
    """Создать таблицы мастеров и расписания"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    print("🔧 Создание таблиц мастеров и расписания...")
    
    # Таблица мастеров
    c.execute("""
        CREATE TABLE IF NOT EXISTS masters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            specialization TEXT,
            services TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    
    # Таблица расписания мастеров
    c.execute("""
        CREATE TABLE IF NOT EXISTS master_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL,
            service_id INTEGER,
            date TEXT NOT NULL,
            time_start TEXT NOT NULL,
            time_end TEXT NOT NULL,
            is_booked BOOLEAN DEFAULT 0,
            booking_id INTEGER,
            client_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (master_id) REFERENCES masters(id),
            FOREIGN KEY (service_id) REFERENCES services(id),
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        )
    """)
    c.execute("""
    CREATE TABLE IF NOT EXISTS master_time_off (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (master_id) REFERENCES masters(id)
    )
    """)
    
# Таблица выходных салона (общие)
    c.execute("""
    CREATE TABLE IF NOT EXISTS salon_holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL
    )
    """)
    
    # Добавляем поле master в bookings если его нет
    c.execute("PRAGMA table_info(bookings)")
    columns = [col[1] for col in c.fetchall()]
    
    if 'master' not in columns:
        c.execute("ALTER TABLE bookings ADD COLUMN master TEXT")
        print("✅ Добавлено поле 'master' в таблицу bookings")
    
    conn.commit()
    
    # Проверяем есть ли мастера
    c.execute("SELECT COUNT(*) FROM masters")
    count = c.fetchone()[0]
    
    if count == 0:
        # Добавляем тестовых мастеров
        now = datetime.now().isoformat()
        test_masters = [
            ("Дина", "+971501234567", "Маникюр, Педикюр", "manicure,pedicure"),
            ("Алина", "+971501234568", "Окрашивание, Стрижка", "coloring,haircut"),
            ("Мария", "+971501234569", "Перманентный макияж", "permanent"),
        ]
        
        for name, phone, spec, services in test_masters:
            c.execute("""
                INSERT INTO masters (name, phone, specialization, services, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (name, phone, spec, services, now))
        
        print(f"✅ Добавлено {len(test_masters)} тестовых мастеров")
    
    conn.commit()
    conn.close()
    
    print("✅ Таблицы мастеров и расписания созданы")


if __name__ == "__main__":
    create_masters_and_schedule_tables()