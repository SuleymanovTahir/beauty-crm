#!/usr/bin/env python3
"""
Скрипт для поиска дубликатов в базе данных
"""
import sqlite3
import sys
import os

# Добавляем путь к backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME


def print_header(text):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def check_duplicate_users():
    """Проверка дубликатов пользователей"""
    print_header("ПРОВЕРКА ДУБЛИКАТОВ ПОЛЬЗОВАТЕЛЕЙ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Дубликаты по username
    c.execute("""
        SELECT username, COUNT(*) as count
        FROM users
        GROUP BY username
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по username:")
        for username, count in duplicates:
            print(f"   - {username}: {count} записей")
            c.execute("SELECT id, full_name, role, is_active FROM users WHERE username = ?", (username,))
            for row in c.fetchall():
                print(f"     ID: {row[0]}, Name: {row[1]}, Role: {row[2]}, Active: {row[3]}")
    else:
        print("✅ Дубликатов по username не найдено")
    
    # Дубликаты по email
    c.execute("""
        SELECT email, COUNT(*) as count
        FROM users
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по email:")
        for email, count in duplicates:
            print(f"   - {email}: {count} записей")
    else:
        print("✅ Дубликатов по email не найдено")
    
    conn.close()


def check_duplicate_clients():
    """Проверка дубликатов клиентов"""
    print_header("ПРОВЕРКА ДУБЛИКАТОВ КЛИЕНТОВ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Дубликаты по instagram_id
    c.execute("""
        SELECT instagram_id, COUNT(*) as count
        FROM clients
        WHERE instagram_id IS NOT NULL
        GROUP BY instagram_id
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по instagram_id:")
        for instagram_id, count in duplicates:
            print(f"   - {instagram_id}: {count} записей")
    else:
        print("✅ Дубликатов по instagram_id не найдено")
    
    # Дубликаты по phone
    c.execute("""
        SELECT phone, COUNT(*) as count
        FROM clients
        WHERE phone IS NOT NULL AND phone != ''
        GROUP BY phone
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по телефону:")
        for phone, count in duplicates:
            print(f"   - {phone}: {count} записей")
            c.execute("SELECT instagram_id, name, username FROM clients WHERE phone = ?", (phone,))
            for row in c.fetchall():
                print(f"     Instagram: {row[0]}, Name: {row[1]}, Username: {row[2]}")
    else:
        print("✅ Дубликатов по телефону не найдено")
    
    # Дубликаты по email
    c.execute("""
        SELECT email, COUNT(*) as count
        FROM clients
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по email:")
        for email, count in duplicates:
            print(f"   - {email}: {count} записей")
    else:
        print("✅ Дубликатов по email не найдено")
    
    conn.close()


def check_duplicate_services():
    """Проверка дубликатов услуг"""
    print_header("ПРОВЕРКА ДУБЛИКАТОВ УСЛУГ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Дубликаты по service_key
    c.execute("""
        SELECT service_key, COUNT(*) as count
        FROM services
        GROUP BY service_key
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по service_key:")
        for service_key, count in duplicates:
            print(f"   - {service_key}: {count} записей")
            c.execute("SELECT id, name, price, is_active FROM services WHERE service_key = ?", (service_key,))
            for row in c.fetchall():
                print(f"     ID: {row[0]}, Name: {row[1]}, Price: {row[2]}, Active: {row[3]}")
    else:
        print("✅ Дубликатов по service_key не найдено")
    
    # Дубликаты по name
    c.execute("""
        SELECT name, COUNT(*) as count
        FROM services
        GROUP BY name
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по названию:")
        for name, count in duplicates:
            print(f"   - {name}: {count} записей")
            c.execute("SELECT id, service_key, price, is_active FROM services WHERE name = ?", (name,))
            for row in c.fetchall():
                print(f"     ID: {row[0]}, Key: {row[1]}, Price: {row[2]}, Active: {row[3]}")
    else:
        print("✅ Дубликатов по названию не найдено")
    
    conn.close()


def check_duplicate_bookings():
    """Проверка дубликатов записей"""
    print_header("ПРОВЕРКА ДУБЛИКАТОВ ЗАПИСЕЙ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Дубликаты по instagram_id + datetime + service
    c.execute("""
        SELECT instagram_id, datetime, service_name, COUNT(*) as count
        FROM bookings
        WHERE status != 'cancelled'
        GROUP BY instagram_id, datetime, service_name
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты записей (клиент + время + услуга):")
        for instagram_id, dt, service, count in duplicates:
            print(f"   - {instagram_id}, {dt}, {service}: {count} записей")
    else:
        print("✅ Дубликатов записей не найдено")
    
    conn.close()


def check_duplicate_positions():
    """Проверка дубликатов должностей"""
    print_header("ПРОВЕРКА ДУБЛИКАТОВ ДОЛЖНОСТЕЙ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем существование таблицы
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='positions'")
    if not c.fetchone():
        print("⚠️  Таблица positions не существует")
        conn.close()
        return
    
    # Дубликаты по name
    c.execute("""
        SELECT name, COUNT(*) as count
        FROM positions
        GROUP BY name
        HAVING count > 1
    """)
    
    duplicates = c.fetchall()
    if duplicates:
        print("\n⚠️  Найдены дубликаты по названию:")
        for name, count in duplicates:
            print(f"   - {name}: {count} записей")
            c.execute("SELECT id, name_en, name_ar, is_active FROM positions WHERE name = ?", (name,))
            for row in c.fetchall():
                print(f"     ID: {row[0]}, EN: {row[1]}, AR: {row[2]}, Active: {row[3]}")
    else:
        print("✅ Дубликатов по названию не найдено")
    
    conn.close()


def check_redundant_data():
    """Проверка избыточных данных"""
    print_header("ПРОВЕРКА ИЗБЫТОЧНЫХ ДАННЫХ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем неактивные записи
    tables_to_check = [
        ('users', 'is_active'),
        ('services', 'is_active'),
        ('positions', 'is_active')
    ]
    
    for table, column in tables_to_check:
        c.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if not c.fetchone():
            continue
            
        c.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = 0")
        count = c.fetchone()[0]
        
        if count > 0:
            print(f"\n📊 {table}: {count} неактивных записей")
            c.execute(f"SELECT COUNT(*) FROM {table}")
            total = c.fetchone()[0]
            print(f"   Всего записей: {total}")
            print(f"   Процент неактивных: {count/total*100:.1f}%")
    
    conn.close()


def check_orphaned_records():
    """Проверка потерянных записей (без связей)"""
    print_header("ПРОВЕРКА ПОТЕРЯННЫХ ЗАПИСЕЙ")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Записи без клиента
    c.execute("""
        SELECT COUNT(*) 
        FROM bookings b
        LEFT JOIN clients c ON b.instagram_id = c.instagram_id
        WHERE c.instagram_id IS NULL AND b.instagram_id IS NOT NULL
    """)
    
    orphaned_bookings = c.fetchone()[0]
    if orphaned_bookings > 0:
        print(f"\n⚠️  Найдено {orphaned_bookings} записей без клиента")
    else:
        print("✅ Все записи связаны с клиентами")
    
    # Проверяем user_services без пользователя
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_services'")
    if c.fetchone():
        c.execute("""
            SELECT COUNT(*) 
            FROM user_services us
            LEFT JOIN users u ON us.user_id = u.id
            WHERE u.id IS NULL
        """)
        
        orphaned_services = c.fetchone()[0]
        if orphaned_services > 0:
            print(f"\n⚠️  Найдено {orphaned_services} связей услуг без пользователя")
        else:
            print("✅ Все связи услуг имеют пользователя")
    
    conn.close()


def main():
    """Запуск всех проверок"""
    print_header("АНАЛИЗ БАЗЫ ДАННЫХ НА ДУБЛИКАТЫ")
    print(f"База данных: {DATABASE_NAME}\n")
    
    check_duplicate_users()
    check_duplicate_clients()
    check_duplicate_services()
    check_duplicate_bookings()
    check_duplicate_positions()
    check_redundant_data()
    check_orphaned_records()
    
    print_header("АНАЛИЗ ЗАВЕРШЕН")


if __name__ == "__main__":
    main()
