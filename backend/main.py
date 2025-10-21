from fastapi import FastAPI, Request, Form, Cookie, Query, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback
from typing import Optional
import time
import os
import sqlite3

# ===== ИМПОРТ ЦЕНТРАЛИЗОВАННОГО ЛОГГЕРА =====
from logger import logger, log_info, log_error, log_warning, log_critical

# ===== ИМПОРТЫ КОНФИГУРАЦИИ =====
from config import VERIFY_TOKEN, SALON_INFO

# ===== ИМПОРТЫ DATABASE =====
from database import (
    init_database, get_or_create_client, save_message,
    get_chat_history, get_booking_progress, update_booking_progress,
    clear_booking_progress, save_booking, get_stats,
    verify_user, create_session, delete_session, create_user,
    get_all_clients, get_all_bookings, get_analytics_data, 
    get_funnel_data, update_booking_status, get_client_by_id,
    update_client_info, get_all_services, DATABASE_NAME, log_activity
)

# ===== ИМПОРТЫ BOT =====
from bot import ask_gemini, build_genius_prompt, extract_booking_info, is_booking_complete

# ===== ИМПОРТЫ INSTAGRAM =====
from instagram import send_message, send_typing_indicator

# ===== ИМПОРТЫ ADMIN =====
from admin import router as admin_router, get_client_display_name


# ===== ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ДИРЕКТОРИЙ =====
def ensure_upload_directories():
    """Создать все необходимые директории для загрузок"""
    directories = [
        "static/uploads/images",
        "static/uploads/files",
        "static/uploads/voice",
        "logs"
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    log_info(f"✅ Созданы директории: {', '.join(directories)}", "startup")


# Создаём директории сразу при импорте
ensure_upload_directories()


# ===== ИНИЦИАЛИЗАЦИЯ FASTAPI =====
app = FastAPI(title=f"💎 {SALON_INFO['name']} CRM")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message: {data}")


# Подключаем статику и шаблоны
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Подключить админ-панель
app.include_router(admin_router)


# ===== MIDDLEWARE CORS (для React) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mlediamant.com",
        "http://localhost:5173",      # React dev
        "http://127.0.0.1:5173",      # React dev
        "http://localhost:3000",      # Alternative React port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "mlediamant.com", 
        "*.mlediamant.com",
        "localhost",
        "127.0.0.1",
        "127.0.0.1:8000"
    ]
)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ===== MIDDLEWARE ДЛЯ ЛОГИРОВАНИЯ (ОПТИМИЗИРОВАННЫЙ) =====
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Игнорируем статику
    if request.url.path.startswith("/static"):
        return await call_next(request)
    
    start_time = time.time()
    log_info(f"🔥 {request.method} {request.url.path}", "middleware")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        log_info(f"📤 {request.method} {request.url.path} → {response.status_code} ({process_time:.2f}s)", "middleware")
        return response
    except Exception as e:
        log_error(f"❌ ОШИБКА: {request.method} {request.url.path}", "middleware", exc_info=True)
        raise


