"""
API для клиентской авторизации и личного кабинета
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from core.config import DATABASE_NAME
from db.connection import get_db_connection
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import Cookie, Request
from utils.utils import require_auth

router = APIRouter(prefix="/client", tags=["Client Auth"])

# ============================================================================
# MODELS
# ============================================================================

class ClientRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None  # YYYY-MM-DD

class ClientLogin(BaseModel):
    email: str
    password: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordReset(BaseModel):
    token: str
    new_password: str

# ============================================================================
# HELPERS
# ============================================================================

def hash_password(password: str) -> str:
    """Хэшировать пароль"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Генерировать токен для восстановления пароля"""
    return secrets.token_urlsafe(32)

def get_client_by_email(email: str):
    """Получить клиента по email"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT instagram_id, email, password_hash, name, phone, birthday,
               created_at, last_login, is_verified
        FROM clients
        WHERE email = %s
    """, (email,))

    client = c.fetchone()
    conn.close()
    return client

def send_reset_email(email: str, token: str):
    """
    Отправить email с ссылкой на восстановление пароля
    TODO: Настроить SMTP сервер
    """
    reset_link = f"https://yourdomain.com/reset-password?token={token}"

    # TODO: Реализовать отправку email через SMTP
    print(f"📧 Reset link для {email}: {reset_link}")

    # В production использовать реальный SMTP:
    # msg = MIMEMultipart()
    # msg['From'] = "noreply@yourdomain.com"
    # msg['To'] = email
    # msg['Subject'] = "Восстановление пароля"
    # body = f"Перейдите по ссылке для сброса пароля: {reset_link}"
    # msg.attach(MIMEText(body, 'plain'))
    #
    # server = smtplib.SMTP('smtp.gmail.com', 587)
    # server.starttls()
    # server.login("your@email.com", "password")
    # server.send_message(msg)
    # server.quit()

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/register")
async def register_client(data: ClientRegister):
    """Регистрация нового клиента"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем, существует ли уже клиент с таким email
        c.execute("SELECT email FROM clients WHERE email = %s", (data.email,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

        # Хэшируем пароль
        password_hash = hash_password(data.password)

        # Генерируем уникальный instagram_id для новых клиентов (без Instagram)
        instagram_id = f"web_{secrets.token_urlsafe(16)}"

        now = datetime.now().isoformat()

        # Создаем нового клиента
        c.execute("""
            INSERT INTO clients
            (instagram_id, email, password_hash, name, phone, birthday,
             created_at, first_contact, last_contact, status, labels)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            instagram_id,
            data.email,
            password_hash,
            data.name,
            data.phone,
            data.birthday,
            now,
            now,
            now,
            'new',
            'Веб-регистрация'
        ))

        # Add Welcome Bonus (100 points)
        c.execute("""
            INSERT INTO loyalty_transactions (client_id, points, reason, transaction_type)
            VALUES (%s, 100, 'Приветственный бонус за регистрацию', 'system')
        """, (instagram_id,))
        
        c.execute("UPDATE clients SET loyalty_points = loyalty_points + 100 WHERE instagram_id = %s", (instagram_id,))

        # Add Welcome Notification
        c.execute("""
            INSERT INTO client_notifications (client_instagram_id, notification_type, title, message, sent_at)
            VALUES (%s, 'welcome', 'Добро пожаловать!', 'Мы рады видеть вас! Вам начислено 100 приветственных бонусов.', %s)
        """, (instagram_id, now))

        conn.commit()

        return {
            "success": True,
            "message": "Регистрация успешна",
            "client_id": instagram_id
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка регистрации: {str(e)}")
    finally:
        conn.close()

@router.post("/login")
async def login_client(data: ClientLogin):
    """Вход клиента"""
    client = get_client_by_email(data.email)

    if not client:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    instagram_id, email, password_hash, name, phone, birthday, created_at, last_login, is_verified = client

    # Проверяем пароль
    if hash_password(data.password) != password_hash:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    # Обновляем last_login
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE clients SET last_login = %s WHERE email = %s",
              (datetime.now().isoformat(), email))
    conn.commit()
    conn.close()

    # Генерируем токен сессии
    session_token = generate_token()

    return {
        "success": True,
        "token": session_token,
        "client": {
            "id": instagram_id,
            "email": email,
            "name": name,
            "phone": phone,
            "birthday": birthday
        }
    }

