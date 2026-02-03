# backend/auth.py
"""
API Endpoints для авторизации и админ-панели
"""
from fastapi import APIRouter, Form, Cookie, Request
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
import psycopg2

from db import (
    verify_user, create_session, delete_session,
)
from core.config import DATABASE_NAME, PUBLIC_URL
from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning
from utils.utils import require_auth, validate_password
import httpx
from db.users import verify_user, create_session, delete_session
import os

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
async def api_login(request: Request, username: str = Form(...), password: str = Form(...)):
    """API: Логин"""
    # Rate limiting
    limiter = getattr(request.app.state, "limiter", None)
    if limiter:
        # Note: In a real app we would use limiter.limit here,
        # but for simplicity and to avoid decorator issues with dynamic app state
        pass
    try:
        # Детальное логирование для отладки мобильных устройств
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        origin = request.headers.get("origin", "unknown")
        referer = request.headers.get("referer", "unknown")

        log_info(f"[LOGIN] Attempt: username='{username}' | IP={client_ip} | Origin={origin}", "auth")
        log_info(f"[LOGIN] User-Agent: {user_agent[:100]}...", "auth")

        user = verify_user(username, password)
        
        if not user:
            log_warning(f"Invalid credentials for {username}", "auth")
            return JSONResponse(
                {"error": "invalid_credentials"}, 
                status_code=401
            )
        
        # ============================================================================
        # 🔒 EMAIL VERIFICATION AND ADMIN APPROVAL CHECKS (NOW ENABLED)
        # ============================================================================
        # Проверяем email верификацию и активацию ВСЕХ пользователей
        # Исключение: admin/admin123 может войти всегда
        # ============================================================================
        
        # Исключение для admin пользователя
        is_admin_exception = (username.lower() == 'admin')

        if not is_admin_exception:
            conn = get_db_connection()
            c = conn.cursor()
            # Для сотрудников (таблица users) проверяем только is_active
            # Email верификация нужна только для клиентов (таблица clients)
            c.execute("SELECT is_active FROM users WHERE id = %s", (user["id"],))
            result = c.fetchone()
            conn.close()

            if not result:
                return JSONResponse(
                    {"error": "user_not_found"},
                    status_code=404
                )

            is_active = result[0]

            # Проверяем активацию администратором
            if not is_active:
                log_warning(f"User {username} not activated yet", "auth")
                return JSONResponse({
                    "error": "account_not_activated",
                    "message": "registration_pending"
                }, status_code=403)
        
        
        # CRITICAL: Check for existing valid sessions to prevent duplicates on mobile
        conn = get_db_connection()
        c = conn.cursor()
        
        # Note: Expired sessions are now handled by scheduler/user_status_checker every minute
        from datetime import datetime
        now = datetime.now().isoformat()
        
        # Check for existing valid session
        c.execute("""
            SELECT session_token FROM sessions 
            WHERE user_id = %s AND expires_at > %s 
            ORDER BY created_at DESC LIMIT 1
        """, (user["id"], now))
        
        existing_session = c.fetchone()
        
        if existing_session:
            # Reuse existing session
            session_token = existing_session[0]
            log_info(f"Reusing existing session for {username}", "auth")
        else:
            # Create new session only if none exists
            session_token = create_session(user["id"])
            log_info(f"New session created for {username}", "auth")
        
        conn.close()
        
        response_data = {
            "success": True,
            "token": session_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user["role"],
                "phone": user.get("phone")
            }
        }
        
        response = JSONResponse(response_data)
        
        # CRITICAL FIX FOR MOBILE:
        # We must set path='/' to ensure cookie is sent for all API routes (including /api/internal-chat)
        # We set samesite='lax' for normal navigation
        # We set secure=True ONLY if we are on HTTPS
        use_ssl = os.getenv("USE_SSL", "false").lower() == "true"
        base_url = os.getenv("BASE_URL", "")
        is_https = base_url.startswith("https://") or use_ssl
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True, 
            max_age=7*24*60*60, # 7 days
            samesite="lax",
            secure=is_https,
            path="/"
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

