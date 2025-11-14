"""
Тесты базы данных и миграций
"""
import pytest
import sqlite3
import os


@pytest.mark.database
class TestDatabase:
    """Тесты структуры базы данных"""

    def test_database_exists(self, clean_database):
        """Проверка создания базы данных"""
        assert os.path.exists(clean_database), "❌ База данных не создана"
        print("✅ База данных успешно создана")

    def test_users_table_structure(self, db_connection):
        """Проверка структуры таблицы users"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'username', 'password_hash', 'full_name', 'email', 'role', 'position', 'employee_id'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в users: {missing}"
        print(f"✅ Таблица users имеет все необходимые колонки: {len(columns)}")

    def test_clients_table_structure(self, db_connection):
        """Проверка структуры таблицы clients"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(clients)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'name', 'phone', 'email', 'instagram_id'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в clients: {missing}"
        print(f"✅ Таблица clients имеет все необходимые колонки: {len(columns)}")

    def test_employees_table_structure(self, db_connection):
        """Проверка структуры таблицы employees"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(employees)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'full_name', 'position', 'phone', 'email', 'is_active'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в employees: {missing}"
        print(f"✅ Таблица employees имеет все необходимые колонки: {len(columns)}")

    def test_services_table_structure(self, db_connection):
        """Проверка структуры таблицы services"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(services)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'name', 'category', 'price', 'duration', 'is_active'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в services: {missing}"
        print(f"✅ Таблица services имеет все необходимые колонки: {len(columns)}")

    def test_bookings_table_structure(self, db_connection):
        """Проверка структуры таблицы bookings"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(bookings)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'client_id', 'service_id', 'employee_id', 'date', 'time', 'status'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в bookings: {missing}"
        print(f"✅ Таблица bookings имеет все необходимые колонки: {len(columns)}")

    def test_positions_table_structure(self, db_connection):
        """Проверка структуры таблицы positions"""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(positions)")
        columns = {row[1] for row in cursor.fetchall()}

        required_columns = {'id', 'name', 'name_en', 'description', 'is_active'}
        missing = required_columns - columns

        assert not missing, f"❌ Отсутствуют колонки в positions: {missing}"
        print(f"✅ Таблица positions имеет все необходимые колонки: {len(columns)}")


@pytest.mark.database
class TestDataIntegrity:
    """Тесты целостности данных"""

    def test_user_creation(self, sample_user, db_connection):
        """Проверка создания пользователя"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (sample_user['id'],))
        user = cursor.fetchone()

        assert user is not None, "❌ Пользователь не был создан"
        assert user['username'] == sample_user['username'], "❌ Username не совпадает"
        assert user['full_name'] == sample_user['full_name'], "❌ Full name не совпадает"
        assert user['position'] == "Администратор", "❌ Position не установлена"

        print(f"✅ Пользователь создан: {user['username']} ({user['full_name']}) - {user['position']}")

    def test_client_creation(self, sample_client, db_connection):
        """Проверка создания клиента"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM clients WHERE id = ?", (sample_client['id'],))
        client = cursor.fetchone()

        assert client is not None, "❌ Клиент не был создан"
        assert client['name'] == sample_client['name'], "❌ Имя клиента не совпадает"
        assert client['phone'] == sample_client['phone'], "❌ Телефон не совпадает"

        print(f"✅ Клиент создан: {client['name']} ({client['phone']})")

    def test_employee_creation(self, sample_employee, db_connection):
        """Проверка создания сотрудника"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (sample_employee['id'],))
        employee = cursor.fetchone()

        assert employee is not None, "❌ Сотрудник не был создан"
        assert employee['full_name'] == sample_employee['full_name'], "❌ Имя не совпадает"
        assert employee['position'] == sample_employee['position'], "❌ Должность не совпадает"
        assert employee['position'] != employee['position'].upper(), "❌ Должность в верхнем регистре (должна быть в правильном формате)"

        print(f"✅ Сотрудник создан: {employee['full_name']} - {employee['position']}")

    def test_service_creation(self, sample_service, db_connection):
        """Проверка создания услуги"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM services WHERE id = ?", (sample_service['id'],))
        service = cursor.fetchone()

        assert service is not None, "❌ Услуга не была создана"
        assert service['name'] == sample_service['name'], "❌ Название не совпадает"
        assert service['price'] == sample_service['price'], "❌ Цена не совпадает"
        assert service['duration'] == sample_service['duration'], "❌ Длительность не совпадает"

        print(f"✅ Услуга создана: {service['name']} - {service['price']} AED ({service['duration']} мин)")

    def test_position_creation(self, sample_position, db_connection):
        """Проверка создания должности"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM positions WHERE id = ?", (sample_position['id'],))
        position = cursor.fetchone()

        assert position is not None, "❌ Должность не была создана"
        assert position['name'] == sample_position['name'], "❌ Название не совпадает"
        assert position['name'] != position['name'].upper(), "❌ Название должности в верхнем регистре"

        print(f"✅ Должность создана: {position['name']} ({position['name_en']})")

    def test_booking_with_foreign_keys(self, sample_client, sample_service, sample_employee, db_connection):
        """Проверка создания бронирования с внешними ключами"""
        from datetime import datetime

        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        cursor.execute("""
            INSERT INTO bookings (client_id, service_id, employee_id, date, time, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sample_client['id'], sample_service['id'], sample_employee['id'],
              "2025-01-15", "14:00", "confirmed", now))

        db_connection.commit()
        booking_id = cursor.lastrowid

        # Проверяем что бронирование создано
        cursor.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
        booking = cursor.fetchone()

        assert booking is not None, "❌ Бронирование не было создано"
        assert booking['client_id'] == sample_client['id'], "❌ client_id не совпадает"
        assert booking['service_id'] == sample_service['id'], "❌ service_id не совпадает"
        assert booking['employee_id'] == sample_employee['id'], "❌ employee_id не совпадает"

        print(f"✅ Бронирование создано: {booking['date']} {booking['time']} - статус: {booking['status']}")


@pytest.mark.database
class TestDataValidation:
    """Тесты валидации данных"""

    def test_unique_username_constraint(self, sample_user, db_connection):
        """Проверка уникальности username"""
        import hashlib
        from datetime import datetime

        cursor = db_connection.cursor()
        password_hash = hashlib.sha256("test456".encode()).hexdigest()
        now = datetime.now().isoformat()

        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO users (username, password_hash, full_name, created_at)
                VALUES (?, ?, ?, ?)
            """, (sample_user['username'], password_hash, "Another User", now))
            db_connection.commit()

        print("✅ Ограничение уникальности username работает")

    def test_unique_instagram_id_constraint(self, sample_client, db_connection):
        """Проверка уникальности instagram_id"""
        from datetime import datetime

        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO clients (name, instagram_id, created_at)
                VALUES (?, ?, ?)
            """, ("Another Client", sample_client['instagram_id'], now))
            db_connection.commit()

        print("✅ Ограничение уникальности instagram_id работает")

    def test_unique_position_name_constraint(self, sample_position, db_connection):
        """Проверка уникальности названия должности"""
        from datetime import datetime

        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO positions (name, name_en, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            """, (sample_position['name'], "Duplicate Position", now, now))
            db_connection.commit()

        print("✅ Ограничение уникальности названия должности работает")
