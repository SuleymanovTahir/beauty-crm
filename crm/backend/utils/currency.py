"""
Утилита для получения валюты салона из настроек
"""
_cached_currency: dict[str, str] = {}

def get_salon_currency() -> str:
    """
    Получить валюту салона из настроек БД с кешированием
    
    Returns:
        str: Код валюты (например, 'AED', 'USD')
    """
    cache_key = "global"
    
    try:
        from db.settings import get_salon_settings
        from utils.tenant_context import get_current_company_id

        company_id = get_current_company_id()
        if company_id:
            cache_key = f"company:{company_id}"

        cached_value = _cached_currency.get(cache_key)
        if cached_value is not None:
            return cached_value

        currency_value = str(get_salon_settings().get("currency") or "").strip()
        _cached_currency[cache_key] = currency_value
        return currency_value
    except Exception:
        pass
    
    _cached_currency[cache_key] = ""
    return _cached_currency[cache_key]

def clear_currency_cache():
    """Очистить кеш валюты (вызывать при обновлении настроек)"""
    _cached_currency.clear()