# ===== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК =====
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ловит ВСЕ необработанные ошибки"""
    log_critical(f"❌ НЕОБРАБОТАННАЯ ОШИБКА: {exc}", "exception_handler")
    log_error(f"📍 URL: {request.url}", "exception_handler")
    log_error(f"📋 Traceback:\n{traceback.format_exc()}", "exception_handler")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "url": str(request.url)
        }
    )


# ===== ОТЛАДКА: Показать все роуты =====
@app.on_event("startup")
async def show_routes():
    log_info("=" * 70, "startup")
    log_info("📋 Зарегистрированные роуты:", "startup")
    for route in app.routes:
        if hasattr(route, 'path'):
            methods = route.methods if hasattr(route, 'methods') else 'MOUNT'
            log_info(f"   {methods} {route.path}", "startup")
    log_info("=" * 70, "startup")


# ===== АВТОРИЗАЦИЯ =====
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str = None):
    """Страница входа"""
    try:
        log_info("Открыта страница логина", "auth")
        return templates.TemplateResponse("admin/login.html", {
            "request": request,
            "salon_info": SALON_INFO,
            "error": error
        })
    except Exception as e:
        log_error(f"Ошибка в login_page: {e}", "auth", exc_info=True)
        raise


@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    """Обработка входа"""
    try:
        log_info(f"Попытка входа: {username}", "auth")
        user = verify_user(username, password)

        if not user:
            log_warning(f"Неверный логин/пароль для {username}", "auth")
            return RedirectResponse(url="/login?error=Неверный+логин+или+пароль", status_code=302)

        session_token = create_session(user["id"])
        log_info(f"Создана сессия для пользователя {username}", "auth")

        response = RedirectResponse(url="/admin", status_code=302)
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=7*24*60*60,
            samesite="lax"
        )

        return response
    
    except Exception as e:
        log_error(f"❌ Ошибка при входе: {e}", "auth", exc_info=True)
        return RedirectResponse(url="/login?error=Произошла+ошибка.+Попробуйте+снова", status_code=302)


@app.get("/logout")
async def logout(session_token: Optional[str] = Cookie(None)):
    """Выход из системы"""
    try:
        if session_token:
            delete_session(session_token)
            log_info("Пользователь вышел из системы", "auth")

        response = RedirectResponse(url="/login", status_code=302)
        response.delete_cookie("session_token")
        return response
    except Exception as e:
        log_error(f"Ошибка при выходе: {e}", "auth", exc_info=True)
        raise


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Страница регистрации"""
    try:
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon_info": SALON_INFO
        })
    except Exception as e:
        log_error(f"Ошибка в register_page: {e}", "auth", exc_info=True)
        raise


@app.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(None),
    role: str = Form("employee")
):
    """Регистрация нового пользователя"""
    try:
        # Валидация
        if len(username) < 3:
            log_warning(f"Логин слишком короткий: {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Логин должен быть минимум 3 символа"
            })
        
        if len(password) < 6:
            log_warning(f"Пароль слишком короткий для {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Пароль должен быть минимум 6 символов"
            })
        
        if not full_name or len(full_name.strip()) < 2:
            log_warning(f"Имя слишком короткое для {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Полное имя должно быть минимум 2 символа"
            })
        
        log_info(f"Регистрация нового пользователя: {username}", "auth")
        user_id = create_user(username, password, full_name, email, role)

        if not user_id:
            log_warning(f"Пользователь {username} уже существует", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Пользователь с таким именем уже существует"
            })

        log_info(f"✅ Пользователь {username} успешно создан (ID: {user_id})", "auth")
        return RedirectResponse(url="/login?success=Аккаунт создан! Можете войти", status_code=302)
    except Exception as e:
        log_error(f"Ошибка при регистрации: {e}", "auth", exc_info=True)
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon_info": SALON_INFO,
            "error": f"Ошибка сервера: {str(e)}"
        })


# ===== ВЕБХУКИ =====
@app.get("/webhook")
async def verify_webhook(request: Request):
    """Верификация webhook от Meta"""
    try:
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        if mode == "subscribe" and token == VERIFY_TOKEN:
            log_info("✅ Webhook верифицирован!", "webhook")
            return int(challenge)

        log_warning("❌ Ошибка верификации webhook", "webhook")
        return JSONResponse({"error": "Verification failed"}, status_code=403)
    except Exception as e:
        log_error(f"Ошибка в verify_webhook: {e}", "webhook", exc_info=True)
        raise


