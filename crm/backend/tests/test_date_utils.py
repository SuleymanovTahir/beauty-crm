"""
Утилиты для тестов - динамические даты
"""
from datetime import datetime, timedelta

def get_test_date(days_offset: int = 2) -> str:
    """
    Получить дату для тестов относительно текущей даты
    
    Args:
        days_offset: Количество дней от текущей даты (положительное = будущее, отрицательное = прошлое)
    
    Returns:
        str: Дата в формате YYYY-MM-DD
    """
    target_date = datetime.now() + timedelta(days=days_offset)
    return target_date.strftime("%Y-%m-%d")

def get_test_datetime(days_offset: int = 2, hour: int = 14, minute: int = 0) -> str:
    """
    Получить datetime для тестов относительно текущей даты
    
    Args:
        days_offset: Количество дней от текущей даты
        hour: Час (0-23)
        minute: Минута (0-59)
    
    Returns:
        str: Datetime в формате YYYY-MM-DD HH:MM:SS
    """
    target_date = datetime.now() + timedelta(days=days_offset)
    target_datetime = target_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return target_datetime.strftime("%Y-%m-%d %H:%M:%S")

def get_date_range(start_offset: int = 2, end_offset: int = 7):
    """
    Получить диапазон дат для тестов
    
    Args:
        start_offset: Начальная дата (дни от текущей)
        end_offset: Конечная дата (дни от текущей)
    
    Returns:
        tuple: (start_date, end_date) в формате YYYY-MM-DD
    """
    return (get_test_date(start_offset), get_test_date(end_offset))
