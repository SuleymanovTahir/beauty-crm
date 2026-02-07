"""
Beauty CRM - Основное приложение FastAPI
Единая точка входа с современным управлением жизненным циклом (lifespan).
"""
import os
import sys
import threading
import types
from contextlib import asynccontextmanager
from pathlib import Path

# --- СОВМЕСТИМОСТЬ С PYTHON 3.13+ ---
if sys.version_info >= (3, 13) and "cgi" not in sys.modules:
    cgi_patch = types.ModuleType("cgi")
    cgi_patch.escape = lambda s, quote=True: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")
    sys.modules["cgi"] = cgi_patch

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Основные утилиты
from utils.logger import log_info, log_error
from core.config import is_localhost
from db.connection import init_connection_pool, get_db_connection
from scripts.maintenance.recreate_database import drop_database, recreate_database  # Uncomment only for manual DB reset
from db.settings import get_salon_settings
from bot import get_bot
from utils.utils import ensure_upload_directories
from middleware import TimingMiddleware
from middleware.user_activity import UserActivityMiddleware
from modules import print_modules_status, is_module_enabled

# Архитектура роутеров (Единый источник истины - SSOT)
from core.auth import router as auth_router
from api import router as api_root_router
from api.proxy import router as proxy_router
from api.dashboard import router as dashboard_router
from api.funnel import router as funnel_router
from api.tasks import router as tasks_router
from api.schedule import router as schedule_router
from api.loyalty import router as loyalty_router
from api.newsletter import router as newsletter_router
from api.invoices import router as invoices_router
from api.contracts import router as contracts_router
from api.telephony import router as telephony_router
from api.recordings import router as recordings_router
from api.holidays import router as holidays_router
from api.visitor_analytics import router as visitor_analytics_router
from api.automation import router as automation_router
from api.reports import router as reports_router
from api.audit import router as audit_router
from api.webrtc_signaling import router as webrtc_router
from api.notifications_ws import router as notifications_ws_router
from api.ringtones import router as ringtones_router
from api.notifications import router as notifications_router
from api.chat_ws import router as chat_ws_router
from api.reminders import router as reminders_router
from api.push_tokens import router as push_tokens_router
from api.sitemap import router as sitemap_router
from api.seo_metadata import router as seo_metadata_router
from api.database_explorer import router as db_explorer_router
from api.menu_settings import router as menu_settings_router
from api.service_change_requests import router as service_change_requests_router
from api.positions import router as positions_router
from api.products import router as products_router
from api.subscriptions import router as subscriptions_router
from api.broadcasts import router as broadcasts_router
from api.trash import router as trash_router
from api.messengers import router as messengers_router
from api.marketplace_integrations import router as marketplace_router
from api.payment_integrations import router as payment_integrations_router
from api.admin_stubs import router as admin_stubs_router
from api.internal_chat import router as internal_chat_router
from api.statuses import router as statuses_router
from api.gallery import router as gallery_router
from api.public_admin import router as public_admin_router
from api.client_auth import router as client_auth_router
from api.admin_registrations import router as admin_registrations_router
from utils.redis_pubsub import redis_pubsub
import asyncio

from scheduler import (
    start_birthday_checker, 
    start_client_birthday_checker, 
    start_booking_reminder_checker, 
    start_task_checker, 
    start_user_status_checker,
    start_weekly_report_checker
)

# Глобальное состояние приложения
salon_config = None

