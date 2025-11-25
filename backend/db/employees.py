"""
Функции для работы с сотрудниками салона
"""
import sqlite3
from datetime import datetime
from typing import Optional, List
from core.config import DATABASE_NAME
from db.connection import get_db_connection


def get_all_employees(active_only=True, service_providers_only=False):
    """
    Получить всех сотрудников

    Args:
        active_only: Только активные сотрудники
        service_providers_only: Только обслуживающий персонал (исключить админов, директоров и т.д.)
    """
    conn = get_db_connection()
    c = conn.cursor()

    # Строим запрос с фильтрами
    query = "SELECT * FROM employees WHERE 1=1"

    if active_only:
        query += " AND is_active = 1"

    if service_providers_only:
        # Проверяем есть ли колонка is_service_provider
        c.execute("PRAGMA table_info(employees)")
        columns = [row[1] for row in c.fetchall()]

        if 'is_service_provider' in columns:
            query += " AND is_service_provider = 1"

    query += " ORDER BY sort_order, full_name"

    c.execute(query)
    employees = c.fetchall()
    conn.close()
    return employees


def get_employee(employee_id: int):
    """Получить сотрудника по ID"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    employee = c.fetchone()
    
    conn.close()
    return employee


def create_employee(full_name: str, position: str = None, experience: str = None,
                   photo: str = None, bio: str = None, phone: str = None,
                   email: str = None, instagram: str = None):
    """Создать сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    c.execute("""INSERT INTO employees 
                 (full_name, position, experience, photo, bio, phone, email, 
                  instagram, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (full_name, position, experience, photo, bio, phone, email, 
               instagram, now, now))
    
    employee_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return employee_id


def update_employee(employee_id: int, **kwargs):
    """Обновить сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    for key, value in kwargs.items():
        updates.append(f"{key} = ?")
        params.append(value)
    
    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(employee_id)
    
    query = f"UPDATE employees SET {', '.join(updates)} WHERE id = ?"
    c.execute(query, params)
    
    conn.commit()
    conn.close()
    return True


def delete_employee(employee_id: int):
    """Удалить сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM employees WHERE id = ?", (employee_id,))
    
    conn.commit()
    affected = c.rowcount
    conn.close()
    
    return affected > 0


# ===== СПЕЦИАЛИЗАЦИИ =====

def get_employee_services(employee_id: int):
    """Получить услуги сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT s.* FROM services s
                 JOIN employee_services es ON s.id = es.service_id
                 WHERE es.employee_id = ?""", (employee_id,))
    
    services = c.fetchall()
    conn.close()
    return services


def add_employee_service(employee_id: int, service_id: int):
    """Добавить специализацию сотруднику"""
    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now().isoformat()

    try:
        c.execute("""INSERT INTO employee_services (employee_id, service_id, created_at)
                     VALUES (?, ?, ?)""", (employee_id, service_id, now))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def remove_employee_service(employee_id: int, service_id: int):
    """Удалить специализацию у сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""DELETE FROM employee_services 
                 WHERE employee_id = ? AND service_id = ?""",
              (employee_id, service_id))
    
    conn.commit()
    conn.close()
    return True


def get_employees_by_service(service_id: int):
    """Получить сотрудников, оказывающих услугу"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT e.* FROM employees e
                 JOIN employee_services es ON e.id = es.employee_id
                 WHERE es.service_id = ? AND e.is_active = 1""",
              (service_id,))
    
    employees = c.fetchall()
    conn.close()
    return employees


# ===== РАСПИСАНИЕ =====

def get_employee_schedule(employee_id: int):
    """Получить расписание сотрудника"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT * FROM employee_schedule 
                 WHERE employee_id = ? AND is_active = 1
                 ORDER BY day_of_week""", (employee_id,))
    
    schedule = c.fetchall()
    conn.close()
    return schedule


def set_employee_schedule(employee_id: int, day_of_week: int, 
                         start_time: str, end_time: str):
    """Установить расписание для дня недели (0=ПН, 6=ВС)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Удаляем старое расписание для этого дня
    c.execute("""DELETE FROM employee_schedule 
                 WHERE employee_id = ? AND day_of_week = ?""",
              (employee_id, day_of_week))
    
    # Добавляем новое
    c.execute("""INSERT INTO employee_schedule 
                 (employee_id, day_of_week, start_time, end_time)
                 VALUES (?, ?, ?, ?)""",
              (employee_id, day_of_week, start_time, end_time))
    
    conn.commit()
    conn.close()
    return True


def get_available_employees(service_id: int, date_time: str):
    """
    Получить доступных сотрудников для услуги в определенное время
    """
    from datetime import datetime
    
    # Парсим дату и время
    dt = datetime.fromisoformat(date_time)
    day_of_week = dt.weekday()
    time_str = dt.strftime('%H:%M')
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Находим сотрудников:
    # 1. Которые оказывают эту услугу
    # 2. Которые работают в этот день недели
    # 3. У которых нет отпуска в эту дату
    c.execute("""
        SELECT DISTINCT e.* 
        FROM employees e
        JOIN employee_services es ON e.id = es.employee_id
        JOIN employee_schedule sch ON e.id = sch.employee_id
        WHERE es.service_id = ?
        AND e.is_active = 1
        AND sch.day_of_week = ?
        AND sch.start_time <= ?
        AND sch.end_time >= ?
        AND e.id NOT IN (
            SELECT employee_id FROM employee_time_off
            WHERE date(?) BETWEEN date(date_from) AND date(date_to)
        )
    """, (service_id, day_of_week, time_str, time_str, date_time))

    employees = c.fetchall()
    conn.close()
    return employees


def get_employee_busy_slots(employee_id: int, date: str):
    """
    Получить занятые слоты сотрудника на определенную дату

    Args:
        employee_id: ID сотрудника
        date: Дата в формате YYYY-MM-DD

    Returns:
        List of tuples (booking_id, start_time, end_time, service_name)
    """
    conn = get_db_connection()
    c = conn.cursor()

    # Получаем все записи мастера на эту дату
    c.execute("""
        SELECT b.id, b.datetime, s.duration, s.name
        FROM bookings b
        LEFT JOIN services s ON b.service_name = s.name
        WHERE b.master = (SELECT full_name FROM employees WHERE id = ?)
        AND b.status NOT IN ('cancelled', 'no-show')
        AND date(b.datetime) = date(?)
    """, (employee_id, date))

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
                    # duration может быть в формате "1h", "30min", "1h 30min"
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