"""
Функции для работы с сотрудниками салона
DEPRECATED: This module is a compatibility wrapper around users table.
All employee data is now stored in users table with is_service_provider = 1.
"""
import sqlite3
from datetime import datetime
from typing import Optional, List
from core.config import DATABASE_NAME
from db.connection import get_db_connection


def get_avatar_url(profile_pic: Optional[str], gender: Optional[str] = 'female') -> str:
    """
    Get avatar URL with gender-based fallback
    
    Args:
        profile_pic: Profile picture path from database (can be None)
        gender: User gender ('male', 'female', or 'other')
    
    Returns:
        Avatar URL (profile_pic or gender-based default)
    """
    if profile_pic:
        return profile_pic
    
    # Gender-based fallback
    if gender == 'male':
        return '/static/avatars/default_male.webp'
    else:  # female or other or None
        return '/static/avatars/default_female.webp'


def get_all_employees(active_only=True, service_providers_only=False):
    """
    Получить всех сотрудников (теперь из users таблицы)
    
    Args:
        active_only: Только активные сотрудники
        service_providers_only: Только обслуживающий персонал
    """
    conn = get_db_connection()
    c = conn.cursor()

    # Check if is_service_provider column exists
    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'is_service_provider' in columns:
        query = "SELECT * FROM users WHERE is_service_provider = 1 AND role NOT IN ('director', 'admin')"
    else:
        # Fallback: filter by role
        query = "SELECT * FROM users WHERE role IN ('employee', 'master')"
    
    if active_only:
        query += " AND is_active = 1"
        # Для публичных страниц показываем только тех, у кого show_on_public_page = 1
        if 'show_on_public_page' in columns:
            query += " AND show_on_public_page = 1"
    
    # Сортировка: сначала по public_page_order (DESC), потом по имени
    if 'public_page_order' in columns:
        query += " ORDER BY public_page_order DESC, full_name ASC"
    elif 'sort_order' in columns:
        query += " ORDER BY sort_order DESC, full_name ASC"
    else:
        query += " ORDER BY full_name ASC"
    
    c.execute(query)
    employees = c.fetchall()
    conn.close()
    return employees


def get_employee(employee_id: int):
    """Получить сотрудника по ID (из users)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM users WHERE id = ? AND is_service_provider = 1", (employee_id,))
    employee = c.fetchone()
    
    conn.close()
    return employee


def create_employee(full_name: str, position: str = None, experience: str = None,
                   photo: str = None, bio: str = None, phone: str = None,
                   email: str = None, instagram: str = None):
    """Создать сотрудника (в users таблице)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    # Generate username from full_name
    username = full_name.lower().replace(" ", "_")
    
    # Check if username exists
    c.execute("SELECT id FROM users WHERE username = ?", (username,))
    if c.fetchone():
        username = f"{username}_{int(datetime.now().timestamp())}"
    
    c.execute("""INSERT INTO users 
                 (username, password_hash, full_name, position, experience, photo, bio, 
                  phone, email, instagram_employee, is_service_provider, role, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'employee', ?)""",
              (username, "placeholder_hash", full_name, position, experience, photo, bio, 
               phone, email, instagram, now))
    
    employee_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return employee_id


def update_employee(employee_id: int, **kwargs):
    """Обновить сотрудника (в users)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    # Map old field names to new ones
    field_mapping = {
        'instagram': 'instagram_employee'
    }
    
    for key, value in kwargs.items():
        mapped_key = field_mapping.get(key, key)
        updates.append(f"{mapped_key} = ?")
        params.append(value)
    
    params.append(employee_id)
    
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ? AND is_service_provider = 1"
    c.execute(query, params)
    
    conn.commit()
    conn.close()
    return True


def delete_employee(employee_id: int):
    """Удалить сотрудника (деактивировать в users)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Soft delete - just deactivate
    c.execute("UPDATE users SET is_active = 0 WHERE id = ? AND is_service_provider = 1", 
              (employee_id,))
    
    conn.commit()
    affected = c.rowcount
    conn.close()
    
    return affected > 0


# ===== СПЕЦИАЛИЗАЦИИ =====

def get_employee_services(employee_id: int):
    """Получить услуги сотрудника (из user_services) с индивидуальными настройками"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if new columns exist in user_services
    c.execute("PRAGMA table_info(user_services)")
    us_columns = [row[1] for row in c.fetchall()]
    
    has_settings = 'price' in us_columns
    
    if has_settings:
        c.execute("""SELECT s.*, us.price, us.duration, us.is_online_booking_enabled, 
                            us.is_calendar_enabled, us.price_min, us.price_max
                     FROM services s
                     JOIN user_services us ON s.id = us.service_id
                     WHERE us.user_id = ? AND s.is_active = 1""", (employee_id,))
    else:
        c.execute("""SELECT s.*, NULL, NULL, 1, 1, NULL, NULL
                     FROM services s
                     JOIN user_services us ON s.id = us.service_id
                     WHERE us.user_id = ? AND s.is_active = 1""", (employee_id,))
    
    services = c.fetchall()
    conn.close()
    return services


def update_employee_service(employee_id: int, service_id: int, 
                           price: float = None, duration: int = None,
                           is_online_booking_enabled: bool = None,
                           is_calendar_enabled: bool = None,
                           price_min: float = None, price_max: float = None):
    """Обновить настройки услуги для сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    if price is not None:
        updates.append("price = ?")
        params.append(price)
    
    if duration is not None:
        updates.append("duration = ?")
        params.append(duration)
        
    if is_online_booking_enabled is not None:
        updates.append("is_online_booking_enabled = ?")
        params.append(1 if is_online_booking_enabled else 0)
        
    if is_calendar_enabled is not None:
        updates.append("is_calendar_enabled = ?")
        params.append(1 if is_calendar_enabled else 0)

    if price_min is not None:
        updates.append("price_min = ?")
        params.append(price_min)

    if price_max is not None:
        updates.append("price_max = ?")
        params.append(price_max)
        
    if not updates:
        conn.close()
        return False
        
    params.append(employee_id)
    params.append(service_id)
    
    query = f"UPDATE user_services SET {', '.join(updates)} WHERE user_id = ? AND service_id = ?"
    
    try:
        c.execute(query, params)
        conn.commit()
        success = c.rowcount > 0
    except Exception:
        success = False
        
    conn.close()
    return success


def add_employee_service(employee_id: int, service_id: int, 
                        price: float = None, duration: int = None,
                        is_online_booking_enabled: bool = True,
                        is_calendar_enabled: bool = True,
                        price_min: float = None, price_max: float = None):
    """Назначить услугу сотруднику"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if table has new columns
    c.execute("PRAGMA table_info(user_services)")
    columns = [info[1] for info in c.fetchall()]
    
    if 'price' in columns:
        c.execute("""
            INSERT OR IGNORE INTO user_services 
            (user_id, service_id, price, duration, is_online_booking_enabled, is_calendar_enabled, price_min, price_max)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (employee_id, service_id, price, duration, 
              1 if is_online_booking_enabled else 0, 
              1 if is_calendar_enabled else 0,
              price_min, price_max))
    else:
        c.execute("INSERT OR IGNORE INTO user_services (user_id, service_id) VALUES (?, ?)", 
                 (employee_id, service_id))
        
    conn.commit()
    conn.close()
    return True


def remove_employee_service(employee_id: int, service_id: int):
    """Удалить специализацию у сотрудника (из user_services)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""DELETE FROM user_services 
                 WHERE user_id = ? AND service_id = ?""",
              (employee_id, service_id))
    
    conn.commit()
    conn.close()
    return True


def get_employees_by_service(service_id: int):
    """
    Получить сотрудников, оказывающих услугу (из users + user_services)
    Returns: List of tuples (user_columns..., price, duration, price_min, price_max)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if new columns exist in user_services
    c.execute("PRAGMA table_info(user_services)")
    us_columns = [row[1] for row in c.fetchall()]
    
    has_settings = 'price' in us_columns
    
    if has_settings:
        c.execute("""SELECT u.*, us.price, us.duration, us.price_min, us.price_max 
                     FROM users u
                     JOIN user_services us ON u.id = us.user_id
                     WHERE us.service_id = ? AND u.is_active = 1 AND u.is_service_provider = 1
                     AND (us.is_online_booking_enabled = 1 OR us.is_online_booking_enabled IS NULL)""",
                  (service_id,))
    else:
        # Fallback for old schema
        c.execute("""SELECT u.*, NULL as price, NULL as duration, NULL as price_min, NULL as price_max
                     FROM users u
                     JOIN user_services us ON u.id = us.user_id
                     WHERE us.service_id = ? AND u.is_active = 1 AND u.is_service_provider = 1""",
                  (service_id,))
    
    employees = c.fetchall()
    conn.close()
    return employees


# ===== РАСПИСАНИЕ =====

def get_employee_schedule(employee_id: int):
    """Получить расписание сотрудника (из user_schedule)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT * FROM user_schedule 
                 WHERE user_id = ? AND is_active = 1
                 ORDER BY day_of_week""", (employee_id,))
    
    schedule = c.fetchall()
    conn.close()
    return schedule


def set_employee_schedule(employee_id: int, day_of_week: int, 
                         start_time: str, end_time: str):
    """Установить расписание для дня недели (в user_schedule)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Удаляем старое расписание для этого дня
    c.execute("""DELETE FROM user_schedule 
                 WHERE user_id = ? AND day_of_week = ?""",
              (employee_id, day_of_week))
    
    # Добавляем новое
    c.execute("""INSERT INTO user_schedule 
                 (user_id, day_of_week, start_time, end_time)
                 VALUES (?, ?, ?, ?)""",
              (employee_id, day_of_week, start_time, end_time))
    
    conn.commit()
    conn.close()
    return True


def get_available_employees(service_id: int, date_time: str):
    """
    Получить доступных сотрудников для услуги в определенное время
    (из users + user_services + user_schedule)
    """
    from datetime import datetime
    
    # Парсим дату и время
    dt = datetime.fromisoformat(date_time)
    day_of_week = dt.weekday()
    time_str = dt.strftime('%H:%M')
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Находим сотрудников из users таблицы
    c.execute("""
        SELECT DISTINCT u.* 
        FROM users u
        JOIN user_services us ON u.id = us.user_id
        JOIN user_schedule sch ON u.id = sch.user_id
        WHERE us.service_id = ?
        AND u.is_active = 1
        AND u.is_service_provider = 1
        AND sch.day_of_week = ?
        AND sch.start_time <= ?
        AND sch.end_time >= ?
        AND u.id NOT IN (
            SELECT user_id FROM user_time_off
            WHERE date(?) BETWEEN date(date_from) AND date(date_to)
        )
    """, (service_id, day_of_week, time_str, time_str, date_time))

    employees = c.fetchall()
    conn.close()
    return employees


def get_employee_busy_slots(employee_id: int, date: str):
    """
    Получить занятые слоты сотрудника на определенную дату
    """
    conn = get_db_connection()
    c = conn.cursor()

    # Получаем имя пользователя
    c.execute("SELECT full_name FROM users WHERE id = ?", (employee_id,))
    user = c.fetchone()
    if not user:
        conn.close()
        return []
    
    full_name = user[0]

    # Получаем все записи мастера на эту дату
    c.execute("""
        SELECT b.id, b.datetime, s.duration, s.name
        FROM bookings b
        LEFT JOIN services s ON b.service_name = s.name
        WHERE b.master = ?
        AND b.status NOT IN ('cancelled', 'no-show')
        AND date(b.datetime) = date(?)
    """, (full_name, date))

    bookings = c.fetchall()
    conn.close()

    # Формируем список занятых слотов
    busy_slots = []
    for booking_id, datetime_str, duration, service_name in bookings:
        if datetime_str:
            try:
                from datetime import datetime as dt, timedelta
                start = dt.fromisoformat(datetime_str)

                # Если есть длительность, вычисляем конец
                if duration:
                    hours = 0
                    minutes = 0
                    if 'h' in duration:
                        hours = int(duration.split('h')[0])
                    if 'min' in duration:
                        min_part = duration.split('min')[0]
                        if 'h' in min_part:
                            minutes = int(min_part.split('h')[1].strip())
                        else:
                            minutes = int(min_part)

                    end = start + timedelta(hours=hours, minutes=minutes)
                else:
                    # По умолчанию 1 час
                    end = start + timedelta(hours=1)

                busy_slots.append({
                    'booking_id': booking_id,
                    'start_time': start.strftime('%H:%M'),
                    'end_time': end.strftime('%H:%M'),
                    'service_name': service_name
                })
            except:
                pass

    return busy_slots