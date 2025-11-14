# backend/auth.py
"""
API Endpoints для авторизации и админ-панели
"""
from fastapi import APIRouter, Form, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3



from db import (
    verify_user, create_session, delete_session,
)
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error, log_warning
from utils.utils import require_auth

router = APIRouter(tags=["Auth"])


# ===== MIDDLEWARE =====

def get_current_user_or_redirect(session_token: Optional[str] = Cookie(None)):
    """Получить пользователя или редирект на логин"""
    user = require_auth(session_token)
    if not user:
        return None
    return user


# ===== АВТОРИЗАЦИЯ =====



@router.post("/login")
async def api_login(username: str = Form(...), password: str = Form(...)):
    """API: Логин"""
    try:
        log_info(f"API Login attempt: {username}", "auth")
        user = verify_user(username, password)
        
        if not user:
            log_warning(f"Invalid credentials for {username}", "auth")
            return JSONResponse(
                {"error": "Неверное имя пользователя или пароль"}, 
                status_code=401
            )
        
        # Проверка email верификации и активации
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("SELECT is_active, email_verified, email FROM users WHERE id = ?", (user["id"],))
        result = c.fetchone()
        conn.close()

        if not result:
            return JSONResponse(
                {"error": "Пользователь не найден"},
                status_code=404
            )

        is_active, email_verified, email = result

        # Проверяем email верификацию
        if not email_verified:
            log_warning(f"User {username} email not verified yet", "auth")
            return JSONResponse(
                {
                    "error": "Email не подтвержден",
                    "error_type": "email_not_verified",
                    "email": email
                },
                status_code=403
            )

        # Проверяем активацию администратором
        if is_active == 0:
            log_warning(f"User {username} not activated yet", "auth")
            return JSONResponse(
                {
                    "error": "Ваш аккаунт еще не активирован администратором",
                    "error_type": "not_approved"
                },
                status_code=403
            )
        
        session_token = create_session(user["id"])
        log_info(f"Session created for {username}", "auth")
        
        response_data = {
            "success": True,
            "token": session_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user["role"]
            }
        }
        
        response = JSONResponse(response_data)
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=7*24*60*60,
            samesite="lax"
        )
        
        return response
        
    except Exception as e:
        log_error(f"Error in api_login: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/logout")
