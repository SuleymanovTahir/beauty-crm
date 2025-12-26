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

class VerifyClientEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str

class ToggleFavoriteMaster(BaseModel):
    master_id: int
    is_favorite: bool


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
        # Проверяем, существует ли уже клиент с таким email (case-insensitive)
        c.execute("SELECT email FROM clients WHERE LOWER(email) = LOWER(%s)", (data.email,))
        existing = c.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail=f"Клиент с email '{data.email}' уже зарегистрирован")

        # Хэшируем пароль
        password_hash = hash_password(data.password)

        # Генерируем уникальный instagram_id для новых клиентов (без Instagram)
        instagram_id = f"web_{secrets.token_urlsafe(16)}"

        # Генерируем код верификации (6 цифр)
        from utils.email_service import generate_verification_code, get_code_expiry
        verification_code = generate_verification_code()
        code_expires = get_code_expiry()

        now = datetime.now().isoformat()

        # Создаем нового клиента с is_verified=False
        # Проверяем есть ли колонка verification_code в clients
        c.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='clients' AND column_name='verification_code'
        """)
        has_verification_column = c.fetchone() is not None

        if has_verification_column:
            # Если колонки есть - используем их
            c.execute("""
                INSERT INTO clients
                (instagram_id, email, password_hash, name, phone, birthday,
                 created_at, first_contact, last_contact, status, labels,
                 is_verified, verification_code, verification_code_expires)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                'Веб-регистрация',
                False,  # is_verified
                verification_code,
                code_expires
            ))
        else:
            # Используем отдельную таблицу client_email_verifications
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
            
            # Записываем код в отдельную таблицу
            c.execute("""
                INSERT INTO client_email_verifications (email, code, expires_at)
                VALUES (%s, %s, %s)
            """, (data.email, verification_code, code_expires))

        # НЕ добавляем бонусы до подтверждения email
        # Бонусы будут добавлены после verify_email

        conn.commit()
        
        # Отправляем email с кодом верификации
        from utils.email_service import send_verification_code_email
        email_sent = send_verification_code_email(data.email, verification_code, data.name or 'Клиент', 'client')
        
        import os
        if not email_sent and os.getenv('ENVIRONMENT') != 'production':
            # В development показываем код в ответе
            return {
                "success": True,
                "message": f"Регистрация успешна! Ваш код верификации: {verification_code}",
                "client_id": instagram_id,
                "verification_code": verification_code,
                "email_sent": False
            }

        return {
            "success": True,
            "message": "Регистрация успешна! Код верификации отправлен на вашу почту.",
            "client_id": instagram_id,
            "email_sent": email_sent
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

# ============================================================================
# ACCOUNT ENHANCEMENTS ENDPOINTS
# ============================================================================

@router.get("/dashboard")
async def get_client_dashboard(session_token: Optional[str] = Cookie(None)):
    """Получить сводную информацию для главной страницы ЛК"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Сводка по лояльности
        c.execute("SELECT loyalty_points, referral_code, total_saved FROM clients WHERE instagram_id = %s", (client_id,))
        client_row = c.fetchone()
        points = client_row[0] if client_row else 0
        
        # Calculate level
        level = "Bronze"
        if points > 1000: level = "Silver"
        if points > 5000: level = "Gold"
        if points > 10000: level = "Platinum"
        
        loyalty = {
            "points": points,
            "referral_code": client_row[1] if client_row else "",
            "total_saved": client_row[2] if client_row else 0,
            "level": level
        }

        # 2. Следующая запись
        c.execute("""
            SELECT id, service_name, datetime, master 
            FROM bookings 
            WHERE instagram_id = %s AND status IN ('pending', 'confirmed') 
            AND datetime >= %s
            ORDER BY datetime ASC LIMIT 1
        """, (client_id, datetime.now().isoformat()))
        next_booking_row = c.fetchone()
        next_booking = {
            "id": next_booking_row[0],
            "service": next_booking_row[1],
            "date": next_booking_row[2],
            "master": next_booking_row[3]
        } if next_booking_row else None

        # 3. Последний визит
        c.execute("""
            SELECT id, service_name, datetime, master 
            FROM bookings 
            WHERE instagram_id = %s AND status = 'completed'
            ORDER BY datetime DESC LIMIT 1
        """, (client_id,))
        last_visit_row = c.fetchone()
        last_visit = {
            "id": last_visit_row[0],
            "service": last_visit_row[1],
            "date": last_visit_row[2],
            "master": last_visit_row[3]
        } if last_visit_row else None

        # 4. Прогресс достижений
        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = %s AND unlocked_at IS NOT NULL", (client_id,))
        unlocked_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM client_achievements WHERE client_id = 'template'")
        total_templates = c.fetchone()[0]

        # 5. Visit Streak Calculation (consecutive months with visits)
        c.execute("""
            SELECT DISTINCT TO_CHAR(TO_TIMESTAMP(datetime, 'YYYY-MM-DD HH24:MI'), 'YYYY-MM') as month
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            ORDER BY month DESC
        """, (client_id,))
        months_with_visits = [row[0] for row in c.fetchall()]
        
        streak_count = 0
        if months_with_visits:
            current_month = datetime.now().strftime('%Y-%m')
            # Check if current or last month has visits
            check_month = current_month
            for i in range(12):  # Check up to 12 months back
                if check_month in months_with_visits:
                    streak_count += 1
                    # Go to previous month
                    d = datetime.strptime(check_month + '-01', '%Y-%m-%d')
                    prev = (d.replace(day=1) - timedelta(days=1))
                    check_month = prev.strftime('%Y-%m')
                else:
                    break
        
        streak = {
            "count": streak_count,
            "bonus_target": 5,  # 5 consecutive months for bonus
            "bonus_amount": 500
        }

        # 6. Spending Analytics (last 6 months)
        c.execute("""
            SELECT 
                TO_CHAR(TO_TIMESTAMP(datetime, 'YYYY-MM-DD HH24:MI'), 'Mon') as month_name,
                SUM(revenue) as total
            FROM bookings
            WHERE instagram_id = %s 
            AND status = 'completed'
            AND datetime >= %s
            GROUP BY TO_CHAR(TO_TIMESTAMP(datetime, 'YYYY-MM-DD HH24:MI'), 'YYYY-MM'), month_name
            ORDER BY TO_CHAR(TO_TIMESTAMP(datetime, 'YYYY-MM-DD HH24:MI'), 'YYYY-MM')
        """, (client_id, (datetime.now() - timedelta(days=180)).isoformat()))
        
        monthly_spending = []
        for row in c.fetchall():
            monthly_spending.append({"month": row[0], "amount": float(row[1] or 0)})
        
        # Total spent
        c.execute("""
            SELECT SUM(revenue), AVG(revenue), COUNT(*)
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
        """, (client_id,))
        stats_row = c.fetchone()
        total_spent = float(stats_row[0] or 0)
        avg_check = float(stats_row[1] or 0)
        total_visits = int(stats_row[2] or 0)
        
        # Most active month
        c.execute("""
            SELECT TO_CHAR(TO_TIMESTAMP(datetime, 'YYYY-MM-DD HH24:MI'), 'Month') as month_name, COUNT(*) as cnt
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            GROUP BY month_name
            ORDER BY cnt DESC
            LIMIT 1
        """, (client_id,))
        most_active_row = c.fetchone()
        most_active_month = most_active_row[0].strip() if most_active_row else None
        
        # Service distribution
        c.execute("""
            SELECT 
                CASE 
                    WHEN LOWER(service_name) LIKE '%волос%' OR LOWER(service_name) LIKE '%hair%' OR LOWER(service_name) LIKE '%окраш%' THEN 'hair'
                    WHEN LOWER(service_name) LIKE '%ногт%' OR LOWER(service_name) LIKE '%маник%' OR LOWER(service_name) LIKE '%педик%' OR LOWER(service_name) LIKE '%nail%' THEN 'nails'
                    WHEN LOWER(service_name) LIKE '%лиц%' OR LOWER(service_name) LIKE '%face%' OR LOWER(service_name) LIKE '%уход%' THEN 'face'
                    ELSE 'other'
                END as category,
                COUNT(*) as cnt
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            GROUP BY category
        """, (client_id,))
        
        total_for_dist = 0
        category_counts = {}
        for row in c.fetchall():
            category_counts[row[0]] = row[1]
            total_for_dist += row[1]
        
        service_distribution = []
        if total_for_dist > 0:
            for cat in ['hair', 'nails', 'face', 'other']:
                pct = int((category_counts.get(cat, 0) / total_for_dist) * 100)
                service_distribution.append({"category": cat, "percentage": pct})
        
        analytics = {
            "monthly_spending": monthly_spending,
            "total_spent": total_spent,
            "total_saved": loyalty["total_saved"],
            "avg_check": round(avg_check, 2),
            "most_active_month": most_active_month,
            "service_distribution": service_distribution,
            "total_visits": total_visits
        }

        # 7. Visit Stats
        # Favorite Service
        c.execute("""
            SELECT service_name, COUNT(*) as cnt
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            GROUP BY service_name
            ORDER BY cnt DESC
            LIMIT 1
        """, (client_id,))
        fav_service_row = c.fetchone()
        fav_service = fav_service_row[0] if fav_service_row else None

        # Favorite Master
        c.execute("""
            SELECT master, COUNT(*) as cnt
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            GROUP BY master
            ORDER BY cnt DESC
            LIMIT 1
        """, (client_id,))
        fav_master_row = c.fetchone()
        fav_master = fav_master_row[0] if fav_master_row else None

        # Average Frequency (days between visits)
        c.execute("""
            SELECT datetime
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            ORDER BY datetime ASC
        """, (client_id,))
        visit_dates = []
        for row in c.fetchall():
            try:
                visit_dates.append(datetime.fromisoformat(row[0].replace(' ', 'T')))
            except:
                pass

        avg_frequency = None
        if len(visit_dates) > 1:
            diffs = [(visit_dates[i] - visit_dates[i-1]).days for i in range(1, len(visit_dates))]
            avg_frequency_days = sum(diffs) / len(diffs)
            
            if avg_frequency_days < 7:
                 avg_frequency = f"{int(avg_frequency_days)} days"
            elif avg_frequency_days < 30:
                 avg_frequency = f"{int(avg_frequency_days // 7)} weeks"
            else:
                 avg_frequency = f"{int(avg_frequency_days // 30)} months"
        
        visit_stats = {
            "total_visits": total_visits,
            "avg_frequency": avg_frequency,
            "fav_service": fav_service,
            "fav_master": fav_master
        }

        # 8. Active Challenges
        c.execute("""
            SELECT id, title_ru, title_en, description_ru, description_en, bonus_points
            FROM active_challenges
            WHERE is_active = TRUE
            ORDER BY created_at DESC
        """)
        challenges = []
        for row in c.fetchall():
            challenges.append({
                "id": row[0],
                "title_ru": row[1],
                "title_en": row[2],
                "description_ru": row[3],
                "description_en": row[4],
                "bonus_points": row[5]
            })

        # 9. Smart Recommendations
        recommendations = []
        c.execute("""
            SELECT service_name, datetime
            FROM bookings
            WHERE instagram_id = %s AND status = 'completed'
            ORDER BY datetime DESC
            LIMIT 20
        """, (client_id,))
        recent_bookings = c.fetchall()
        
        # Analyze patterns for each service type
        service_last_dates = {}
        for row in recent_bookings:
            svc = row[0]
            if svc and svc not in service_last_dates:
                try:
                    service_last_dates[svc] = datetime.fromisoformat(row[1].replace(' ', 'T'))
                except:
                    pass
        
        # Generate recommendations
        now = datetime.now()
        for svc, last_date in service_last_dates.items():
            days_since = (now - last_date).days
            if days_since >= 21:  # 3 weeks
                weeks = days_since // 7
                if 'маник' in svc.lower() or 'nail' in svc.lower():
                    recommendations.append({
                        "service": svc,
                        "message": f"Прошло {weeks} недель с последнего маникюра",
                        "type": "manicure"
                    })
                elif 'окраш' in svc.lower() or 'color' in svc.lower() or 'hair' in svc.lower():
                    recommendations.append({
                        "service": svc,
                        "message": f"Прошло {weeks} недель с последнего окрашивания",
                        "type": "coloring"
                    })
                elif days_since >= 28:
                    recommendations.append({
                        "service": svc,
                        "message": f"Прошло {weeks} недель с последней процедуры",
                        "type": "general"
                    })

        # 8. Active Referral Campaign
        c.execute("""
            SELECT bonus_points, referrer_bonus, name, description
            FROM referral_campaigns
            WHERE is_active = TRUE
            ORDER BY created_at DESC LIMIT 1
        """)
        rc_row = c.fetchone()
        active_campaign = {
            "bonus_points": rc_row[0],
            "referrer_bonus": rc_row[1],
            "name": rc_row[2],
            "description": rc_row[3]
        } if rc_row else {
            "bonus_points": 200,
            "referrer_bonus": 200,
            "name": "Приведи друга",
            "description": "Пригласите друга и получите баллы"
        }

        # 9. Special Offers (Personalized packages)
        c.execute("""
            SELECT id, name_ru, description_ru, special_price, original_price, valid_until
            FROM special_packages
            WHERE is_active = TRUE
            ORDER BY created_at DESC LIMIT 2
        """)
        offers_rows = c.fetchall()
        special_offers = []
        for offer in offers_rows:
            # Calculate days left
            days_left = 7
            if offer[5]:
                try:
                    expiry = datetime.strptime(offer[5], '%Y-%m-%d')
                    days_left = (expiry - datetime.now()).days
                except:
                    pass
            
            special_offers.append({
                "id": offer[0],
                "title": offer[1],
                "description": offer[2],
                "price": offer[3],
                "original_price": offer[4],
                "days_left": max(0, days_left)
            })

        return {
            "success": True,
            "loyalty": loyalty,
            "next_booking": next_booking,
            "last_visit": last_visit,
            "achievements_summary": {
                "unlocked": unlocked_count,
                "total": total_templates
            },
            "streak": streak,
            "analytics": analytics,
            "visit_stats": visit_stats,
            "challenges": challenges,
            "recommendations": recommendations[:3],
            "referral_campaign": active_campaign,
            "special_offers": special_offers
        }

    finally:
        conn.close()

@router.get("/gallery")
async def get_client_gallery(session_token: Optional[str] = Cookie(None)):
    """Получить фото из галереи клиента (до/после)"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT id, before_photo, after_photo, created_at, category, notes, master_id
            FROM client_gallery
            WHERE client_id = %s
            ORDER BY created_at DESC
        """, (client_id,))
        
        gallery = []
        for row in c.fetchall():
            gallery.append({
                "id": row[0],
                "before": row[1],
                "after": row[2],
                "date": row[3],
                "category": row[4],
                "notes": row[5],
                "master_id": row[6]
            })
        return {"success": True, "gallery": gallery}
    finally:
        conn.close()

@router.get("/achievements")
async def get_client_achievements(session_token: Optional[str] = Cookie(None)):
    """Получить список достижений клиента"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Сначала получаем все шаблоны
        c.execute("SELECT achievement_type, title_ru, description_ru, icon, points_awarded, max_progress FROM client_achievements WHERE client_id = 'template'")
        templates = {row[0]: {"title": row[1], "description": row[2], "icon": row[3], "points": row[4], "max": row[5]} for row in c.fetchall()}

        # Затем получаем прогресс клиента
        c.execute("SELECT achievement_type, progress, unlocked_at FROM client_achievements WHERE client_id = %s", (client_id,))
        client_data = {row[0]: {"progress": row[1], "unlocked_at": row[2]} for row in c.fetchall()}

        achievements = []
        for ach_type, info in templates.items():
            client_ach = client_data.get(ach_type, {"progress": 0, "unlocked_at": None})
            achievements.append({
                "type": ach_type,
                "title": info["title"],
                "description": info["description"],
                "icon": info["icon"],
                "points": info["points"],
                "progress": client_ach["progress"],
                "max_progress": info["max"],
                "unlocked_at": client_ach["unlocked_at"]
            })

        return {"success": True, "achievements": achievements}
    finally:
        conn.close()

@router.get("/favorite-masters")
async def get_favorite_masters(session_token: Optional[str] = Cookie(None)):
    """Получить список избранных мастеров"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT u.id, u.full_name, u.photo_url, u.position
            FROM client_favorite_masters fm
            JOIN users u ON fm.master_id = u.id
            WHERE fm.client_id = %s
        """, (client_id,))
        
        masters = []
        for row in c.fetchall():
            masters.append({
                "id": row[0],
                "name": row[1],
                "photo": row[2],
                "position": row[3]
            })
        return {"success": True, "masters": masters}
    finally:
        conn.close()