@router.post("/request-password-reset")
async def request_password_reset(data: PasswordResetRequest):
    """Запрос на восстановление пароля"""
    client = get_client_by_email(data.email)

    if not client:
        # Не раскрываем, существует ли email
        return {"success": True, "message": "Если email существует, на него отправлена ссылка"}

    # Генерируем токен
    token = generate_token()
    expires_at = (datetime.now() + timedelta(hours=24)).isoformat()

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        INSERT INTO password_reset_tokens (client_email, token, created_at, expires_at)
        VALUES (%s, %s, %s, %s)
    """, (data.email, token, datetime.now().isoformat(), expires_at))

    conn.commit()
    conn.close()

    # Отправляем email
    send_reset_email(data.email, token)

    return {"success": True, "message": "Если email существует, на него отправлена ссылка"}

@router.post("/reset-password")
async def reset_password(data: PasswordReset):
    """Сброс пароля по токену"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем токен
        c.execute("""
            SELECT client_email, expires_at, used
            FROM password_reset_tokens
            WHERE token = %s
        """, (data.token,))

        token_data = c.fetchone()

        if not token_data:
            raise HTTPException(status_code=400, detail="Неверный токен")

        client_email, expires_at, used = token_data

        if used:
            raise HTTPException(status_code=400, detail="Токен уже использован")

        if datetime.fromisoformat(expires_at) < datetime.now():
            raise HTTPException(status_code=400, detail="Токен истек")

        # Обновляем пароль
        password_hash = hash_password(data.new_password)
        c.execute("UPDATE clients SET password_hash = %s WHERE email = %s",
                  (password_hash, client_email))

        # Помечаем токен как использованный
        c.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = %s",
                  (data.token,))

        conn.commit()

        return {"success": True, "message": "Пароль успешно изменен"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка сброса пароля: {str(e)}")
    finally:
        conn.close()

@router.get("/my-bookings")
async def get_client_bookings(
    client_id: Optional[str] = None, 
    session_token: Optional[str] = Cookie(None)
):
    """Получить историю записей клиента"""
    user = require_auth(session_token)
    if not user:
        # Fallback for old calls? No, this is sensitive.
        return HTTPException(status_code=401, detail="Unauthorized")
        
    # Use authenticated user ID
    target_id = user["username"]
    phone = user.get("phone")
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT id, service_name, datetime, status, created_at, completed_at,
               revenue, notes
        FROM bookings
        WHERE instagram_id = %s
        ORDER BY datetime DESC
    """, (target_id,))

    bookings = []
    for row in c.fetchall():
        bookings.append({
            "id": row[0],
            "service_name": row[1],
            "datetime": row[2],
            "status": row[3],
            "created_at": row[4],
            "completed_at": row[5],
            "revenue": row[6],
            "notes": row[7]
        })

    conn.close()
    return {"bookings": bookings}

@router.get("/my-notifications")
async def get_client_notifications(
    client_id: Optional[str] = None, 
    unread_only: bool = False,
    session_token: Optional[str] = Cookie(None)
):
    """Получить уведомления клиента"""
    user = require_auth(session_token)
    if not user:
         raise HTTPException(status_code=401, detail="Unauthorized")

    # Use authenticated user
    target_id = user["username"]
    
    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT id, notification_type, title, message, sent_at, read_at, created_at
        FROM client_notifications
        WHERE client_instagram_id = %s
    """

    if unread_only:
        query += " AND read_at IS NULL"

    query += " ORDER BY created_at DESC LIMIT 50"

    c.execute(query, (target_id,))

    notifications = []
    for row in c.fetchall():
        notifications.append({
            "id": row[0],
            "type": row[1],
            "title": row[2],
            "message": row[3],
            "sent_at": row[4],
            "read_at": row[5],
            "created_at": row[6]
        })

    conn.close()
    return {"notifications": notifications}

@router.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(notification_id: int):
    """Отметить уведомление как прочитанное"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        UPDATE client_notifications
        SET read_at = %s
        WHERE id = %s
    """, (datetime.now().isoformat(), notification_id))

    conn.commit()
    conn.close()

    return {"success": True}

