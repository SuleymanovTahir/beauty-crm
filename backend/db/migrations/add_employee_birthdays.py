import sqlite3
from datetime import datetime
from config import DATABASE_NAME


def add_employee_birthday_fields():
    """Добавить поля для дней рождения сотрудников"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    print("🎂 Добавление полей для дней рождения сотрудников...")
    
    # Проверяем существование поля birthday в users
    c.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in c.fetchall()]
    
    if 'birthday' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN birthday TEXT")
        print("✅ Добавлено поле birthday в users")
    
    # Создаем таблицу уведомлений о ДР
    c.execute("""
        CREATE TABLE IF NOT EXISTS birthday_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            notification_type TEXT NOT NULL,
            notification_date TEXT NOT NULL,
            is_sent INTEGER DEFAULT 0,
            sent_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    print("✅ Создана таблица birthday_notifications")
    
    conn.commit()
    conn.close()
    
    print("✅ Миграция дней рождения завершена")


if __name__ == "__main__":
    add_employee_birthday_fields()