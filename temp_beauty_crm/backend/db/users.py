"""
Функции для работы с пользователями
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
import hashlib
import secrets
import time

from db.connection import get_db_connection
from utils.cache import cache
from utils.logger import log_error
import psycopg2

# In-memory cache for session verification (fallback when Redis is unavailable)
_session_cache = {}
_session_cache_ttl = 300  # 5 minutes - cache session verification to reduce DB load

def get_all_users():
    """Получить всех пользователей"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, password_hash, full_name, email, role, 
                 created_at, last_login, is_active, is_service_provider 
                 FROM users 
                 WHERE deleted_at IS NULL
                 ORDER BY id""")
    
    users = c.fetchall()
    conn.close()
    return users

def get_all_service_providers():
    """Получить всех мастеров (провайдеров услуг)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, role, specialization, position 
                 FROM users 
                 WHERE (is_service_provider = TRUE OR role = 'employee')
                 AND deleted_at IS NULL
                 ORDER BY full_name""")
    
    providers = c.fetchall()
    conn.close()
    return [{"id": row[0], "full_name": row[2], "role": row[3]} for row in providers]


def create_user(username: str, password: str, full_name: str = None,
                email: str = None, role: str = 'employee', phone: str = None):
    """Создать нового пользователя"""
    conn = get_db_connection()
    c = conn.cursor()
    
    from utils.utils import hash_password
    password_hash = hash_password(password)
    now = datetime.now().isoformat()
    
    try:
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, email, role, created_at, phone)
                     VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                  (username, password_hash, full_name, email, role, now, phone))
        conn.commit()
        user_id = c.fetchone()[0]
        conn.close()
        return user_id
    except psycopg2.IntegrityError:
        conn.close()
        return None

def verify_user(username: str, password: str) -> Optional[Dict]:
    """Проверить логин и пароль"""
    from utils.logger import log_info, log_warning, log_error

    conn = get_db_connection()
    c = conn.cursor()

    # Сначала проверяем существует ли пользователь вообще
    c.execute("""SELECT id, username, full_name, email, role, employee_id, phone, password_hash, is_active
                 FROM users
                 WHERE username = %s""",
              (username,))

    user_row = c.fetchone()
    conn.close()

    if not user_row:
        log_warning(f"[AUTH] User '{username}' not found in database", "auth")
        return None

    is_active = user_row[8]
    if not is_active:
        log_warning(f"[AUTH] User '{username}' exists but is_active=FALSE (deactivated account)", "auth")
        return None

    stored_hash = user_row[7]
    is_valid = False

    log_info(f"[AUTH] Verifying password for '{username}', hash type: {'pbkdf2' if stored_hash.startswith('pbkdf2:') else 'legacy_sha256'}", "auth")

    if stored_hash.startswith("pbkdf2:"):
        try:
            _, algorithm, iterations_salt_hash = stored_hash.split(':')
            iterations, salt, hash_value = iterations_salt_hash.split('$')
            new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(iterations)).hex()
            is_valid = (new_hash == hash_value)
            if not is_valid:
                log_warning(f"[AUTH] Password mismatch for '{username}' (pbkdf2 hash)", "auth")
        except Exception as e:
            log_error(f"[AUTH] Error verifying pbkdf2 hash for '{username}': {e}", "auth")
            is_valid = False
    else:
        # Legacy SHA256 support
        is_valid = (hashlib.sha256(password.encode()).hexdigest() == stored_hash)
        if not is_valid:
            log_warning(f"[AUTH] Password mismatch for '{username}' (legacy sha256 hash)", "auth")

    if is_valid:
        log_info(f"[AUTH] Login successful for '{username}' (role: {user_row[4]})", "auth")
        return {
            "id": user_row[0],
            "username": user_row[1],
            "full_name": user_row[2],
            "email": user_row[3],
            "role": user_row[4],
            "employee_id": user_row[5],
            "phone": user_row[6]
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
    
    try:
        c.execute("""INSERT INTO sessions (user_id, session_token, created_at, expires_at)
                     VALUES (%s, %s, %s, %s)""",
                  (user_id, session_token, now.isoformat(), expires))
        
        # Обновить last_login
        c.execute("UPDATE users SET last_login = %s WHERE id = %s",
                  (now.isoformat(), user_id))
        
        conn.commit()
    finally:
        conn.close()
    
    return session_token

def get_user_by_session(session_token: str) -> Optional[Dict]:
    """Получить пользователя по токену сессии (с кэшированием)"""
    if not session_token:
        return None
    
    cache_key = f"session_user_{session_token}"
    
    # Try Redis cache first (if available)
    if cache.enabled:
        cached_user = cache.get(cache_key)
        if cached_user is not None:
            return cached_user
    
    # Fallback to in-memory cache
    if cache_key in _session_cache:
        cached_user, cached_time = _session_cache[cache_key]
        if time.time() - cached_time < _session_cache_ttl:
            return cached_user
    
    # Query database
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        now = datetime.now().isoformat()
        
        # Query with proper index usage (idx_sessions_token_expires covers this)
        c.execute("""SELECT u.id, u.username, u.full_name, u.email, u.role, u.employee_id, u.phone
                     FROM users u
                     INNER JOIN sessions s ON u.id = s.user_id
                     WHERE s.session_token = %s 
                     AND s.expires_at > %s 
                     AND u.is_active = TRUE
                     LIMIT 1""",
                  (session_token, now))
        
        user = c.fetchone()
        
        if user:
            user_dict = {
                "id": user[0],
                "username": user[1],
                "full_name": user[2],
                "email": user[3],
                "role": user[4],
                "employee_id": user[5],
                "phone": user[6]
            }
            
            # Cache in Redis (if available)
            if cache.enabled:
                cache.set(cache_key, user_dict, expire=300)  # 5 minutes
            
            # Cache in memory as fallback
            _session_cache[cache_key] = (user_dict, time.time())
            
            # Clean old cache entries (keep only last 100)
            if len(_session_cache) > 100:
                sorted_items = sorted(_session_cache.items(), key=lambda x: x[1][1])
                for key, _ in sorted_items[:len(_session_cache) - 100]:
                    del _session_cache[key]
            
            return user_dict
        return None
    except Exception as e:
        log_error(f"Error getting user by session: {e}", "users")
        return None
    finally:
        conn.close()

def delete_session(session_token: str):
    """Удалить сессию (выход)"""
    # Invalidate cache
    cache_key = f"session_user_{session_token}"
    if cache_key in _session_cache:
        del _session_cache[cache_key]
    if cache.enabled:
        cache.delete(cache_key)
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
        conn.commit()
    finally:
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
    
    salt = secrets.token_hex(16)
    hash_value = hashlib.pbkdf2_hmac('sha256', new_password.encode(), salt.encode(), 100000).hex()
    password_hash = f"pbkdf2:sha256:100000${salt}${hash_value}"
    
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
def update_user_info(user_id: int, data: dict) -> bool:
    """Обновить информацию о пользователе"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    allowed_fields = ['full_name', 'email', 'phone', 'position', 'is_active', 'is_service_provider']
    
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = %s")
            params.append(data[field])
            
    if not updates:
        conn.close()
        return False
        
    try:
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        print(f"❌ Ошибка обновления пользователя: {e}")
        return False
    finally:
        conn.close()