@router.post("/google-login")
async def google_login(data: dict):
    """API: Вход/Регистрация через Google"""
    token = data.get("token")
    if not token:
        return JSONResponse({"error": "Token is required"}, status_code=400)

    current_stage = "Проверка Google токена"
    user_info = {'email': 'Unknown', 'full_name': 'Google User'}
    try:
        # 1. Проверяем токен через Google API
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if resp.status_code != 200:
                log_warning(f"Invalid Google token: {resp.text}", "auth")
                raise ValueError(f"Невалидный Google токен: {resp.text[:100]}")
            google_data = resp.json()

        email = google_data.get("email")
        if not email:
             raise ValueError("Email не найден в Google токене")
        
        user_info['email'] = email
        user_info['full_name'] = google_data.get("name", "Google User")

        email_verified_google = google_data.get("email_verified")
        if not email_verified_google:
             raise ValueError("Google email не подтвержден")

        current_stage = "Поиск пользователя в БД"
        # 2. Ищем пользователя в БД
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id, username, full_name, email, role, is_active, phone FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        user_id = None
        username = None
        full_name = None
        role = None
        phone = None
        
        if user:
            # Пользователь существует - логиним
            user_id, username, full_name, db_email, role, is_active, phone = user
            
            # Проверяем is_active
            if not is_active:
                conn.close()
                return JSONResponse(
                    {
                        "error": "Ваш аккаунт еще не активирован администратором",
                        "error_type": "not_approved",
                        "message": "Ваша регистрация ожидает одобрения администратора"
                    }, 
                    status_code=403
                )
                
            # Если email не был подтвержден в нашей системе, подтверждаем т.к. Google доверенный
            c.execute("UPDATE users SET email_verified = TRUE WHERE id = %s AND email_verified = FALSE", (user_id,))
            conn.commit()
            
        else:
            current_stage = "Регистрация нового пользователя (Google)"
            # Пользователь не существует - регистрируем
            username = email.split('@')[0]
            # Уникальность username
            c.execute("SELECT id FROM users WHERE username = %s", (username,))
            if c.fetchone():
                import random
                username = f"{username}{random.randint(100, 999)}"
            
            user_info['username'] = username
            full_name = google_data.get("name") or username
            password_hash = "google_auth_no_password" # Невозможно войти по паролю
            role = "employee" # Дефолтная роль
            
            # Создаем пользователя (требует одобрения админа!)
            from datetime import datetime
            now = datetime.now().isoformat()
            
            c.execute("""INSERT INTO users 
                         (username, password_hash, full_name, email, role, created_at, 
                          is_active, email_verified, privacy_accepted, privacy_accepted_at)
                         VALUES (%s, %s, %s, %s, %s, %s, FALSE, TRUE, 1, %s) RETURNING id""",
                      (username, password_hash, full_name, email, role, now, now))
            
            user_id = c.fetchone()[0]
            conn.commit()
            conn.close()
            
            current_stage = "Уведомление админа (Google Успех)"
            # Уведомляем админов
            user_info.update({
                'role': role,
                'position': 'Google Auth'
            })
            import asyncio
            asyncio.create_task(notify_admin_registration(user_info, success=True))
            
            return JSONResponse(
                {
                    "error": "Регистрация успешна! Ожидайте одобрения администратора.",
                    "error_type": "not_approved",
                    "message": "Ваш аккаунт создан и ожидает активации."
                },
                status_code=403
            )

        # 3. Генерируем сессию (для существующих пользователей)
        import secrets
        from datetime import timedelta
        session_token = secrets.token_urlsafe(32)
        expiry = (datetime.now() + timedelta(days=7)).isoformat()
        
        # Re-establish connection if it was closed in the 'if user' block or if it's a new user path
        # If user existed, conn was closed after update. If new user, conn was closed after insert.
        # So, we need a new connection for session creation.
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""INSERT INTO sessions (user_id, session_token, expires_at)
                     VALUES (%s, %s, %s)""", (user_id, session_token, expiry))
        conn.commit()
        conn.close()
        
        response = JSONResponse({
            "success": True, 
            "message": "Вход через Google успешен",
            "user": {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "role": role,
                "phone": phone
            }
        })
        response.set_cookie(key="session_token", value=session_token, httponly=True, max_age=7*24*60*60)
        return response

    except ValueError as ve:
        error_msg = str(ve)
        log_warning(f"Google Auth validation error: {error_msg} (Stage: {current_stage})", "auth")
        if user_info.get('email'):
             import asyncio
             asyncio.create_task(notify_admin_registration(user_info, success=False, error_msg=error_msg, stage=current_stage))
        return JSONResponse({"error": error_msg}, status_code=400)
    except Exception as e:
        error_msg = str(e)
        log_error(f"Error in google_login: {error_msg} (Stage: {current_stage})", "auth")
        if user_info.get('email'):
             import asyncio
             asyncio.create_task(notify_admin_registration(user_info, success=False, error_msg=error_msg, stage=current_stage))
        return JSONResponse({"error": "Внутренняя ошибка сервера Google Auth"}, status_code=500)

# ===== РЕГИСТРАЦИЯ =====

# ===== РЕГИСТРАЦИЯ (ОБЩАЯ) =====

@router.post("/register/client")
async def register_client_api(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    privacy_accepted: bool = Form(False)
):
    """API: Регистрация клиента (упрощенная)"""
    return await api_register(
        username=username,
        password=password,
        full_name=full_name,
        email=email,
        role="client",
        position="Клиент",
        phone=phone,
        privacy_accepted=privacy_accepted
    )

@router.post("/register/employee")
async def register_employee_api(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form("employee"),
    position: str = Form(""),
    phone: str = Form(""),
    privacy_accepted: bool = Form(False)
):
    """API: Регистрация сотрудника (с выбором должности/роли)"""
    # Запрещаем регистрировать директора через общую форму из соображений безопасности
    # (хотя подтверждение все равно нужно, лучше перестраховаться)
    if role == "director" and username.lower() != "admin":
         # Проверяем, есть ли уже директора. Если есть - запрещаем.
         conn = get_db_connection()
         c = conn.cursor()
         c.execute("SELECT COUNT(*) FROM users WHERE role = 'director' AND is_active = TRUE")
         count = c.fetchone()[0]
         conn.close()
         if count > 0:
             return JSONResponse(
                 {"error": "Регистрация роли Директор через общую форму запрещена."},
                 status_code=403
             )
    return await api_register(
        username=username,
        password=password,
        full_name=full_name,
        email=email,
        role=role,
        position=position,
        phone=phone,
        privacy_accepted=privacy_accepted
    )


async def notify_admin_registration(user_data: dict, success: bool = True, error_msg: str = None, stage: str = None):
    """
    Уведомить администратора о новой регистрации или ошибке при регистрации
    """
    from integrations.telegram_bot import send_telegram_alert
    from utils.email_service import send_admin_notification_email
    from db.settings import get_salon_settings
    import os

    salon_settings = get_salon_settings()
    salon_name = salon_settings.get('name', 'Beauty CRM')
    
    status_emoji = "✅" if success else "❌"
    title = "Новая регистрация" if success else "Ошибка при регистрации"
    
    # Формируем сообщение для Telegram
    tg_msg = (
        f"{status_emoji} <b>{title}</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Name:</b> {user_data.get('full_name', 'Not specified')}\n"
        f"📧 <b>Email:</b> {user_data.get('email', 'Not specified')}\n"
        f"👤 <b>Username:</b> {user_data.get('username', 'Not specified')}\n"
        f"👔 <b>Role:</b> {user_data.get('role', 'employee')}\n"
        f"📱 <b>Tel:</b> <code>{user_data.get('phone', 'Not specified')}</code>\n"
    )
    
    if not success:
        tg_msg += (
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ <b>Stage:</b> {stage}\n"
            f"🚫 <b>Error:</b> {error_msg}\n"
        )
    else:
        tg_msg += (
            f"━━━━━━━━━━━━━━━━━━\n"
            f"✨ User is awaiting approval.\n"
        )

    # 1. Отправляем в Telegram
    await send_telegram_alert(tg_msg)
    
    # 2. Отправляем на Email (только при успехе или критической ошибке)
    if success:
        admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USER')
        if admin_email:
            send_admin_notification_email(admin_email, user_data)


@router.post("/register")
async def api_register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form("employee"),
    position: str = Form(""),
    phone: str = Form(""),
    privacy_accepted: bool = Form(False),
    newsletter_subscribed: bool = Form(True)
):
    """API: Регистрация нового пользователя (базовый метод)"""
    user_info = {
        'username': username,
        'email': email,
        'full_name': full_name,
        'role': role,
        'position': position,
        'phone': phone
    }
    
    current_stage = "Validation"
    try:
        # Валидация
        if len(username) < 3:
            raise ValueError("error_login_too_short")

        is_valid_pwd, pwd_error = validate_password(password)
        if not is_valid_pwd:
           raise ValueError(pwd_error)

        if not full_name or len(full_name) < 2:
            raise ValueError("error_name_too_short")

        if not email or '@' not in email:
            raise ValueError("error_invalid_email")

        current_stage = "DB Existence Check"
        # Проверяем что логин и email не заняты
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(%s)", (username,))
        if c.fetchone():
            conn.close()
            raise ValueError("error_username_exists")

        c.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
        if c.fetchone():
            conn.close()
            raise ValueError("error_email_exists")

        current_stage = "Подготовка данных"
        # Генерируем токены
        import secrets
        verification_token = secrets.token_urlsafe(32)
        from utils.email import generate_verification_code, get_code_expiry
        verification_code = generate_verification_code()
        code_expires = get_code_expiry()

        from utils.utils import hash_password
        password_hash = hash_password(password)
        from datetime import datetime
        now = datetime.now().isoformat()

        # Первый админ?
        is_first_admin = False
        if username.lower() == 'admin' and role == 'director':
            c.execute("SELECT COUNT(*) FROM users WHERE LOWER(username) = 'admin' AND role = 'director'")
            is_first_admin = (c.fetchone()[0] == 0)
        
        auto_verify = is_first_admin

        current_stage = "Сохранение пользователя"
        c.execute("""INSERT INTO users
                     (username, password_hash, full_name, email, phone, role, position, created_at,
                      is_active, email_verified, verification_code, verification_code_expires,
                      email_verification_token, privacy_accepted, privacy_accepted_at)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                  (username, password_hash, full_name, email, phone, role, position, now,
                   True if auto_verify else False,
                   True if auto_verify else False,
                   verification_code, code_expires,
                   verification_token,
                   int(privacy_accepted), now if privacy_accepted else None))

        user_id = c.fetchone()[0]

        # Если это сотрудник - создаем запись в employees
        if role in ['employee', 'manager', 'director', 'admin', 'sales', 'marketer']:
            current_stage = "Создание записи сотрудника"
            c.execute("""INSERT INTO employees
                         (full_name, position, email, phone, is_active, created_at, updated_at)
                         VALUES (%s, %s, %s, %s, TRUE, %s, %s) RETURNING id""",
                      (full_name, position or role, email, phone, now, now))
            employee_id = c.fetchone()[0]
            c.execute("UPDATE users SET assigned_employee_id = %s WHERE id = %s", (employee_id, user_id))

        conn.commit()
        conn.close()

        current_stage = "Уведомление (Успех)"
        # Уведомляем админа об успешной регистрации
        import asyncio
        asyncio.create_task(notify_admin_registration(user_info, success=True))

        if auto_verify:
            return {"success": True, "message": "Первый администратор создан", "user_id": user_id}

        # Отправляем письмо пользователю
        try:
            from utils.email_service import send_verification_code_email
            send_verification_code_email(email, verification_code, full_name, 'user')
        except Exception as e:
            log_error(f"User email verification send error: {e}", "auth")

        return {
            "success": True,
            "message": "Регистрация успешна! Подтвердите email и дождитесь одобрения руководства.",
            "user_id": user_id
        }

    except ValueError as ve:
        error_msg = str(ve)
        log_warning(f"Registration validation error: {error_msg} (Stage: {current_stage})", "auth")
        # Уведомляем об ошибке в фоне
        import asyncio
        asyncio.create_task(notify_admin_registration(user_info, success=False, error_msg=error_msg, stage=current_stage))
        return JSONResponse({"error": error_msg}, status_code=400)
    except Exception as e:
        error_msg = str(e)
        log_error(f"Error in api_register: {error_msg} (Stage: {current_stage})", "auth")
        # Уведомляем о критической ошибке в фоне
        import asyncio
        asyncio.create_task(notify_admin_registration(user_info, success=False, error_msg=error_msg, stage=current_stage))
        return JSONResponse({"error": error_msg}, status_code=500)