from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/webhook")
@limiter.limit("10/minute")
async def handle_webhook(request: Request):
    """Обработка входящих сообщений от Instagram"""
    try:
        data = await request.json()
        log_info("=" * 70, "webhook")
        log_info("📨 НОВОЕ СООБЩЕНИЕ", "webhook")
        log_info("=" * 70, "webhook")

        if data.get("object") == "instagram":
            for entry in data.get("entry", []):
                for messaging in entry.get("messaging", []):
                    sender_id = messaging.get("sender", {}).get("id")

                    if "message" in messaging:
                        if messaging["message"].get("is_echo"):
                            continue

                        message_text = messaging["message"].get("text", "")
                        if not message_text.strip():
                            continue

                        log_info(f"👤 От клиента: {sender_id}", "webhook")
                        log_info(f"💬 Текст: {message_text}", "webhook")

                        get_or_create_client(sender_id)
                        save_message(sender_id, message_text, "client")
                        await send_typing_indicator(sender_id)

                        history = get_chat_history(sender_id, limit=10)
                        progress = get_booking_progress(sender_id)
                        genius_prompt = build_genius_prompt(sender_id, history, progress)

                        log_info("🤖 Спрашиваю Gemini AI...", "webhook")
                        ai_response = await ask_gemini(message_text, genius_prompt)
                        log_info(f"✅ Ответ AI: {ai_response[:150]}...", "webhook")

                        updated_progress = extract_booking_info(message_text, progress)

                        if updated_progress and updated_progress != progress:
                            update_booking_progress(sender_id, updated_progress)
                            log_info(f"📝 Обновлён прогресс: {updated_progress}", "webhook")

                        if "BOOKING_READY" in ai_response and updated_progress:
                            if is_booking_complete(updated_progress):
                                log_info("🎉 Запись завершена!", "webhook")
                                
                                datetime_str = f"{updated_progress.get('date', 'не указано')} {updated_progress.get('time', 'не указано')}"
                                save_booking(
                                    sender_id,
                                    updated_progress.get('service_name', 'не указано'),
                                    datetime_str,
                                    updated_progress.get('phone', 'не указано'),
                                    updated_progress.get('name', 'не указано')
                                )

                                clear_booking_progress(sender_id)

                                confirmation = f"""✨ Потрясающе! Вы записаны! 

📅 {updated_progress.get('date')} в {updated_progress.get('time')}
💅 {updated_progress.get('service_name')}
👤 {updated_progress.get('name')}
📞 {updated_progress.get('phone')}

Ждём вас в {SALON_INFO['name']}! 😊
{SALON_INFO['address']}"""

                                save_message(sender_id, confirmation, "bot")
                                await send_message(sender_id, confirmation)
                            else:
                                clean_response = ai_response.replace("BOOKING_READY", "").strip()
                                save_message(sender_id, clean_response, "bot")
                                await send_message(sender_id, clean_response)
                        else:
                            save_message(sender_id, ai_response, "bot")
                            await send_message(sender_id, ai_response)

                        log_info("📤 Отправлено клиенту!", "webhook")

        log_info("=" * 70, "webhook")
        return {"status": "ok"}
    except Exception as e:
        log_error(f"❌ Ошибка в handle_webhook: {e}", "webhook", exc_info=True)
        raise


