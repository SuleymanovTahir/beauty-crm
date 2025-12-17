"""
API модуль - REST endpoints для CRM системы
"""
from fastapi import APIRouter
from .clients import router as clients_router
from .bookings import router as bookings_router
from .services import router as services_router
from .analytics import router as analytics_router
from .salary import router as salary_router
from .users import router as users_router
from .settings import router as settings_router
from .export import router as export_router
from .chat import router as chat_router
from .roles import router as roles_router
from .uploads import router as uploads_router
from .employees import router as employees_router
from api.diagnostics import router as diagnostics_router
from .client_auth import router as client_auth_router

# Главный роутер API
router = APIRouter(tags=["API"])

# Подключаем все роутеры
router.include_router(clients_router)
router.include_router(bookings_router)
router.include_router(services_router)
router.include_router(analytics_router)
router.include_router(users_router)
router.include_router(settings_router)
router.include_router(export_router)
router.include_router(chat_router)
router.include_router(roles_router)
router.include_router(uploads_router)
router.include_router(employees_router)
router.include_router(diagnostics_router)
router.include_router(salary_router)
router.include_router(client_auth_router)

__all__ = ["router"]