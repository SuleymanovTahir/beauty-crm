"""
Функции для работы с должностями
"""

from datetime import datetime
from typing import Optional, List, Dict
from db.connection import get_db_connection

def get_all_positions(active_only=True):
    """
    Получить все должности

    Args:
        active_only: Только активные должности
    """
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    query = "SELECT * FROM positions WHERE 1=1"

    if active_only:
        query += " AND is_active = TRUE"

    query += " ORDER BY sort_order, name"

    c.execute(query)
    positions = [dict(row) for row in c.fetchall()]
    conn.close()
    return positions

def get_position(position_id: int):
    """Получить должность по ID"""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM positions WHERE id = %s", (position_id,))
    row = c.fetchone()
    position = dict(row) if row else None

    conn.close()
    return position

def create_position(name: str, name_en: str = None, name_ar: str = None, 
                   name_fr: str = None, name_de: str = None,
                   description: str = None, sort_order: int = 0):
    """Создать должность"""
    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now().isoformat()

    try:
        c.execute("""INSERT INTO positions
                     (name, name_en, name_ar, name_fr, name_de, description, sort_order, is_active, created_at, updated_at)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s)
                     RETURNING id""",
                  (name, name_en, name_ar, name_fr, name_de, description, sort_order, now, now))

        position_id = c.fetchone()[0]
        conn.commit()
        return position_id
    except sqlite3.IntegrityError:
        # Должность с таким именем уже существует
        return None
    finally:
        conn.close()

def update_position(position_id: int, **kwargs):
    """Обновить должность"""
    conn = get_db_connection()
    c = conn.cursor()

    updates = []
    params = []

    allowed_fields = ['name', 'name_en', 'name_ar', 'name_fr', 'name_de', 'description', 'sort_order', 'is_active']

    for key, value in kwargs.items():
        if key in allowed_fields:
            updates.append(f"{key} = %s")
            params.append(value)

    if not updates:
        conn.close()
        return False

    updates.append("updated_at = %s")
    params.append(datetime.now().isoformat())
    params.append(position_id)

    query = f"UPDATE positions SET {', '.join(updates)} WHERE id = %s"
    c.execute(query, params)

    conn.commit()
    conn.close()
    return True

def delete_position(position_id: int):
    """
    Удалить должность (мягкое удаление - деактивация)
    Пользователи с этой должностью не удаляются, у них просто обнуляется position_id
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Обнуляем position_id у всех пользователей с этой должностью
        c.execute("UPDATE users SET position_id = NULL WHERE position_id = %s", (position_id,))

        # Деактивируем должность
        c.execute("UPDATE positions SET is_active = FALSE, updated_at = %s WHERE id = %s",
                 (datetime.now().isoformat(), position_id))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error deleting position: {e}")
        return False
    finally:
        conn.close()

def hard_delete_position(position_id: int):
    """
    Полностью удалить должность из БД (использовать с осторожностью!)
    Пользователи с этой должностью не удаляются, у них обнуляется position_id
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Обнуляем position_id у всех пользователей с этой должностью
        c.execute("UPDATE users SET position_id = NULL WHERE position_id = %s", (position_id,))

        # Удаляем должность
        c.execute("DELETE FROM positions WHERE id = %s", (position_id,))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error hard deleting position: {e}")
        return False
    finally:
        conn.close()

def get_employees_by_position(position_id: int):
    """Получить всех пользователей с определенной должностью"""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE position_id = %s AND is_active = TRUE", (position_id,))
    employees = [dict(row) for row in c.fetchall()]

    conn.close()
    return employees
