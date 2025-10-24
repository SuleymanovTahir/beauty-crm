"""
Функции для работы с пользователями
"""
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict
import hashlib
import secrets

from config import DATABASE_NAME


def get_all_users():
    """Получить всех пользователей"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT id, username, password_hash, full_name, email, role, 
                 created_at, last_login, is_active 
                 FROM users ORDER BY id""")
    
    users = c.fetchall()
    conn.close()
    return users


def create_user(username: str, password: str, full_name: str = None,
                email: str = None, role: str = 'employee'):
    """Создать нового пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    now = datetime.now().isoformat()
    
    try:
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, email, role, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (username, password_hash, full_name, email, role, now))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None


def verify_user(username: str, password: str) -> Optional[Dict]:
    """Проверить логин и пароль"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    c.execute("""SELECT id, username, full_name, email, role 
                 FROM users 
                 WHERE username = ? AND password_hash = ? AND is_active = 1""",
              (username, password_hash))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4]
        }
    return None


def delete_user(user_id: int) -> bool:
    """Удалить пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Удаляем сессии
        c.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        # Удаляем пользователя
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, email 
                 FROM users 
                 WHERE email = ? AND is_active = 1""", (email,))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3]
        }
    return None


# ===== СЕССИИ =====

def create_session(user_id: int) -> str:
    """Создать сессию для пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    session_token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = (now + timedelta(days=7)).isoformat()
    
    c.execute("""INSERT INTO sessions (user_id, session_token, created_at, expires_at)
                 VALUES (?, ?, ?, ?)""",
              (user_id, session_token, now.isoformat(), expires))
    
    # Обновить last_login
    c.execute("UPDATE users SET last_login = ? WHERE id = ?",
              (now.isoformat(), user_id))
    
    conn.commit()
    conn.close()
    
    return session_token


def get_user_by_session(session_token: str) -> Optional[Dict]:
    """Получить пользователя по токену сессии"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""SELECT u.id, u.username, u.full_name, u.email, u.role
                 FROM users u
                 JOIN sessions s ON u.id = s.user_id
                 WHERE s.session_token = ? AND s.expires_at > ? AND u.is_active = 1""",
              (session_token, now))
    
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4]
        }
    return None


def delete_session(session_token: str):
    """Удалить сессию (выход)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM sessions WHERE session_token = ?", (session_token,))
    conn.commit()
    conn.close()


# ===== СБРОС ПАРОЛЯ =====

def create_password_reset_token(user_id: int) -> str:
    """Создать токен для сброса пароля"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Создаем таблицу для токенов если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS password_reset_tokens
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                 VALUES (?, ?, ?, ?)""",
              (user_id, token, now.isoformat(), expires))
    
    conn.commit()
    conn.close()
    
    return token


def verify_reset_token(token: str):
    """Проверить токен сброса пароля"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""SELECT user_id FROM password_reset_tokens
                 WHERE token = ? AND expires_at > ? AND used = 0""",
              (token, now))
    
    result = c.fetchone()
    conn.close()
    
    return result[0] if result else None


def mark_reset_token_used(token: str):
    """Отметить токен как использованный"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,))
    
    conn.commit()
    conn.close()


def reset_user_password(user_id: int, new_password: str):
    """Сбросить пароль пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    
    c.execute("UPDATE users SET password_hash = ? WHERE id = ?",
              (password_hash, user_id))
    
    conn.commit()
    conn.close()
    
    return True


# ===== ЛОГ АКТИВНОСТИ =====

def log_activity(user_id: int, action: str, entity_type: str,
                 entity_id: str, details: str = None):
    """Залогировать действие пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""INSERT INTO activity_log 
                 (user_id, action, entity_type, entity_id, details, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (user_id, action, entity_type, entity_id, details, now))
    
    conn.commit()
    conn.close()