# ============================================================================
# NEW ENDPOINTS FOR ACCOUNT ENHANCEMENTS
# ============================================================================

class ClientProfileUpdate(BaseModel):
    client_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None
    notification_preferences: Optional[str] = None
    birth_date: Optional[str] = None

@router.put("/profile")
async def update_client_profile(data: ClientProfileUpdate):
    """Обновление профиля клиента"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Build query dynamically
        fields = []
        values = []

        if data.name:
            fields.append("name = %s")
            values.append(data.name)
        if data.email:
            fields.append("email = %s")
            values.append(data.email)
        if data.phone:
            fields.append("phone = %s")
            values.append(data.phone)
        if data.avatar_url:
            fields.append("avatar_url = %s")
            values.append(data.avatar_url)
        if data.notification_preferences:
            fields.append("notification_preferences = %s")
            values.append(data.notification_preferences)
        if data.birth_date:
            fields.append("birth_date = %s")
            values.append(data.birth_date)
            
        if data.password:
            fields.append("password_hash = %s")
            values.append(hash_password(data.password))

        if not fields:
            return {"success": True, "message": "Нет изменений"}

        query = f"UPDATE clients SET {', '.join(fields)} WHERE instagram_id = %s"
        values.append(data.client_id)

        c.execute(query, tuple(values))
        conn.commit()
        
        # Return updated user info
        c.execute("""
            SELECT instagram_id, email, name, phone, birthday, avatar_url, notification_preferences, birth_date, loyalty_points
            FROM clients WHERE instagram_id = %s
        """, (data.client_id,))
        row = c.fetchone()
        
        updated_client = None
        if row:
             updated_client = {
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "phone": row[3],
                "birthday": row[7] or row[4], # Preference new birth_date column
                "avatar_url": row[5],
                "notification_preferences": row[6],
                "loyalty_points": row[8] if len(row) > 8 else 0
            }

        return {"success": True, "message": "Профиль обновлен", "client": updated_client}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

from fastapi import UploadFile, File
import shutil
import os

@router.post("/upload-avatar")
async def upload_client_avatar(file: UploadFile = File(...)):
    """Загрузка аватара"""
    try:
        # Create upload dir
        UPLOAD_DIR = "static/uploads/avatars"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Generate filename
        ext = file.filename.split(".")[-1]
        filename = f"avatar_{secrets.token_hex(8)}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL relative to API
        return {"success": True, "url": f"/static/uploads/avatars/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@router.get("/loyalty")
async def get_loyalty_info(
    client_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Получить информацию о бонусах"""
    user = require_auth(session_token)
    if not user:
         raise HTTPException(status_code=401, detail="Unauthorized")

    # Use authenticated user
    target_id = user["username"]
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get points summary from clients table
        c.execute("SELECT loyalty_points FROM clients WHERE instagram_id = %s", (target_id,))
        row = c.fetchone()
        points = row[0] if row else 0
        
        # Get transaction history
        c.execute("""
            SELECT points, reason, created_at, transaction_type 
            FROM loyalty_transactions 
            WHERE client_id = %s 
            ORDER BY created_at DESC 
            LIMIT 20
        """, (target_id,))
        
        history = []
        for row in c.fetchall():
            history.append({
                "amount": row[0],
                "reason": row[1],
                "date": row[2],
                "source": row[3]
            })
            
        # Determine level based on points
        level = "Bronze"
        if points > 1000:
            level = "Silver"
        if points > 5000:
            level = "Gold"
        if points > 10000:
            level = "Platinum"
        
        return {"points": points, "history": history, "level": level}
    finally:
        conn.close()
