import sqlite3
from config import DATABASE_NAME

def create_master_services_table():
    """Создать таблицу связей мастеров и услуг"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Таблица связей
    c.execute("""
        CREATE TABLE IF NOT EXISTS master_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            created_at TEXT,
            FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            UNIQUE(master_id, service_id)
        )
    """)
    
    print("✅ Таблица master_services создана")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_master_services_table()