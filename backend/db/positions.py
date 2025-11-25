"""
Функции для работы с должностями
"""
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict
from core.config import DATABASE_NAME


def get_all_positions(active_only=True):
    """
    Получить все должности

    Args:
        active_only: Только активные должности
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    query = "SELECT * FROM positions WHERE 1=1"

    if active_only:
        query += " AND is_active = 1"

    query += " ORDER BY sort_order, name"

    c.execute(query)
    positions = [dict(row) for row in c.fetchall()]
    conn.close()
    return positions


def get_position(position_id: int):
    """Получить должность по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM positions WHERE id = ?", (position_id,))
    row = c.fetchone()
    position = dict(row) if row else None

    conn.close()
    return position


def create_position(name: str, name_en: str = None, name_ar: str = None, 
                   name_fr: str = None, name_de: str = None,
                   description: str = None, sort_order: int = 0):
    """Создать должность"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    try:
        c.execute("""INSERT INTO positions
                     (name, name_en, name_ar, name_fr, name_de, description, sort_order, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                  (name, name_en, name_ar, name_fr, name_de, description, sort_order, now, now))

        position_id = c.lastrowid
        conn.commit()
        return position_id
    except sqlite3.IntegrityError:
        # Должность с таким именем уже существует
        return None
    finally:
        conn.close()


def update_position(position_id: int, **kwargs):
    """Обновить должность"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    updates = []
    params = []

    allowed_fields = ['name', 'name_en', 'name_ar', 'name_fr', 'name_de', 'description', 'sort_order', 'is_active']

    for key, value in kwargs.items():
        if key in allowed_fields:
            updates.append(f"{key} = ?")
            params.append(value)

    if not updates:
        conn.close()
        return False

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(position_id)

    query = f"UPDATE positions SET {', '.join(updates)} WHERE id = ?"
    c.execute(query, params)

    conn.commit()
    conn.close()
    return True


def delete_position(position_id: int):
    """
    Удалить должность (мягкое удаление - деактивация)
    Сотрудники с этой должностью не удаляются, у них просто обнуляется position_id
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Обнуляем position_id у всех сотрудников с этой должностью
        c.execute("UPDATE employees SET position_id = NULL WHERE position_id = ?", (position_id,))

        # Деактивируем должность
        c.execute("UPDATE positions SET is_active = 0, updated_at = ? WHERE id = ?",
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
    Сотрудники с этой должностью не удаляются, у них обнуляется position_id
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Обнуляем position_id у всех сотрудников с этой должностью
        c.execute("UPDATE employees SET position_id = NULL WHERE position_id = ?", (position_id,))

        # Удаляем должность
        c.execute("DELETE FROM positions WHERE id = ?", (position_id,))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error hard deleting position: {e}")
        return False
    finally:
        conn.close()


def get_employees_by_position(position_id: int):
    """Получить всех сотрудников с определенной должностью"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM employees WHERE position_id = ? AND is_active = 1", (position_id,))
    employees = [dict(row) for row in c.fetchall()]

    conn.close()
    return employees
