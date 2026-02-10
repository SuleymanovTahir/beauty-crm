"""
Заглушки для недостающих admin API endpoints
Эти endpoints вызываются frontend'ом, но не реализованы в backend
"""
from fastapi import APIRouter, Depends
from utils.utils import get_current_user

router = APIRouter()





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
    """Получить список валют из БД или настроек салона"""
    from db.connection import get_db_connection

    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Получаем валюту из настроек салона
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        salon_row = c.fetchone()
        default_currency = salon_row[0] if salon_row and salon_row[0] else "USD"

        # Пробуем получить валюты из таблицы currencies
        c.execute("""
            SELECT code, name, symbol, exchange_rate, is_default
            FROM currencies
            WHERE is_active = TRUE
            ORDER BY is_default DESC, code
        """)
        rows = c.fetchall()

        if rows:
            currencies = []
            for row in rows:
                currencies.append({
                    "code": row[0],
                    "name": row[1],
                    "symbol": row[2],
                    "exchange_rate": row[3],
                    "is_default": row[4]
                })
            return {"currencies": currencies, "default": default_currency}

        # Если таблица пуста - возвращаем базовые валюты
        return {
            "currencies": [
                {"code": "USD", "symbol": "$", "name": "US Dollar"},
                {"code": "EUR", "symbol": "€", "name": "Euro"},
                {"code": "RUB", "symbol": "₽", "name": "Russian Ruble"},
                {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham"},
                {"code": "KZT", "symbol": "₸", "name": "Kazakhstani Tenge"}
            ],
            "default": default_currency
        }
    except Exception as e:
        # Fallback если таблица не существует
        return {
            "currencies": [
                {"code": "USD", "symbol": "$", "name": "US Dollar"},
                {"code": "EUR", "symbol": "€", "name": "Euro"},
                {"code": "RUB", "symbol": "₽", "name": "Russian Ruble"},
                {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham"}
            ],
            "default": "USD"
        }
    finally:
        conn.close()


@router.get("/admin/features")
async def get_admin_features(current_user: dict = Depends(get_current_user)):
    """Получить список функций/фич для админки"""
    return {
        "features": []
    }
