# backend/db/schedule.py
"""
Функции для работы с расписанием мастеров
"""
import sqlite3
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from config import DATABASE_NAME


def get_available_slots(
    service_name: str = None,
    master_id: int = None,
    date_from: str = None,
    days_ahead: int = 7,
    limit: int = 20
) -> List[Dict]:
    """
    Получить доступные окна для записи
    
    Args:
        service_name: Название услуги (для фильтрации по мастерам)
        master_id: ID конкретного мастера
        date_from: С какой даты искать (по умолчанию сегодня)
        days_ahead: На сколько дней вперед смотреть
        limit: Максимум результатов
    
    Returns:
        List[Dict]: Список доступных окон
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Определяем диапазон дат
    if not date_from:
        date_from = datetime.now().strftime("%Y-%m-%d")
    
    date_to = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    
    # Строим запрос
    query = """
        SELECT 
            ms.id,
            ms.date,
            ms.time_start,
            ms.time_end,
            m.id as master_id,
            m.name as master_name,
            m.specialization
        FROM master_schedule ms
        JOIN masters m ON ms.master_id = m.id
        WHERE ms.is_booked = 0
        AND m.is_active = 1
        AND ms.date >= ?
        AND ms.date <= ?
    """
    
    params = [date_from, date_to]
    
    if master_id:
        query += " AND ms.master_id = ?"
        params.append(master_id)
    
    if service_name:
        # Находим подходящих мастеров
        from db.masters import get_masters_for_service
        suitable_masters = get_masters_for_service(service_name)
        if suitable_masters:
            master_ids = [m[0] for m in suitable_masters]
            placeholders = ','.join(['?'] * len(master_ids))
            query += f" AND ms.master_id IN ({placeholders})"
            params.extend(master_ids)
    
    query += " ORDER BY ms.date, ms.time_start LIMIT ?"
    params.append(limit)
    
    c.execute(query, params)
    rows = c.fetchall()
    
    slots = []
    for row in rows:
        slots.append({
            'slot_id': row[0],
            'date': row[1],
            'time_start': row[2],
            'time_end': row[3],
            'master_id': row[4],
            'master_name': row[5],
            'specialization': row[6]
        })
    
    conn.close()
    return slots


def book_slot(
    slot_id: int,
    client_id: str,
    service_name: str,
    booking_id: int = None
) -> bool:
    """Забронировать слот"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        UPDATE master_schedule
        SET is_booked = 1,
            client_id = ?,
            booking_id = ?
        WHERE id = ? AND is_booked = 0
    """, (client_id, booking_id, slot_id))
    
    success = c.rowcount > 0
    conn.commit()
    conn.close()
    
    return success


def unbook_slot(slot_id: int) -> bool:
    """Освободить слот"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        UPDATE master_schedule
        SET is_booked = 0,
            client_id = NULL,
            booking_id = NULL
        WHERE id = ?
    """, (slot_id,))
    
    conn.commit()
    conn.close()
    return True


def create_schedule_slot(
    master_id: int,
    date: str,
    time_start: str,
    time_end: str,
    service_id: int = None
) -> int:
    """Создать слот в расписании"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""
        INSERT INTO master_schedule 
        (master_id, service_id, date, time_start, time_end, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (master_id, service_id, date, time_start, time_end, now))
    
    slot_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return slot_id


def get_client_booking_history(client_id: str, limit: int = 10) -> List[Dict]:
    """Получить историю записей клиента для анализа паттернов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT 
            b.datetime,
            b.service_name,
            b.master,
            ms.date,
            ms.time_start
        FROM bookings b
        LEFT JOIN master_schedule ms ON b.id = ms.booking_id
        WHERE b.instagram_id = ?
        ORDER BY b.created_at DESC
        LIMIT ?
    """, (client_id, limit))
    
    rows = c.fetchall()
    
    history = []
    for row in rows:
        try:
            dt = datetime.fromisoformat(row[0])
            history.append({
                'datetime': row[0],
                'weekday': dt.strftime('%A'),
                'time': dt.strftime('%H:%M'),
                'service': row[1],
                'master': row[2]
            })
        except:
            pass
    
    conn.close()
    return history