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
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response

class CacheControlStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def file_response(self, *args, **kwargs) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000" # 1 year
        return response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time
import os

from utils.logger import logger, log_info, log_error, log_critical,log_warning
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from db import init_database
from db.settings import get_salon_settings
from bot import get_bot
from utils.utils import ensure_upload_directories
from middleware import CacheControlMiddleware

# Force reload check 3

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ВСЕЙ СИСТЕМЫ                                     ║
# ║  Раскомментируйте строку ниже чтобы запускать проверку при старте          ║
# ╚════════════════════════════════════════════════════════════════════════════╝
# from comprehensive_test import run_comprehensive_test

# Импорт роутеров
from api import router as api_router
from core.auth import router as auth_router
from webhooks import router as webhooks_router
from webhooks.telegram import router as telegram_webhook_router
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
from scheduler import start_birthday_checker, start_client_birthday_checker, start_booking_reminder_checker
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
from api.seo_metadata import router as seo_metadata_router

# Создаём директории для загрузок
ensure_upload_directories()

# Получаем настройки салона ПОСЛЕ миграций (будет инициализировано в startup_event)
salon = None

# Инициализация FastAPI
app = FastAPI(title="💎 Beauty CRM")

# Подключение статики и шаблонов
# Подключение статики и шаблонов
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", CacheControlStaticFiles(directory=str(BASE_DIR / "static")), name="static/dist")

# Подключение роутеров
# API роутеры (все через /api)
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
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
# Публичные роутеры (БЕЗ авторизации через /public)
app.include_router(notes_router, prefix="/api")

# Модуль публичных страниц (опциональный)
from modules import is_module_enabled
if is_module_enabled('public'):
    app.include_router(public_router, prefix="/api/public")
    app.include_router(public_content_router, prefix="/api")  # Public content API
    app.include_router(public_employees_router, prefix="/api")  # Public employees API
    app.include_router(gallery_router, prefix="/api")  # Gallery API
    app.include_router(client_auth_router, prefix="/public")  # API для клиентов
    log_info("✅ Модуль 'public' подключен: /api/public/* endpoints", "startup")
# Специальные роутеры (БЕЗ /api)
app.include_router(webhooks_router)  # для Instagram webhook (/webhook)
app.include_router(telegram_webhook_router)  # для Telegram webhook (/webhooks/telegram)
app.include_router(proxy_router, prefix="/api")   # для прокси изображений
app.include_router(internal_chat_router)
app.include_router(sitemap_router)  # для XML sitemap (/sitemap.xml)
app.include_router(seo_metadata_router)  # для SEO метаданных (/api/public/seo-metadata)

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

# GZip сжатие (должно быть одним из первых)
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

# Cache Control для API endpoints (предотвращает кэширование на мобильных)
app.add_middleware(CacheControlMiddleware)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

@app.get("/data-deletion")
async def data_deletion():
    return RedirectResponse(url="/#/data-deletion")

