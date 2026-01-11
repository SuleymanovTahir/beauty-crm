"""
Заглушки для недостающих admin API endpoints
Эти endpoints вызываются frontend'ом, но не реализованы в backend
"""
from fastapi import APIRouter, Depends
from utils.utils import get_current_user

router = APIRouter()


@router.get("/menu-settings")
async def get_menu_settings(current_user: dict = Depends(get_current_user)):
    """Получить настройки меню"""
    return {
        "items": [],
        "customization": {}
    }


@router.get("/funnel/stages")
async def get_funnel_stages(current_user: dict = Depends(get_current_user)):
    """Получить этапы воронки продаж"""
    return {
        "stages": []
    }


@router.get("/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    """Получить список продуктов/товаров"""
    return {
        "products": [],
        "total": 0
    }


@router.get("/products/categories")
async def get_product_categories(current_user: dict = Depends(get_current_user)):
    """Получить категории продуктов"""
    return {
        "categories": []
    }


@router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    """Получить список счетов"""
    return {
        "invoices": [],
        "total": 0
    }


@router.get("/invoices/stages")
async def get_invoice_stages(current_user: dict = Depends(get_current_user)):
    """Получить этапы обработки счетов"""
    return {
        "stages": []
    }


@router.get("/contracts")
async def get_contracts(current_user: dict = Depends(get_current_user)):
    """Получить список договоров"""
    return {
        "contracts": [],
        "total": 0
    }


@router.get("/contract-types")
async def get_contract_types(current_user: dict = Depends(get_current_user)):
    """Получить типы договоров"""
    return {
        "types": []
    }


@router.get("/contracts/stages")
async def get_contract_stages(current_user: dict = Depends(get_current_user)):
    """Получить этапы обработки договоров"""
    return {
        "stages": []
    }


@router.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    """Получить список задач"""
    return {
        "tasks": [],
        "total": 0
    }


@router.get("/tasks/stages")
async def get_task_stages(current_user: dict = Depends(get_current_user)):
    """Получить этапы задач"""
    return {
        "stages": []
    }


@router.get("/tasks/analytics")
async def get_task_analytics(current_user: dict = Depends(get_current_user)):
    """Получить аналитику по задачам"""
    return {
        "completed": 0,
        "in_progress": 0,
        "overdue": 0,
        "total": 0
    }


@router.get("/payment-providers")
async def get_payment_providers(current_user: dict = Depends(get_current_user)):
    """Получить список платежных провайдеров"""
    return {
        "providers": []
    }


@router.get("/marketplace-providers")
async def get_marketplace_providers(current_user: dict = Depends(get_current_user)):
    """Получить список маркетплейсов"""
    return {
        "providers": []
    }


@router.get("/marketplace/stats")
async def get_marketplace_stats(current_user: dict = Depends(get_current_user)):
    """Получить статистику по маркетплейсам"""
    return {
        "total_sales": 0,
        "total_revenue": 0,
        "by_provider": []
    }


@router.get("/admin/audit-log")
async def get_audit_log(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Получить лог аудита"""
    return {
        "logs": [],
        "total": 0
    }


@router.get("/admin/audit-log/summary")
async def get_audit_log_summary(current_user: dict = Depends(get_current_user)):
    """Получить сводку по логам аудита"""
    return {
        "total_events": 0,
        "by_type": {},
        "recent_activities": []
    }


@router.get("/admin/trash")
async def get_trash(current_user: dict = Depends(get_current_user)):
    """Получить удаленные элементы (корзина)"""
    return {
        "items": [],
        "total": 0
    }


@router.get("/subscription-types")
async def get_subscription_types(current_user: dict = Depends(get_current_user)):
    """Получить типы подписок"""
    return {
        "types": []
    }


@router.get("/settings/currencies")
async def get_currencies(current_user: dict = Depends(get_current_user)):
    """Получить список валют"""
    return {
        "currencies": [
            {"code": "USD", "symbol": "$", "name": "US Dollar"},
            {"code": "EUR", "symbol": "€", "name": "Euro"},
            {"code": "RUB", "symbol": "₽", "name": "Russian Ruble"},
            {"code": "KZT", "symbol": "₸", "name": "Kazakhstani Tenge"}
        ],
        "default": "USD"
    }


@router.get("/admin/features")
async def get_admin_features(current_user: dict = Depends(get_current_user)):
    """Получить список функций/фич для админки"""
    return {
        "features": []
    }
