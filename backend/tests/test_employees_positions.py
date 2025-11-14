"""
Тесты функциональности сотрудников и должностей
"""
import pytest
import sqlite3
from datetime import datetime


@pytest.mark.employees
class TestEmployeesBasic:
    """Базовые тесты сотрудников"""

    def test_employee_has_position(self, sample_employee, db_connection):
        """Проверка что у сотрудника есть должность"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (sample_employee['id'],))
        employee = cursor.fetchone()

        assert employee['position'] is not None, "❌ У сотрудника нет должности"
        assert employee['position'] != "", "❌ Должность пустая"
        assert len(employee['position']) > 0, "❌ Должность пустая строка"

        print(f"✅ Сотрудник {employee['full_name']} имеет должность: {employee['position']}")

    def test_employee_name_proper_case(self, sample_employee, db_connection):
        """Проверка что имя сотрудника в правильном формате (не ALL CAPS)"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (sample_employee['id'],))
        employee = cursor.fetchone()

        name = employee['full_name']

        # Проверяем что имя не в верхнем регистре
        assert name != name.upper(), f"❌ Имя сотрудника в верхнем регистре: {name}"

        # Проверяем что первая буква заглавная
        assert name[0].isupper(), f"❌ Первая буква имени должна быть заглавной: {name}"

        print(f"✅ Имя сотрудника в правильном формате: {name}")

    def test_employee_position_proper_case(self, sample_employee, db_connection):
        """Проверка что должность в правильном формате (не ALL CAPS)"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (sample_employee['id'],))
        employee = cursor.fetchone()

        position = employee['position']

        # Проверяем что должность не в верхнем регистре
        assert position != position.upper(), f"❌ Должность в верхнем регистре: {position}"

        # Должность должна быть как "Hair Stylist", а не "HAIR STYLIST"
        words = position.split()
        for word in words:
            if len(word) > 0:
                assert word[0].isupper(), f"❌ Каждое слово должности должно начинаться с заглавной: {position}"

        print(f"✅ Должность в правильном формате: {position}")

    def test_multiple_employees_with_same_position(self, sample_position, db_connection):
        """Проверка что несколько сотрудников могут иметь одну должность"""
        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        # Создаем двух сотрудников с одной должностью
        cursor.execute("""
            INSERT INTO employees (full_name, position, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("Employee One", sample_position['name'], 1, now, now))

        cursor.execute("""
            INSERT INTO employees (full_name, position, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("Employee Two", sample_position['name'], 1, now, now))

        db_connection.commit()

        # Проверяем что оба созданы
        cursor.execute("SELECT COUNT(*) as count FROM employees WHERE position = ?", (sample_position['name'],))
        count = cursor.fetchone()['count']

        assert count >= 2, f"❌ Должно быть минимум 2 сотрудника с должностью {sample_position['name']}, найдено: {count}"

        print(f"✅ Несколько сотрудников могут иметь одну должность: {count} сотрудников с должностью '{sample_position['name']}'")


@pytest.mark.positions
class TestPositions:
    """Тесты должностей"""

    def test_position_proper_format(self, sample_position, db_connection):
        """Проверка формата должности"""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM positions WHERE id = ?", (sample_position['id'],))
        position = cursor.fetchone()

        name = position['name']

        # Проверки формата
        assert name is not None, "❌ Название должности NULL"
        assert name != "", "❌ Название должности пустое"
        assert name != name.upper(), f"❌ Название должности в верхнем регистре: {name}"
        assert name != name.lower(), f"❌ Название должности полностью в нижнем регистре: {name}"

        print(f"✅ Формат должности правильный: {name}")

    def test_default_positions_exist(self, db_connection):
        """Проверка что стандартные должности существуют"""
        cursor = db_connection.cursor()

        # Добавляем стандартные должности
        now = datetime.now().isoformat()
        default_positions = [
            ("Hair Stylist", "Hair Stylist", "مصفف شعر"),
            ("Nail Master", "Nail Master", "خبير الأظافر"),
            ("Nail/Waxing", "Nail & Waxing Master", "خبير الأظافر والإزالة"),
            ("Nail Master/Massages", "Nail & Massage Master", "خبير الأظافر والمساج"),
        ]

        for name, name_en, name_ar in default_positions:
            cursor.execute("""
                INSERT INTO positions (name, name_en, name_ar, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, name_en, name_ar, 1, now, now))

        db_connection.commit()

        # Проверяем что все созданы
        cursor.execute("SELECT COUNT(*) as count FROM positions WHERE is_active = 1")
        count = cursor.fetchone()['count']

        assert count >= 4, f"❌ Должно быть минимум 4 активных должности, найдено: {count}"

        # Проверяем каждую должность
        for name, name_en, _ in default_positions:
            cursor.execute("SELECT * FROM positions WHERE name = ?", (name,))
            pos = cursor.fetchone()

            assert pos is not None, f"❌ Должность '{name}' не найдена"
            assert pos['name'] == name, f"❌ Название должности не совпадает"
            assert pos['name'] != pos['name'].upper(), f"❌ Должность '{name}' в верхнем регистре"

            print(f"✅ Должность существует и в правильном формате: {name}")

    def test_position_translation(self, db_connection):
        """Проверка переводов должностей"""
        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        cursor.execute("""
            INSERT INTO positions (name, name_en, name_ar, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("Hair Stylist", "Hair Stylist", "مصفف شعر", 1, now, now))

        db_connection.commit()

        cursor.execute("SELECT * FROM positions WHERE name = 'Hair Stylist'")
        position = cursor.fetchone()

        assert position['name_en'] is not None, "❌ Нет английского перевода"
        assert position['name_ar'] is not None, "❌ Нет арабского перевода"
        assert len(position['name_ar']) > 0, "❌ Арабский перевод пустой"

        print(f"✅ Переводы должности присутствуют:")
        print(f"   RU: {position['name']}")
        print(f"   EN: {position['name_en']}")
        print(f"   AR: {position['name_ar']}")


@pytest.mark.employees
@pytest.mark.positions
class TestEmployeePositionRelationship:
    """Тесты связи сотрудников и должностей"""

    def test_employee_linked_to_position(self, db_connection):
        """Проверка связи сотрудника с должностью"""
        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        # Создаем должность
        cursor.execute("""
            INSERT INTO positions (name, name_en, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("Test Position", "Test Position", 1, now, now))

        # Создаем сотрудника с этой должностью
        cursor.execute("""
            INSERT INTO employees (full_name, position, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("Test Employee", "Test Position", 1, now, now))

        db_connection.commit()

        # Проверяем связь
        cursor.execute("""
            SELECT e.*, p.name as position_name, p.name_en as position_name_en
            FROM employees e
            LEFT JOIN positions p ON e.position = p.name
            WHERE e.full_name = 'Test Employee'
        """)

        result = cursor.fetchone()

        assert result is not None, "❌ Сотрудник не найден"
        assert result['position'] is not None, "❌ У сотрудника нет должности"
        assert result['position_name'] is not None, "❌ Должность не найдена в справочнике"
        assert result['position'] == result['position_name'], "❌ Должность сотрудника не соответствует справочнику"

        print(f"✅ Сотрудник корректно связан с должностью:")
        print(f"   Сотрудник: {result['full_name']}")
        print(f"   Должность: {result['position']} ({result['position_name_en']})")

    def test_all_employees_have_valid_positions(self, db_connection):
        """Проверка что все сотрудники имеют валидные должности"""
        cursor = db_connection.cursor()
        now = datetime.now().isoformat()

        # Создаем должности
        positions = ["Hair Stylist", "Nail Master", "Администратор"]
        for pos_name in positions:
            cursor.execute("""
                INSERT OR IGNORE INTO positions (name, name_en, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (pos_name, pos_name, 1, now, now))

        # Создаем сотрудников
        employees = [
            ("Simo", "Hair Stylist"),
            ("Mestan", "Hair Stylist"),
            ("Lyazzat", "Nail Master"),
        ]

        for emp_name, emp_position in employees:
            cursor.execute("""
                INSERT INTO employees (full_name, position, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (emp_name, emp_position, 1, now, now))

        db_connection.commit()

        # Проверяем что у всех есть должности
        cursor.execute("SELECT COUNT(*) as count FROM employees WHERE position IS NULL OR position = ''")
        count_without_position = cursor.fetchone()['count']

        assert count_without_position == 0, f"❌ Найдено {count_without_position} сотрудников без должности"

        # Проверяем что все должности валидны
        cursor.execute("""
            SELECT e.full_name, e.position
            FROM employees e
            LEFT JOIN positions p ON e.position = p.name
            WHERE p.id IS NULL
        """)

        invalid_positions = cursor.fetchall()

        assert len(invalid_positions) == 0, f"❌ Найдено {len(invalid_positions)} сотрудников с невалидными должностями: {[r['full_name'] for r in invalid_positions]}"

        # Проверяем формат должностей
        cursor.execute("SELECT full_name, position FROM employees")
        all_employees = cursor.fetchall()

        for emp in all_employees:
            position = emp['position']
            assert position == position.title() or position[0].isupper(), \
                f"❌ Должность '{position}' у сотрудника {emp['full_name']} не в правильном формате"

        print(f"✅ Все {len(employees)} сотрудников имеют валидные должности")
        for emp in all_employees:
            print(f"   {emp['full_name']}: {emp['position']}")


@pytest.mark.employees
@pytest.mark.integration
class TestEmployeeMigration:
    """Тесты миграции сотрудников (имитация seed_employees.py)"""

    def test_seed_employees_creates_with_positions(self, db_connection):
        """Проверка что seed_employees создает сотрудников с должностями"""
        cursor = db_connection.cursor()
        now = datetime.now().isoformat()
        import hashlib

        # Имитируем seed_employees.py
        employees = [
            {"full_name": "Simo", "position": "Hair Stylist", "username": "simo", "role": "employee"},
            {"full_name": "Mestan", "position": "Hair Stylist", "username": "mestan", "role": "employee"},
            {"full_name": "Lyazzat", "position": "Nail Master", "username": "lyazzat", "role": "employee"},
            {"full_name": "Gulya", "position": "Nail/Waxing", "username": "gulya", "role": "employee"},
            {"full_name": "Jennifer", "position": "Nail Master/Massages", "username": "jennifer", "role": "employee"},
        ]

        for emp in employees:
            # Создаем employee
            cursor.execute("""
                INSERT INTO employees (full_name, position, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (emp["full_name"], emp["position"], 1, now, now))

            employee_id = cursor.lastrowid

            # Создаем user с должностью (ЭТО ВАЖНО!)
            password_hash = hashlib.sha256(f"{emp['username']}123".encode()).hexdigest()
            cursor.execute("""
                INSERT INTO users (username, password_hash, full_name, role, position, employee_id, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (emp["username"], password_hash, emp["full_name"], emp["role"], emp["position"], employee_id, now, 1))

        db_connection.commit()

        # Проверяем что все пользователи созданы с должностями
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE position IS NULL OR position = ''")
        users_without_position = cursor.fetchone()['count']

        assert users_without_position == 0, f"❌ КРИТИЧЕСКАЯ ОШИБКА: {users_without_position} пользователей без должности!"

        # Проверяем каждого пользователя
        cursor.execute("SELECT username, full_name, position, employee_id FROM users WHERE role = 'employee'")
        users = cursor.fetchall()

        print(f"\n✅ Все {len(users)} сотрудников созданы с должностями:")
        print(f"{'Username':<15} {'Full Name':<20} {'Position':<25} {'Emp ID':<8}")
        print("-" * 68)

        for user in users:
            assert user['position'] is not None, f"❌ У пользователя {user['username']} нет должности"
            assert user['position'] != "", f"❌ У пользователя {user['username']} пустая должность"
            assert user['employee_id'] is not None, f"❌ У пользователя {user['username']} нет employee_id"

            print(f"{user['username']:<15} {user['full_name']:<20} {user['position']:<25} {user['employee_id']:<8}")

        print("\n✅ ВСЕ ТЕСТЫ МИГРАЦИИ ПРОШЛИ УСПЕШНО!")