@app.post("/admin/run-migration/{migration_name}")
async def run_migration(migration_name: str):
    """Запустить конкретную миграцию (только для разработки)"""
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse({"error": "Migrations disabled in production"}, status_code=403)
    
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
async def get_diagnostics():
    """Получить диагностику БД (только для разработки)"""
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse({"error": "Diagnostics disabled in production"}, status_code=403)

    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Собираем данные
        diagnostics = {
            "database": DATABASE_NAME,
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
        from diagnostic_full import run_full_diagnostics

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
    # from db.migrations.run_all_migrations import run_all_migrations
    # log_info("🔧 Запуск миграций...", "startup")
    # run_all_migrations()
    
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
    # Раскомментируйте для запуска ВСЕХ тестов при старте
    # Рекомендуется только для development окружения
    # NOTE: Закомментировано - запускайте вручную: python3 tests/run_all_tests.py

    # from scripts.run_all_fixes import main as run_all_fixes
    # log_info("🔧 Запуск всех исправлений...", "startup")
    # await run_all_fixes()



 

    # Инициализация бота
    bot = get_bot()
    log_info(f"🤖 Бот инициализирован: {bot.salon['name']}", "startup")

    # Загрузка модулей
    from modules import print_modules_status, is_module_enabled
    print_modules_status()

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
        
        # ✅ Запуск планировщика напоминаний (Instagram)
        from services.reminder_service import check_and_send_reminders
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        
        scheduler = AsyncIOScheduler()
        
        # Запускаем проверку каждые 30 минут
        scheduler.add_job(
            check_and_send_reminders,
            'interval',
            minutes=30,
            id='instagram_reminders'
        )
        
        scheduler.start()
        log_info("✅ Instagram reminders scheduler started (every 30 minutes)", "startup")
        
        log_info("✅ Планировщики запущены с async поддержкой (включая email-напоминания)", "startup")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
    def diagnose_database():

    
        try:
            conn = get_db_connection()
            c = conn.cursor()

            log_info("=" * 70, "diagnostics")
            log_info("🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ", "diagnostics")
            log_info("=" * 70, "diagnostics")

            # Таблицы
            if os.getenv('DATABASE_TYPE') == 'postgresql':
                c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
            else:
                c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' ORDER BY tablename")
            tables = [row[0] for row in c.fetchall()]
            log_info(f"📋 Таблиц в БД: {len(tables)}", "diagnostics")
            for table in tables:
                c.execute(f"SELECT COUNT(*) FROM {table}")
                count = c.fetchone()[0]
                log_info(f"   ✓ {table}: {count} записей", "diagnostics")

            # bot_settings детально
            if 'bot_settings' in tables:
                log_info("", "diagnostics")
                log_info("🤖 BOT_SETTINGS ДЕТАЛЬНО:", "diagnostics")

                if os.getenv('DATABASE_TYPE') == 'postgresql':
                    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='bot_settings'")
                    columns = [col[0] for col in c.fetchall()]
                else:
                    c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bot_settings'")
                    columns = [col[1] for col in c.fetchall()]
                log_info(f"   Колонок: {len(columns)}", "diagnostics")

                c.execute("SELECT COUNT(*) FROM bot_settings")
                count = c.fetchone()[0]
                log_info(f"   Записей: {count}", "diagnostics")

                if count > 0:
                    # Проверяем ключевые поля
                    fields_to_check = [
                        'bot_name', 'max_message_chars', 'personality_traits',
                        'emoji_usage', 'objection_expensive', 'emotional_triggers'
                    ]

                    for field in fields_to_check:
                        if field in columns:
                            c.execute(f"SELECT {field} FROM bot_settings LIMIT 1")
                            value = c.fetchone()[0]

                            if value:
                                preview = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                                log_info(f"   ✅ {field}: {preview}", "diagnostics")
                            else:
                                log_warning(f"   ⚠️  {field}: ПУСТО", "diagnostics")
                        else:
                            log_warning(f"   ❌ {field}: колонка отсутствует", "diagnostics")

            # employees детально
            if 'users' in tables:
                log_info("", "diagnostics")
                log_info("👥 EMPLOYEES ДЕТАЛЬНО:", "diagnostics")

                c.execute("SELECT COUNT(*) FROM users WHERE is_service_provider = TRUE")
                count = c.fetchone()[0]
                log_info(f"   Записей: {count}", "diagnostics")

                if count > 0:
                    c.execute("SELECT full_name, position FROM users WHERE is_service_provider = TRUE ORDER BY sort_order")
                    for i, row in enumerate(c.fetchall(), 1):
                        log_info(f"   {i}. {row[0]} - {row[1]}", "diagnostics")
                else:
                    log_warning("   ⚠️  Таблица пуста! Запустите seed_employees", "diagnostics")
            else:
                log_warning("   ❌ Таблица users не создана!", "diagnostics")

            log_info("=" * 70, "diagnostics")
            log_info("✅ ДИАГНОСТИКА ЗАВЕРШЕНА", "diagnostics")
            log_info("=" * 70, "diagnostics")

            conn.close()

        except Exception as e:
            log_error(f"❌ Ошибка диагностики: {e}", "diagnostics")
            import traceback
            log_error(traceback.format_exc(), "diagnostics")

# ============================================================================
# POSITIONS API
# ============================================================================

@app.get("/api/positions")
async def get_positions(active_only: bool = True):
    """Получить список всех должностей"""
    try:
        from db.positions import get_all_positions
        positions = get_all_positions(active_only=active_only)
        return {"success": True, "positions": positions}
    except Exception as e:
        log_error(f"Error getting positions: {e}", "api")
        return {"success": False, "error": str(e)}

@app.get("/api/positions/{position_id}")
async def get_position_by_id(position_id: int):
    """Получить должность по ID"""
    try:
        from db.positions import get_position
        position = get_position(position_id)
        if position:
            return {"success": True, "position": position}
        else:
            return {"success": False, "error": "Position not found"}
    except Exception as e:
        log_error(f"Error getting position: {e}", "api")
        return {"success": False, "error": str(e)}

@app.post("/api/positions")
async def create_new_position(request: Request):
    """Создать новую должность"""
    try:
        from db.positions import create_position
        data = await request.json()

        position_id = create_position(
            name=data.get("name"),
            name_en=data.get("name_en"),
            name_ar=data.get("name_ar"),
            description=data.get("description"),
            sort_order=data.get("sort_order", 0)
        )

        if position_id:
            return {"success": True, "position_id": position_id}
        else:
            return {"success": False, "error": "Position with this name already exists"}
    except Exception as e:
        log_error(f"Error creating position: {e}", "api")
        return {"success": False, "error": str(e)}

@app.put("/api/positions/{position_id}")
async def update_position_by_id(position_id: int, request: Request):
    """Обновить должность"""
    try:
        from db.positions import update_position
        data = await request.json()

        success = update_position(position_id, **data)

        if success:
            return {"success": True}
        else:
            return {"success": False, "error": "No fields to update"}
    except Exception as e:
        log_error(f"Error updating position: {e}", "api")
        return {"success": False, "error": str(e)}

@app.delete("/api/positions/{position_id}")
async def delete_position_by_id(position_id: int, hard: bool = False):
    """
    Удалить должность
    hard=False - мягкое удаление (деактивация)
    hard=True - полное удаление из БД
    """
    try:
        from db.positions import delete_position, hard_delete_position

        if hard:
            success = hard_delete_position(position_id)
        else:
            success = delete_position(position_id)

        if success:
            return {"success": True}
        else:
            return {"success": False, "error": "Failed to delete position"}
    except Exception as e:
        log_error(f"Error deleting position: {e}", "api")
        return {"success": False, "error": str(e)}

@app.get("/api/positions/{position_id}/employees")
async def get_employees_by_position_id(position_id: int):
    """Получить всех сотрудников с определенной должностью"""
    try:
        from db.positions import get_employees_by_position
        employees = get_employees_by_position(position_id)
        return {"success": True, "employees": employees}
    except Exception as e:
        log_error(f"Error getting employees by position: {e}", "api")
        return {"success": False, "error": str(e)}