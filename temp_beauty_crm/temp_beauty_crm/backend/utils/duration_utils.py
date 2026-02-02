"""
Утилиты для работы с длительностью услуг
Преобразование между минутами и читаемым форматом
"""
import re
from typing import Optional


# Карта единиц времени для всех поддерживаемых языков
# Синхронизировано с frontend/public/locales/
DURATION_FORMATS = {
    'ru': {'hour': 'ч', 'minute': 'мин'},
    'en': {'hour': 'h', 'minute': 'min'},
    'ar': {'hour': 'س', 'minute': 'د'},  # ساعة (час), دقيقة (минута)
    'de': {'hour': 'Std', 'minute': 'Min'},
    'es': {'hour': 'h', 'minute': 'min'},
    'fr': {'hour': 'h', 'minute': 'min'},
    'hi': {'hour': 'घंटा', 'minute': 'मिनट'},
    'kk': {'hour': 'сағ', 'minute': 'мин'},
    'pt': {'hour': 'h', 'minute': 'min'},
}

# Паттерны для парсинга длительности (универсальные для всех языков)
# Поддерживает: h, ч, час, hours, min, мин, минут, minutes и т.д.
HOUR_PATTERNS = [
    r'(\d+)\s*(?:h|ч|час|hours?|std|сағ|घंटा)',  # Английский, русский, немецкий, казахский, хинди
]

MINUTE_PATTERNS = [
    r'(\d+)\s*(?:min|мин|минут|minutes?|म|мин|д)',  # Все варианты минут
]


def parse_duration_to_minutes(duration_str: Optional[str]) -> Optional[int]:
    """
    Парсит строку длительности в минуты (универсальный для всех языков)
    
    Примеры:
        "1h" -> 60
        "2h" -> 120
        "1h 30min" -> 90
        "30min" -> 30
        "90" -> 90 (уже в минутах)
        "90min" -> 90
        "1ч 30" -> 90
        "1ч 30мин" -> 90
        "2 Std 15 Min" -> 135 (немецкий)
    
    Args:
        duration_str: Строка с длительностью в любом формате
        
    Returns:
        Длительность в минутах или None если не удалось распарсить
    """
    if not duration_str:
        return None
    
    duration_str = str(duration_str).strip()
    
    # Если уже число - возвращаем его
    if duration_str.isdigit():
        return int(duration_str)
    
    hours = 0
    minutes = 0
    
    # Ищем часы используя все паттерны
    for pattern in HOUR_PATTERNS:
        hour_match = re.search(pattern, duration_str, re.IGNORECASE)
        if hour_match:
            hours = int(hour_match.group(1))
            # Удаляем найденные часы из строки
            duration_str = re.sub(pattern, '', duration_str, flags=re.IGNORECASE).strip()
            break
    
    # Ищем минуты в оставшейся строке
    for pattern in MINUTE_PATTERNS:
        minute_match = re.search(pattern, duration_str, re.IGNORECASE)
        if minute_match:
            minutes = int(minute_match.group(1))
            break
    
    # Если ничего не нашли через паттерны, но осталось число - это минуты
    if hours == 0 and minutes == 0 and duration_str.isdigit():
        minutes = int(duration_str)
    
    # Если всё ещё ничего не нашли, возвращаем None
    if hours == 0 and minutes == 0:
        return None
    
    return hours * 60 + minutes


def format_duration_display(minutes: Optional[int], language: str = 'ru') -> str:
    """
    Форматирует длительность в минутах в читаемый формат
    Поддерживает все языки из frontend/public/locales/
    
    Примеры (для ru):
        60 -> "1ч"
        90 -> "1ч 30мин"
        30 -> "30мин"
        120 -> "2ч"
        150 -> "2ч 30мин"
    
    Примеры (для en):
        60 -> "1h"
        90 -> "1h 30min"
        30 -> "30min"
    
    Args:
        minutes: Длительность в минутах
        language: Код языка ('ru', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt')
        
    Returns:
        Отформатированная строка с правильными единицами для языка
    """
    if not minutes or minutes <= 0:
        return ""
    
    hours = minutes // 60
    mins = minutes % 60
    
    # Получаем формат для языка, fallback на русский если язык не найден
    fmt = DURATION_FORMATS.get(language, DURATION_FORMATS['ru'])
    
    if hours > 0 and mins > 0:
        return f"{hours}{fmt['hour']} {mins}{fmt['minute']}"
    elif hours > 0:
        return f"{hours}{fmt['hour']}"
    else:
        return f"{mins}{fmt['minute']}"


def normalize_duration_to_db_format(duration_str: Optional[str]) -> Optional[int]:
    """
    Нормализует любой формат длительности в формат для БД (минуты)
    
    Args:
        duration_str: Строка с длительностью в любом формате
        
    Returns:
        Длительность в минутах для хранения в БД
    """
    return parse_duration_to_minutes(duration_str)


# Для обратной совместимости: если код ожидает текстовый формат
def minutes_to_legacy_format(minutes: Optional[int]) -> str:
    """
    Конвертирует минуты в legacy формат "1h 30min" (английский)
    DEPRECATED: Используйте format_duration_display вместо этого
    """
    if not minutes:
        return ""
    
    hours = minutes // 60
    mins = minutes % 60
    
    if hours > 0 and mins > 0:
        return f"{hours}h {mins}min"
    elif hours > 0:
        return f"{hours}h"
    else:
        return f"{mins}min"


# Вспомогательная функция для получения списка поддерживаемых языков
def get_supported_languages() -> list:
    """
    Возвращает список всех поддерживаемых языков для форматирования длительности
    
    Returns:
        Список кодов языков
    """
    return list(DURATION_FORMATS.keys())
