from fastapi import FastAPI, Request, Form, Cookie, Query, WebSocket,HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback
from typing import Optional
import time
import os
import ssl

# ===== ИМПОРТ ЦЕНТРАЛИЗОВАННОГО ЛОГГЕРА =====
from logger import logger, log_info, log_error, log_warning, log_critical




# ===== ИМПОРТЫ КОНФИГУРАЦИИ =====
from config import VERIFY_TOKEN, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL

# ===== ИМПОРТЫ DATABASE =====
from database import (
    init_database, get_or_create_client, save_message,
    get_chat_history, get_stats,
    verify_user, create_session, delete_session, create_user,DATABASE_NAME,
    get_user_by_email, create_password_reset_token, verify_reset_token,
    reset_user_password, mark_reset_token_used, get_salon_settings,get_user_by_session,
    detect_and_save_language, get_client_language,
)

# ===== ИМПОРТЫ BOT =====
from bot import get_bot
from integrations import send_message, send_typing_indicator 



# ===== ИМПОРТЫ API ROUTER =====
from api import router as api_router, get_client_display_name




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

salon = get_salon_settings()

# ===== ИНИЦИАЛИЗАЦИЯ FASTAPI =====
app = FastAPI(title=f"💎 {salon['name']} CRM")


# ===== WEBSOCKET (опционально) =====
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket для real-time обновлений"""
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message: {data}")


# ===== ПОДКЛЮЧЕНИЕ СТАТИКИ И ШАБЛОНОВ =====
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ===== ПОДКЛЮЧИТЬ REST API ROUTER =====
app.include_router(api_router)


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

# # ===== MIDDLEWARE TRUSTED HOSTS =====
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=[
#         "mlediamant.com", 
#         "*.mlediamant.com",
#         "localhost",
#         "127.0.0.1",
#     ]
# )


# ===== MIDDLEWARE SECURITY HEADERS =====
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


  
# ===== MIDDLEWARE ЛОГИРОВАНИЯ =====
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Игнорируем статику и документацию
    if request.url.path.startswith("/static") or request.url.path == "/docs":
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



def get_current_user(request: Request) -> dict:
    """
    Получить текущего пользователя из сессии
    
    Используется как зависимость в защищённых endpoints:
    @app.get("/api/protected")
    async def protected_route(current_user: dict = Depends(get_current_user)):
        # Только авторизованные пользователи попадут сюда
        ...
    
    Args:
        request: FastAPI Request объект
    
    Returns:
        dict: Данные пользователя {id, username, full_name, email, role}
    
    Raises:
        HTTPException 401: Если не авторизован или сессия истекла
    """
    # Получить токен из cookies
    session_token = request.cookies.get("session_token")
    
    # Проверить что токен есть
    if not session_token:
        raise HTTPException(
            status_code=401,
            detail="Не авторизован. Пожалуйста, войдите в систему."
        )
    
    # Получить пользователя из БД
    user = get_user_by_session(session_token)
    
    # Проверить что сессия валидна
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Сессия истекла. Пожалуйста, войдите заново."
        )
    
    return user

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
        }
    )


# ===== ОСНОВНЫЕ API ENDPOINTS =====

@app.get("/api")
async def root():
    """Главная страница API"""
    return {
        "status": "✅ CRM работает!",
        "salon": salon['name'],
        "bot": salon['bot_name'],
        "version": "2.0.0",
        "features": [
            "AI-гений продаж (Gemini 2.0 Flash)",
            "Автоматическая запись клиентов",
            "Полноценная CRM с дашбордом",
            "Воронка продаж с аналитикой",
            "История диалогов",
            "Графики и отчеты",
            "Многоязычность (RU/EN/AR)"
        ]
    }


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


# ===== АВТОРИЗАЦИЯ =====

@app.post("/api/login")
async def api_login(username: str = Form(...), password: str = Form(...)):
    """API: Логин для фронтенда"""
    try:
        log_info(f"API Login attempt: {username}", "auth")
        user = verify_user(username, password)
        
        if not user:
            log_warning(f"Invalid credentials for {username}", "auth")
            return JSONResponse(
                {"error": "Неверное имя пользователя или пароль"}, 
                status_code=401
            )
        
        # ✅ ДОБАВЛЕНО: Проверка активации
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
        log_error(f"Error in api_login: {e}", "auth", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)



@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str = None, success: str = None):
    """HTML: Страница входа"""
    try:
        log_info("Открыта страница логина", "auth")
        return templates.TemplateResponse("admin/login.html", {
            "request": request,
            "salon": salon,
            "error": error,
            "success": success
        })
    except Exception as e:
        log_error(f"Ошибка в login_page: {e}", "auth", exc_info=True)
        raise


@app.post("/logout")
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
        log_error(f"Error in logout: {e}", "auth", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """HTML: Страница регистрации"""
    try:
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon": salon
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
    """HTML: Регистрация нового пользователя (требует подтверждения админа)"""
    try:
        # Валидация
        if len(username) < 3:
            log_warning(f"Логин слишком короткий: {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Логин должен быть минимум 3 символа"
            })
        
        if len(password) < 6:
            log_warning(f"Пароль слишком короткий для {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Пароль должен быть минимум 6 символов"
            })
        
        if not full_name or len(full_name.strip()) < 2:
            log_warning(f"Имя слишком короткое для {username}", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Полное имя должно быть минимум 2 символа"
            })
        
        log_info(f"Регистрация нового пользователя: {username}", "auth")
        
        # ✅ ИЗМЕНЕНО: Создаем пользователя с is_active=0
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
            
            # ✅ ИЗМЕНЕНО: Сообщение о необходимости подтверждения
            return RedirectResponse(
                url="/login?success=Регистрация отправлена! Ожидайте подтверждения администратора", 
                status_code=302
            )
        except sqlite3.IntegrityError:
            conn.close()
            log_warning(f"Пользователь {username} уже существует", "auth")
            return templates.TemplateResponse("admin/register.html", {
                "request": request,
                "salon": salon,
                "error": "Пользователь с таким именем уже существует"
            })
            
    except Exception as e:
        log_error(f"Ошибка при регистрации: {e}", "auth", exc_info=True)
        return templates.TemplateResponse("admin/register.html", {
            "request": request,
            "salon": salon,
            "error": f"Ошибка сервера: {str(e)}"
        })
    

@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    """HTML: Страница восстановления пароля"""
    try:
        return templates.TemplateResponse("admin/forgot_password.html", {
            "request": request,
            "salon": salon
        })
    except Exception as e:
        log_error(f"Ошибка в forgot_password_page: {e}", "auth", exc_info=True)
        raise


@app.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    """HTML: Обработка восстановления пароля"""
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
{salon['address']}
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
        log_error(f"Ошибка в forgot_password: {e}", "auth", exc_info=True)
        raise


@app.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(request: Request, token: str = Query(...)):
    """HTML: Страница сброса пароля"""
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
        log_error(f"Ошибка в reset_password_page: {e}", "auth", exc_info=True)
        raise


@app.post("/reset-password")
async def reset_password(
    request: Request,
    token: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    """HTML: Обработка сброса пароля"""
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

        success = reset_user_password(user_id, password)  # ✅ НОВОЕ: Проверяем результат
        
        if success:  # ✅ НОВОЕ: Проверяем успешность
            mark_reset_token_used(token)
            log_info(f"Пароль успешно сброшен для пользователя {user_id}", "auth")
            return RedirectResponse(url="/login?success=Пароль успешно изменён", status_code=302)
        else:  # ✅ НОВОЕ: Обработка ошибки
            log_error(f"Ошибка сброса пароля для пользователя {user_id}", "auth")
            return templates.TemplateResponse("admin/reset_password.html", {
                "request": request,
                "salon": salon,
                "token": token,
                "error": "Ошибка при сбросе пароля. Попробуйте позже."
            })
    except Exception as e:
        log_error(f"Ошибка в reset_password: {e}", "auth", exc_info=True)
        raise
# ===== ВЕБХУКИ INSTAGRAM =====

# ========================================
# УЛУЧШЕННЫЕ WEBHOOK HANDLERS для main.py
# Замените существующие обработчики на эти
# ========================================

@app.get("/webhook")
async def verify_webhook(request: Request):
    """Верификация webhook от Meta"""
    try:
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        log_info("=" * 70, "webhook")
        log_info("🔍 ВЕРИФИКАЦИЯ WEBHOOK", "webhook")
        log_info(f"Mode: {mode}", "webhook")
        log_info(f"Token: {token}", "webhook")
        log_info(f"Challenge: {challenge}", "webhook")
        log_info("=" * 70, "webhook")

        if mode == "subscribe" and token == VERIFY_TOKEN:
            log_info("✅ Webhook верифицирован!", "webhook")
            return int(challenge)

        log_warning("❌ Ошибка верификации webhook", "webhook")
        return JSONResponse({"error": "Verification failed"}, status_code=403)
    except Exception as e:
        log_error(f"Ошибка в verify_webhook: {e}", "webhook", exc_info=True)
        raise


@app.post("/webhook")
async def handle_webhook(request: Request):
    """
    WEBHOOK с новой структурой бота
    """
    try:
        logger.info("=" * 70)
        logger.info("📨 WEBHOOK: POST request received")
        
        # Читаем body
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8')
        
        import json
        data = json.loads(body_str)
        
        if data.get("object") != "instagram":
            logger.warning(f"⚠️ Not Instagram: {data.get('object')}")
            return {"status": "ok"}
        
        logger.info("✅ Instagram webhook confirmed")
        
        # ✅ ПОЛУЧАЕМ ЭКЗЕМПЛЯР БОТА
        bot = get_bot()
        
        # Обрабатываем entries
        for entry in data.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                
                if not sender_id or "message" not in messaging:
                    continue
                
                message_data = messaging["message"]
                
                # Пропускаем эхо
                if message_data.get("is_echo"):
                    continue
                
                message_text = message_data.get("text", "").strip()
                
                if not message_text:
                    continue
                
                try:
                    # Создать/получить клиента
                    get_or_create_client(sender_id)
                    save_message(sender_id, message_text, "client")
                    
                    # Определить язык
                    detect_and_save_language(sender_id, message_text)
                    client_language = get_client_language(sender_id)
                    
                    # Показать typing
                    await send_typing_indicator(sender_id)
                    
                    # Получить историю
                    history = get_chat_history(sender_id, limit=10)
                    
                    # ✅ ГЕНЕРИРУЕМ ОТВЕТ ЧЕРЕЗ НОВОГО БОТА
                    logger.info("🤖 Generating AI response...")
                    ai_response = await bot.generate_response(
                        user_message=message_text,
                        instagram_id=sender_id,
                        history=history,
                        client_language=client_language
                    )
                    
                    logger.info(f"✅ AI response: {ai_response[:100]}")
                    
                    # Сохранить и отправить
                    save_message(sender_id, ai_response, "bot")
                    await send_message(sender_id, ai_response)
                    
                    logger.info("📤 Message sent!")
                    
                except Exception as e:
                    logger.error(f"❌ Processing error: {e}")
                    logger.error(traceback.format_exc())
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("=" * 70)
        logger.error(f"❌ CRITICAL ERROR: {e}")
        logger.error(traceback.format_exc())
        return {"status": "ok"} 

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """HTML: Главная страница"""
    try:
        salon = get_salon_settings()  # ✅ Берем из БД
        return templates.TemplateResponse("index.html", {
            "request": request,
            "title": "Онлайн-запись",
            "salon": salon  # ✅ Передаем из БД
        })
    except Exception as e:
        log_error(f"Ошибка: {e}", "api", exc_info=True)
        raise


@app.post("/api/bot-settings/reload")
async def reload_bot_settings(session_token: Optional[str] = Cookie(None)):
    """
    Перезагрузить настройки бота из БД
    Вызывается после обновления настроек в админке
    """
    user = get_user_by_session(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        # ✅ ПЕРЕЗАГРУЖАЕМ НАСТРОЙКИ БОТА
        bot = get_bot()
        bot.reload_settings()
        
        log_info("Настройки бота перезагружены", "api")
        
        return {
            "success": True,
            "message": "Настройки бота перезагружены из БД",
            "salon": bot.salon['name']
        }
    except Exception as e:
        log_error(f"Ошибка перезагрузки настроек: {e}", "api")
        return JSONResponse(
            {"error": str(e)}, 
            status_code=500
        )

@app.delete("/api/services/{service_id}")
async def delete_service(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Проверить что пользователь админ
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Доступ запрещён. Только для администраторов."
        )
    
    # Удалить услугу
    from database import delete_service as db_delete_service
    success = db_delete_service(service_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    
    return {"success": True}

@app.post("/book", response_class=HTMLResponse)
async def book(request: Request, name: str = Form(...), phone: str = Form(...), service: str = Form(...)):
    """HTML: Обработка формы записи"""
    try:
        log_info(f"📘 Новая запись: {name} — {phone} — {service}", "booking")
        return templates.TemplateResponse(
            "success.html",
            {
                "request": request,
                "title": "Запись успешно отправлена",
                "name": name,
                "service": service,
                "salon": salon
            },
        )
    except Exception as e:
        log_error(f"Ошибка в book: {e}", "booking", exc_info=True)
        raise


@app.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy(request: Request):
    """HTML: Политика конфиденциальности"""
    try:
        return templates.TemplateResponse("privacy-policy.html", {
            "request": request,
            "title": "Privacy Policy",
            "content": (
                "This app automatically replies to Instagram messages. "
                "We do not collect, store, or share personal user data. "
                "If you want to delete your data, contact us at mladimontuae@gmail.com."
            ),
            "salon": salon
        })
    except Exception as e:
        log_error(f"Ошибка в privacy_policy: {e}", "api", exc_info=True)
        raise


@app.get("/terms", response_class=HTMLResponse)
async def terms_of_service(request: Request):
    """HTML: Пользовательское соглашение"""
    try:
        return templates.TemplateResponse("terms.html", {
            "request": request,
            "title": "Terms of Service",
            "content": (
                "By messaging our Instagram page, you agree that our system may "
                "automatically reply to your inquiries about our salon services. "
                "All conversations are confidential and not shared with third parties."
            ),
            "salon": salon
        })
    except Exception as e:
        log_error(f"Ошибка в terms_of_service: {e}", "api", exc_info=True)
        raise


# ===== ЗАПУСК ПРИЛОЖЕНИЯ =====

@app.on_event("startup")
async def startup_event():
    """При запуске приложения"""
    try:
        log_info("=" * 70, "startup")
        log_info("🚀 Запуск CRM системы...", "startup")
        
        # Инициализация БД
        init_database()
        
        # ✅ ИНИЦИАЛИЗАЦИЯ БОТА
        bot = get_bot()
        log_info(f"🤖 Бот инициализирован: {bot.salon['name']}", "startup")
        
        log_info("✅ CRM готова к работе!", "startup")
        log_info("=" * 70, "startup")
    except Exception as e:
        log_critical(f"❌ ОШИБКА ПРИ ЗАПУСКЕ: {e}", "startup")
        raise





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )