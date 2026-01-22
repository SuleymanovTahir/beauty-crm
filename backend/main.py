"""
Главный файл FastAPI приложения
"""
import os
import sys
import types
from contextlib import asynccontextmanager

# --- PATCH FOR PYTHON 3.13+ (Missing cgi module) ---
if "cgi" not in sys.modules:
    cgi_mock = types.ModuleType("cgi")
    cgi_mock.escape = lambda s, quote=True: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")
    sys.modules["cgi"] = cgi_mock
# ---------------------------------------------------

import asyncio
from fastapi import FastAPI, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response

class CacheControlStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def file_response(self, *args, **kwargs) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=3600" # 1 hour
        return response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time
import os

from utils.logger import logger, log_info, log_error, log_critical,log_warning
from db.connection import get_db_connection
from db import init_database
from db.settings import get_salon_settings
from bot import get_bot
from utils.utils import ensure_upload_directories, get_current_user
from middleware import CacheControlMiddleware, TimingMiddleware

# Force reload check 3

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ВСЕЙ СИСТЕМЫ                                     ║
# ║  Раскомментируйте строку ниже чтобы запускать проверку при старте          ║
# ╚════════════════════════════════════════════════════════════════════════════╝
# from comprehensive_test import run_comprehensive_test

# Импорт роутеров (все импортируются напрямую ниже)
# Main routers
from api import router as api_router
from core.auth import router as auth_router
from api.templates import router as templates_router
# Other routers
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
from api.public_content import router as public_content_router
from api.public_employees import router as public_employees_router
from api.gallery import router as gallery_router
from api.notes import router as notes_router
from api.client_auth import router as client_auth_router
from api.user_management import router as user_management_router
from api.data_export import router as data_export_router
from api.subscriptions import router as subscriptions_router
from api.broadcasts import router as broadcasts_router
from api.positions import router as positions_router
from api.messengers import router as messengers_router
from api.client_import import router as client_import_router
from api.booking_import import router as booking_import_router
from scheduler import start_birthday_checker, start_client_birthday_checker, start_booking_reminder_checker, start_task_checker
from api.internal_chat import router as internal_chat_router
from api.dashboard import router as dashboard_router
from api.schedule import router as schedule_router
from api.loyalty import router as loyalty_router
from api.auto_booking import router as auto_booking_router
from api.permissions import router as permissions_router
from api.roles import router as roles_router
from api.plans import router as plans_router
from api.public_admin import router as public_admin_router
from api.employee_services import router as employee_services_router
from api.employee_schedule import router as employee_schedule_router
from api.client_import import router as client_import_router
from api.booking_import import router as booking_import_router

from api.payroll import router as payroll_router
from api.feedback import router as feedback_router
from api.sitemap import router as sitemap_router
from api.feedback import router as feedback_router
from api.sitemap import router as sitemap_router
from api.seo_metadata import router as seo_metadata_router

from api.holidays import router as holidays_router
from api.visitor_analytics import router as visitor_analytics_router
from api.analytics import router as analytics_router
from api.newsletter import router as newsletter_router
from api.admin_registrations import router as admin_registrations_router
from api.challenges import router as challenges_router
from api.client_gallery_admin import router as client_gallery_admin_router
from api.admin_features import router as admin_features_router
from api.users import router as users_router
from api.funnel import router as funnel_router
from api.tasks import router as tasks_router
from api.telephony import router as telephony_router
from api.menu_settings import router as menu_settings_router
from api.trash import router as trash_router
from api.audit import router as audit_router
from api.webrtc_signaling import router as webrtc_router
from api.notifications_ws import router as notifications_ws_router
from api.contracts import router as contracts_router
from api.products import router as products_router
from api.invoices import router as invoices_router
from api.funnel_checkpoints import router as funnel_checkpoints_router
from api.payment_integrations import router as payment_integrations_router
from api.marketplace_integrations import router as marketplace_integrations_router
from api.recordings import router as recordings_router
from api.admin_stubs import router as admin_stubs_router
from api.chat_ws import router as chat_ws_router
from api.push_tokens import router as push_tokens_router


from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate Limiting configuration
if os.getenv("ENVIRONMENT") == "production":
    limiter = Limiter(key_func=get_remote_address)
