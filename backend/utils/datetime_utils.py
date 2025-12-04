"""
Утилиты для работы с датой и временем с учетом timezone салона
"""
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

def get_salon_timezone() -> str:
    """
    Получить timezone салона из настроек
    
    Returns:
        Строка timezone (например, 'Asia/Dubai')
    """
    try:
        from db.settings import get_salon_settings
        salon = get_salon_settings()
        return salon.get('timezone', 'Asia/Dubai')
    except Exception:
        # Fallback на Dubai если не удалось получить настройки
        return 'Asia/Dubai'

def get_current_time(timezone: Optional[str] = None) -> datetime:
    """
    Получить текущее время с учетом timezone салона
    
    Args:
        timezone: Опциональный timezone (по умолчанию из настроек салона)
    
    Returns:
        Timezone-aware datetime object
    """
    if timezone is None:
        timezone = get_salon_timezone()
    
    try:
        tz = ZoneInfo(timezone)
        return datetime.now(tz)
    except Exception:
        # Fallback на UTC если timezone некорректный
        return datetime.now(ZoneInfo('UTC'))

def format_time_for_display(dt: Optional[datetime] = None) -> str:
    """
    Форматировать время для отображения
    
    Args:
        dt: datetime object (по умолчанию текущее время)
    
    Returns:
        Строка вида "18:13"
    """
    if dt is None:
        dt = get_current_time()
    return dt.strftime('%H:%M')

def format_date_for_display(dt: Optional[datetime] = None) -> str:
    """
    Форматировать дату для отображения
    
    Args:
        dt: datetime object (по умолчанию текущее время)
    
    Returns:
        Строка вида "2025-11-26"
    """
    if dt is None:
        dt = get_current_time()
    return dt.strftime('%Y-%m-%d')

def format_datetime_for_display(dt: Optional[datetime] = None) -> str:
    """
    Форматировать дату и время для отображения
    
    Args:
        dt: datetime object (по умолчанию текущее время)
    
    Returns:
        Строка вида "2025-11-26 18:13"
    """
    if dt is None:
        dt = get_current_time()
    return dt.strftime('%Y-%m-%d %H:%M')
