import sqlite3
from config import DATABASE_NAME

def add_permissions_system():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Таблица индивидуальных прав пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission_key TEXT NOT NULL,
        granted INTEGER DEFAULT 1,
        granted_by INTEGER,
        granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE(user_id, permission_key)
    )''')
    
    # Таблица внутреннего чата между сотрудниками
    c.execute('''CREATE TABLE IF NOT EXISTS internal_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        message TEXT NOT NULL,
        is_group INTEGER DEFAULT 0,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
    )''')
    
    # Обновляем колонку role если нужно
    try:
        c.execute("ALTER TABLE users ADD COLUMN assigned_employee_id INTEGER")
    except:
        pass
    
    conn.commit()
    conn.close()
    print("✅ Permissions system created")

if __name__ == "__main__":
    add_permissions_system()