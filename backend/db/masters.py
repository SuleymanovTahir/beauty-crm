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