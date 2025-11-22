"""
API для клиентской авторизации и личного кабинета
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from core.config import DATABASE_NAME
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT instagram_id, email, password_hash, name, phone, birthday,
               created_at, last_login, is_verified
        FROM clients
        WHERE email = ?
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, существует ли уже клиент с таким email
        c.execute("SELECT email FROM clients WHERE email = ?", (data.email,))
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("UPDATE clients SET last_login = ? WHERE email = ?",
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

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        INSERT INTO password_reset_tokens (client_email, token, created_at, expires_at)
        VALUES (?, ?, ?, ?)
    """, (data.email, token, datetime.now().isoformat(), expires_at))

    conn.commit()
    conn.close()

    # Отправляем email
    send_reset_email(data.email, token)

    return {"success": True, "message": "Если email существует, на него отправлена ссылка"}


@router.post("/reset-password")
async def reset_password(data: PasswordReset):
    """Сброс пароля по токену"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем токен
        c.execute("""
            SELECT client_email, expires_at, used
            FROM password_reset_tokens
            WHERE token = ?
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
        c.execute("UPDATE clients SET password_hash = ? WHERE email = ?",
                  (password_hash, client_email))

        # Помечаем токен как использованный
        c.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?",
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
async def get_client_bookings(client_id: str):
    """Получить историю записей клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT id, service_name, datetime, status, created_at, completed_at,
               revenue, notes
        FROM bookings
        WHERE instagram_id = ?
        ORDER BY datetime DESC
    """, (client_id,))

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
async def get_client_notifications(client_id: str, unread_only: bool = False):
    """Получить уведомления клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    query = """
        SELECT id, notification_type, title, message, sent_at, read_at, created_at
        FROM client_notifications
        WHERE client_instagram_id = ?
    """

    if unread_only:
        query += " AND read_at IS NULL"

    query += " ORDER BY created_at DESC LIMIT 50"

    c.execute(query, (client_id,))

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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        UPDATE client_notifications
        SET read_at = ?
        WHERE id = ?
    """, (datetime.now().isoformat(), notification_id))

    conn.commit()
    conn.close()

    return {"success": True}
