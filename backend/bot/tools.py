# backend/bot/tools.py
"""
Инструменты для AI-бота - проверка доступности времени
"""
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from core.config import DATABASE_NAME


def get_available_time_slots(
    date: str,
    service_name: Optional[str] = None,
    master_name: Optional[str] = None,
    duration_minutes: int = 60
) -> List[Dict[str, str]]:
    """
    Получить реально свободные слоты из БД
    
    Args:
        date: Дата в формате YYYY-MM-DD
        service_name: Название услуги (опционально)
        master_name: Имя мастера (опционально)
        duration_minutes: Длительность процедуры
        
    Returns:
        Список свободных слотов [{"time": "10:00", "master": "Симо"}, ...]
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Время работы салона
        SALON_START = 9
        SALON_END = 21
        
        # Получаем все занятые слоты на эту дату
        c.execute("""
            SELECT datetime, master, service_name
            FROM bookings
            WHERE DATE(datetime) = ?
            AND status NOT IN ('cancelled', 'no_show')
        """, (date,))
        
        booked_slots = c.fetchall()
        
        # Получаем список мастеров если не указан конкретный
        if not master_name:
            c.execute("""
                SELECT DISTINCT full_name 
                FROM employees 
                WHERE is_active = 1
            """)
            masters = [row[0] for row in c.fetchall()]
        else:
            masters = [master_name]
        
        # Генерируем все возможные слоты
        all_slots = []
        current_time = datetime.strptime(f"{date} {SALON_START:02d}:00", "%Y-%m-%d %H:%M")
        end_time = datetime.strptime(f"{date} {SALON_END:02d}:00", "%Y-%m-%d %H:%M")
        
        while current_time < end_time:
            time_str = current_time.strftime("%H:%M")
            
            # Проверяем для каждого мастера
            for master in masters:
                is_busy = False
                
                for booked_datetime, booked_master, booked_service in booked_slots:
                    booked_time = datetime.strptime(booked_datetime, "%Y-%m-%d %H:%M:%S")
                    
                    # Если это тот же мастер и время пересекается
                    if booked_master == master:
                        if booked_time <= current_time < booked_time + timedelta(minutes=duration_minutes):
                            is_busy = True
                            break
                
                if not is_busy:
                    all_slots.append({
                        "time": time_str,
                        "master": master,
                        "date": date
                    })
            
            current_time += timedelta(minutes=30)  # Шаг 30 минут
        
        return all_slots[:10]  # Возвращаем первые 10 свободных слотов
        
    finally:
        conn.close()


def check_time_slot_available(
    date: str,
    time: str,
    master_name: Optional[str] = None
) -> Dict[str, any]:
    """
    Проверить доступен ли конкретный слот
    
    Returns:
        {"available": True/False, "reason": "...", "alternatives": [...]}
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        datetime_str = f"{date} {time}"
        
        # Проверяем занятость
        if master_name:
            c.execute("""
                SELECT id, service_name 
                FROM bookings
                WHERE datetime = ? AND master = ?
                AND status NOT IN ('cancelled', 'no_show')
            """, (datetime_str, master_name))
        else:
            c.execute("""
                SELECT id, service_name, master
                FROM bookings
                WHERE datetime = ?
                AND status NOT IN ('cancelled', 'no_show')
            """, (datetime_str,))
        
        booking = c.fetchone()
        
        if booking:
            # Слот занят - ищем альтернативы
            alternatives = get_available_time_slots(date, master_name=master_name)
            
            return {
                "available": False,
                "reason": f"Время {time} занято",
                "alternatives": alternatives[:3]  # Первые 3 альтернативы
            }
        else:
            return {
                "available": True,
                "reason": "Слот свободен",
                "alternatives": []
            }
            
    finally:
        conn.close()