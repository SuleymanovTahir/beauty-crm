# backend/bot/tools.py
"""
Инструменты для AI-бота - проверка доступности времени
"""
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from core.config import DATABASE_NAME
from services.master_schedule import MasterScheduleService


def get_available_time_slots(
    date: str,
    service_name: Optional[str] = None,
    master_name: Optional[str] = None,
    duration_minutes: int = 60
) -> List[Dict[str, str]]:
    """
    Получить реально свободные слоты из БД с учетом графика и услуг
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # 1. Определяем ID услуги если передано название
        service_id = None
        if service_name:
            c.execute("SELECT id, duration FROM services WHERE name_ru LIKE ? OR name LIKE ?", 
                     (f"%{service_name}%", f"%{service_name}%"))
            service_row = c.fetchone()
            if service_row:
                service_id = service_row[0]
                # Пытаемся распарсить длительность
                try:
                    dur_str = service_row[1]
                    if dur_str:
                        hours = 0
                        minutes = 0
                        if 'h' in dur_str:
                            hours = int(dur_str.split('h')[0])
                        if 'min' in dur_str:
                            min_part = dur_str.split('min')[0]
                            if 'h' in min_part:
                                minutes = int(min_part.split('h')[1].strip())
                            else:
                                minutes = int(min_part)
                        duration_minutes = hours * 60 + minutes
                except:
                    pass

        # 2. Получаем мастеров
        from db.employees import get_available_employees
        
        # Если услуга известна - берем тех кто её делает
        # Если нет - берем всех активных
        if service_id:
            # Используем фиктивное время чтобы получить список мастеров работающих в этот день
            dummy_time = f"{date} 12:00"
            potential_masters = get_available_employees(service_id, dummy_time)
        else:
            # Fallback: все активные мастера
            c.execute("SELECT * FROM employees WHERE is_active = 1")
            potential_masters = c.fetchall()

        # Фильтр по имени если указано
        if master_name:
            potential_masters = [m for m in potential_masters if master_name.lower() in m[1].lower()]

        if not potential_masters:
            return []

        # 3. Генерируем слоты через MasterScheduleService
        schedule_service = MasterScheduleService()
        all_slots = []
        
        for master in potential_masters:
            master_name_real = master[1]
            
            # Получаем слоты для конкретного мастера
            slots = schedule_service.get_available_slots(
                master_name=master_name_real, 
                date=date, 
                duration_minutes=duration_minutes
            )
            
            for time_str in slots:
                all_slots.append({
                    "time": time_str,
                    "master": master_name_real,
                    "date": date
                })
            
        # Сортируем по времени
        all_slots.sort(key=lambda x: x['time'])
        
        # Убираем дубликаты времени (показываем разные варианты мастеров)
        # Но для бота лучше показать уникальные времена и одного из мастеров
        unique_slots = []
        seen_times = set()
        
        for slot in all_slots:
            if slot['time'] not in seen_times:
                unique_slots.append(slot)
                seen_times.add(slot['time'])
                
        return unique_slots[:10]

    except Exception as e:
        print(f"Error in get_available_time_slots: {e}")
        return []
        
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
    schedule_service = MasterScheduleService()
    
    # Если мастер не указан, проверяем есть ли ХОТЯ БЫ ОДИН свободный мастер
    if not master_name:
        # Получаем доступность всех мастеров
        availability = schedule_service.get_all_masters_availability(date)
        
        is_any_available = False
        for master, slots in availability.items():
            if time in slots:
                is_any_available = True
                break
        
        if is_any_available:
            return {
                "available": True,
                "reason": "Слот свободен",
                "alternatives": []
            }
        else:
             # Слот занят - ищем альтернативы
            alternatives = get_available_time_slots(date)
            return {
                "available": False,
                "reason": f"Время {time} занято у всех мастеров",
                "alternatives": alternatives[:3]
            }

    # Если мастер указан
    is_available = schedule_service.is_master_available(
        master_name=master_name,
        date=date,
        time_str=time
    )
    
    if is_available:
        return {
            "available": True,
            "reason": "Слот свободен",
            "alternatives": []
        }
    else:
        # Слот занят - ищем альтернативы
        alternatives = get_available_time_slots(date, master_name=master_name)
        
        return {
            "available": False,
            "reason": f"Время {time} занято или мастер не работает",
            "alternatives": alternatives[:3]  # Первые 3 альтернативы
        }