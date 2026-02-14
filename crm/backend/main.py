"""
Beauty CRM - Основное приложение FastAPI (CRM runtime)
"""
import os
import sys
import threading
import types
import time
from typing import Optional
from contextlib import asynccontextmanager
from pathlib import Path

# --- СОВМЕСТИМОСТЬ С PYTHON 3.13+ ---
if sys.version_info >= (3, 13) and "cgi" not in sys.modules:
    cgi_patch = types.ModuleType("cgi")
    cgi_patch.escape = lambda s, quote=True: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")
    sys.modules["cgi"] = cgi_patch

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Основные утилиты
from utils.logger import log_info, log_error
from core.config import is_localhost
from db.connection import init_connection_pool, get_db_connection
from scripts.maintenance.recreate_database import drop_database, recreate_database  # Uncomment only for manual DB reset
from db.settings import get_salon_settings
from utils.utils import ensure_upload_directories
from middleware import TimingMiddleware
from middleware.user_activity import UserActivityMiddleware

# Архитектура роутеров (Единый источник истины - SSOT)
from product_groups.shared import mount_shared_routers
from product_groups.crm import (
    mount_crm_routers,
    start_crm_runtime_services,
    start_crm_schedulers,
    CRM_MODULE_ROUTE_MATCHERS,
    RUNTIME_CRM_ONLY_PREFIXES,
)
from utils.redis_pubsub import redis_pubsub
import asyncio

# Глобальное состояние приложения
salon_config = None
_feature_gate_cache = {
    "expires_at": 0.0,
    "crm_modules": {},
}

_CRM_MODULE_ROUTE_MATCHERS = CRM_MODULE_ROUTE_MATCHERS
_RUNTIME_CRM_ONLY_PREFIXES = RUNTIME_CRM_ONLY_PREFIXES


def _normalize_feature_flag(raw_value, default_value: bool) -> bool:
    if raw_value is None:
        return default_value
    if isinstance(raw_value, str):
        normalized = raw_value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return default_value
    return bool(raw_value)


def _path_matches(path: str, prefix: str) -> bool:
    if path == prefix:
        return True
    return path.startswith(f"{prefix}/")


def _normalize_crm_modules(raw_modules) -> dict:
    if not isinstance(raw_modules, dict):
        return {}

    normalized_modules = {}
    for module_key, module_enabled in raw_modules.items():
        normalized_modules[module_key] = _normalize_feature_flag(module_enabled, True)
    return normalized_modules


def _resolve_crm_module_by_path(path: str) -> Optional[str]:
    for module_key, prefixes in _CRM_MODULE_ROUTE_MATCHERS:
        for prefix in prefixes:
            if _path_matches(path, prefix):
                return module_key
    return None


def _get_feature_gates_cached() -> dict:
    now = time.time()
    if _feature_gate_cache["expires_at"] > now:
        return {
            "crm_modules": _feature_gate_cache["crm_modules"],
        }

    try:
        settings = get_salon_settings()
        business_profile_config = settings.get("business_profile_config")
        crm_modules = {}
        if isinstance(business_profile_config, dict):
            module_matrix = business_profile_config.get("modules")
            if isinstance(module_matrix, dict):
                crm_modules = _normalize_crm_modules(module_matrix.get("crm"))
    except Exception as error:
        log_error(f"Feature-gate load failed: {error}", "feature-gates")
        crm_modules = {}

    _feature_gate_cache["crm_modules"] = crm_modules
    _feature_gate_cache["expires_at"] = now + 10

    return {
        "crm_modules": crm_modules,
    }


