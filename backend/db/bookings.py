"""
Функции для работы с записями
"""
import sqlite3
from datetime import datetime
from typing import Optional, Dict

from config import DATABASE_NAME


def get_all_bookings():
    """Получить все записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""SELECT id, instagram_id, service_name, datetime, phone, 
                     name, status, created_at, revenue 
                     FROM bookings ORDER BY created_at DESC""")
    except sqlite3.OperationalError:
        c.execute("""SELECT id, instagram_id, service_name, datetime, phone, 
                     name, status, created_at, 0 as revenue 
                     FROM bookings ORDER BY created_at DESC""")
    
    bookings = c.fetchall()
    conn.close()
    return bookings


def save_booking(instagram_id: str, service: str, datetime_str: str, 
                phone: str, name: str, special_package_id: int = None):
    """Сохранить завершённую запись"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    c.execute("""INSERT INTO bookings 
                 (instagram_id, service_name, datetime, phone, name, status, 
                  created_at, special_package_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, service, datetime_str, phone, name, "pending", 
               now, special_package_id))
    
    c.execute("""UPDATE clients 
                 SET status = 'lead', phone = ?, name = ? 
                 WHERE instagram_id = ?""",
              (phone, name, instagram_id))
    
    # Увеличиваем счетчик использования пакета если это спец. пакет
    if special_package_id:
        from .services import increment_package_usage
        increment_package_usage(special_package_id)
    
    conn.commit()
    conn.close()


def update_booking_status(booking_id: int, status: str) -> bool:
    """Обновить статус записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        if status == 'completed':
            completed_at = datetime.now().isoformat()
            c.execute("""UPDATE bookings 
                        SET status = ?, completed_at = ? 
                        WHERE id = ?""",
                      (status, completed_at, booking_id))
        else:
            c.execute("UPDATE bookings SET status = ? WHERE id = ?",
                      (status, booking_id))
        
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка обновления статуса: {e}")
        conn.close()
        return False


# ===== ВРЕМЕННЫЕ ДАННЫЕ ЗАПИСИ =====

def get_booking_progress(instagram_id: str) -> Optional[Dict]:
    """Получить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT * FROM booking_temp WHERE instagram_id = ?", (instagram_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "instagram_id": row[0],
            "service_name": row[1],
            "date": row[2],
            "time": row[3],
            "phone": row[4],
            "name": row[5],
            "step": row[6]
        }
    return None


def update_booking_progress(instagram_id: str, data: Dict):
    """Обновить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""INSERT OR REPLACE INTO booking_temp 
                 (instagram_id, service_name, date, time, phone, name, step)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, data.get('service_name'), data.get('date'),
               data.get('time'), data.get('phone'), data.get('name'), 
               data.get('step')))
    
    conn.commit()
    conn.close()


def clear_booking_progress(instagram_id: str):
    """Очистить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM booking_temp WHERE instagram_id = ?", (instagram_id,))
    conn.commit()
    conn.close()