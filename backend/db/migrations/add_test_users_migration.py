#!/usr/bin/env python3
"""
Миграция: Добавление тестовых пользователей
Вызывается из main.py через run_all_migrations()

Эта миграция создает тестовых пользователей с разными ролями для тестирования
Internal Chat, WebRTC звонков и других функций CRM.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
import hashlib
from datetime import datetime

def hash_password(password: str) -> str:
    """Хешировать пароль"""
    return hashlib.sha256(password.encode()).hexdigest()

def migration_add_test_users():
    """
    Миграция: Добавить тестовых пользователей

    Создает 13 тестовых пользователей с разными ролями:
    - 1 директор
    - 1 администратор
    - 2 менеджера
    - 3 продажника (sales)
    - 1 маркетолог
    - 5 мастеров (employee)

    Все пользователи имеют:
    - Пароль: test123
    - Email: *@test.com (подтвержденный)
    - is_active: TRUE
    """
    print("🔄 Миграция: Добавление тестовых пользователей...")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Пароль для всех тестовых пользователей
    test_password = "test123"
    password_hash = hash_password(test_password)

    # Список тестовых пользователей
    test_users = [
        # Директора
        {
            "username": "director1",
            "full_name": "Иванов Иван",
            "email": "director1@test.com",
            "role": "director",
            "position": "Генеральный директор",
            "bio": "Опытный руководитель салона красоты",
        },

        # Администраторы
        {
            "username": "admin1",
            "full_name": "Петрова Анна",
            "email": "admin1@test.com",
            "role": "admin",
            "position": "Администратор",
            "bio": "Системный администратор CRM",
        },

        # Менеджеры
        {
            "username": "manager1",
            "full_name": "Морозова Ольга",
            "email": "manager1@test.com",
            "role": "manager",
            "position": "Менеджер зала",
            "bio": "Координация работы сотрудников",
        },
        {
            "username": "manager2",
            "full_name": "Волков Сергей",
            "email": "manager2@test.com",
            "role": "manager",
            "position": "Старший менеджер",
            "bio": "Управление персоналом",
        },

        # Продажники (Sales)
        {
            "username": "sales1",
            "full_name": "Козлов Дмитрий",
            "email": "sales1@test.com",
            "role": "sales",
            "position": "Менеджер по продажам",
            "bio": "Специалист по привлечению клиентов",
        },
        {
            "username": "sales2",
            "full_name": "Новикова Елена",
            "email": "sales2@test.com",
            "role": "sales",
            "position": "Старший менеджер по продажам",
            "bio": "Работа с VIP-клиентами",
        },
        {
            "username": "sales3",
            "full_name": "Соколов Алексей",
            "email": "sales3@test.com",
            "role": "sales",
            "position": "Менеджер по продажам",
            "bio": "Консультирование по услугам",
        },

        # Маркетологи
        {
            "username": "marketer1",
            "full_name": "Орлова Дарья",
            "email": "marketer1@test.com",
            "role": "marketer",
            "position": "Маркетолог",
            "bio": "SMM и реклама",
        },

        # Сотрудники (Employees) - мастера
        {
            "username": "master1",
            "full_name": "Кузнецова Виктория",
            "email": "master1@test.com",
            "role": "employee",
            "position": "Мастер маникюра",
            "bio": "Nail-art специалист",
            "specialization": "Маникюр, педикюр, nail-дизайн",
            "years_of_experience": 5,
            "is_service_provider": True,
            "base_salary": 50000,
            "commission_rate": 30,
        },
        {
            "username": "master2",
            "full_name": "Смирнова Екатерина",
            "email": "master2@test.com",
            "role": "employee",
            "position": "Парикмахер-стилист",
            "bio": "Стрижки, окрашивание, укладки",
            "specialization": "Парикмахерские услуги",
            "years_of_experience": 7,
            "is_service_provider": True,
            "base_salary": 60000,
            "commission_rate": 35,
        },
        {
            "username": "master3",
            "full_name": "Лебедева Татьяна",
            "email": "master3@test.com",
            "role": "employee",
            "position": "Косметолог",
            "bio": "Уход за лицом и телом",
            "specialization": "Косметология, массаж",
            "years_of_experience": 6,
            "is_service_provider": True,
            "base_salary": 55000,
            "commission_rate": 30,
        },
        {
            "username": "master4",
            "full_name": "Федорова Наталья",
            "email": "master4@test.com",
            "role": "employee",
            "position": "Мастер бровист",
            "bio": "Оформление бровей и ресниц",
            "specialization": "Брови, ресницы",
            "years_of_experience": 4,
            "is_service_provider": True,
            "base_salary": 45000,
            "commission_rate": 25,
        },
        {
            "username": "master5",
            "full_name": "Павлова Ирина",
            "email": "master5@test.com",
            "role": "employee",
            "position": "Визажист",
            "bio": "Профессиональный макияж",
            "specialization": "Макияж, визаж",
            "years_of_experience": 8,
            "is_service_provider": True,
            "base_salary": 50000,
            "commission_rate": 30,
        },
    ]

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for user in test_users:
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id, email FROM users WHERE username = %s", (user['username'],))
        existing = cursor.fetchone()

        if existing:
            # Если пользователь уже существует, обновляем только если это тестовый (email = *@test.com)
            if existing[1] and existing[1].endswith('@test.com'):
                cursor.execute("""
                    UPDATE users
                    SET email = %s,
                        full_name = %s,
                        role = %s,
                        position = %s,
                        bio = %s,
                        specialization = %s,
                        years_of_experience = %s,
                        is_service_provider = %s,
                        base_salary = %s,
                        commission_rate = %s,
                        is_active = TRUE
                    WHERE username = %s
                """, (
                    user['email'],
                    user['full_name'],
                    user['role'],
                    user.get('position'),
                    user.get('bio'),
                    user.get('specialization'),
                    user.get('years_of_experience'),
                    user.get('is_service_provider', False),
                    user.get('base_salary', 0),
                    user.get('commission_rate', 0),
                    user['username']
                ))
                print(f"  ✏️  Обновлен: {user['username']} ({user['full_name']}) - {user['role']}")
                updated_count += 1
            else:
                print(f"  ⏭️  Пропущен: {user['username']} (уже существует с реальным email)")
                skipped_count += 1
        else:
            # Создаем нового пользователя
            cursor.execute("""
                INSERT INTO users (
                    username, password_hash, full_name, email, role,
                    position, bio, specialization, years_of_experience,
                    is_service_provider, base_salary, commission_rate,
                    created_at, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user['username'],
                password_hash,
                user['full_name'],
                user['email'],
                user['role'],
                user.get('position'),
                user.get('bio'),
                user.get('specialization'),
                user.get('years_of_experience'),
                user.get('is_service_provider', False),
                user.get('base_salary', 0),
                user.get('commission_rate', 0),
                datetime.now().isoformat(),
                True
            ))
            print(f"  ✅ Создан: {user['username']} ({user['full_name']}) - {user['role']}")
            created_count += 1

    conn.commit()

    print(f"\n📊 Результаты миграции:")
    print(f"   ✅ Создано: {created_count}")
    print(f"   ✏️  Обновлено: {updated_count}")
    print(f"   ⏭️  Пропущено: {skipped_count}")
    print(f"\n✅ Миграция завершена! Пароль для всех тестовых пользователей: {test_password}\n")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    """Запуск миграции напрямую"""
    try:
        migration_add_test_users()
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        import traceback
        traceback.print_exc()
