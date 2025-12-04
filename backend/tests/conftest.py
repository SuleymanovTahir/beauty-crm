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

# Тестовая база данных
TEST_DB = 'test_salon.db'

@pytest.fixture(scope="session")
def test_db_path():
    """Путь к тестовой базе данных"""
    return TEST_DB

@pytest.fixture(scope="function")
def clean_database(test_db_path):
    """Создает чистую базу данных для каждого теста"""
    # Удаляем старую тестовую БД
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    # Создаем новую
    conn = sqlite3.connect(test_db_path)
    c = conn.cursor()

    # Создаем базовые таблицы
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        role TEXT DEFAULT 'employee',
        position TEXT,
        employee_id INTEGER,
        created_at TEXT,
        is_active INTEGER DEFAULT 1
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        instagram_id TEXT UNIQUE,
        created_at TEXT,
        notes TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        position TEXT,
        phone TEXT,
        email TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_en TEXT,
        name_ar TEXT,
        category TEXT,
        price REAL,
        duration INTEGER,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER,
        service_id INTEGER,
        employee_id INTEGER,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        name_en TEXT,
        name_ar TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        instagram TEXT,
        booking_url TEXT,
        google_maps TEXT,
        hours TEXT,
        city TEXT,
        country TEXT,
        currency TEXT,
        created_at TEXT,
        updated_at TEXT
    )''')

    conn.commit()
    conn.close()

    yield test_db_path

    # Очистка после теста
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

@pytest.fixture
def db_connection(clean_database):
    """Подключение к тестовой базе данных"""
    conn = sqlite3.connect(clean_database)
    conn.row_factory = sqlite3.Row
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
    """, ("testuser", password_hash, "Test User", "test@example.com", "admin", "Администратор", now))

    db_connection.commit()
    user_id = cursor.lastrowid

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
    """, ("John Doe", "+971501234567", "john@example.com", "john_doe", now))

    db_connection.commit()
    client_id = cursor.lastrowid

    return {
        "id": client_id,
        "name": "John Doe",
        "phone": "+971501234567",
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
    """, ("Maria Smith", "Hair Stylist", "+971509876543", "maria@salon.com", 1, now, now))

    db_connection.commit()
    employee_id = cursor.lastrowid

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
        INSERT INTO services (name, name_en, category, price, duration, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, ("Стрижка", "Haircut", "Hair", 150.0, 60, 1, now))

    db_connection.commit()
    service_id = cursor.lastrowid

    return {
        "id": service_id,
        "name": "Стрижка",
        "name_en": "Haircut",
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
        INSERT INTO positions (name, name_en, description, is_active, sort_order, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, ("Hair Stylist", "Hair Stylist", "Hair specialist", 1, 1, now, now))

    db_connection.commit()
    position_id = cursor.lastrowid

    return {
        "id": position_id,
        "name": "Hair Stylist",
        "name_en": "Hair Stylist",
        "description": "Hair specialist"
    }

def pytest_configure(config):
    """Pytest конфигурация"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
