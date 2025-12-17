"""
Функции для работы с пользователями
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
import hashlib
import secrets

from db.connection import get_db_connection
import psycopg2

def get_all_users():
    """Получить всех пользователей"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, password_hash, full_name, email, role, 
                 created_at, last_login, is_active, is_service_provider 
                 FROM users ORDER BY id""")
    
    users = c.fetchall()
    conn.close()
    return users

def get_all_service_providers():
    """Получить всех мастеров (провайдеров услуг)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, full_name, role 
                 FROM users 
                 WHERE is_service_provider = TRUE AND is_active = TRUE
                 ORDER BY full_name""")
    
    providers = c.fetchall()
    conn.close()
    return [{"id": row[0], "full_name": row[1], "role": row[2]} for row in providers]

def create_user(username: str, password: str, full_name: str = None,
                email: str = None, role: str = 'employee', phone: str = None):
    """Создать нового пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    now = datetime.now().isoformat()
    
    try:
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, email, role, created_at, phone)
                     VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                  (username, password_hash, full_name, email, role, now, phone))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id
    except psycopg2.IntegrityError:
        conn.close()
        return None

def verify_user(username: str, password: str) -> Optional[Dict]:
    """Проверить логин и пароль"""
    conn = get_db_connection()
    c = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    c.execute("""SELECT id, username, full_name, email, role, employee_id, phone
                 FROM users 
                 WHERE username = %s AND password_hash = %s AND is_active = TRUE""",
              (username, password_hash))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4],
            "employee_id": user[5],
            "phone": user[6]
        }
    return None

def delete_user(user_id: int) -> bool:
    """Удалить пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Удаляем сессии
        c.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
        # Удаляем пользователя
        c.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка удаления пользователя: {e}")
        conn.close()
        return False

def get_user_by_email(email: str):
    """Получить пользователя по email"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, email, phone 
                 FROM users 
                 WHERE email = %s AND is_active = TRUE""", (email,))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "phone": user[4]
        }
    return None

# ===== СЕССИИ =====

def create_session(user_id: int) -> str:
    """Создать сессию для пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    session_token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = (now + timedelta(days=7)).isoformat()
    
    c.execute("""INSERT INTO sessions (user_id, session_token, created_at, expires_at)
                 VALUES (%s, %s, %s, %s)""",
              (user_id, session_token, now.isoformat(), expires))
    
    # Обновить last_login
    c.execute("UPDATE users SET last_login = %s WHERE id = %s",
              (now.isoformat(), user_id))
    
    conn.commit()
    conn.close()
    
    return session_token

def get_user_by_session(session_token: str) -> Optional[Dict]:
    """Получить пользователя по токену сессии"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""SELECT u.id, u.username, u.full_name, u.email, u.role, u.employee_id, u.phone
                 FROM users u
                 JOIN sessions s ON u.id = s.user_id
                 WHERE s.session_token = %s AND s.expires_at > %s AND u.is_active = TRUE""",
              (session_token, now))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4],
            "employee_id": user[5],
            "phone": user[6]
        }
    return None

def delete_session(session_token: str):
    """Удалить сессию (выход)"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
    conn.commit()
    conn.close()

# ===== СБРОС ПАРОЛЯ =====

def create_password_reset_token(user_id: int) -> str:
    """Создать токен для сброса пароля"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Создаем таблицу для токенов если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS password_reset_tokens
                 (id SERIAL PRIMARY KEY,
                  user_id INTEGER,
                  token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT,
                  used INTEGER DEFAULT 0,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')
    
    token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = (now + timedelta(hours=1)).isoformat()
    
    c.execute("""INSERT INTO password_reset_tokens (user_id, token, created_at, expires_at)
                 VALUES (%s, %s, %s, %s)""",
              (user_id, token, now.isoformat(), expires))
    
    conn.commit()
    conn.close()
    
    return token

def verify_reset_token(token: str):
    """Проверить токен сброса пароля"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""SELECT user_id FROM password_reset_tokens
                 WHERE token = %s AND expires_at > %s AND used = 0""",
              (token, now))
    
    result = c.fetchone()
    conn.close()
    
    return result[0] if result else None

def mark_reset_token_used(token: str):
    """Отметить токен как использованный"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = %s", (token,))
    
    conn.commit()
    conn.close()

def reset_user_password(user_id: int, new_password: str):
    """Сбросить пароль пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    
    c.execute("UPDATE users SET password_hash = %s WHERE id = %s",
              (password_hash, user_id))
    
    conn.commit()
    conn.close()
    
    return True

# ===== ЛОГ АКТИВНОСТИ =====

def log_activity(user_id: int, action: str, entity_type: str,
                 entity_id: str, details: str = None):
    """Залогировать действие пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""INSERT INTO activity_log 
                 (user_id, action, entity_type, entity_id, details, timestamp)
                 VALUES (%s, %s, %s, %s, %s, %s)""",
              (user_id, action, entity_type, entity_id, details, now))
    
    conn.commit()
    conn.close()