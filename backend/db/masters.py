# backend/db/masters.py
"""
Функции для работы с мастерами
"""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict
from config import DATABASE_NAME


def get_all_masters(active_only: bool = True) -> List[tuple]:
    """Получить всех мастеров"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    if active_only:
        c.execute("SELECT * FROM masters WHERE is_active = 1 ORDER BY name")
    else:
        c.execute("SELECT * FROM masters ORDER BY name")
    
    masters = c.fetchall()
    conn.close()
    return masters

def get_master_services(master_id: int) -> List[Dict]:
    """Получить услуги мастера с ценами"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT 
            s.id,
            s.name_ru,
            s.name_en,
            s.name_ar,
            s.category,
            s.price_min,
            s.price_max,
            s.currency
        FROM services s
        JOIN master_services ms ON s.id = ms.service_id
        WHERE ms.master_id = ? AND s.is_active = 1
        ORDER BY s.category, s.name_ru
    """, (master_id,))
    
    services = []
    for row in c.fetchall():
        services.append({
            'id': row[0],
            'name_ru': row[1],
            'name_en': row[2],
            'name_ar': row[3],
            'category': row[4],
            'price_min': row[5],
            'price_max': row[6],
            'currency': row[7]
        })
    
    conn.close()
    return services


def add_master_service(master_id: int, service_id: int) -> bool:
    """Добавить услугу мастеру"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO master_services (master_id, service_id, created_at)
            VALUES (?, ?, ?)
        """, (master_id, service_id, datetime.now().isoformat()))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def remove_master_service(master_id: int, service_id: int) -> bool:
    """Удалить услугу у мастера"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        DELETE FROM master_services 
        WHERE master_id = ? AND service_id = ?
    """, (master_id, service_id))
    
    conn.commit()
    success = c.rowcount > 0
    conn.close()
    return success


def update_master_services(master_id: int, service_ids: List[int]) -> bool:
    """Обновить все услуги мастера разом"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Удаляем старые
        c.execute("DELETE FROM master_services WHERE master_id = ?", (master_id,))
        
        # Добавляем новые
        now = datetime.now().isoformat()
        for service_id in service_ids:
            c.execute("""
                INSERT INTO master_services (master_id, service_id, created_at)
                VALUES (?, ?, ?)
            """, (master_id, service_id, now))
        
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        return False
    finally:
        conn.close()

def get_master_by_id(master_id: int) -> Optional[tuple]:
    """Получить мастера по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT * FROM masters WHERE id = ?", (master_id,))
    master = c.fetchone()
    
    conn.close()
    return master


def get_master_by_name(name: str) -> Optional[tuple]:
    """Найти мастера по имени (нечеткий поиск)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute(
        "SELECT * FROM masters WHERE name LIKE ? AND is_active = 1",
        (f"%{name}%",)
    )
    master = c.fetchone()
    
    conn.close()
    return master


def get_masters_for_service(service_name: str) -> List[tuple]:
    """Найти мастеров для конкретной услуги"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Ищем по ключевым словам услуги
    service_keywords = service_name.lower().split()
    
    c.execute("SELECT * FROM masters WHERE is_active = 1")
    all_masters = c.fetchall()
    
    suitable_masters = []
    for master in all_masters:
        services = master[4] or ""  # поле services
        for keyword in service_keywords:
            if keyword in services.lower():
                suitable_masters.append(master)
                break
    
    conn.close()
    return suitable_masters if suitable_masters else all_masters


def create_master(name: str, phone: str = None, 
                 specialization: str = None, services: str = None) -> int:
    """Создать мастера"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""
        INSERT INTO masters (name, phone, specialization, services, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (name, phone, specialization, services, now))
    
    master_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return master_id


def update_master(master_id: int, **kwargs) -> bool:
    """Обновить мастера"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    updates = []
    params = []
    
    for key, value in kwargs.items():
        if key in ['name', 'phone', 'specialization', 'services', 'is_active']:
            updates.append(f"{key} = ?")
            params.append(value)
    
    if updates:
        params.append(datetime.now().isoformat())
        params.append(master_id)
        
        query = f"UPDATE masters SET {', '.join(updates)}, updated_at = ? WHERE id = ?"
        c.execute(query, params)
        conn.commit()
    
    conn.close()
    return True


def delete_master(master_id: int) -> bool:
    """Удалить мастера (мягкое удаление)"""
    return update_master(master_id, is_active=0)

def add_master_time_off(
    master_id: int,
    date_from: str,
    date_to: str,
    reason: str = None
) -> int:
    """Добавить выходной мастеру"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""
        INSERT INTO master_time_off (master_id, date_from, date_to, reason, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (master_id, date_from, date_to, reason, now))
    
    time_off_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return time_off_id


def get_master_time_off(master_id: int, date_from: str = None) -> List[tuple]:
    """Получить выходные мастера"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    if date_from:
        c.execute("""
            SELECT * FROM master_time_off
            WHERE master_id = ? AND date_to >= ?
            ORDER BY date_from
        """, (master_id, date_from))
    else:
        c.execute("""
            SELECT * FROM master_time_off
            WHERE master_id = ?
            ORDER BY date_from
        """, (master_id,))
    
    time_offs = c.fetchall()
    conn.close()
    return time_offs


def delete_master_time_off(time_off_id: int) -> bool:
    """Удалить выходной"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("DELETE FROM master_time_off WHERE id = ?", (time_off_id,))
    
    conn.commit()
    conn.close()
    return True


def add_salon_holiday(date: str, name: str = None) -> bool:
    """Добавить выходной салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    try:
        c.execute("""
            INSERT INTO salon_holidays (date, name, created_at)
            VALUES (?, ?, ?)
        """, (date, name, now))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def get_salon_holidays(date_from: str = None) -> List[tuple]:
    """Получить выходные салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    if date_from:
        c.execute("""
            SELECT * FROM salon_holidays
            WHERE date >= ?
            ORDER BY date
        """, (date_from,))
    else:
        c.execute("SELECT * FROM salon_holidays ORDER BY date")
    
    holidays = c.fetchall()
    conn.close()
    return holidays


def delete_salon_holiday(date: str) -> bool:
    """Удалить выходной салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("DELETE FROM salon_holidays WHERE date = ?", (date,))
    
    conn.commit()
    conn.close()
    return True