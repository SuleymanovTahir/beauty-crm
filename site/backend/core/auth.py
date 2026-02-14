# backend/auth.py
"""
API Endpoints для авторизации и админ-панели
"""
from fastapi import APIRouter, Form, Cookie, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
import psycopg2
import threading
import time
from collections import deque

from core.config import DATABASE_NAME, PUBLIC_URL
from db.connection import get_db_connection
from db.users import verify_user, create_session, delete_session
from utils.logger import log_info, log_error, log_warning
from utils.utils import require_auth, validate_password
import httpx
import os

router = APIRouter(tags=["Auth"])

# ===== LOGIN RATE LIMITING =====
_LOGIN_WINDOW_SECONDS = 10 * 60
_LOGIN_BLOCK_SECONDS = 15 * 60
_LOGIN_MAX_ATTEMPTS = 8
_LOGIN_RATE_LOCK = threading.Lock()
_LOGIN_RATE_STATE = {}  # {key: {"attempts": deque([ts]), "blocked_until": float}}


def _cleanup_login_attempts(state: dict, now: float):
    attempts = state["attempts"]
    while attempts and (now - attempts[0]) > _LOGIN_WINDOW_SECONDS:
        attempts.popleft()


def _get_login_block_remaining(key: str) -> int:
    now = time.time()
    with _LOGIN_RATE_LOCK:
        state = _LOGIN_RATE_STATE.get(key)
        if not state:
            return 0

        _cleanup_login_attempts(state, now)
        blocked_until = state.get("blocked_until", 0)
        if blocked_until and blocked_until > now:
            return int(blocked_until - now) + 1

        if not state["attempts"]:
            _LOGIN_RATE_STATE.pop(key, None)
        else:
            state["blocked_until"] = 0
        return 0


def _register_login_failure(key: str):
    now = time.time()
    with _LOGIN_RATE_LOCK:
        state = _LOGIN_RATE_STATE.setdefault(
            key,
            {"attempts": deque(), "blocked_until": 0},
        )
        _cleanup_login_attempts(state, now)
        state["attempts"].append(now)
        if len(state["attempts"]) >= _LOGIN_MAX_ATTEMPTS:
            state["attempts"].clear()
            state["blocked_until"] = now + _LOGIN_BLOCK_SECONDS


def _clear_login_limit(key: str):
    with _LOGIN_RATE_LOCK:
        _LOGIN_RATE_STATE.pop(key, None)


def _cookie_secure_flag() -> bool:
    use_ssl = os.getenv("USE_SSL", "false").lower() == "true"
    base_url = os.getenv("BASE_URL", "")
    return base_url.startswith("https://") or use_ssl or os.getenv("ENVIRONMENT") == "production"


_ALLOWED_BUSINESS_TYPES = {
    "beauty",
    "restaurant",
    "construction",
    "factory",
    "taxi",
    "delivery",
    "other",
}
_ALLOWED_PRODUCT_MODES = {"crm", "site", "both"}


def _normalize_business_type(raw_value: Optional[str]) -> str:
    value = (raw_value or "").strip().lower()
    if value in _ALLOWED_BUSINESS_TYPES:
        return value
    return "beauty"


def _normalize_product_mode(raw_value: Optional[str]) -> str:
    value = (raw_value or "").strip().lower()
    if value in _ALLOWED_PRODUCT_MODES:
        return value
    return "both"


