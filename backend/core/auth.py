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
        
        # Проверка активации
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("SELECT is_active FROM users WHERE id = ?", (user["id"],))
        result = c.fetchone()
        conn.close()
        
        if not result or result[0] == 0:
            log_warning(f"User {username} not activated yet", "auth")
            return JSONResponse(
                {"error": "Ваш аккаунт еще не активирован администратором"}, 
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
    email: str = Form(None)
):
    """API: Регистрация нового пользователя (требуется подтверждение админа)"""
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

        # Проверяем что логин не занят
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        if c.fetchone():
            conn.close()
            return JSONResponse(
                {"error": "Пользователь с таким логином уже существует"},
                status_code=400
            )

        # Создаём пользователя с is_active = 0 (неактивен, ждёт подтверждения)
        import hashlib
        from datetime import datetime

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        now = datetime.now().isoformat()

        c.execute("""INSERT INTO users
                     (username, password_hash, full_name, email, role, created_at, is_active)
                     VALUES (?, ?, ?, ?, 'employee', ?, 0)""",
                  (username, password_hash, full_name, email, now))

        conn.commit()
        user_id = c.lastrowid
        conn.close()

        log_info(f"New registration: {username} (ID: {user_id}), pending approval", "auth")

        return {
            "success": True,
            "message": "Регистрация успешна! Ожидайте подтверждения администратора.",
            "user_id": user_id
        }

    except sqlite3.IntegrityError:
        log_error(f"Registration failed: username {username} already exists", "auth")
        return JSONResponse(
            {"error": "Пользователь с таким логином уже существует"},
            status_code=400
        )
    except Exception as e:
        log_error(f"Error in api_register: {e}", "auth")
        return JSONResponse({"error": str(e)}, status_code=500)