# ===== СТРАНИЦЫ =====
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Главная страница"""
    try:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "title": "Онлайн-запись",
            "salon_info": SALON_INFO
        })
    except Exception as e:
        log_error(f"Ошибка в index: {e}", "api", exc_info=True)
        raise


@app.post("/book", response_class=HTMLResponse)
async def book(request: Request, name: str = Form(...), phone: str = Form(...), service: str = Form(...)):
    """Обработка формы записи"""
    try:
        log_info(f"📘 Новая запись: {name} — {phone} — {service}", "booking")
        return templates.TemplateResponse(
            "success.html",
            {
                "request": request,
                "title": "Запись успешно отправлена",
                "name": name,
                "service": service,
                "salon_info": SALON_INFO
            },
        )
    except Exception as e:
        log_error(f"Ошибка в book: {e}", "booking", exc_info=True)
        raise


@app.get("/api")
async def root():
    """Главная страница API"""
    return {
        "status": "✅ CRM работает!",
        "salon": SALON_INFO['name'],
        "bot": SALON_INFO['bot_name'],
        "version": "2.0.0",
        "features": [
            "AI-гений продаж (Gemini 2.5 Flash)",
            "Автоматическая запись клиентов",
            "Полноценная CRM с дашбордом",
            "Воронка продаж с аналитикой",
            "История диалогов",
            "Графики и отчеты",
            "Многоязычность (RU/EN/AR)"
        ]
    }


@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    """Страница восстановления пароля"""
    try:
        return templates.TemplateResponse("admin/forgot_password.html", {
            "request": request,
            "salon_info": SALON_INFO
        })
    except Exception as e:
        log_error(f"Ошибка в forgot_password_page: {e}", "auth", exc_info=True)
        raise


@app.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    """Обработка восстановления пароля"""
    try:
        from database import get_user_by_email, create_password_reset_token
        from config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL
        import ssl

        log_info(f"Запрос на восстановление пароля для {email}", "auth")
        user = get_user_by_email(email)

        if not user:
            log_warning(f"Email {email} не найден", "auth")
            return templates.TemplateResponse("admin/forgot_password.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "success": "Если email существует в системе, инструкции отправлены на почту"
            })

        token = create_password_reset_token(user["id"])
        reset_link = f"https://mlediamant.com/reset-password?token={token}"

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "Восстановление пароля - M.Le Diamant CRM"
            msg['From'] = FROM_EMAIL
            msg['To'] = email

            text = f"""
Здравствуйте, {user['full_name']}!

Вы запросили восстановление пароля для CRM системы M.Le Diamant.

Для сброса пароля перейдите по ссылке:
{reset_link}

Ссылка действительна 1 час.

Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.

