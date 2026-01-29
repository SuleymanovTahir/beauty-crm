"""
Утилита для получения валюты салона из настроек
"""
from typing import Optional

_cached_currency: Optional[str] = None

def get_salon_currency() -> str:
    """
    Получить валюту салона из настроек БД с кешированием
    
    Returns:
        str: Код валюты (например, 'AED', 'USD')
    """
    global _cached_currency
    
    if _cached_currency:
        return _cached_currency
    
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        conn.close()
        
        if row and row[0]:
            _cached_currency = row[0]
            return row[0]
    except Exception:
        pass
    
    # Fallback to env or default
    import os
    default = os.getenv('SALON_CURRENCY', 'AED')
    _cached_currency = default
    return default

def clear_currency_cache():
    """Очистить кеш валюты (вызывать при обновлении настроек)"""
    global _cached_currency
    _cached_currency = None
