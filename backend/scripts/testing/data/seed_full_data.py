#!/usr/bin/env python3
"""
Скрипт для полного заполнения БД тестовыми данными
Включает:
1. Сотрудников и услуги (через seed_test_data)
2. Клиентов
3. Записи (прошлые и будущие)
4. Диалоги
5. Баллы лояльности
"""
from db.connection import get_db_connection
import sys
import os
import random
from datetime import datetime, timedelta

# Добавляем backend в путь
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME
from scripts.data.seed_test_data import seed_data as seed_employees_and_services

def get_db_connection():
    conn = get_db_connection()
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def seed_clients(conn):
    print("\n2. ДОБАВЛЕНИЕ КЛИЕНТОВ:")
    print("-" * 70)
    c = conn.cursor()
    
    clients = [
        ("Anna Smith", "anna_smith", "+971500000001", "Regular client"),
        ("Maria Garcia", "maria_g", "+971500000002", "VIP"),
        ("Elena Petrova", "lenap", "+971500000003", "New client"),
        ("Sarah Jones", "sarah_j", "+971500000004", "Prefer weekends"),
        ("Fatima Al-Sayed", "fatima_a", "+971500000005", "Arabic speaker")
    ]

    client_ids = []
    for name, username, phone, notes in clients:
        # Проверяем существование по instagram_id (используем username как ID для теста)
        instagram_id = username
        c.execute("SELECT instagram_id FROM clients WHERE instagram_id = %s", (instagram_id,))
        existing = c.fetchone()
        
        if existing:
            client_ids.append(existing[0])
            print(f"ℹ️  Клиент {name} уже существует")
        else:
            c.execute("""
                INSERT INTO clients (instagram_id, username, name, phone, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (instagram_id, username, name, phone, notes, datetime.now().isoformat()))
            client_ids.append(instagram_id)
            print(f"✅ Добавлен клиент: {name} (ID: {instagram_id})")
            
    return client_ids

def seed_bookings(conn, client_ids):
    print("\n3. ДОБАВЛЕНИЕ ЗАПИСЕЙ:")
    print("-" * 70)
    c = conn.cursor()
    
    # Получаем мастеров и услуги
    c.execute("SELECT full_name FROM employees WHERE is_active = TRUE")
    masters = [row[0] for row in c.fetchall()]
    
    c.execute("SELECT name FROM services WHERE is_active = TRUE")
    services = [row[0] for row in c.fetchall()]
    
    if not masters or not services:
        print("❌ Нет мастеров или услуг для создания записей")
        return

    # Создаем записи: 5 в прошлом, 5 в будущем
    now = datetime.now()
    
    # Прошлые записи (завершенные)
    for i in range(5):
        client_id = random.choice(client_ids)
        master = random.choice(masters)
        service = random.choice(services)
        
        # Случайная дата в прошлом месяце
        days_ago = random.randint(1, 30)
        dt = now - timedelta(days=days_ago)
        dt = dt.replace(hour=random.randint(10, 20), minute=0, second=0, microsecond=0)
        
        c.execute("""
            INSERT INTO bookings (instagram_id, master, service_name, datetime, status, created_at)
            VALUES (%s, %s, %s, %s, 'completed', %s)
        """, (client_id, master, service, dt.isoformat(), dt.isoformat()))
        print(f"✅ Добавлена прошлая запись: {dt.date()} - {master} - {service}")

    # Будущие записи (подтвержденные)
    for i in range(5):
        client_id = random.choice(client_ids)
        master = random.choice(masters)
        service = random.choice(services)
        
        # Случайная дата в следующем месяце
        days_ahead = random.randint(1, 14)
        dt = now + timedelta(days=days_ahead)
        dt = dt.replace(hour=random.randint(10, 20), minute=0, second=0, microsecond=0)
        
        c.execute("""
            INSERT INTO bookings (instagram_id, master, service_name, datetime, status, created_at)
            VALUES (%s, %s, %s, %s, 'confirmed', %s)
        """, (client_id, master, service, dt.isoformat(), now.isoformat()))
        print(f"✅ Добавлена будущая запись: {dt.date()} - {master} - {service}")

def seed_conversations(conn, client_ids):
    print("\n4. ДОБАВЛЕНИЕ ДИАЛОГОВ:")
    print("-" * 70)
    c = conn.cursor()
    
    for client_id in client_ids:
        c.execute("SELECT id FROM conversations WHERE client_id = %s", (client_id,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO conversations (client_id, timestamp)
                VALUES (%s, %s)
            """, (client_id, datetime.now().isoformat()))
            print(f"✅ Создан диалог для клиента ID {client_id}")

def seed_loyalty(conn, client_ids):
    print("\n5. ДОБАВЛЕНИЕ БАЛЛОВ ЛОЯЛЬНОСТИ:")
    print("-" * 70)
    c = conn.cursor()
    
    for client_id in client_ids:
        points = random.randint(0, 500)
        c.execute("SELECT id FROM client_loyalty_points WHERE client_id = %s", (client_id,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO client_loyalty_points (client_id, total_points, available_points, spent_points, loyalty_level, updated_at)
                VALUES (%s, %s, %s, 0, 'bronze', %s)
            """, (client_id, points, points, datetime.now().isoformat()))
            print(f"✅ Начислены баллы клиенту ID {client_id}: {points}")

def cleanup_test_data(conn):
    """Удаляет тестовые данные после успешного выполнения"""
    print("\n🧹 ОЧИСТКА ТЕСТОВЫХ ДАННЫХ:")
    print("-" * 70)
    c = conn.cursor()
    
    # Удаляем тестовых клиентов
    test_client_ids = ['anna_smith', 'maria_g', 'lenap', 'sarah_j', 'fatima_a']
    c.execute(f"DELETE FROM bookings WHERE instagram_id IN ({','.join(['%s']*len(test_client_ids))})", test_client_ids)
    deleted_bookings = c.rowcount
    
    c.execute(f"DELETE FROM conversations WHERE client_id IN ({','.join(['%s']*len(test_client_ids))})", test_client_ids)
    deleted_conversations = c.rowcount
    
    c.execute(f"DELETE FROM client_loyalty_points WHERE client_id IN ({','.join(['%s']*len(test_client_ids))})", test_client_ids)
    deleted_loyalty = c.rowcount
    
    c.execute(f"DELETE FROM clients WHERE instagram_id IN ({','.join(['%s']*len(test_client_ids))})", test_client_ids)
    deleted_clients = c.rowcount
    
    print(f"✅ Удалено: {deleted_clients} клиентов, {deleted_bookings} записей, {deleted_conversations} диалогов, {deleted_loyalty} баллов лояльности")

def main():
    print("🚀 ЗАПУСК ПОЛНОГО ЗАПОЛНЕНИЯ БД")
    
    # 1. Базовые данные (сотрудники, услуги)
    try:
        seed_employees_and_services()
    except Exception as e:
        print(f"⚠️  Ошибка в seed_test_data: {e}")

    conn = get_db_connection()
    try:
        client_ids = seed_clients(conn)
        if client_ids:
            seed_bookings(conn, client_ids)
            seed_conversations(conn, client_ids)
            seed_loyalty(conn, client_ids)
        
        conn.commit()
        print("\n✨ Полное заполнение завершено успешно!")
        
        # ✅ АВТОМАТИЧЕСКАЯ ОЧИСТКА ПОСЛЕ УСПЕШНОГО ВЫПОЛНЕНИЯ
        cleanup_test_data(conn)
        conn.commit()
        
    except Exception as e:
        print(f"\n❌ Ошибка при заполнении: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