class ModernStaticFiles(StaticFiles):
    """Статические файлы с агрессивным кешированием"""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=3600"
        return response


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом базы данных, CRM сервисов и планировщиков"""
    log_info("=" * 60, "boot")
    log_info("🚀 Двигатель CRM запускается...", "boot")
    log_info("🧭 Runtime backend group: crm", "boot")

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
    redis_ready = await redis_pubsub.connect()
    app.state.redis_listener = asyncio.create_task(redis_pubsub.start_listening())
    if redis_ready:
        log_info("✅ Redis Pub/Sub listener started", "boot")
    else:
        if redis_pubsub.redis_enabled:
            log_info("ℹ️ Redis Pub/Sub unavailable at startup. Local-only WS delivery is active.", "boot")
        else:
            log_info("ℹ️ Redis Pub/Sub disabled (REDIS_ENABLED=false). Local-only WS delivery is active.", "boot")

    try:
        def warmup():
            try:
                conn = get_db_connection()
                conn.cursor().execute("SELECT 1")
                conn.close()
            except Exception:
                pass

        w_threads = [threading.Thread(target=warmup, daemon=True) for _ in range(10)]
        for thread in w_threads:
            thread.start()
        for thread in w_threads:
            thread.join(timeout=1.0)
        log_info("✅ Пул соединений прогрет", "boot")
    except Exception as error:
        log_error(f"⚠️  Проблема при прогреве пула: {error}", "boot")

    # 4. Синхронизация схемы БД (по умолчанию отключено в production)
    run_db_sync = _env_flag(
        "RUN_STARTUP_DB_SYNC",
        default=(os.getenv("ENVIRONMENT") != "production"),
    )
    if run_db_sync:
        from db.migrations.run_all_migrations import run_all_migrations

        run_all_migrations()
    else:
        log_info("⏭️ Startup DB sync skipped (RUN_STARTUP_DB_SYNC=false)", "boot")

    # 5. Конфигурация
    global salon_config
    salon_config = get_salon_settings()
    log_info(f"✅ Конфигурация салона: {salon_config['name']}", "boot")

    # 6. Опциональные data-fixes (по умолчанию выключено)
    if _env_flag("RUN_STARTUP_DATA_FIXES", default=False):
        from scripts.maintenance.fix_data import run_all_fixes

        run_all_fixes()
    else:
        log_info("⏭️ Startup data fixes skipped (RUN_STARTUP_DATA_FIXES=false)", "boot")

    # [MANUAL DEBUG HOOKS] Keep commented; enable only for local diagnostics.
    # from db.migrations.run_all_migrations import run_all_migrations
    # run_all_migrations()
    # from scripts.maintenance.fix_data import run_all_fixes
    # run_all_fixes()
    # from tests.run_all_tests import run_all_tests
    # run_all_tests()
    # from tests.run_all_test2 import run_all_tests2
    # run_all_tests2()
    # from tests.run_all_test3 import run_all_tests3
    # run_all_tests3()

    # 7. CRM сервисы
    start_crm_runtime_services()

    # 8. Периодические задачи
    schedulers_started = start_crm_schedulers()
    if not schedulers_started:
        log_info("⏭️ CRM schedulers skipped (scheduler module disabled)", "boot")

    yield

    # 9. Завершение работы
    log_info("🛑 Двигатель CRM безопасно останавливается...", "shutdown")

    await redis_pubsub.stop()
    if hasattr(app.state, "redis_listener"):
        app.state.redis_listener.cancel()
        try:
            await app.state.redis_listener
        except asyncio.CancelledError:
            pass


# Подключение ресурсов
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"


def _resolve_cors_policy() -> tuple[list[str], Optional[str]]:
    # При allow_credentials=True нельзя использовать "*", поэтому используем динамический список или регулярку
    cors_origins = ["*"]
    cors_allow_origin_regex = None

    if os.getenv("ENVIRONMENT") == "development" or is_localhost():
        cors_allow_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?"
        cors_origins = []
        return cors_origins, cors_allow_origin_regex

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

    return cors_origins, cors_allow_origin_regex


async def feature_gate_middleware(request: Request, call_next):
    path = request.url.path

    if path.startswith("/api/"):
        matched_module_key = _resolve_crm_module_by_path(path)
        is_runtime_crm_prefix = any(_path_matches(path, prefix) for prefix in _RUNTIME_CRM_ONLY_PREFIXES)
        if is_runtime_crm_prefix and matched_module_key is None:
            return await call_next(request)

        if matched_module_key is not None:
            gates = _get_feature_gates_cached()
            crm_modules = gates.get("crm_modules")
            if isinstance(crm_modules, dict):
                module_enabled = _normalize_feature_flag(crm_modules.get(matched_module_key), True)
                if not module_enabled:
                    return JSONResponse(
                        status_code=404,
                        content={
                            "error": "crm_module_disabled",
                            "module": matched_module_key,
                            "message": "CRM module is disabled for this workspace",
                        },
                    )

    return await call_next(request)


def _register_middlewares(app: FastAPI):
    limiter = Limiter(
        key_func=get_remote_address,
        enabled=(os.getenv("ENVIRONMENT") == "production"),
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    cors_origins, cors_allow_origin_regex = _resolve_cors_policy()
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
    app.middleware("http")(feature_gate_middleware)


def _register_static_assets(app: FastAPI):
    app.mount("/static", ModernStaticFiles(directory=str(BASE_DIR / "static")), name="static")

    frontend_img_candidates = [
        FRONTEND_DIR / "dist" / "landing-images",
        BASE_DIR / "static" / "images",
    ]
    for frontend_img_dir in frontend_img_candidates:
        if frontend_img_dir.exists():
            app.mount("/landing-images", ModernStaticFiles(directory=str(frontend_img_dir)), name="landing_images")
            break


def _register_product_routers(app: FastAPI):
    mount_shared_routers(app)
    mount_crm_routers(app)


def _register_runtime_endpoints(app: FastAPI):
    @app.api_route("/health", methods=["GET", "HEAD"])
    async def health_check():
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            db_status = "ok"
        except Exception as error:
            log_error(f"Health check DB error: {error}", "health")
            db_status = "error"

        return {
            "status": "ok" if db_status == "ok" else "degraded",
            "database": db_status,
            "version": "2.0",
            "backend_product_group": "crm",
            "crm_runtime_enabled": True,
            "site_runtime_enabled": False,
        }

    @app.get("/api/runtime-profile")
    async def runtime_profile():
        return {
            "backend_product_group": "crm",
            "crm_runtime_enabled": True,
            "site_runtime_enabled": False,
        }

    @app.get("/")
    async def root():
        return RedirectResponse(url="/static/index.html")


def create_app() -> FastAPI:
    app = FastAPI(title="Beauty CRM", lifespan=lifespan)
    app.state.backend_product_group = "crm"

    _register_middlewares(app)
    _register_static_assets(app)
    _register_product_routers(app)
    _register_runtime_endpoints(app)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