async def logout_api(session_token: Optional[str] = Cookie(None)):
    """API: Logout"""
    try:
        if session_token:
            delete_session(session_token)
            log_info("Пользователь вышел из системы", "auth")
        
        response = JSONResponse({"success": True, "message": "Logged out"})
        response.delete_cookie("session_token")
        return response
    except Exception as e:
        log_error(f"Error in logout: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


# ===== РЕГИСТРАЦИЯ =====

@router.post("/register")
async def api_register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form("employee"),
    position: str = Form(""),
    privacy_accepted: bool = Form(False),
    newsletter_subscribed: bool = Form(True)
):
    """API: Регистрация нового пользователя (требуется email подтверждение + одобрение админа)"""
    try:
        # Валидация
        if len(username) < 3:
            return JSONResponse(
                {"error": "Логин должен быть минимум 3 символа"},
                status_code=400
            )

        if len(password) < 6:
            return JSONResponse(
                {"error": "Пароль должен быть минимум 6 символов"},
                status_code=400
            )

        if not full_name or len(full_name) < 2:
            return JSONResponse(
                {"error": "Имя должно быть минимум 2 символа"},
                status_code=400
            )

        if not email or '@' not in email:
            return JSONResponse(
                {"error": "Введите корректный email"},
                status_code=400
            )

        # Проверяем что логин и email не заняты
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        if c.fetchone():
            conn.close()
            return JSONResponse(
                {"error": "Пользователь с таким логином уже существует"},
                status_code=400
            )

        c.execute("SELECT id FROM users WHERE email = ?", (email,))
        if c.fetchone():
            conn.close()
            return JSONResponse(
                {"error": "Пользователь с таким email уже существует"},
                status_code=400
            )

        # Генерируем код верификации
        from utils.email import generate_verification_code, get_code_expiry, send_verification_email

        verification_code = generate_verification_code()
        code_expires = get_code_expiry()

        # Создаём пользователя с is_active = 0 и email_verified = 0
        import hashlib
        from datetime import datetime

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        now = datetime.now().isoformat()

        # Проверяем, существуют ли уже пользователи в системе
        c.execute("SELECT COUNT(*) FROM users")
        user_count = c.fetchone()[0]
        is_first_user = (user_count == 0)

        # Для первого пользователя с ролью director автоматически подтверждаем email и активируем
        auto_verify = is_first_user and role == 'director'

        # Добавляем privacy_accepted и privacy_accepted_at
        privacy_accepted_at = now if privacy_accepted else None

        c.execute("""INSERT INTO users
                     (username, password_hash, full_name, email, role, position, created_at,
                      is_active, email_verified, verification_code, verification_code_expires,
                      privacy_accepted, privacy_accepted_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (username, password_hash, full_name, email, role, position, now,
                   1 if auto_verify else 0,  # is_active
                   1 if auto_verify else 0,  # email_verified
                   verification_code, code_expires,
                   int(privacy_accepted), privacy_accepted_at))

        user_id = c.lastrowid

        # Создаем запись в таблице employees для сотрудников
        if role in ['employee', 'manager', 'director', 'admin']:
            c.execute("""INSERT INTO employees
                         (full_name, position, email, phone, is_active, created_at, updated_at)
                         VALUES (?, ?, ?, '', 1, ?, ?)""",
                      (full_name, position or role, email, now, now))

            employee_id = c.lastrowid

            # Связываем пользователя с записью employee
            c.execute("UPDATE users SET assigned_employee_id = ? WHERE id = ?",
                      (employee_id, user_id))

        # Если пользователь подписался на рассылку, создаем подписки
        if newsletter_subscribed:
            from core.subscriptions import CLIENT_SUBSCRIPTION_TYPES
            for sub_type in CLIENT_SUBSCRIPTION_TYPES.keys():
                c.execute("""INSERT INTO user_subscriptions
                             (user_id, subscription_type, is_subscribed, created_at, updated_at)
                             VALUES (?, ?, 1, ?, ?)""",
                          (user_id, sub_type, now, now))

        conn.commit()
        conn.close()

        # Если это первый директор, он автоматически подтвержден
        if auto_verify:
            response_data = {
                "success": True,
                "message": "Регистрация успешна! Вы первый директор системы и автоматически подтверждены. Можете войти в систему.",
                "user_id": user_id,
                "auto_verified": True,
                "is_first_director": True
            }
            log_info(f"First director registered and auto-verified: {username} (ID: {user_id})", "auth")
            return response_data

        # Отправляем email с кодом верификации
        email_sent = send_verification_email(email, verification_code, full_name)

        response_data = {
            "success": True,
            "message": "Регистрация успешна! Проверьте вашу почту и введите код подтверждения.",
            "user_id": user_id,
            "email_sent": email_sent
        }

        # В development режиме возвращаем код в ответе если email не отправлен
        import os
        if not email_sent and os.getenv("ENVIRONMENT") != "production":
            log_warning(f"SMTP not configured - showing code in response: {verification_code}", "auth")
            response_data["verification_code"] = verification_code
            response_data["message"] = f"⚠️ SMTP не настроен. Ваш код: {verification_code}"

        log_info(f"New registration: {username} (ID: {user_id}), code: {verification_code if not email_sent else 'sent to email'}", "auth")

        return response_data

    except sqlite3.IntegrityError:
        log_error(f"Registration failed: username {username} already exists", "auth")
        return JSONResponse(
            {"error": "Пользователь с таким логином уже существует"},
            status_code=400
        )
    except Exception as e:
        log_error(f"Error in api_register: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/verify-email")
async def verify_email(
    email: str = Form(...),
    code: str = Form(...)
):
    """API: Подтверждение email адреса кодом"""
    try:
        from datetime import datetime

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Находим пользователя с таким email и кодом
        c.execute("""
            SELECT id, full_name, verification_code_expires, email_verified
            FROM users
            WHERE email = ? AND verification_code = ?
        """, (email, code))

        result = c.fetchone()

        if not result:
            conn.close()
            return JSONResponse(
                {"error": "Неверный код подтверждения"},
                status_code=400
            )

        user_id, full_name, code_expires, email_verified = result

        # Проверяем, не истек ли код
        if datetime.now().isoformat() > code_expires:
            conn.close()
            return JSONResponse(
                {"error": "Код подтверждения истек. Запросите новый код."},
                status_code=400
            )

        # Проверяем, не подтвержден ли уже email
        if email_verified:
            conn.close()
            return JSONResponse(
                {"error": "Email уже подтвержден"},
                status_code=400
            )

        # Подтверждаем email
        c.execute("""
            UPDATE users
            SET email_verified = 1, verification_code = NULL, verification_code_expires = NULL
            WHERE id = ?
        """, (user_id,))

        conn.commit()
        conn.close()

        log_info(f"Email verified for user {user_id} ({email})", "auth")

        return {
            "success": True,
            "message": "Email подтвержден! Ожидайте одобрения администратора для доступа к системе."
        }

    except Exception as e:
        log_error(f"Error in verify_email: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/resend-verification")
async def resend_verification(email: str = Form(...)):
    """API: Повторная отправка кода верификации"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT id, full_name, email_verified
            FROM users
            WHERE email = ?
        """, (email,))

        result = c.fetchone()

        if not result:
            conn.close()
            return JSONResponse(
                {"error": "Пользователь с таким email не найден"},
                status_code=404
            )

        user_id, full_name, email_verified = result

        if email_verified:
            conn.close()
            return JSONResponse(
                {"error": "Email уже подтвержден"},
                status_code=400
            )

        # Генерируем новый код
        from utils.email import generate_verification_code, get_code_expiry, send_verification_email

        verification_code = generate_verification_code()
        code_expires = get_code_expiry()

        # Обновляем код в БД
        c.execute("""
            UPDATE users
            SET verification_code = ?, verification_code_expires = ?
            WHERE id = ?
        """, (verification_code, code_expires, user_id))

        conn.commit()
        conn.close()

        # Отправляем email
        email_sent = send_verification_email(email, verification_code, full_name)

        if not email_sent:
            return JSONResponse(
                {"error": "Не удалось отправить письмо. Попробуйте позже."},
                status_code=500
            )

        log_info(f"Verification code resent to {email}", "auth")

        return {
            "success": True,
            "message": "Код подтверждения отправлен на вашу почту"
        }

    except Exception as e:
        log_error(f"Error in resend_verification: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


# ===== СПРАВОЧНИКИ =====

@router.get("/positions")
async def get_positions():
    """API: Получить список доступных должностей"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Создаем таблицу если её нет
        c.execute('''CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            name_en TEXT,
            name_ar TEXT,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )''')

        # Проверяем есть ли данные
        c.execute("SELECT COUNT(*) FROM positions")
        count = c.fetchone()[0]

        if count == 0:
            from datetime import datetime
            now = datetime.now().isoformat()

            # Добавляем дефолтные должности
            default_positions = [
                ("Мастер маникюра", "Manicure Master", "خبير مانيكير", "Специалист по маникюру", 1),
                ("Мастер педикюра", "Pedicure Master", "خبير باديكير", "Специалист по педикюру", 2),
                ("Мастер бровист", "Brow Master", "خبير الحواجب", "Специалист по оформлению бровей", 3),
                ("Косметолог", "Cosmetologist", "خبير التجميل", "Специалист по косметологии", 4),
                ("Визажист", "Makeup Artist", "فنان مكياج", "Специалист по макияжу", 5),
                ("Парикмахер", "Hairdresser", "مصفف شعر", "Специалист по прическам", 6),
                ("Менеджер по продажам", "Sales Manager", "مدير المبيعات", "Ответственный за продажи услуг", 7),
                ("Таргетолог", "Targeting Specialist", "أخصائي الاستهداف", "Специалист по таргетированной рекламе", 8),
                ("SMM-менеджер", "SMM Manager", "مدير وسائل التواصل", "Менеджер социальных сетей", 9),
                ("Администратор", "Administrator", "مسؤول", "Администратор салона", 10),
                ("Старший администратор", "Senior Administrator", "مسؤول أول", "Старший администратор", 11),
                ("Директор", "Director", "مدير", "Директор салона", 12),
            ]

            for position in default_positions:
                c.execute("""INSERT INTO positions
                             (name, name_en, name_ar, description, sort_order, is_active, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, 1, ?, ?)""",
                          (position[0], position[1], position[2], position[3], position[4], now, now))

            conn.commit()

        # Получаем активные должности
        c.execute("""
            SELECT id, name, name_en, name_ar, description
            FROM positions
            WHERE is_active = 1
            ORDER BY sort_order, name
        """)

        positions = []
        for row in c.fetchall():
            positions.append({
                "id": row[0],
                "name": row[1],
                "name_en": row[2],
                "name_ar": row[3],
                "description": row[4]
            })

        conn.close()

        return {"success": True, "positions": positions}

    except Exception as e:
        log_error(f"Error in get_positions: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