def _product_mode_to_flags(product_mode: str) -> tuple[bool, bool]:
    if product_mode == "crm":
        return True, False
    if product_mode == "site":
        return False, True
    return True, True

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
    try:
        # Детальное логирование для отладки мобильных устройств
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        origin = request.headers.get("origin", "unknown")
        referer = request.headers.get("referer", "unknown")
        username_clean = username.strip().lower()

        ip_key = f"login_ip:{client_ip}"
        user_key = f"login_user:{username_clean}"
        ip_block = _get_login_block_remaining(ip_key)
        user_block = _get_login_block_remaining(user_key)
        block_seconds = max(ip_block, user_block)
        if block_seconds > 0:
            log_warning(
                f"[LOGIN] Rate limited for '{username_clean}' from {client_ip} ({block_seconds}s)",
                "auth",
            )
            return JSONResponse(
                {
                    "error": "too_many_attempts",
                    "message": "Too many login attempts. Please try again later.",
                    "retry_after_seconds": block_seconds,
                },
                status_code=429,
                headers={"Retry-After": str(block_seconds)},
            )

        log_info(f"[LOGIN] Attempt: username='{username}' | IP={client_ip} | Origin={origin}", "auth")
        log_info(f"[LOGIN] User-Agent: {user_agent[:100]}...", "auth")

        user = verify_user(username_clean, password)

        if not user:
            _register_login_failure(ip_key)
            _register_login_failure(user_key)
            log_warning(f"Invalid credentials for '{username}' (cleaned: '{username_clean}')", "auth")
            return JSONResponse(
                {"error": "invalid_credentials"},
                status_code=401
            )

        # Проверяем, не ожидает ли аккаунт подтверждения
        if user.get("status") == "inactive":
            log_warning(f"User '{username}' account pending approval", "auth")
            return JSONResponse({
                "error": "account_not_activated",
                "message": "registration_pending"
            }, status_code=403)

        # ALWAYS create new session for each login to prevent cross-device logout issues
        session_token = create_session(user["id"])
        log_info(f"New unique session created for {username}", "auth")
        _clear_login_limit(ip_key)
        _clear_login_limit(user_key)
        
        response_data = {
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user["role"],
                "secondary_role": user.get("secondary_role"),
                "phone": user.get("phone")
            }
        }
        
        response = JSONResponse(response_data)

        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True, 
            max_age=7*24*60*60, # 7 days
            samesite="lax",
            secure=_cookie_secure_flag(),
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
        response.delete_cookie("session_token", path="/")
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
                "secondary_role": user[9] if user and len(user) > 9 else None,
                "phone": phone
            }
        })
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=7*24*60*60,
            samesite="lax",
            secure=_cookie_secure_flag(),
            path="/",
        )
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
    privacy_accepted: bool = Form(False),
    captcha_token: str = Form(None),
    preferred_language: str = Form("en")
):
    """API: Регистрация клиента (упрощенная)"""
    import os
    import httpx

    # Проверка hCaptcha (если включена)
    hcaptcha_secret = os.getenv('HCAPTCHA_SECRET_KEY')
    if hcaptcha_secret and hcaptcha_secret != '0x0000000000000000000000000000000000000000':
        if not captcha_token:
            return JSONResponse(
                {"error": "error_captcha_required"},
                status_code=400
            )
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://hcaptcha.com/siteverify',
                    data={
                        'secret': hcaptcha_secret,
                        'response': captcha_token
                    }
                )
                result = response.json()
                if not result.get('success'):
                    log_warning(f"hCaptcha verification failed for {email}: {result}", "auth")
                    return JSONResponse(
                        {"error": "error_captcha_failed"},
                        status_code=400
                    )
        except Exception as e:
            log_error(f"hCaptcha verification error: {e}", "auth")
            # В случае ошибки сети - пропускаем проверку, чтобы не блокировать регистрацию

    return await api_register(
        username=username,
        password=password,
        full_name=full_name,
        email=email,
        role="client",
        position="Клиент",
        phone=phone,
        privacy_accepted=privacy_accepted,
        preferred_language=preferred_language
    )

@router.post("/register/employee")
async def register_employee_api(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form("employee"),
    phone: str = Form(""),
    business_type: str = Form("beauty"),
    product_mode: str = Form("both"),
    privacy_accepted: bool = Form(False),
    newsletter_subscribed: bool = Form(True),
    captcha_token: str = Form(None),
    preferred_language: str = Form("en")
):
    """API: Регистрация сотрудника (с выбором роли)"""
    from db.newsletter import add_subscriber
    import os
    import httpx

    # Проверка hCaptcha (если включена)
    hcaptcha_secret = os.getenv('HCAPTCHA_SECRET_KEY')
    if hcaptcha_secret and hcaptcha_secret != '0x0000000000000000000000000000000000000000':
        if not captcha_token:
            return JSONResponse(
                {"error": "error_captcha_required"},
                status_code=400
            )
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://hcaptcha.com/siteverify',
                    data={
                        'secret': hcaptcha_secret,
                        'response': captcha_token
                    }
                )
                result = response.json()
                if not result.get('success'):
                    log_warning(f"hCaptcha verification failed for {email}: {result}", "auth")
                    return JSONResponse(
                        {"error": "error_captcha_failed"},
                        status_code=400
                    )
        except Exception as e:
            log_error(f"hCaptcha verification error: {e}", "auth")
            # В случае ошибки сети - пропускаем проверку, чтобы не блокировать регистрацию

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

    # Подписка на рассылку
    if newsletter_subscribed and email:
        try:
            add_subscriber(email, source='registration')
        except Exception as e:
            log_error(f"Failed to subscribe {email} to newsletter: {e}", "auth")

    return await api_register(
        username=username,
        password=password,
        full_name=full_name,
        email=email,
        role=role,
        position="",
        phone=phone,
        business_type=business_type,
        product_mode=product_mode,
        privacy_accepted=privacy_accepted,
        preferred_language=preferred_language
    )