---
M.Le Diamant Beauty Lounge
{SALON_INFO['address']}
            """

            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #667eea;">Восстановление пароля</h2>
                  <p>Здравствуйте, <strong>{user['full_name']}</strong>!</p>
                  <p>Вы запросили восстановление пароля для CRM системы M.Le Diamant.</p>
                  <p>Для сброса пароля нажмите на кнопку ниже:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Сбросить пароль</a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Ссылка действительна 1 час.</p>
                  <p style="font-size: 12px; color: #666;">Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="font-size: 12px; color: #999;">
                    M.Le Diamant Beauty Lounge<br>
                    {SALON_INFO['address']}
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
                server.set_debuglevel(1)
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)

            log_info(f"✅ Email успешно отправлен на {email}", "email")
            
        except smtplib.SMTPAuthenticationError as e:
            log_error(f"❌ Ошибка аутентификации SMTP: {e}", "email")
        except smtplib.SMTPException as e:
            log_error(f"❌ Ошибка SMTP: {e}", "email")
        except Exception as e:
            log_error(f"❌ Общая ошибка отправки email: {e}", "email", exc_info=True)

        return templates.TemplateResponse("admin/forgot_password.html", {
            "request": request,
            "salon_info": SALON_INFO,
            "success": "Если email существует в системе, инструкции отправлены на почту"
        })
    except Exception as e:
        log_error(f"Ошибка в forgot_password: {e}", "auth", exc_info=True)
        raise


@app.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(request: Request, token: str = Query(...)):
    """Страница сброса пароля"""
    try:
        from database import verify_reset_token

        user_id = verify_reset_token(token)

        if not user_id:
            log_warning("Недействительный токен для сброса пароля", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Недействительная или истёкшая ссылка"
            })

        return templates.TemplateResponse("admin/reset_password.html", {
            "request": request,
            "salon_info": SALON_INFO,
            "token": token
        })
    except Exception as e:
        log_error(f"Ошибка в reset_password_page: {e}", "auth", exc_info=True)
        raise


@app.post("/reset-password")
async def reset_password(
    request: Request,
    token: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    """Обработка сброса пароля"""
    try:
        from database import verify_reset_token, reset_user_password, mark_reset_token_used

        if password != confirm_password:
            log_warning("Пароли не совпадают", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "token": token,
                "error": "Пароли не совпадают"
            })

        if len(password) < 6:
            log_warning("Пароль слишком короткий", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "token": token,
                "error": "Пароль должен быть минимум 6 символов"
            })

        user_id = verify_reset_token(token)

        if not user_id:
            log_warning("Недействительный токен при сбросе пароля", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon_info": SALON_INFO,
                "error": "Недействительная или истёкшая ссылка"
            })

        reset_user_password(user_id, password)
        mark_reset_token_used(token)

        log_info(f"Пароль успешно сброшен для пользователя {user_id}", "auth")
        return RedirectResponse(url="/login?success=Пароль успешно изменён", status_code=302)
    except Exception as e:
        log_error(f"Ошибка в reset_password: {e}", "auth", exc_info=True)
        raise


@app.get("/stats")
async def stats():
    """Статистика бота"""
    try:
        return get_stats()
    except Exception as e:
        log_error(f"Ошибка в stats: {e}", "api", exc_info=True)
        raise


@app.get("/health")
async def health():
    """Проверка здоровья сервиса"""
    try:
        stats = get_stats()
        return {
            "status": "healthy",
            "database": "connected",
            "gemini_ai": "active",
            "total_clients": stats['total_clients'],
            "total_bookings": stats['total_bookings']
        }
    except Exception as e:
        log_error(f"Health check failed: {e}", "health", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }


@app.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy(request: Request):
    """Политика конфиденциальности"""
    try:
        return templates.TemplateResponse("privacy-policy.html", {
            "request": request,
            "title": "Privacy Policy",
            "content": (
                "This app automatically replies to Instagram messages. "
                "We do not collect, store, or share personal user data. "
                "If you want to delete your data, contact us at mladimontuae@gmail.com."
            ),
            "salon_info": SALON_INFO
        })
    except Exception as e:
        log_error(f"Ошибка в privacy_policy: {e}", "api", exc_info=True)
        raise


@app.get("/terms", response_class=HTMLResponse)
async def terms_of_service(request: Request):
    """Пользовательское соглашение"""
    try:
        return templates.TemplateResponse("terms.html", {
            "request": request,
            "title": "Terms of Service",
            "content": (
                "By messaging our Instagram page, you agree that our system may "
                "automatically reply to your inquiries about our salon services. "
                "All conversations are confidential and not shared with third parties."
            ),
            "salon_info": SALON_INFO
        })
    except Exception as e:
        log_error(f"Ошибка в terms_of_service: {e}", "api", exc_info=True)
        raise


# ========================================
# ===== НОВЫЕ API ENDPOINTS ДЛЯ REACT =====
# ========================================

@app.get("/api/users")
async def api_get_users(session_token: Optional[str] = Cookie(None)):
    """API: Получить всех пользователей"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    from database import get_all_users
    users = get_all_users()
    
    return [
        {
            "id": u[0],
            "username": u[1],
            "full_name": u[2],
            "email": u[3],
            "role": u[4],
            "created_at": u[5]
        }
        for u in users
    ]


@app.get("/api/clients")
async def api_get_clients(session_token: Optional[str] = Cookie(None)):
    """API: Получить всех клиентов"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    clients = get_all_clients()
    
    return [
        {
            "id": c[0],
            "instagram_id": c[0],
            "username": c[1],
            "phone": c[2],
            "name": c[3],
            "display_name": get_client_display_name(c),
            "first_contact": c[4],
            "last_contact": c[5],
            "total_messages": c[6],
            "labels": c[7] if len(c) > 7 else "",
            "status": c[8] if len(c) > 8 else "new",
            "lifetime_value": c[9] if len(c) > 9 else 0,
            "profile_pic": c[10] if len(c) > 10 else None,
            "notes": c[11] if len(c) > 11 else "",
            "is_pinned": c[12] if len(c) > 12 else 0
        }
        for c in clients
    ]


@app.get("/api/clients/{client_id}")
async def api_get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    """API: Получить детали клиента"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    client = get_client_by_id(client_id)
    if not client:
        return JSONResponse({"error": "Client not found"}, status_code=404)
    
    history = get_chat_history(client_id, limit=50)
    bookings = [b for b in get_all_bookings() if b[1] == client_id]
    
    return {
        "client": {
            "id": client[0],
            "username": client[1],
            "phone": client[2],
            "name": client[3],
            "first_contact": client[4],
            "last_contact": client[5],
            "total_messages": client[6],
            "status": client[8] if len(client) > 8 else "new",
            "lifetime_value": client[9] if len(client) > 9 else 0,
            "notes": client[11] if len(client) > 11 else ""
        },
        "chat_history": [
            {
                "message": msg[0],
                "sender": msg[1],
                "timestamp": msg[2]
            }
            for msg in history
        ],
        "bookings": [
            {
                "id": b[0],
                "service": b[2],
                "datetime": b[3],
                "phone": b[4],
                "status": b[6]
            }
            for b in bookings
        ]
    }


