"""
Миграция схемы для таблицы newsletter_subscribers
"""
from db.connection import get_db_connection
import logging

def create_newsletter_table(db_name=None):
    """Создать таблицу подписчиков на рассылку"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица подписчиков
        c.execute("""
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source TEXT DEFAULT 'footer'
            )
        """)
        
        conn.commit()
        print("✅ Таблица newsletter_subscribers проверена/создана")
        return True
    except Exception as e:
        print(f"❌ Ошибка создания таблицы newsletter_subscribers: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def add_subscriber(email: str, source: str = 'footer'):
    """Добавить подписчика"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO newsletter_subscribers (email, source)
            VALUES (%s, %s)
            ON CONFLICT (email) DO UPDATE 
            SET active = TRUE, source = EXCLUDED.source
            RETURNING id
        """, (email, source))
        
        subscriber_id = c.fetchone()[0]
        conn.commit()
        return subscriber_id
    except Exception as e:
        print(f"Ошибка добавления подписчика {email}: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()