class ModernStaticFiles(StaticFiles):
    """Статические файлы с агрессивным кешированием"""
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=3600"
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом базы данных, бота и планировщиков"""
    log_info("=" * 60, "boot")
    log_info("🚀 Двигатель CRM запускается...", "boot")
    
    # 1. Настройка окружения
    ensure_upload_directories()
    
    # 2. Слой базы данных

    # [ОПАСНО: РУЧНОЙ СБРОС БД] - Раскомментируйте строки ниже только для ПОЛНОГО сброса данных
    # ⚠️ НЕ ЗАПУСКАТЬ В PRODUCTION! Удалит все данные!
    # ⚠️ НЕ СОВМЕСТИМО С GUNICORN с несколькими workers - используйте только локально с 1 worker
    # log_info("⚠️  Удаление базы данных...", "startup")
    # drop_database()
    # log_info("🔄 Создание новой базы данных...", "startup")
    # recreate_database()
    # log_info("✅ База данных пересоздана. ТЕПЕРЬ ОБЯЗАТЕЛЬНО ЗАПУСТИТЕ МИГРАЦИИ (пункт 3)", "startup")

    init_connection_pool()
    
    # 3. Redis Pub/Sub (Sink for multi-worker synchronization)
    await redis_pubsub.connect()
    app.state.redis_listener = asyncio.create_task(redis_pubsub.start_listening())
    log_info("✅ Redis Pub/Sub listener started", "boot")

    try:
        def warmup():
            try:
                conn = get_db_connection()
                conn.cursor().execute("SELECT 1")
                conn.close()
            except: pass
        w_threads = [threading.Thread(target=warmup, daemon=True) for _ in range(10)]
        for t in w_threads: t.start()
        for t in w_threads: t.join(timeout=1.0)
        log_info("✅ Пул соединений прогрет", "boot")
    except Exception as e:
        log_error(f"⚠️  Проблема при прогреве пула: {e}", "boot")

    # 3. Синхронизация системы (Создание таблиц и миграции)
    # ОБЯЗАТЕЛЬНО раскомментируйте после пересоздания базы данных или обновления кода
    from db.migrations.run_all_migrations import run_all_migrations
    run_all_migrations()
    
    # 4. Конфигурация
    global salon_config
    salon_config = get_salon_settings()
    log_info(f"✅ Конфигурация салона: {salon_config['name']}", "boot")

    # [РУЧНОЕ АДМИНИСТРИРОВАНИЕ] - Раскомментируйте при необходимости
    # log_info("🔧 Выполнение задач ручного администрирования...", "boot")
    from scripts.maintenance.fix_data import run_all_fixes
    run_all_fixes()

    # [ТЕСТИРОВАНИЕ] - Запуск тестов при старте (можно выключить для ускорения запуска)
    # from tests.run_all_tests import run_all_tests
    # from tests.run_all_test2 import run_all_tests2
    # from tests.run_all_test3 import run_all_tests3
    # log_info("🧪 Запуск всех тестов (V1, V2, V3)...", "startup")
    # run_all_tests()
    # run_all_tests2()
    # run_all_tests3()

    # 5. Сервисы
    get_bot()
    print_modules_status()
    
    # 6. Периодические задачи
    if is_module_enabled('scheduler'):
        start_birthday_checker()
        start_client_birthday_checker()
        start_booking_reminder_checker()
        start_task_checker()
        start_user_status_checker()
        
        cron = AsyncIOScheduler(job_defaults={'misfire_grace_time': 3600})
        
        # Импорт статических задач
        from services.reminder_service import check_and_send_reminders
        from bot.reminders.abandoned import check_abandoned_bookings
        from bot.reminders.feedback import check_visits_for_feedback
        from bot.reminders.retention import check_client_retention
        from bot.reminders.appointments import check_appointment_reminders
        from scripts.maintenance.housekeeping import run_housekeeping
        from scripts.cleanup_sessions import cleanup_expired_sessions
        
        cron.add_job(check_and_send_reminders, 'interval', minutes=30, id='ig_reminders')
        cron.add_job(check_abandoned_bookings, 'interval', minutes=10, id='abandoned')
        cron.add_job(check_visits_for_feedback, 'interval', minutes=60, id='feedback')
        cron.add_job(check_client_retention, 'cron', hour=11, minute=0, id='retention')
        cron.add_job(check_appointment_reminders, 'interval', minutes=30, id='appointments')
        cron.add_job(run_housekeeping, 'cron', hour=3, minute=0, id='cleaning')
        cron.add_job(cleanup_expired_sessions, 'interval', hours=6, id='sessions')
        
        # Регистрация еженедельного отчета (PN 09:00)
        from scheduler.weekly_report_checker import start_weekly_report_checker
        start_weekly_report_checker(cron)
        
        # Регистрация автоматического бэкапа БД (проверка каждый день в 4:00)
        from scheduler.database_backup_checker import check_database_backup
        cron.add_job(check_database_backup, 'cron', hour=4, minute=0, id='database_backup')
        log_info("📦 Database backup scheduler registered (runs at 04:00 daily)", "boot")

        # Регистрация автоочистки корзины (каждый день в 03:00)
        from scheduler.trash_cleanup import start_trash_cleanup_scheduler
        start_trash_cleanup_scheduler(cron)
        
        cron.start()
        log_info("✅ Планировщики (Mission-control) активны", "boot")

    yield
    
    # 7. Завершение работы
    log_info("🛑 Двигатель CRM безопасно останавливается...", "shutdown")
    
    # Stop Redis Pub/Sub
    await redis_pubsub.stop()
    if hasattr(app.state, 'redis_listener'):
        app.state.redis_listener.cancel()
        try:
            await app.state.redis_listener
        except asyncio.CancelledError:
            pass

# Инициализация FastAPI
app = FastAPI(title="Beauty CRM", lifespan=lifespan)

# Защита и политики
limiter = Limiter(key_func=get_remote_address, enabled=(os.getenv("ENVIRONMENT") == "production"))
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Защита и политика CORS (Полностью универсальная)
# При allow_credentials=True нельзя использовать "*", поэтому используем динамический список или регулярку
cors_origins = ["*"]
cors_allow_origin_regex = None

if os.getenv("ENVIRONMENT") == "development" or is_localhost():
    # В разработке разрешаем любые локальные адреса на любых портах (Универсально)
    cors_allow_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?"
    cors_origins = [] 
else:
    # В продакшене разрешаем только домены из конфига (Универсально через ENV)
    cors_origins = []
    for key in ["FRONTEND_URL", "PUBLIC_URL", "PRODUCTION_URL", "BASE_URL"]:
        val = os.getenv(key)
        if val:
            clean_val = val.strip().rstrip("/")
            if clean_val and clean_val not in cors_origins:
                cors_origins.append(clean_val)
                # Automatically add 'www' variant if it's a domain
                if "://" in clean_val and "www." not in clean_val:
                    protocol, rest = clean_val.split("://", 1)
                    www_variant = f"{protocol}://www.{rest}"
                    if www_variant not in cors_origins:
                        cors_origins.append(www_variant)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TimingMiddleware)
app.add_middleware(UserActivityMiddleware)

# Подключение ресурсов
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Mount backend static files
app.mount("/static", ModernStaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Mount frontend images for public landing (Портфолио, Фото салона, etc.)
frontend_img_dir = FRONTEND_DIR / "public_landing" / "styles" / "img"
if frontend_img_dir.exists():
    app.mount("/landing-images", ModernStaticFiles(directory=str(frontend_img_dir)), name="landing_images")

# Интеграция эндпоинтов (сгруппированы по доменам)
# Сокеты
app.include_router(webrtc_router, prefix="/api/webrtc")
app.include_router(notifications_ws_router, prefix="/api/ws")
app.include_router(chat_ws_router, prefix="/api/ws")

# Базовые роутеры
app.include_router(auth_router, prefix="/api")
app.include_router(api_root_router, prefix="/api")

# Функциональные модули
app.include_router(dashboard_router, prefix="/api")
app.include_router(funnel_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(schedule_router, prefix="/api")
app.include_router(loyalty_router, prefix="/api")
app.include_router(newsletter_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")
app.include_router(contracts_router, prefix="/api")
app.include_router(telephony_router, prefix="/api")
app.include_router(recordings_router, prefix="/api")
app.include_router(ringtones_router, prefix="/api")
app.include_router(reminders_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

# Утилиты и управление
app.include_router(automation_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(holidays_router, prefix="/api/holidays")
app.include_router(visitor_analytics_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(db_explorer_router)
app.include_router(push_tokens_router)
app.include_router(menu_settings_router, prefix="/api")
app.include_router(service_change_requests_router, prefix="/api")
app.include_router(positions_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api")
app.include_router(broadcasts_router, prefix="/api")
app.include_router(trash_router, prefix="/api")
app.include_router(messengers_router, prefix="/api")
app.include_router(marketplace_router, prefix="/api")
app.include_router(payment_integrations_router, prefix="/api")
app.include_router(admin_stubs_router, prefix="/api")
app.include_router(internal_chat_router)  # already has /api/internal-chat prefix
app.include_router(statuses_router, prefix="/api")
app.include_router(gallery_router, prefix="/api")
app.include_router(public_admin_router, prefix="/api")  # already has /public-admin prefix
app.include_router(client_auth_router, prefix="/api/client")  # Client portal endpoints
app.include_router(admin_registrations_router, prefix="/api")  # Admin registration management
app.include_router(proxy_router, prefix="/api")
app.include_router(sitemap_router)
app.include_router(seo_metadata_router)

# Публичный доступ
if is_module_enabled('public'):
    from api.public import router as public_api
    app.include_router(public_api, prefix="/api/public", tags=["public"])

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Проверка состояния сервера"""
    try:
        # Проверка подключения к БД
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT 1")
        conn.close()
        db_status = "ok"
    except Exception as e:
        log_error(f"Health check DB error: {e}", "health")
        db_status = "error"
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "version": "2.0"
    }

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
