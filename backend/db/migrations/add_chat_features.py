"""
Миграция: Добавление таблиц для функций чата
"""
import sqlite3
from config import DATABASE_NAME

def add_chat_features_tables():
    """Добавить таблицы для реакций, шаблонов и отложенных сообщений"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # 1. Таблица реакций на сообщения
        c.execute("""
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                emoji TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES chat_history(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(message_id, user_id, emoji)
            )
        """)
        
        # 2. Таблица шаблонов сообщений
        c.execute("""
            CREATE TABLE IF NOT EXISTS message_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        # 3. Таблица отложенных сообщений
        c.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                message TEXT NOT NULL,
                send_at TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'pending',
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                error TEXT,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        # 4. Добавляем поле is_read в chat_history если его нет
        c.execute("PRAGMA table_info(chat_history)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'is_read' not in columns:
            c.execute("""
                ALTER TABLE chat_history 
                ADD COLUMN is_read INTEGER DEFAULT 0
            """)
            print("✅ Добавлено поле is_read в chat_history")
        
        # 5. Добавляем индексы для производительности
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_reactions_message 
            ON message_reactions(message_id)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_scheduled_status 
            ON scheduled_messages(status, send_at)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_unread 
            ON chat_history(instagram_id, is_read, sender)
        """)
        
        # 6. Добавляем дефолтные шаблоны
        default_templates = [
            ("Приветствие", "Здравствуйте! 👋 Чем могу помочь?", "greetings"),
            ("Запись", "На какую дату вы хотели бы записаться? 📅", "booking"),
            ("Цены", "Наши актуальные цены можно посмотреть здесь: [ссылка]", "info"),
            ("Спасибо", "Спасибо за обращение! 🙏 Будем рады видеть вас!", "closing"),
            ("Перезвоним", "Хорошо, я свяжусь с вами позже! ⏰", "followup"),
        ]
        
        for name, content, category in default_templates:
            c.execute("""
                INSERT OR IGNORE INTO message_templates (name, content, category)
                VALUES (?, ?, ?)
            """, (name, content, category))
        
        conn.commit()
        print("✅ Таблицы для функций чата успешно созданы")
        print("✅ Добавлены дефолтные шаблоны сообщений")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка создания таблиц: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_chat_features_tables()