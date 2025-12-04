#!/usr/bin/env python3
"""
Проверка существующих сотрудников в БД
"""
from db.connection import get_db_connection
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.config import DATABASE_NAME as DB_PATH

def check_employees():
    """Проверить существующих сотрудников"""
    conn = get_db_connection()
    c = conn.cursor()

    print("=" * 80)
    print("👥 ПРОВЕРКА СУЩЕСТВУЮЩИХ СОТРУДНИКОВ")
    print("=" * 80)

    # Проверяем таблицу employees
    print("\n📋 Таблица EMPLOYEES:")
    print("-" * 80)
    c.execute("""
        SELECT id, full_name, position, email, is_active
        FROM employees
        ORDER BY id
    """)

    employees = c.fetchall()
    if employees:
        print(f"{'ID':<5} {'Имя':<30} {'Должность':<25} {'Email':<25} {'Активен'}")
        print("-" * 80)
        for emp in employees:
            emp_id, name, position, email, is_active = emp
            print(f"{emp_id:<5} {name:<30} {position or 'НЕТ':<25} {email or 'НЕТ':<25} {'Да' if is_active else 'Нет'}")
    else:
        print("❌ Нет сотрудников в таблице employees")

    # Проверяем таблицу users
    print("\n\n📋 Таблица USERS:")
    print("-" * 80)
    c.execute("""
        SELECT id, username, full_name, email, role, position, assigned_employee_id, email_verified, is_active
        FROM users
        ORDER BY id
    """)

    users = c.fetchall()
    if users:
        print(f"{'ID':<5} {'Username':<15} {'Имя':<25} {'Роль':<12} {'Должность':<20} {'Emp_ID':<7} {'Email OK':<9} {'Активен'}")
        print("-" * 80)
        for user in users:
            user_id, username, name, email, role, position, emp_id, email_verified, is_active = user
            print(f"{user_id:<5} {username:<15} {name:<25} {role or 'НЕТ':<12} {position or 'НЕТ':<20} {emp_id or 'НЕТ':<7} {'Да' if email_verified else 'Нет':<9} {'Да' if is_active else 'Нет'}")
    else:
        print("❌ Нет пользователей в таблице users")

    print("\n" + "=" * 80)

    conn.close()
    return employees, users

if __name__ == "__main__":
    check_employees()