else:
    # Disable rate limiting for dev/test to prevent 429 errors during automated testing
    limiter = Limiter(key_func=get_remote_address, enabled=False)

# Создаём директории для загрузок
ensure_upload_directories()

# Получаем настройки салона ПОСЛЕ миграций (будет инициализировано в startup_event)
salon = None

# Инициализация FastAPI
app = FastAPI(title="💎 Beauty CRM")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Подключение статики и шаблонов
# Подключение статики и шаблонов
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", CacheControlStaticFiles(directory=str(BASE_DIR / "static")), name="static/dist")

# Подключение роутеров
# 1. WebSocket и Real-time (в начале для приоритета)
app.include_router(webrtc_router, prefix="/api/webrtc")
app.include_router(notifications_ws_router, prefix="/api/ws")
app.include_router(chat_ws_router, prefix="/api/ws")

# API роутеры (все через /api)
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(statuses_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(reminders_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(tags_router, prefix="/api")
app.include_router(automation_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(user_management_router)  # User management API
app.include_router(data_export_router)  # Export/Import API
app.include_router(subscriptions_router, prefix="/api")  # Subscriptions API
app.include_router(broadcasts_router, prefix="/api")  # Broadcasts API
app.include_router(positions_router, prefix="/api")  # Positions API
app.include_router(messengers_router, prefix="/api")  # Messengers API
app.include_router(dashboard_router, prefix="/api")  # Dashboard & Analytics API
app.include_router(schedule_router, prefix="/api")  # Master Schedule API
app.include_router(loyalty_router, prefix="/api")  # Loyalty Program API
app.include_router(auto_booking_router, prefix="/api")  # Auto-Booking API
app.include_router(permissions_router, prefix="/api")  # Permissions & Roles API
app.include_router(roles_router, prefix="/api")  # Roles API
app.include_router(plans_router, prefix="/api")  # Plans API
app.include_router(employee_services_router, prefix="/api")  # Employee Services API
app.include_router(employee_schedule_router, prefix="/api")  # Employee Schedule API& Goals API
app.include_router(client_import_router, prefix="/api")  # Client Import API
app.include_router(booking_import_router, prefix="/api")  # Booking Import API
app.include_router(public_admin_router, prefix="/api")  # Public Content Admin API (/api/public-admin)
app.include_router(payroll_router, prefix="/api")  # Payroll API
app.include_router(feedback_router, prefix="/api")  # Feedback API
app.include_router(newsletter_router, prefix="/api")  # Newsletter API
# Модуль публичных страниц (опциональный)
from modules import is_module_enabled
if is_module_enabled('public'):
    app.include_router(public_router, prefix="/api/public", tags=["public"])
    app.include_router(public_content_router, prefix="/api")  # Public content API
    app.include_router(public_employees_router, prefix="/api")  # Public employees API
    app.include_router(gallery_router, prefix="/api")  # Gallery API
    app.include_router(client_auth_router, prefix="/api/client", tags=["client"])
    log_info("✅ Модуль 'client' подключен: /api/client/* endpoints", "startup")
    log_info("✅ Модуль 'public' подключен: /api/public/* endpoints", "startup")
app.include_router(holidays_router, prefix="/api/holidays", tags=["holidays"])
# Специальные роутеры (БЕЗ /api)
# app.include_router(webhooks_router)  # для Instagram webhook (/webhook) - модуль не существует
# app.include_router(telegram_webhook_router)  # для Telegram webhook (/webhooks/telegram) - модуль не существует
app.include_router(proxy_router, prefix="/api")   # для прокси изображений
app.include_router(internal_chat_router)
app.include_router(sitemap_router)  # для XML sitemap (/sitemap.xml)
app.include_router(seo_metadata_router)  # для SEO метаданных (/api/public/seo-metadata)
app.include_router(visitor_analytics_router, prefix="/api")  # для аналитики посетителей
app.include_router(analytics_router, prefix="/api")  # для аналитики бота
app.include_router(admin_registrations_router, prefix="/api")  # Admin Registrations Management
app.include_router(challenges_router, prefix="/api")  # Challenges API
app.include_router(client_gallery_admin_router, prefix="/api")  # Client Gallery Admin API

app.include_router(admin_features_router, prefix="/api")  # Admin Features API (Challenges, Referrals, Loyalty, Notifications, Gallery)
app.include_router(users_router, prefix="/api")  # Users API
app.include_router(funnel_router, prefix="/api") # Funnel API
app.include_router(tasks_router, prefix="/api") # Tasks API
app.include_router(telephony_router, prefix="/api") # Telephony API
app.include_router(menu_settings_router, prefix="/api")
app.include_router(trash_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
# webrtc, notifications_ws, chat_ws moved to the top
app.include_router(contracts_router, prefix="/api")  # Contracts API
app.include_router(products_router, prefix="/api")  # Products API
app.include_router(invoices_router, prefix="/api")  # Invoices API
app.include_router(funnel_checkpoints_router, prefix="/api")  # Funnel Checkpoints API
app.include_router(payment_integrations_router, prefix="/api")  # Payment Integrations API
app.include_router(marketplace_integrations_router, prefix="/api")  # Marketplace Integrations API
app.include_router(recordings_router, prefix="/api")  # Recordings & Folders API
app.include_router(admin_stubs_router, prefix="/api")  # Admin Stubs (temporary endpoints)
app.include_router(push_tokens_router)  # Push Notifications Tokens API



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
    """Логирование запросов (оптимизировано)"""
    # Игнорируем статику, документацию и большинство API запросов
    path = request.url.path
    if path.startswith("/static") or path == "/docs" or path.startswith("/api/"):
        return await call_next(request)
    
    start_time = time.time()
    log_info(f"🔥 {request.method} {path}", "middleware")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Логируем только медленные запросы (> 1с)
        if process_time > 1.0:
            log_info(f"📤 {request.method} {path} → {response.status_code} ({process_time:.2f}s)", 
                    "middleware")
        
        # Track visitors to public pages
        if path.startswith("/api/public") or path == "/":
            try:
                from db.visitor_tracking import track_visitor
                ip = request.client.host
                user_agent = request.headers.get("user-agent", "")
                page_url = str(request.url)
                
                # Track asynchronously to not block response
                import asyncio
                asyncio.create_task(asyncio.to_thread(track_visitor, ip, user_agent, page_url))
            except Exception as e:
                # Don't fail the request if tracking fails
                pass  # Убрали логирование ошибок трекинга
        
        return response
    except Exception as e:
        log_error(f"❌ ОШИБКА: {request.method} {path}", "middleware", 
                 exc_info=True)
        raise

# ===== Middleware Layer (FastAPI Middleware Stack) =====
# Note: Middlewares are executed in reverse order of addition (Onion model)

# 1. Timing (Inner layer - closest to app)
app.add_middleware(TimingMiddleware)

# 2. Rate Limiting (защита от перегрузки)
if os.getenv("ENVIRONMENT") == "production":
    from middleware.rate_limit import RateLimitMiddleware
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=120,  # 120 запросов в минуту на IP
        requests_per_second=20    # 20 запросов в секунду на IP
    )
    log_info("✅ Rate limiting enabled: 120/min, 20/sec per IP", "startup")

# 3. Cache Control
app.add_middleware(CacheControlMiddleware)

# 4. GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. CORS Layer (Outer layer)
# Продакшн домены
allowed_origins = [
    "https://mlediamant.com",
    "http://mlediamant.com",
]

# Add optional environment variable origin
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    allowed_origins.append(frontend_url)

# Regex для localhost/127.0.0.1 с любым портом (для разработки)
localhost_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=localhost_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ===== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК =====

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ловит ВСЕ необработанные ошибки"""
    log_critical(f"❌ НЕОБРАБОТАННАЯ ОШИБКА: {exc}", "exception_handler")
    log_error(f"📍 URL: {request.url}", "exception_handler")
    
    import traceback
    log_error(f"📋 Traceback:\n{traceback.format_exc()}", "exception_handler")
    
    error_msg = "Internal Server Error"
    detail_msg = str(exc)
    
    if os.getenv("ENVIRONMENT") == "production":
        detail_msg = "An unexpected error occurred. Please contact support."

    return JSONResponse(
        status_code=500,
        content={
            "error": error_msg,
            "message": detail_msg,
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

@app.get("/data-deletion")
async def data_deletion():
    return RedirectResponse(url="/#/data-deletion")

@app.post("/admin/run-migration/{migration_name}")
async def run_migration(migration_name: str, user: dict = Depends(get_current_user)):
    """Запустить конкретную миграцию (только для директора)"""
    if user["role"] != 'director':
        return JSONResponse({"error": "Forbidden: Only directors can run migrations"}, status_code=403)
    
    if os.getenv("ENVIRONMENT") == "production" and migration_name != "consolidated":
        return JSONResponse({"error": "Direct migrations disabled in production. Use consolidated migration only."}, status_code=403)
    
    try:
        log_info(f"🔧 Запуск миграции: {migration_name}", "migrations")
        
        if migration_name == "bot_settings":
            from db.migrations.data.bot.migrate_bot_settings import migrate_settings
            result = migrate_settings()
            return {"success": True, "migration": migration_name, "result": result}

        elif migration_name == "salon_settings":
            from db.migrations.data.salon.migrate_salon_settings import migrate_salon_settings
            result = migrate_salon_settings()
            return {"success": True, "migration": migration_name, "result": result}

        elif migration_name == "employees":
            from db.migrations.schema.employees.create_employees import create_employees_table
            # Employees are now seeded in db/init.py
            # from db.migrations.data.employees.seed_employees import seed_employees
            create_employees_table()
            # seed_employees()
            return {"success": True, "migration": migration_name}

        elif migration_name == "permissions":
            from db.migrations.schema.permissions.add_permissions_system import add_permissions_system
            add_permissions_system()
            return {"success": True, "migration": migration_name}

        elif migration_name == "manager_consultation":
            from db.migrations.schema.bot.add_manager_consultation import add_manager_consultation_field
            add_manager_consultation_field()
            return {"success": True, "migration": migration_name}
        
        else:
            return JSONResponse(
                {"error": f"Unknown migration: {migration_name}"}, 
                status_code=400
            )
    
    except Exception as e:
        log_error(f"❌ Ошибка миграции {migration_name}: {e}", "migrations")
        import traceback
        log_error(traceback.format_exc(), "migrations")
        return JSONResponse(
            {"error": str(e), "traceback": traceback.format_exc()},
            status_code=500
        )

@app.get("/admin/diagnostics")
async def get_diagnostics(user: dict = Depends(get_current_user)):
    """Получить диагностику БД (только для директора)"""
    if user["role"] != 'director' and os.getenv("ENVIRONMENT") == "production":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Собираем данные
        diagnostics = {
            "database": os.getenv('POSTGRES_DB', 'beauty_crm'),
            "tables": {},
            "bot_settings": {},
            "employees": []
        }
        
        # Таблицы
        if os.getenv('DATABASE_TYPE') == 'postgresql':
            c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
        else:
            c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' ORDER BY tablename")
        tables = [row[0] for row in c.fetchall()]
        
        for table in tables:
            c.execute(f"SELECT COUNT(*) FROM {table}")
            count = c.fetchone()[0]
            diagnostics["tables"][table] = count
        
        # bot_settings
        if 'bot_settings' in tables:
            c.execute("SELECT * FROM bot_settings LIMIT 1")
            row = c.fetchone()
            if row:
                if os.getenv('DATABASE_TYPE') == 'postgresql':
                    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='bot_settings'")
                    columns = [col[0] for col in c.fetchall()]
                else:
                    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bot_settings'")
                    columns = [col[1] for col in c.fetchall()]
                diagnostics["bot_settings"] = dict(zip(columns, row))
        
        # employees
        if 'employees' in tables or 'users' in tables: # users is the new table name
            # Check if users table has is_service_provider column
            if 'users' in tables:
                 c.execute("SELECT full_name, position, is_active FROM users WHERE is_service_provider = TRUE ORDER BY sort_order")
            else:
                 c.execute("SELECT full_name, position, is_active FROM employees WHERE is_active = TRUE") # Fallback for old table

            diagnostics["employees"] = [
                {"name": row[0], "position": row[1], "active": bool(row[2])}
                for row in c.fetchall()
            ]
        
        conn.close()
        return diagnostics

    except Exception as e:
        log_error(f"❌ Ошибка диагностики: {e}", "diagnostics")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/diagnostics/full")
async def run_full_diagnostics_endpoint():
    """Запустить полную диагностику системы (только для разработки)"""
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse({"error": "Diagnostics disabled in production"}, status_code=403)

    try:
        log_info("🔍 Запуск полной диагностики через API...", "diagnostics")

        # Импортируем и запускаем диагностику
        from scripts.diagnostics.diagnostic_full import run_full_diagnostics

        result = await run_full_diagnostics()

        return {
            "success": True,
            "diagnostics": result,
            "message": "Полная диагностика завершена. Проверьте логи для деталей."
        }

    except Exception as e:
        log_error(f"❌ Ошибка полной диагностики: {e}", "diagnostics")
        import traceback
        return JSONResponse(
            {
                "error": str(e),
                "traceback": traceback.format_exc()
            },
            status_code=500
        )

# ===== ЗАПУСК ПРИЛОЖЕНИЯ =====

@app.on_event("startup")
async def startup_event():
    """При запуске приложения"""
    log_info("=" * 70, "startup")
    log_info("🚀 Запуск CRM системы...", "startup")

    # ================================
    # ЦЕНТРАЛИЗОВАННЫЕ МИГРАЦИИ
    # ================================
    # Запускаются все миграции при каждом старте (идемпотентны)
    # Внутри run_all_migrations() происходит:
    # 1. Создание БД если не существует (recreate_database)
    # 2. Инициализация базовых таблиц (init_database)
    # 3. Все консолидированные миграции
    from db.migrations.run_all_migrations import run_all_migrations
    log_info("🔧 Запуск миграций...", "startup")
    run_all_migrations()  # Will be called later at line 599
    
    # ================================
    # УДАЛЕНИЕ БАЗЫ ДАННЫХ (ОПЦИОНАЛЬНО)
    # ================================
    # Раскомментируй для полного удаления и пересоздания БД
    # ВНИМАНИЕ: Это удалит ВСЕ данные!
    # from scripts.maintenance.recreate_database import drop_database
    # log_info("⚠️  Удаление базы данных...", "startup")
    # drop_database()
    # from db.migrations.run_all_migrations import run_all_migrations
    # run_all_migrations()  # Пересоздать после удаления

    # ================================
    # ПОЛУЧЕНИЕ НАСТРОЕК САЛОНА
    # ================================
    # Инициализация пула соединений
    from db.connection import init_connection_pool, get_db_connection
    log_info("🔌 Инициализация connection pool...", "startup")
    init_connection_pool()
    
    # Предварительное "прогревание" pool - создаем несколько соединений заранее
    # чтобы первый запрос не ждал создания соединений
    log_info("🔥 Прогревание connection pool...", "startup")
    try:
        import threading
        warmup_connections = []
        warmup_lock = threading.Lock()
        
        def warmup_connection(i):
            try:
                conn = get_db_connection()
                with warmup_lock:
                    warmup_connections.append(conn)
                # Делаем простой запрос для проверки соединения
                c = conn.cursor()
                c.execute("SELECT 1")
                c.fetchone()
                conn.close()
            except Exception as e:
                log_error(f"⚠️ Ошибка при прогревании соединения {i+1}: {e}", "startup")
        
        # Прогреваем параллельно для ускорения
        threads = []
        for i in range(10):  # Увеличено до 10 соединений
            thread = threading.Thread(target=warmup_connection, args=(i+1,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        # Ждем завершения всех потоков (максимум 5 секунд)
        for thread in threads:
            thread.join(timeout=5.0)
        
        log_info(f"✅ Connection pool прогрет: {len(warmup_connections)} соединений готовы", "startup")
    except Exception as e:
        log_error(f"⚠️ Ошибка при прогревании pool: {e}", "startup")
    
    # Получаем настройки ПОСЛЕ миграций
    global salon

    salon = get_salon_settings()
    log_info(f"✅ Настройки загружены: {salon['name']}", "startup")
 
    try:
        # Plans table is now handled by schema_other.py
        # Analytics indexes are now handled by schema_clients.py and schema_bookings.py
        pass
    except Exception as e:
        log_error(f"⚠️ Ошибка миграций аналитики: {e}", "startup")

    # ================================
    # ТЕСТЫ
    # ================================
    # ================================
    # ТЕСТЫ И ИСПРАВЛЕНИЯ (ТОЛЬКО ДЛЯ DEV)
    # ================================
    if os.getenv("ENVIRONMENT") != "production":
        from scripts.run_all_fixes import main as run_all_fixes
        log_info("🔧 Запуск всех исправлений...", "startup")
        await run_all_fixes()

        # from tests.run_all_tests import run_all_tests
        # log_info("🧪 Запуск всех тестов...", "startup")
        # run_all_tests()
    else:
        log_info("ℹ️ Skip fixes and tests in production", "startup")

    # Инициализация бота
    bot = get_bot()
    log_info(f"🤖 Бот инициализирован: {bot.salon['name']}", "startup")

    # Загрузка модулей
    from modules import print_modules_status, is_module_enabled
    print_modules_status()

    # run_all_migrations()  # Автоматически создаст таблицы для системы записей
    # await run_all_fixes()
    # run_all_tests()

    # ================================
    # ПЛАНИРОВЩИКИ (исправлено: теперь используют asyncio.create_task)
    # ================================
    # ИСПРАВЛЕНИЕ: Планировщики переписаны для использования asyncio.create_task()
    # вместо threading.Thread + asyncio.run(), что устраняет конфликт с FastAPI event loop
    #
    if is_module_enabled('scheduler'):
        start_birthday_checker()
        start_client_birthday_checker()
        start_booking_reminder_checker()
        start_task_checker()
        
        # ✅ Запуск планировщика напоминаний (Instagram)
        from services.reminder_service import check_and_send_reminders
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        
        scheduler = AsyncIOScheduler(job_defaults={'misfire_grace_time': 3600}) # 1 hour grace time

        # Запускаем проверку instagram напоминаний каждые 30 минут
        scheduler.add_job(
            check_and_send_reminders,
            'interval',
            minutes=30,
            id='instagram_reminders'
        )

        # ✅ Запуск проверки брошенных диалогов (каждые 10 минут)
        from bot.reminders.abandoned import check_abandoned_bookings
        scheduler.add_job(
            check_abandoned_bookings,
            'interval',
            minutes=10,
            id='abandoned_bookings'
        )

        # ✅ Запрос отзывов (каждый час)
        from bot.reminders.feedback import check_visits_for_feedback
        scheduler.add_job(
            check_visits_for_feedback,
            'interval',
            minutes=60,
            id='feedback_requests'
        )

        # ✅ Возвращение клиентов (раз в сутки в 11:00)
        from bot.reminders.retention import check_client_retention
        scheduler.add_job(
            check_client_retention,
            'cron',
            hour=11,
            minute=0,
            id='retention_check'
        )
        
        # ✅ Напоминания о записи через месседжер (каждые 30 минут)
        from bot.reminders.appointments import check_appointment_reminders
        scheduler.add_job(
            check_appointment_reminders,
            'interval',
            minutes=30,
            id='appointment_reminders'
        )

        # ✅ Ежедневная очистка (housekeeping) в 03:00 ночи
        from scripts.maintenance.housekeeping import run_housekeeping
        scheduler.add_job(
            run_housekeeping,
            'cron',
            hour=3,
            minute=0,
            id='housekeeping_task'
        )

        
        # ✅ Очистка устаревших сессий (каждые 6 часов)
        from scripts.cleanup_sessions import cleanup_expired_sessions
        scheduler.add_job(
            cleanup_expired_sessions,
            'interval',
            hours=6,
            id='cleanup_sessions'
        )
        
        scheduler.start()
        log_info("✅ Schedulers started: Instagram (30m), Abandoned (10m), Feedback (60m)", "startup")
        
        log_info("✅ Планировщики запущены с async поддержкой", "startup")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",  # Use import string for workers to work
        host="0.0.0.0",
        port=port,
        log_level="info",
        workers=4
    )
