"""
Главный файл FastAPI приложения
"""
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import time

from logger import logger, log_info, log_error, log_critical
from db import init_database
from db.settings import get_salon_settings
from bot import get_bot
from utils import ensure_upload_directories

# Импорт роутеров
from api import router as api_router
from auth import router as auth_router
from webhooks import router as webhooks_router
from api.reactions import router as reactions_router
from api.templates import router as templates_router
from api.statuses import router as statuses_router
from api.uploads import router as upload_router
from api.proxy import router as proxy_router  # ✅ НОВЫЙ РОУТЕР
from api.reminders import router as reminders_router
from api.notifications import router as notifications_router
from api.tags import router as tags_router
from api.automation import router as automation_router
from api.reports import router as reports_router
from api.settings import router as settings_router 
from api.public import router as public_router


# Создаём директории для загрузок
ensure_upload_directories()

# Получаем настройки салона
salon = get_salon_settings()

# Инициализация FastAPI
app = FastAPI(title=f"💎 {salon['name']} CRM")

# Подключение статики и шаблонов
app.mount("/static", StaticFiles(directory="static"), name="static/dist")

# Подключение роутеров
# API роутеры (все через /api)
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(reactions_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
app.include_router(statuses_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(reminders_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(tags_router, prefix="/api")
app.include_router(automation_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
# Публичные роутеры (БЕЗ авторизации через /public)
app.include_router(public_router, prefix="/public")
# Специальные роутеры (БЕЗ /api)
app.include_router(webhooks_router)  # для Instagram webhook
app.include_router(proxy_router)     # для прокси изображений


# ===== MIDDLEWARE =====

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Добавить заголовки безопасности"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Логирование запросов"""
    # Игнорируем статику и документацию
    if request.url.path.startswith("/static") or request.url.path == "/docs":
        return await call_next(request)
    
    start_time = time.time()
    log_info(f"🔥 {request.method} {request.url.path}", "middleware")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        log_info(f"📤 {request.method} {request.url.path} → {response.status_code} ({process_time:.2f}s)", 
                "middleware")
        return response
    except Exception as e:
        log_error(f"❌ ОШИБКА: {request.method} {request.url.path}", "middleware", 
                 exc_info=True)
        raise


# CORS для React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mlediamant.com",
        "http://mlediamant.com",
        "http://91.201.215.32:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК =====

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ловит ВСЕ необработанные ошибки"""
    log_critical(f"❌ НЕОБРАБОТАННАЯ ОШИБКА: {exc}", "exception_handler")
    log_error(f"📍 URL: {request.url}", "exception_handler")
    
    import traceback
    log_error(f"📋 Traceback:\n{traceback.format_exc()}", "exception_handler")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
        }
    )


# ===== ОСНОВНЫЕ ENDPOINTS =====

@app.get("/")
async def root():
    """API информация"""
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
            "Многоязычность (RU/EN/AR)",
            "Прокси для изображений Instagram"  # ✅ НОВАЯ ФИЧА
        ]
    }


@app.get("/health")
async def health():
    """Проверка здоровья сервиса"""
    try:
        from db import get_stats
        stats = get_stats()
        return {
            "status": "healthy",
            "database": "connected",
            "gemini_ai": "active",
            "image_proxy": "active",  # ✅ НОВАЯ ПРОВЕРКА
            "total_clients": stats['total_clients'],
            "total_bookings": stats['total_bookings']
        }
    except Exception as e:
        log_error(f"Health check failed: {e}", "health")
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/privacy-policy")
async def privacy_policy():
    return RedirectResponse(url="/#/privacy-policy")

@app.get("/terms")
async def terms():
    return RedirectResponse(url="/#/terms")


# ===== ЗАПУСК ПРИЛОЖЕНИЯ =====

@app.on_event("startup")
async def startup_event():
    """При запуске приложения"""
    try:
        log_info("=" * 70, "startup")
        log_info("🚀 Запуск CRM системы...", "startup")
        
        # Инициализация БД
        init_database()
        
        # Раскомментируйте следующие строки для первичной миграции:
        from db.migrations.migrate_salon_settings import migrate_salon_settings
        # from db.migrations.migrate_services import migrate_services
        # from db.migrations.migrate_bot_settings import migrate_settings
        # from db.migrations.create_employees import create_employees_tables
        migrate_salon_settings()  # <- Запустить ПЕРВЫМ
        # migrate_services()
        # migrate_settings()
        # create_employees_tables()
        
        # Инициализация бота
        bot = get_bot()
        log_info(f"🤖 Бот инициализирован: {bot.salon['name']}", "startup")
        
        log_info("✅ CRM готова к работе!", "startup")
        log_info("🔄 Прокси для изображений активирован", "startup")  # ✅ НОВОЕ
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

    