@app.get("/api/bookings")
async def api_get_bookings(session_token: Optional[str] = Cookie(None)):
    """API: Получить все бронирования"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    bookings = get_all_bookings()
    
    return [
        {
            "id": b[0],
            "client_id": b[1],
            "service_name": b[2],
            "datetime": b[3],
            "phone": b[4],
            "name": b[5],
            "status": b[6],
            "created_at": b[7],
            "revenue": b[8] if len(b) > 8 else 0,
            "notes": b[9] if len(b) > 9 else ""
        }
        for b in bookings
    ]


@app.get("/api/bookings/{booking_id}")
async def api_get_booking_detail(booking_id: int, session_token: Optional[str] = Cookie(None)):
    """API: Получить детали бронирования"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("""SELECT id, instagram_id, service_name, datetime, phone, name, status, created_at, revenue, notes
                 FROM bookings WHERE id = ?""", (booking_id,))
    booking = c.fetchone()
    conn.close()
    
    if not booking:
        return JSONResponse({"error": "Booking not found"}, status_code=404)
    
    return {
        "id": booking[0],
        "client_id": booking[1],
        "service_name": booking[2],
        "datetime": booking[3],
        "phone": booking[4],
        "name": booking[5],
        "status": booking[6],
        "created_at": booking[7],
        "revenue": booking[8] if len(booking) > 8 else 0,
        "notes": booking[9] if len(booking) > 9 else ""
    }


@app.get("/api/services")
async def api_get_services(session_token: Optional[str] = Cookie(None)):
    """API: Получить все сервисы"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    services = get_all_services(active_only=False)
    
    return [
        {
            "id": s[0],
            "service_key": s[1],
            "name": s[2],
            "name_ru": s[3] if len(s) > 3 else s[2],
            "price": s[5] if len(s) > 5 else 0,
            "currency": s[6] if len(s) > 6 else "AED",
            "category": s[7] if len(s) > 7 else "other",
            "description": s[8] if len(s) > 8 else "",
            "is_active": s[12] if len(s) > 12 else True
        }
        for s in services
    ]


@app.get("/api/analytics")
async def api_get_analytics(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """API: Получить аналитику"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if date_from and date_to:
        analytics = get_analytics_data(date_from=date_from, date_to=date_to)
    else:
        analytics = get_analytics_data(days=period)
    
    return analytics


@app.get("/api/funnel")
async def api_get_funnel(session_token: Optional[str] = Cookie(None)):
    """API: Получить данные воронки"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_funnel_data()


@app.get("/api/stats")
async def api_get_stats():
    """API: Получить статистику"""
    return get_stats()


@app.post("/api/login")
async def api_login(
    email: str = Form(...),
    password: str = Form(...)
):
    """API: Логин (JSON вариант)"""
    try:
        log_info(f"API Login attempt: {email}", "auth")
        user = verify_user(email, password)
        
        if not user:
            log_warning(f"Invalid credentials for {email}", "auth")
            return JSONResponse({"error": "Invalid email or password"}, status_code=401)
        
        session_token = create_session(user["id"])
        log_info(f"Session created for {email}", "auth")
        
        return {
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
    except Exception as e:
        log_error(f"Error in api_login: {e}", "auth", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/logout")
async def api_logout(session_token: Optional[str] = Cookie(None)):
    """API: Логаут"""
    if session_token:
        delete_session(session_token)
        log_info("User logged out", "auth")
    
    return {"success": True, "message": "Logged out"}


@app.post("/api/bookings/create")
async def api_create_booking(request: Request, session_token: Optional[str] = Cookie(None)):
    """API: Создать бронирование"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    
    try:
        instagram_id = data.get('instagram_id')
        service = data.get('service')
        datetime_str = f"{data.get('date')} {data.get('time')}"
        phone = data.get('phone')
        name = data.get('name')
        
        get_or_create_client(instagram_id, username=name)
        save_booking(instagram_id, service, datetime_str, phone, name)
        
        log_activity("system", "create_booking", "booking", instagram_id,
                     f"Created booking: {service}")
        
        return {"success": True, "message": "Booking created"}
    except Exception as e:
        log_error(f"Error creating booking: {e}", "api", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/clients/{client_id}/update")
async def api_update_client(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """API: Обновить информацию клиента"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    
    success = update_client_info(
        client_id,
        name=data.get('name'),
        phone=data.get('phone'),
        notes=data.get('notes')
    )
    
    if success:
        log_activity("system", "update_client_info", "client", client_id, "Client updated")
        return {"success": True, "message": "Client updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)


@app.post("/api/bookings/{booking_id}/status")
async def api_update_booking_status(
    booking_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """API: Изменить статус бронирования"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    new_status = data.get('status')
    
    if new_status:
        success = update_booking_status(booking_id, new_status)
        if success:
            log_activity("system", "update_booking_status", "booking", str(booking_id),
                         f"Status changed to {new_status}")
            return {"success": True, "message": "Status updated"}
    
    return JSONResponse({"error": "Status update failed"}, status_code=400)


@app.post("/api/chat/send")
async def api_send_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """API: Отправить сообщение"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    instagram_id = data.get('instagram_id')
    message = data.get('message')
    
    if not instagram_id or not message:
        return JSONResponse({"error": "Missing data"}, status_code=400)
    
    result = await send_message(instagram_id, message)
    
    if "error" not in result:
        save_message(instagram_id, message, "bot")
        log_activity("system", "send_message", "client", instagram_id,
                     f"Message sent: {message[:50]}")
        return {"success": True, "message": "Message sent"}
    
    return JSONResponse({"error": "Send failed"}, status_code=500)


@app.get("/api/chat/{client_id}/history")
async def api_get_chat_history(
    client_id: str,
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """API: Получить историю чата"""
    if not session_token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    history = get_chat_history(client_id, limit=limit)
    
    return [
        {
            "message": msg[0],
            "sender": msg[1],
            "timestamp": msg[2],
            "type": msg[3] if len(msg) > 3 else "text"
        }
        for msg in history
    ]


# ===== ЗАПУСК =====
@app.on_event("startup")
async def startup_event():
    """При запуске приложения"""
    try:
        log_info("=" * 70, "startup")
        log_info("🚀 Запуск CRM системы...", "startup")
        log_info(f"💎 Салон: {SALON_INFO['name']}", "startup")
        log_info(f"🤖 Бот-гений продаж: {SALON_INFO['bot_name']}", "startup")
        log_info(f"📍 Адрес: {SALON_INFO['address']}", "startup")
        log_info("=" * 70, "startup")

        init_database()

        log_info("✅ CRM готова к работе!", "startup")
        log_info("🔐 Логин: http://localhost:8000/login", "startup")
        log_info("📊 Админ-панель: http://localhost:8000/admin", "startup")
        log_info("📈 Воронка продаж: http://localhost:8000/admin/funnel", "startup")
        log_info("📉 Аналитика: http://localhost:8000/admin/analytics", "startup")
        log_info("🎨 React фронтенд: http://localhost:5173", "startup")
        log_info("=" * 70, "startup")
    except Exception as e:
        log_critical(f"❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАПУСКЕ: {e}", "startup")
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )