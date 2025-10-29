# backend/auth.py
"""
API Endpoints для авторизации и админ-панели
"""
from fastapi import APIRouter, Request, Form, Cookie, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from typing import Optional
import sqlite3
import hashlib
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from db import (
    verify_user, create_session, delete_session, get_user_by_email,
    create_password_reset_token, verify_reset_token, reset_user_password,
    mark_reset_token_used, get_user_by_session
)
from db.settings import get_salon_settings
from config import DATABASE_NAME, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL
from logger import log_info, log_error, log_warning
from utils import require_auth

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





