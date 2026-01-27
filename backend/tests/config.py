"""
Конфигурация для тестов
Получает настройки из salon_settings для универсальности
"""
import sys
import os

# Добавляем backend в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.settings import get_salon_settings

def get_test_config():
    """
    Получить конфигурацию для тестов из salon_settings
    
    Returns:
        dict: Конфигурация с временами, контактами и тестовыми данными
    """
    settings = get_salon_settings()
    
    # Парсим рабочие часы из settings
    # Формат: "09:00-18:00" или "Пн-Пт: 09:00-18:00"
    hours_weekdays = settings.get('hours_weekdays')
    hours_weekends = settings.get('hours_weekends')  # Выходные (СБ-ВС)
    
    # Извлекаем время начала и конца
    def parse_hours(hours_str):
        """Парсит строку типа '09:00-18:00' или 'Пн-Пт: 09:00-18:00'"""
        if not hours_str:
            return None, None
        
        if ':' in hours_str and '-' in hours_str:
            # Убираем префикс типа "Пн-Пт: "
            if hours_str.count(':') > 2:
                hours_str = hours_str.split(': ', 1)[1]
            start, end = hours_str.split('-')
            return start.strip(), end.strip()
        return None, None
    
    work_start_weekday, work_end_weekday = parse_hours(hours_weekdays)
    work_start_weekend, work_end_weekend = parse_hours(hours_weekends)
    
    # Если hours_weekdays не установлены - ошибка
    if not work_start_weekday or not work_end_weekday:
        raise ValueError("hours_weekdays не установлены в salon_settings!")
    
    # Если выходные не установлены - используем будние дни
    if not work_start_weekend or not work_end_weekend:
        work_start_weekend = work_start_weekday
        work_end_weekend = work_end_weekday
    
    return {
        # Рабочее время из настроек салона
        'work_start_weekday': work_start_weekday,
        'work_end_weekday': work_end_weekday,
        'work_start_saturday': work_start_weekend,  # Для совместимости
        'work_end_saturday': work_end_weekend,      # Для совместимости
        
        # Контактные данные салона для тестов
        'test_phone': settings.get('phone') or '+1234567890',
        'test_email': settings.get('email') or 'test@example.com',
        'test_instagram': settings.get('instagram'),
        'salon_name': settings.get('name'),
        
        # Фиксированные времена для проверок доступности в тестах
        # НЕ рабочие часы! Это просто времена для тестирования функций is_master_available()
        # Например: "проверить доступен ли мастер в 10:00, 14:00, 18:00"
        'test_time_morning': '10:00',      # Утреннее время для проверки
        'test_time_afternoon': '14:00',    # Дневное время для проверки
        'test_time_evening': '18:00',      # Вечернее время для проверки
        'test_time_report': '09:00',       # Время для отчётов (reportTime в настройках)
    }

# Для удобства импорта
TEST_CONFIG = get_test_config()

if __name__ == "__main__":
    # Тест конфигурации
    config = get_test_config()
    print("📋 Конфигурация тестов:")
    print("=" * 70)
    for key, value in config.items():
        print(f"  {key}: {value}")
    print("=" * 70)