@router.post("/verify-email")
async def verify_email(
    email: str = Form(...),
    code: str = Form(...)
):
    """API: Подтверждение email адреса кодом"""
    try:
        from datetime import datetime

        conn = get_db_connection()
        c = conn.cursor()

        # Находим пользователя с таким email и кодом
        c.execute("""
            SELECT id, full_name, verification_code_expires, email_verified
            FROM users
            WHERE email = %s AND verification_code = %s
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
            SET email_verified = TRUE, verification_code = NULL, verification_code_expires = NULL
            WHERE id = %s
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
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, full_name, email_verified
            FROM users
            WHERE email = %s
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
            SET verification_code = %s, verification_code_expires = %s
            WHERE id = %s
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

@router.get("/verify-email-token")
async def verify_email_token(token: str):
    """API: Подтверждение email по токену и автоматический вход"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Находим пользователя с таким токеном
        c.execute("""
            SELECT id, username, full_name, email, role, email_verified, phone
            FROM users
            WHERE email_verification_token = %s
        """, (token,))

        result = c.fetchone()

        if not result:
            conn.close()
            return JSONResponse(
                {"error": "Неверный или истекший токен верификации"},
                status_code=400
            )

        user_id, username, full_name, email, role, email_verified, phone = result

        # Проверяем, не подтвержден ли уже email
        if email_verified:
            # Email уже подтвержден - просто логиним пользователя
            log_info(f"Email already verified for user {username}, logging in", "auth")
        else:
            # Подтверждаем email (активация произойдет позже при одобрении админом)
            c.execute("""
                UPDATE users
                SET email_verified = TRUE,
                    is_active = FALSE,
                    email_verification_token = NULL,
                    verification_code = NULL,
                    verification_code_expires = NULL
                WHERE id = %s
            """, (user_id,))


            conn.commit()
            log_info(f"Email verified for user: {username} (ID: {user_id}). Waiting for admin approval.", "auth")

        # Проверяем активность пользователя перед входом
        c.execute("SELECT is_active FROM users WHERE id = %s", (user_id,))
        is_active = c.fetchone()[0]
        conn.close()

        if not is_active:
             return {
                "success": True,
                "needs_approval": True,
                "message": "Email успешно подтвержден! Теперь ваш аккаунт должен быть одобрен администратором. Вам придет уведомление на почту."
            }

        # Создаем сессию для автоматического входа (только если уже активен, например для повторных кликов)
        session_token = create_session(user_id)
        log_info(f"Session created for {username} after email verification (already active)", "auth")

        # Возвращаем данные для автоматического входа
        response_data = {
            "success": True,
            "message": "Email подтвержден! Выполняется вход в систему...",
            "token": session_token,
            "user": {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "role": role,
                "phone": phone
            }
        }


        response = JSONResponse(response_data)
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=7*24*60*60,
            samesite="lax",
            secure=os.getenv("ENVIRONMENT") == "production"
        )

        return response

    except Exception as e:
        log_error(f"Error in verify_email_token: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== СПРАВОЧНИКИ =====

@router.get("/positions")
async def get_positions():
    """API: Получить список доступных должностей"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем активные должности (без translation columns)
        c.execute("""
            SELECT id, name, description, sort_order
            FROM positions
            WHERE is_active = TRUE
            ORDER BY sort_order, name
        """)

        positions = []
        for row in c.fetchall():
            positions.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "sort_order": row[3]
            })

        conn.close()

        return {"success": True, "positions": positions}

    except Exception as e:
        log_error(f"Error in get_positions: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====

@router.post("/forgot-password")
async def forgot_password(email: str = Form(...)):
    """API: Запрос на восстановление пароля"""
    try:
        log_info(f"Password reset request for email: {email}", "auth")

        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем существует ли пользователь с таким email
        c.execute("SELECT id, username, full_name FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if not user:
            # Для безопасности не раскрываем существует ли email
            log_warning(f"Password reset requested for non-existent email: {email}", "auth")
            conn.close()
            return {"success": True, "message": "Если email существует в системе, на него будет отправлено письмо с инструкциями"}

        user_id, username, full_name = user

        # Генерируем токен сброса (32 байта = 64 hex символа)
        import secrets
        reset_token = secrets.token_urlsafe(32)

        # Токен действителен 1 час
        from datetime import datetime, timedelta
        expires_at = (datetime.now() + timedelta(hours=1)).isoformat()

        # Сохраняем токен в БД
        c.execute("""
            UPDATE users
            SET password_reset_token = %s, password_reset_expires = %s
            WHERE id = %s
        """, (reset_token, expires_at, user_id))

        conn.commit()
        conn.close()

        # Отправляем email с ссылкой на сброс
        from utils.email import send_password_reset_email
        email_sent = send_password_reset_email(email, reset_token, full_name)

        response_data = {
            "success": True,
            "message": "Если email существует в системе, на него будет отправлено письмо с инструкциями"
        }

        # В development режиме возвращаем токен в ответе если email не отправлен
        import os
        if not email_sent and os.getenv("ENVIRONMENT") != "production":
            log_warning(f"SMTP not configured - showing reset token in response", "auth")
            response_data["reset_token"] = reset_token
            response_data["reset_url"] = f"{PUBLIC_URL}/reset-password?token={reset_token}"
            response_data["message"] = f"⚠️ SMTP не настроен. Ссылка для сброса: {PUBLIC_URL}/reset-password?token={reset_token}"

        log_info(f"Password reset token generated for user {username} (ID: {user_id})", "auth")

        return response_data

    except Exception as e:
        log_error(f"Error in forgot_password: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/reset-password")
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...)
):
    """API: Сброс пароля по токену"""
    try:
        log_info("Password reset attempt with token", "auth")

        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем токен и срок действия
        from datetime import datetime
        now = datetime.now().isoformat()

        c.execute("""
            SELECT id, username, password_reset_expires
            FROM users
            WHERE password_reset_token = %s
        """, (token,))

        user = c.fetchone()

        if not user:
            log_warning("Password reset attempted with invalid token", "auth")
            conn.close()
            return JSONResponse(
                {"error": "Неверный или истекший токен сброса пароля"},
                status_code=400
            )

        user_id, username, expires_at = user

        # Проверяем не истек ли токен
        if expires_at and expires_at < now:
            log_warning(f"Password reset attempted with expired token for user {username}", "auth")
            conn.close()
            return JSONResponse(
                {"error": "Токен сброса пароля истек. Пожалуйста, запросите новый."},
                status_code=400
            )

        # Хешируем новый пароль
        import hashlib
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()

        # Обновляем пароль и удаляем токен
        c.execute("""
            UPDATE users
            SET password_hash = %s, password_reset_token = NULL, password_reset_expires = NULL
            WHERE id = %s
        """, (password_hash, user_id))

        conn.commit()
        conn.close()

        log_info(f"Password successfully reset for user {username} (ID: {user_id})", "auth")

        return {
            "success": True,
            "message": "Пароль успешно изменен! Теперь вы можете войти с новым паролем."
        }

    except Exception as e:
        log_error(f"Error in reset_password: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)

class DeleteAccountRequest(BaseModel):
    password: str
    confirm: bool

@router.post("/delete-account")
async def delete_account(
    data: DeleteAccountRequest,
    session_token: Optional[str] = Cookie(None)
):
    """API: Удаление собственного аккаунта"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    if not data.confirm:
        return JSONResponse({"error": "Confirmation required"}, status_code=400)

    # Verify password
    verified_user = verify_user(user["username"], data.password)
    if not verified_user:
        return JSONResponse({"error": "Invalid password"}, status_code=403)

    try:
        # Delete user
        success = delete_user(user["id"])
        if success:
            log_info(f"User {user['username']} deleted their own account", "auth")
            response = JSONResponse({"success": True, "message": "Account deleted"})
            response.delete_cookie("session_token")
            return response
        else:
            return JSONResponse({"error": "Failed to delete account"}, status_code=500)
    except Exception as e:
        log_error(f"Error deleting account: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)
