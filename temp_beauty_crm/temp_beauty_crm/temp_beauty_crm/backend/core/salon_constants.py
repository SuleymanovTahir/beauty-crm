"""
Централизованные константы для настроек салона
Единый источник истины для всех дефолтных значений
"""

# === РАБОЧИЕ ЧАСЫ САЛОНА ===
DEFAULT_HOURS_WEEKDAYS = "10:30 - 21:30"
DEFAULT_HOURS_WEEKENDS = "10:30 - 21:30"
DEFAULT_HOURS_START = "10:30"
DEFAULT_HOURS_END = "21:30"
DEFAULT_HOURS_START_HOUR = 10
DEFAULT_HOURS_END_HOUR = 21

# === ОБЕДЕННОЕ ВРЕМЯ ===
DEFAULT_LUNCH_START = "13:00"
DEFAULT_LUNCH_END = "14:00"

# === ВРЕМЯ ОТЧЕТОВ ===
DEFAULT_REPORT_TIME = "09:00"

# === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
def get_default_hours_dict():
    """Получить словарь с дефолтными часами работы"""
    return {
        "start": DEFAULT_HOURS_START,
        "end": DEFAULT_HOURS_END,
        "start_hour": DEFAULT_HOURS_START_HOUR,
        "end_hour": DEFAULT_HOURS_END_HOUR
    }

def get_default_working_hours_response():
    """Получить полный ответ с дефолтными рабочими часами (для fallback)"""
    return {
        "weekdays": get_default_hours_dict(),
        "weekends": get_default_hours_dict(),
        "lunch": {
            "start": DEFAULT_LUNCH_START,
            "end": DEFAULT_LUNCH_END
        }
    }
