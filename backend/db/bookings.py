"""
Функции для работы с записями
"""
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Tuple

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
                phone: str, name: str, special_package_id: int = None, master: str = None):
    """Сохранить завершённую запись"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    c.execute("""INSERT INTO bookings 
             (instagram_id, service_name, datetime, phone, name, status, 
              created_at, special_package_id, master)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
          (instagram_id, service, datetime_str, phone, name, "pending", 
           now, special_package_id, master))
    
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


def search_bookings(query: str, limit: int = 50):
    """Поиск записей по тексту"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT b.id, b.instagram_id, c.username, c.name, b.service_name, 
                   b.datetime, b.phone, b.status, b.created_at, b.revenue
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE b.service_name LIKE ? OR b.name LIKE ? OR c.username LIKE ? 
                  OR c.name LIKE ? OR b.phone LIKE ?
            ORDER BY b.created_at DESC
            LIMIT ?
        """, (query, query, query, query, query, limit))
        
        bookings = c.fetchall()
        
        return [
            {
                "id": b[0],
                "instagram_id": b[1],
                "username": b[2],
                "name": b[3],
                "service": b[4],
                "datetime": b[5],
                "phone": b[6],
                "status": b[7],
                "created_at": b[8],
                "revenue": b[9]
            } for b in bookings
        ]
    except Exception as e:
        print(f"❌ Ошибка поиска записей: {e}")
        return []
    finally:
        conn.close()

# ===== #4 - ПРОДОЛЖИТЬ ПРЕРВАННУЮ ЗАПИСЬ =====

def get_incomplete_booking(instagram_id: str) -> Optional[Dict]:
    """Получить незавершённую запись клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем незавершённую запись в booking_temp
    c.execute("""
        SELECT instagram_id, service_name, date, time, phone, name, step
        FROM booking_temp
        WHERE instagram_id = ?
    """, (instagram_id,))
    
    result = c.fetchone()
    conn.close()
    
    if result:
        return {
            'instagram_id': result[0],
            'service_name': result[1],
            'date': result[2],
            'time': result[3],
            'phone': result[4],
            'name': result[5],
            'step': result[6]
        }
    return None


def mark_booking_incomplete(instagram_id: str, progress: Dict):
    """Отметить запись как незавершённую"""
    update_booking_progress(instagram_id, progress)


# ===== #7 - БЫСТРАЯ ЗАПИСЬ ДЛЯ ПОСТОЯННЫХ =====

def get_client_usual_booking_pattern(instagram_id: str) -> Optional[Dict]:
    """Получить обычный паттерн записи клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Берём последние 3 записи
    c.execute("""
        SELECT service_name, master, 
               strftime('%w', datetime) as weekday,
               strftime('%H', datetime) as hour
        FROM bookings
        WHERE instagram_id = ? AND status = 'completed'
        ORDER BY datetime DESC
        LIMIT 3
    """, (instagram_id,))
    
    bookings = c.fetchall()
    conn.close()
    
    if len(bookings) < 2:
        return None
    
    # Анализ паттерна
    services = {}
    masters = {}
    weekdays = {}
    hours = {}
    
    for service, master, weekday, hour in bookings:
        services[service] = services.get(service, 0) + 1
        if master:
            masters[master] = masters.get(master, 0) + 1
        weekdays[weekday] = weekdays.get(weekday, 0) + 1
        hours[hour] = hours.get(hour, 0) + 1
    
    # Находим самые частые
    fav_service = max(services.items(), key=lambda x: x[1])[0] if services else None
    fav_master = max(masters.items(), key=lambda x: x[1])[0] if masters else None
    fav_weekday = max(weekdays.items(), key=lambda x: x[1])[0] if weekdays else None
    fav_hour = max(hours.items(), key=lambda x: x[1])[0] if hours else None
    
    # Если паттерн не выражен (всё разное) - возвращаем None
    if services.get(fav_service, 0) < 2:
        return None
    
    weekday_names = {
        '0': 'воскресенье',
        '1': 'понедельник',
        '2': 'вторник',
        '3': 'среда',
        '4': 'четверг',
        '5': 'пятница',
        '6': 'суббота'
    }
    
    return {
        'service': fav_service,
        'master': fav_master,
        'weekday': fav_weekday,
        'weekday_name': weekday_names.get(str(fav_weekday), '') if fav_weekday is not None else '',
        'hour': int(fav_hour) if fav_hour is not None else None
    }

# ===== #11 - КУРСОВЫЕ ПРОЦЕДУРЫ =====