@router.post("/favorite-masters/toggle")
async def toggle_favorite_master(data: ToggleFavoriteMaster, session_token: Optional[str] = Cookie(None)):
    """Добавить/удалить мастера из избранного"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        if data.is_favorite:
            c.execute("INSERT INTO client_favorite_masters (client_id, master_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (client_id, data.master_id))
        else:
            c.execute("DELETE FROM client_favorite_masters WHERE client_id = %s AND master_id = %s", (client_id, data.master_id))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

@router.get("/beauty-metrics")
async def get_beauty_metrics(session_token: Optional[str] = Cookie(None)):
    """Получить бьюти-метрики клиента"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client_id = user["username"]
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT metric_name, metric_value, status, days_since_last
            FROM client_beauty_metrics
            WHERE client_id = %s
        """, (client_id,))
        
        metrics = []
        for row in c.fetchall():
            metrics.append({
                "name": row[0],
                "value": row[1],
                "status": row[2],
                "days": row[3]
            })
            
        # Если метрик нет - возвращаем дефолтные
        if not metrics:
            metrics = [
                {"name": "Маникюр", "value": 100, "status": "good", "days": 0},
                {"name": "Брови", "value": 100, "status": "good", "days": 0},
                {"name": "Уход", "value": 100, "status": "good", "days": 0}
            ]
            
        return {"success": True, "metrics": metrics}
    finally:
        conn.close()

