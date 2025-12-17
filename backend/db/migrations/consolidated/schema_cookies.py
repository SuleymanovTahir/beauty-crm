"""
Миграция схемы для таблицы cookie_consents
"""
from db.connection import get_db_connection
import logging

def create_cookie_consents_table(db_name=None):
    """Создать таблицу согласия с куки"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            CREATE TABLE IF NOT EXISTS cookie_consents (
                id SERIAL PRIMARY KEY,
                ip_address TEXT,
                action TEXT NOT NULL, /* 'accept' or 'decline' */
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        print("✅ Таблица cookie_consents проверена/создана")
        return True
    except Exception as e:
        print(f"❌ Ошибка создания таблицы cookie_consents: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def log_cookie_consent(ip: str, action: str, user_agent: str = None):
    """Логировать решение по куки"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем, есть ли уже запись для этого IP
        c.execute("SELECT id FROM cookie_consents WHERE ip_address = %s", (ip,))
        row = c.fetchone()
        
        if row:
            # Обновляем существующую запись
            c.execute("""
                UPDATE cookie_consents 
                SET action = %s, user_agent = %s, created_at = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (action, user_agent, row[0]))
        else:
            # Создаем новую
            c.execute("""
                INSERT INTO cookie_consents (ip_address, action, user_agent)
                VALUES (%s, %s, %s)
            """, (ip, action, user_agent))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Ошибка логирования куки {ip}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def check_cookie_consent(ip: str):
    """Проверить, давал ли IP согласие"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT action FROM cookie_consents WHERE ip_address = %s", (ip,))
        row = c.fetchone()
        if row:
            return row[0] # 'accept' or 'decline'
        return None
    except Exception as e:
        print(f"Ошибка проверки куки {ip}: {e}")
        return None
    finally:
        conn.close()