def get_client_course_progress(instagram_id: str, service_name: str) -> Optional[Dict]:
    """Получить прогресс по курсовой процедуре"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем есть ли курс для этой услуги
    c.execute("""
        SELECT total_sessions, discount_percent
        FROM service_courses
        WHERE service_name LIKE ?
    """, (f"%{service_name}%",))
    
    course = c.fetchone()
    
    if not course:
        conn.close()
        return None
    
    total_sessions, discount = course
    
    # Считаем сколько уже было сеансов
    c.execute("""
        SELECT COUNT(*) 
        FROM bookings
        WHERE instagram_id = ? 
        AND service_name LIKE ?
        AND status = 'completed'
        AND datetime >= datetime('now', '-90 days')
    """, (instagram_id, f"%{service_name}%"))
    
    completed_count = c.fetchone()[0]
    conn.close()
    
    return {
        'service': service_name,
        'total': total_sessions,
        'completed': completed_count,
        'remaining': max(0, total_sessions - completed_count),
        'discount': discount
    }


# ===== #17 - УМНАЯ ОЧЕРЕДЬ ОЖИДАНИЯ =====

def add_to_waitlist(instagram_id: str, service: str, preferred_date: str, preferred_time: str):
    """Добавить клиента в лист ожидания"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Создаём таблицу если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS booking_waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        service TEXT NOT NULL,
        preferred_date DATE NOT NULL,
        preferred_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified INTEGER DEFAULT 0,
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
    )''')
    
    c.execute("""
        INSERT INTO booking_waitlist 
        (client_id, service, preferred_date, preferred_time)
        VALUES (?, ?, ?, ?)
    """, (instagram_id, service, preferred_date, preferred_time))
    
    conn.commit()
    conn.close()


def get_waitlist_for_slot(service: str, date: str, time: str) -> List[str]:
    """Получить список ожидающих для конкретного слота"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT client_id 
        FROM booking_waitlist
        WHERE service LIKE ? 
        AND preferred_date = ?
        AND preferred_time = ?
        AND notified = 0
        ORDER BY created_at ASC
    """, (f"%{service}%", date, time))
    
    results = [row[0] for row in c.fetchall()]
    conn.close()
    
    return results


def mark_waitlist_notified(instagram_id: str, service: str, date: str, time: str):
    """Отметить что клиента уведомили"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        UPDATE booking_waitlist
        SET notified = 1
        WHERE client_id = ?
        AND service LIKE ?
        AND preferred_date = ?
        AND preferred_time = ?
    """, (instagram_id, f"%{service}%", date, time))
    
    conn.commit()
    conn.close()


# ===== #18 - ДЕТЕКТОР "СКОРО УЕЗЖАЕТ" =====

def check_if_urgent_booking(message: str) -> bool:
    """Проверить есть ли в сообщении признаки срочности"""
    urgent_keywords = [
        'уезжа', 'уеду', 'улетаю', 'leaving', 'срочно', 'urgent',
        'завтра уеж', 'послезавтра уеж', 'скоро уеж'
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in urgent_keywords)


# ===== #19 - ПРЕДСКАЗАНИЕ NO-SHOW =====


def get_clients_for_rebooking(service_name: str, days_since: int) -> List[Tuple[str, str, str]]:
    """Получить клиентов для повторной записи (#16)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT b.instagram_id, c.name, c.username
        FROM bookings b
        JOIN clients c ON b.instagram_id = c.instagram_id
        WHERE b.service_name LIKE ?
        AND b.status = 'completed'
        AND b.datetime <= datetime('now', '-' || ? || ' days')
        AND b.instagram_id NOT IN (
            SELECT instagram_id 
            FROM bookings 
            WHERE status IN ('pending', 'confirmed')
        )
        ORDER BY b.datetime DESC
    """, (f"%{service_name}%", days_since))
    
    results = c.fetchall()
    conn.close()
    
    return results


def get_upcoming_bookings(hours: int = 24) -> List[Tuple]:
    """Получить предстоящие записи для напоминаний (#15)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT b.id, b.instagram_id, b.service_name, b.datetime, 
               b.master, c.name, c.username
        FROM bookings b
        JOIN clients c ON b.instagram_id = c.instagram_id
        WHERE b.status IN ('pending', 'confirmed')
        AND b.datetime BETWEEN datetime('now') 
            AND datetime('now', '+' || ? || ' hours')
    """, (hours,))
    
    results = c.fetchall()
    conn.close()
    
    return results

