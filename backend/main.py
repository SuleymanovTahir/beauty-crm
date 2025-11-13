"""
Главный файл FastAPI приложения
"""
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import time

from logger import logger, log_info, log_error, log_critical,log_warning
from config import DATABASE_NAME
from db import init_database
from db.settings import get_salon_settings
from bot import get_bot
from utils import ensure_upload_directories

# Импорт роутеров
from api import router as api_router
from auth import router as auth_router
from webhooks import router as webhooks_router
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
from api.notes import router as notes_router
from scheduler import start_birthday_checker
from api.internal_chat import router as internal_chat_router



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
app.include_router(notes_router, prefix="/api")
app.include_router(public_router, prefix="/public")
# Специальные роутеры (БЕЗ /api)
app.include_router(webhooks_router)  # для Instagram webhook
app.include_router(proxy_router, prefix="/api")   # для прокси изображений
app.include_router(internal_chat_router)


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
            from db.migrations.migrate_bot_settings import migrate_settings
            result = migrate_settings()
            return {"success": True, "migration": migration_name, "result": result}
        
        elif migration_name == "salon_settings":
            from db.migrations.migrate_salon_settings import migrate_salon_settings
            result = migrate_salon_settings()
            return {"success": True, "migration": migration_name, "result": result}
        
        elif migration_name == "employees":
            from db.migrations.create_employees import create_employees_tables
            create_employees_tables()
            from db.migrations.seed_employees import seed_employees
            seed_employees()
            return {"success": True, "migration": migration_name}
        
        elif migration_name == "permissions":
            from db.migrations.add_permissions_system import add_permissions_system
            add_permissions_system()
            return {"success": True, "migration": migration_name}
        
        elif migration_name == "manager_consultation":
            from db.migrations.add_manager_consultation import add_manager_consultation_field
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
    
    import sqlite3
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Собираем данные
        diagnostics = {
            "database": DATABASE_NAME,
            "tables": {},
            "bot_settings": {},
            "employees": []
        }
        
        # Таблицы
        c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
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
                c.execute("PRAGMA table_info(bot_settings)")
                columns = [col[1] for col in c.fetchall()]
                diagnostics["bot_settings"] = dict(zip(columns, row))
        
        # employees
        if 'employees' in tables:
            c.execute("SELECT full_name, position, is_active FROM employees ORDER BY sort_order")
            diagnostics["employees"] = [
                {"name": row[0], "position": row[1], "active": bool(row[2])}
                for row in c.fetchall()
            ]
        
        conn.close()
        return diagnostics
        
    except Exception as e:
        log_error(f"❌ Ошибка диагностики: {e}", "diagnostics")
        return JSONResponse({"error": str(e)}, status_code=500)

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
        
        #Миграция настроек салона
        # from db.migrations.migrate_salon_settings import migrate_salon_settings
        # migrate_salon_settings()  # <- Запустить ПЕРВЫМ.

        # from db.migrations.add_permissions_system import add_permissions_system
        # add_permissions_system()

        # from db.migrations.add_bot_modes import add_bot_mode_fields
        # add_bot_mode_fields()

        # from db.migrations.add_manager_consultation import add_manager_consultation_field
        # add_manager_consultation_field()

        # from db.migrations.migrate_services import migrate_services
        # migrate_services()

        # from db.migrations.migrate_bot_settings import migrate_settings
        # migrate_settings()
        

        # from db.migrations.create_employees import create_employees_tables
        # create_employees_tables()

        # from db.migrations.seed_employees import seed_employees
        # seed_employees()


        # from scheduler.birthday_checker import start_booking_scheduler
        # start_booking_scheduler()

        # Миграция #5 - Таблица интересов клиентов
        # from db.migrations.add_client_interests import add_client_interests_table
        # add_client_interests_table()
        
        # Миграция #17 - Таблица листа ожидания  
        # from db.migrations.add_waitlist import add_waitlist_table
        # add_waitlist_table()
        
        # Миграция #21 - Поле temperature в clients
        # from db.migrations.add_temperature_field import add_temperature_field
        # add_temperature_field()
        
        # Миграция #11 - Таблица курсов услуг
        # from db.migrations.add_service_courses import add_service_courses_table
        # add_service_courses_table()
        
        # from db.migrations.add_master_field import add_master_field
        # add_master_field()

        # from db.migrations.link_employees_to_services import link_employees_to_services
        # link_employees_to_services()

        # from db.migrations.add_employee_translations import add_employee_translations
        # add_employee_translations()


        bot = get_bot()
        log_info(f"🤖 Бот инициализирован: {bot.salon['name']}", "startup")
        
        # ✅ НОВОЕ: Запуск планировщика дней рождения
        start_birthday_checker()
        
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
    def diagnose_database():
        import sqlite3
    
        try:
            conn = sqlite3.connect(DATABASE_NAME)
            c = conn.cursor()

            log_info("=" * 70, "diagnostics")
            log_info("🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ", "diagnostics")
            log_info("=" * 70, "diagnostics")

            # Таблицы
            c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
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

                c.execute("PRAGMA table_info(bot_settings)")
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
            if 'employees' in tables:
                log_info("", "diagnostics")
                log_info("👥 EMPLOYEES ДЕТАЛЬНО:", "diagnostics")

                c.execute("SELECT COUNT(*) FROM employees")
                count = c.fetchone()[0]
                log_info(f"   Записей: {count}", "diagnostics")

                if count > 0:
                    c.execute("SELECT full_name, position FROM employees ORDER BY sort_order")
                    for i, row in enumerate(c.fetchall(), 1):
                        log_info(f"   {i}. {row[0]} - {row[1]}", "diagnostics")
                else:
                    log_warning("   ⚠️  Таблица пуста! Запустите seed_employees", "diagnostics")
            else:
                log_warning("   ❌ Таблица employees не создана!", "diagnostics")

            log_info("=" * 70, "diagnostics")
            log_info("✅ ДИАГНОСТИКА ЗАВЕРШЕНА", "diagnostics")
            log_info("=" * 70, "diagnostics")

            conn.close()

        except Exception as e:
            log_error(f"❌ Ошибка диагностики: {e}", "diagnostics")
            import traceback
            log_error(traceback.format_exc(), "diagnostics")

