"""
Pytest конфигурация и фикстуры
"""
import pytest
from db.connection import get_db_connection
import os
import sys
from fastapi.testclient import TestClient
from datetime import datetime

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture(scope="function")
def clean_database():
    """Очищает базу данных для каждого теста"""
    conn = get_db_connection()
    c = conn.cursor()

    # Очистка таблиц (только для тестов!)
    tables = ['bookings', 'clients', 'users', 'services', 'employees', 'positions', 'salon_settings']
    for table in tables:
        try:
            c.execute(f"TRUNCATE TABLE {table} CASCADE")
        except:
            conn.rollback()
            try:
                c.execute(f"DELETE FROM {table}")
            except:
                conn.rollback()

    conn.commit()
    conn.close()
    yield

@pytest.fixture
def db_connection(clean_database):
    """Подключение к базе данных"""
    conn = get_db_connection()
    yield conn
    conn.close()

@pytest.fixture
def sample_user(db_connection):
    """Создает тестового пользователя"""
    import hashlib
    password_hash = hashlib.sha256("test123".encode()).hexdigest()
    now = datetime.now().isoformat()

    cursor = db_connection.cursor()
    cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, email, role, position, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, ("testuser", password_hash, "Test User", "test@example.com", "admin", "Администратор", now))

    user_id = cursor.fetchone()[0]
    db_connection.commit()

    return {
        "id": user_id,
        "username": "testuser",
        "password": "test123",
        "full_name": "Test User",
        "email": "test@example.com",
        "role": "admin"
    }

@pytest.fixture
def sample_client(db_connection):
    """Создает тестового клиента"""
    now = datetime.now().isoformat()

    cursor = db_connection.cursor()
    cursor.execute("""
        INSERT INTO clients (name, phone, email, instagram_id, created_at)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, ("John Doe", "971526961100", "john@example.com", "john_doe", now))

    client_id = cursor.fetchone()[0]
    db_connection.commit()

    return {
        "id": client_id,
        "name": "John Doe",
        "phone": "971526961100",
        "email": "john@example.com",
        "instagram_id": "john_doe"
    }

@pytest.fixture
def sample_employee(db_connection):
    """Создает тестового сотрудника"""
    now = datetime.now().isoformat()

    cursor = db_connection.cursor()
    cursor.execute("""
        INSERT INTO employees (full_name, position, phone, email, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, ("Maria Smith", "Hair Stylist", "+971509876543", "maria@salon.com", 1, now, now))

    employee_id = cursor.fetchone()[0]
    db_connection.commit()

    return {
        "id": employee_id,
        "full_name": "Maria Smith",
        "position": "Hair Stylist",
        "phone": "+971509876543",
        "email": "maria@salon.com"
    }

@pytest.fixture
def sample_service(db_connection):
    """Создает тестовую услугу"""
    now = datetime.now().isoformat()

    cursor = db_connection.cursor()
    cursor.execute("""
        INSERT INTO services (service_key, name, category, price, duration, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, ("haircut", "Haircut", "Hair", 150.0, 60, 1, now))

    service_id = cursor.fetchone()[0]
    db_connection.commit()

    return {
        "id": service_id,
        "name": "Haircut",
        "category": "Hair",
        "price": 150.0,
        "duration": 60
    }

@pytest.fixture
def sample_position(db_connection):
    """Создает тестовую должность"""
    now = datetime.now().isoformat()

    cursor = db_connection.cursor()
    cursor.execute("""
        INSERT INTO positions (name, description, is_active, sort_order, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, ("Hair Stylist", "Hair specialist", 1, 1, now, now))

    position_id = cursor.fetchone()[0]
    db_connection.commit()

    return {
        "id": position_id,
        "name": "Hair Stylist",
        "description": "Hair specialist"
    }

def pytest_configure(config):
    """Pytest конфигурация"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
