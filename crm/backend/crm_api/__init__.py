"""
API модуль - REST endpoints для CRM системы
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

def _safe_import(module_name: str, alias: str):
    try:
        mod = __import__(f'crm_api.{module_name}', fromlist=['router'])
        return mod.router
    except Exception as e:
        logger.warning(f"Skipping router {module_name}: {e}")
        return None

# Главный роутер API
router = APIRouter(tags=["API"])

_modules = [
    'notes', 'templates', 'clients', 'bookings', 'services', 'analytics',
    'users', 'settings', 'export', 'chat', 'roles', 'permissions', 'uploads',
    'employees', 'employee_services', 'diagnostics', 'salary', 'payroll',
    'platform_admin', 'trash', 'loyalty', 'broadcasts', 'cashbox', 'challenges',
    'contracts', 'funnel', 'gift_cards', 'holidays', 'inventory', 'invoices',
    'kpi', 'marketplace_integrations', 'menu_settings', 'messengers',
    'notifications', 'payment_integrations', 'plans', 'products', 'promo_codes',
    'recordings', 'referral_links', 'service_bundles', 'service_change_requests',
    'statuses', 'tasks', 'telephony', 'waitlist', 'audit_log',
]

for _mod in _modules:
    _r = _safe_import(_mod, _mod)
    if _r is not None:
        router.include_router(_r)

__all__ = ["router"]
