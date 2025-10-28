# backend/auth.py
"""
API Endpoints для авторизации и админ-панели
"""
from fastapi import APIRouter, Request, Form, Cookie, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
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
templates = Jinja2Templates(directory="templates")


# ===== MIDDLEWARE =====

def get_current_user_or_redirect(session_token: Optional[str] = Cookie(None)):
    """Получить пользователя или редирект на логин"""
    user = require_auth(session_token)
    if not user:
        return None
    return user


# ===== АВТОРИЗАЦИЯ =====

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str = None, success: str = None):
    """Страница входа"""
    try:
        salon = get_salon_settings()
        return templates.TemplateResponse("admin/login.html", {
            "request": request,
            "salon": salon,
            "error": error,
            "success": success
        })
    except Exception as e:
        log_error(f"Ошибка в login_page: {e}", "auth")
        raise


@router.post("/api/login")
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

@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Страница регистрации"""
    try:
        salon = get_salon_settings()
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon": salon
        })
    except Exception as e:
        log_error(f"Ошибка в register_page: {e}", "auth")
        raise


@router.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(None),
    role: str = Form("employee")
):
    """Регистрация нового пользователя"""
    salon = get_salon_settings()
    
    try:
        # Валидация
        if len(username) < 3:
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Логин должен быть минимум 3 символа"
            })
        
        if len(password) < 6:
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Пароль должен быть минимум 6 символов"
            })
        
        if not full_name or len(full_name.strip()) < 2:
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Полное имя должно быть минимум 2 символа"
            })
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        now = datetime.now().isoformat()
        
        try:
            c.execute("""INSERT INTO users 
                         (username, password_hash, full_name, email, role, created_at, is_active)
                         VALUES (?, ?, ?, ?, ?, ?, 0)""",
                      (username, password_hash, full_name, email, role, now))
            conn.commit()
            user_id = c.lastrowid
            conn.close()
            
            log_info(f"✅ Пользователь {username} создан (ID: {user_id}), ожидает подтверждения", "auth")
            
            return RedirectResponse(
                url="/login?success=Регистрация отправлена! Ожидайте подтверждения администратора", 
                status_code=302
            )
        except sqlite3.IntegrityError:
            conn.close()
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Пользователь с таким именем уже существует"
            })
            
    except Exception as e:
        log_error(f"Ошибка при регистрации: {e}", "auth")
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon": salon,
            "error": f"Ошибка сервера: {str(e)}"
        })


# ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====

@router.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    """Страница восстановления пароля"""
    try:
        salon = get_salon_settings()
        return templates.TemplateResponse("admin/forgot_password.html", {
            "request": request,
            "salon": salon
        })
    except Exception as e:
        log_error(f"Ошибка в forgot_password_page: {e}", "auth")
        raise


@router.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    """Обработка восстановления пароля"""
    salon = get_salon_settings()
    
    try:
        log_info(f"Запрос на восстановление пароля для {email}", "auth")
        user = get_user_by_email(email)

        if not user:
            log_warning(f"Email {email} не найден", "auth")
            return templates.TemplateResponse("admin/forgot_password.html", {
                "request": request,
                "salon": salon,
                "success": "Если email существует в системе, инструкции отправлены на почту"
            })

        token = create_password_reset_token(user["id"])
        reset_link = f"https://mlediamant.com/reset-password?token={token}"

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Восстановление пароля - {salon['name']} CRM"
            msg['From'] = FROM_EMAIL
            msg['To'] = email

            text = f"""
Здравствуйте, {user['full_name']}!

Вы запросили восстановление пароля для CRM системы {salon['name']}.

Для сброса пароля перейдите по ссылке:
{reset_link}

Ссылка действительна 1 час.

Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.

---
{salon['name']}
{salon['address']}
            """

            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #667eea;">Восстановление пароля</h2>
                  <p>Здравствуйте, <strong>{user['full_name']}</strong>!</p>
                  <p>Вы запросили восстановление пароля для CRM системы {salon['name']}.</p>
                  <p>Для сброса пароля нажмите на кнопку ниже:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Сбросить пароль</a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Ссылка действительна 1 час.</p>
                  <p style="font-size: 12px; color: #666;">Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="font-size: 12px; color: #999;">
                    {salon['name']}<br>
                    {salon['address']}
                  </p>
                </div>
              </body>
            </html>
            """

            part1 = MIMEText(text, 'plain', 'utf-8')
            part2 = MIMEText(html, 'html', 'utf-8')

            msg.attach(part1)
            msg.attach(part2)

            context = ssl.create_default_context()
            
            log_info(f"📧 Попытка отправить email на {email}...", "email")
            
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)

            log_info(f"✅ Email успешно отправлен на {email}", "email")
            
        except Exception as e:
            log_error(f"❌ Ошибка отправки email: {e}", "email")

        return templates.TemplateResponse("admin/forgot_password.html", {
            "request": request,
            "salon": salon,
            "success": "Если email существует в системе, инструкции отправлены на почту"
        })
    except Exception as e:
        log_error(f"Ошибка в forgot_password: {e}", "auth")
        raise


@router.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(request: Request, token: str):
    """Страница сброса пароля"""
    salon = get_salon_settings()
    
    try:
        user_id = verify_reset_token(token)

        if not user_id:
            log_warning("Недействительный токен для сброса пароля", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "error": "Недействительная или истёкшая ссылка"
            })

        return templates.TemplateResponse("admin/reset_password.html", {
            "request": request,
            "salon": salon,
            "token": token
        })
    except Exception as e:
        log_error(f"Ошибка в reset_password_page: {e}", "auth")
        raise


@router.post("/reset-password")
async def reset_password(
    request: Request,
    token: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    """Обработка сброса пароля"""
    salon = get_salon_settings()
    
    try:
        if password != confirm_password:
            log_warning("Пароли не совпадают", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "token": token,
                "error": "Пароли не совпадают"
            })

        if len(password) < 6:
            log_warning("Пароль слишком короткий", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "token": token,
                "error": "Пароль должен быть минимум 6 символов"
            })

        user_id = verify_reset_token(token)

        if not user_id:
            log_warning("Недействительный токен при сбросе пароля", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "error": "Недействительная или истёкшая ссылка"
            })

        success = reset_user_password(user_id, password)
        
        if success:
            mark_reset_token_used(token)
            log_info(f"Пароль успешно сброшен для пользователя {user_id}", "auth")
            return RedirectResponse(url="/login?success=Пароль успешно изменён", status_code=302)
        else:
            log_error(f"Ошибка сброса пароля для пользователя {user_id}", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "token": token,
                "error": "Ошибка при сбросе пароля. Попробуйте позже."
            })
    except Exception as e:
        log_error(f"Ошибка в reset_password: {e}", "auth")
        raise