async def notify_admin_registration(user_data: dict, success: bool = True, error_msg: str = None, stage: str = None):
    """
    Уведомить администратора о новой регистрации или ошибке при регистрации
    """
    from utils.email_service import send_admin_notification_email
    import os

    _ = error_msg
    _ = stage

    # Site runtime keeps admin notifications via email only.
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
    business_type: str = Form("beauty"),
    product_mode: str = Form("both"),
    privacy_accepted: bool = Form(False),
    newsletter_subscribed: bool = Form(True),
    preferred_language: str = Form("en")
):
    """API: Регистрация нового пользователя (базовый метод)"""
    normalized_business_type = _normalize_business_type(business_type)
    normalized_product_mode = _normalize_product_mode(product_mode)
    crm_enabled, site_enabled = _product_mode_to_flags(normalized_product_mode)

    user_info = {
        'username': username,
        'email': email,
        'full_name': full_name,
        'role': role,
        'position': position,
        'phone': phone,
        'business_type': normalized_business_type,
        'product_mode': normalized_product_mode,
        'preferred_language': preferred_language
    }
    
    current_stage = "Validation"
    try:
        # Собираем ВСЕ ошибки валидации сразу
        validation_errors = []

        # Логин - только латинские буквы, цифры, точки, подчеркивания
        import re
        if not re.match(r'^[a-zA-Z0-9._]+$', username):
            validation_errors.append("error_login_invalid_chars")
        elif len(username) < 3:
            validation_errors.append("error_login_too_short")

        is_valid_pwd, pwd_errors = validate_password(password)
        if not is_valid_pwd:
            validation_errors.extend(pwd_errors)

        if not full_name or len(full_name) < 2:
            validation_errors.append("error_name_too_short")

        if not email or '@' not in email:
            validation_errors.append("error_invalid_email")

        current_stage = "DB Existence Check"
        # Проверяем что логин и email не заняты
        # Исключаем неподтверждённых пользователей с истёкшим кодом - их данные "освобождаются"
        conn = get_db_connection()
        c = conn.cursor()

        # Сначала удаляем "мёртвые" регистрации с этими данными (неподтверждённые с истёкшим кодом)
        c.execute("""
            DELETE FROM users
            WHERE (LOWER(username) = LOWER(%s) OR LOWER(email) = LOWER(%s))
            AND email_verified = FALSE
            AND verification_code_expires IS NOT NULL
            AND verification_code_expires < NOW()
        """, (username, email))
        conn.commit()

        # Теперь проверяем уникальность (исключая неподтверждённых с истёкшим кодом)
        c.execute("""
            SELECT id FROM users
            WHERE LOWER(username) = LOWER(%s)
            AND NOT (email_verified = FALSE AND verification_code_expires IS NOT NULL AND verification_code_expires < NOW())
        """, (username,))
        if c.fetchone():
            validation_errors.append("error_username_exists")

        c.execute("""
            SELECT id FROM users
            WHERE LOWER(email) = LOWER(%s)
            AND NOT (email_verified = FALSE AND verification_code_expires IS NOT NULL AND verification_code_expires < NOW())
        """, (email,))
        if c.fetchone():
            validation_errors.append("error_email_exists")

        # Проверяем что телефон не занят (если указан)
        if phone and phone.strip():
            # Очищаем телефон от всех символов кроме цифр для сравнения
            phone_digits = re.sub(r'\D', '', phone)
            if len(phone_digits) >= 10:
                # Удаляем "мёртвые" регистрации с этим телефоном
                c.execute("""
                    DELETE FROM users
                    WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = %s
                    AND phone IS NOT NULL AND phone != ''
                    AND email_verified = FALSE
                    AND verification_code_expires IS NOT NULL
                    AND verification_code_expires < NOW()
                """, (phone_digits,))
                conn.commit()

                c.execute("""
                    SELECT id FROM users
                    WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = %s
                    AND phone IS NOT NULL AND phone != ''
                    AND NOT (email_verified = FALSE AND verification_code_expires IS NOT NULL AND verification_code_expires < NOW())
                """, (phone_digits,))
                if c.fetchone():
                    validation_errors.append("error_phone_exists")

        # Если есть ошибки валидации - возвращаем их все сразу
        if validation_errors:
            conn.close()
            raise ValueError(",".join(validation_errors))

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

        # Клиенты активируются автоматически, сотрудникам нужно подтверждение админа
        auto_activate = is_first_admin or (role == 'client')
        auto_verify = is_first_admin  # Email verification всё равно нужен

        current_stage = "Сохранение пользователя"
        c.execute("""INSERT INTO users
                     (username, password_hash, full_name, email, phone, role, position, created_at,
                      is_active, email_verified, verification_code, verification_code_expires,
                      email_verification_token, privacy_accepted, privacy_accepted_at, preferred_language)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                  (username, password_hash, full_name, email, phone, role, position, now,
                   auto_activate,  # Клиенты активируются сразу, сотрудники ждут одобрения
                   True if auto_verify else False,
                   verification_code, code_expires,
                   verification_token,
                   int(privacy_accepted), now if privacy_accepted else None,
                   preferred_language))

        user_id = c.fetchone()[0]

        # Если это клиент - создаем запись в clients
        if role == 'client':
            current_stage = "Создание записи клиента"
            # Используем user_{id} как instagram_id для зарегистрированных клиентов
            client_id = f"user_{user_id}"
            c.execute("""INSERT INTO clients
                         (instagram_id, username, name, email, phone, status, source, user_id, created_at, updated_at)
                         VALUES (%s, %s, %s, %s, %s, 'new', 'registration', %s, %s, %s)
                         ON CONFLICT (instagram_id) DO NOTHING""",
                      (client_id, username, full_name, email, phone, user_id, now, now))

        current_stage = "Применение профиля бизнеса"
        c.execute("""
            UPDATE salon_settings
            SET business_type = %s,
                product_mode = %s,
                crm_enabled = %s,
                custom_settings = jsonb_set(
                    COALESCE(custom_settings, '{}'::jsonb),
                    '{business_profile_config}',
                    COALESCE(custom_settings -> 'business_profile_config', '{"schema_version": 1}'::jsonb),
                    TRUE
                ),
                site_enabled = %s,
                updated_at = NOW()
            WHERE id = 1
              AND (
                    business_type IS NULL
                    OR TRIM(business_type) = ''
                    OR (business_type = 'beauty' AND COALESCE(product_mode, 'both') = 'both')
                  )
        """, (normalized_business_type, normalized_product_mode, crm_enabled, site_enabled))

        conn.commit()
        conn.close()

        current_stage = "Уведомление (Успех)"
        # Уведомляем админа об успешной регистрации
        import asyncio
        asyncio.create_task(notify_admin_registration(user_info, success=True))

        # Уведомляем админов/директоров о новой регистрации (in-app уведомление)
        try:
            from notifications.admin_notifications import notify_new_registration_pending
            notify_new_registration_pending(full_name, email, role)
        except Exception as e:
            log_error(f"Failed to send admin in-app notification: {e}", "auth")

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
        if code_expires:
            # Если code_expires это строка - конвертируем в datetime
            if isinstance(code_expires, str):
                code_expires = datetime.fromisoformat(code_expires)
            if datetime.now() > code_expires:
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

        # Уведомляем админов что пользователь подтвердил email
        try:
            from notifications.admin_notifications import notify_email_verified
            notify_email_verified(full_name, email)
        except Exception as e:
            log_error(f"Failed to send admin notification: {e}", "auth")

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
            secure=_cookie_secure_flag(),
            path="/"
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
async def forgot_password(email: str = Form(...), background_tasks: BackgroundTasks = None):
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

        # Отправляем email в фоне для быстрого ответа
        from utils.email import send_password_reset_email
        if background_tasks:
            background_tasks.add_task(send_password_reset_email, email, reset_token, full_name)
            email_sent = True  # Assume it will be sent
        else:
            email_sent = send_password_reset_email(email, reset_token, full_name)

        response_data = {
            "success": True,
            "message": "Если email существует в системе, на него будет отправлено письмо с инструкциями"
        }

        # В development режиме возвращаем токен в ответе
        import os
        if os.getenv("ENVIRONMENT") != "production":
            log_warning(f"Development mode - showing reset token in response", "auth")
            response_data["reset_token"] = reset_token
            response_data["reset_url"] = f"{PUBLIC_URL}/reset-password?token={reset_token}"

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
