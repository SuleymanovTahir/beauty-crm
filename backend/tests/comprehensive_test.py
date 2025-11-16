#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║              КОМПЛЕКСНАЯ ПРОВЕРКА ВСЕЙ СИСТЕМЫ BEAUTY CRM                  ║
║                                                                            ║
║  Этот файл проверяет КАЖДУЮ функциональность системы и показывает         ║
║  МАКСИМАЛЬНО ПОДРОБНУЮ информацию об ошибках                               ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import sqlite3
import os
import sys
import traceback
from datetime import datetime
from typing import Dict, List, Tuple, Any
import json

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import DATABASE_NAME


class Colors:
    """ANSI цвета для вывода"""
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


class TestResult:
    """Результат теста"""
    def __init__(self, name: str, category: str):
        self.name = name
        self.category = category
        self.passed = False
        self.error = None
        self.details = []
        self.data = {}

    def success(self, message: str = "", data: Dict = None):
        self.passed = True
        if message:
            self.details.append(f"✅ {message}")
        if data:
            self.data.update(data)

    def fail(self, error: str, details: List[str] = None):
        self.passed = False
        self.error = error
        if details:
            self.details.extend(details)


class ComprehensiveTest:
    """Комплексное тестирование всей системы"""

    def __init__(self):
        self.results: List[TestResult] = []
        self.db_path = DATABASE_NAME
        self.start_time = None
        self.end_time = None

    def print_header(self, text: str, char: str = "═"):
        """Печать заголовка"""
        print(f"\n{Colors.BLUE}{char * 80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.WHITE}{text:^80}{Colors.END}")
        print(f"{Colors.BLUE}{char * 80}{Colors.END}\n")

    def print_section(self, text: str):
        """Печать секции"""
        print(f"\n{Colors.CYAN}{'─' * 80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}  {text}{Colors.END}")
        print(f"{Colors.CYAN}{'─' * 80}{Colors.END}\n")

    def print_test_result(self, result: TestResult):
        """Печать результата теста"""
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result.passed else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"  {status} - {result.name}")

        if result.details:
            for detail in result.details:
                if "❌" in detail:
                    print(f"      {Colors.RED}{detail}{Colors.END}")
                elif "⚠️" in detail:
                    print(f"      {Colors.YELLOW}{detail}{Colors.END}")
                else:
                    print(f"      {Colors.GREEN}{detail}{Colors.END}")

        if result.error:
            print(f"      {Colors.RED}❌ ОШИБКА: {result.error}{Colors.END}")

        if result.data:
            print(f"      {Colors.MAGENTA}📊 Данные: {json.dumps(result.data, ensure_ascii=False, indent=8)}{Colors.END}")

    def connect_db(self) -> sqlite3.Connection:
        """Подключение к базе данных"""
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"❌ База данных не найдена: {self.db_path}")

        if os.path.getsize(self.db_path) == 0:
            raise ValueError(f"❌ База данных пустая (0 байт): {self.db_path}")

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ========================================================================
    # ТЕСТЫ БАЗЫ ДАННЫХ
    # ========================================================================

    def test_database_exists(self) -> TestResult:
        """1. Проверка существования базы данных"""
        result = TestResult("База данных существует", "Database")

        try:
            if not os.path.exists(self.db_path):
                result.fail(f"Файл базы данных не найден: {self.db_path}", [
                    f"❌ Путь: {os.path.abspath(self.db_path)}",
                    f"❌ Директория существует: {os.path.exists(os.path.dirname(self.db_path))}",
                    "💡 Решение: Запустите приложение чтобы создать базу данных"
                ])
                return result

            size = os.path.getsize(self.db_path)
            if size == 0:
                result.fail("База данных пустая (0 байт)", [
                    f"❌ Размер: {size} байт",
                    "💡 Решение: База создана но не инициализирована. Перезапустите приложение."
                ])
                return result

            result.success(f"База данных найдена и заполнена ({size} байт)", {
                "path": self.db_path,
                "size_bytes": size,
                "size_mb": round(size / 1024 / 1024, 2)
            })

        except Exception as e:
            result.fail(f"Неожиданная ошибка: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    def test_tables_exist(self) -> TestResult:
        """2. Проверка существования всех таблиц"""
        result = TestResult("Все необходимые таблицы существуют", "Database")

        required_tables = [
            'users', 'clients', 'employees', 'services', 'bookings',
            'positions', 'salon_settings', 'bot_settings'
        ]

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = {row['name'] for row in cursor.fetchall()}

            missing_tables = set(required_tables) - existing_tables
            extra_tables = existing_tables - set(required_tables) - {'sqlite_sequence'}

            if missing_tables:
                result.fail(f"Отсутствуют таблицы: {', '.join(missing_tables)}", [
                    f"❌ Необходимые таблицы: {', '.join(required_tables)}",
                    f"❌ Найденные таблицы: {', '.join(existing_tables)}",
                    f"❌ Отсутствуют: {', '.join(missing_tables)}",
                    "💡 Решение: Запустите миграции или перезапустите приложение"
                ])
            else:
                result.success(f"Все {len(required_tables)} таблиц существуют", {
                    "required_tables": required_tables,
                    "extra_tables": list(extra_tables)
                })

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки таблиц: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    def test_users_table_structure(self) -> TestResult:
        """3. Проверка структуры таблицы users"""
        result = TestResult("Таблица users имеет правильную структуру", "Database")

        required_columns = {
            'id', 'username', 'password_hash', 'full_name', 'email',
            'role', 'position', 'employee_id', 'created_at', 'is_active'
        }

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("PRAGMA table_info(users)")
            columns_info = cursor.fetchall()
            existing_columns = {row['name'] for row in columns_info}

            missing_columns = required_columns - existing_columns

            if missing_columns:
                result.fail(f"Отсутствуют колонки: {', '.join(missing_columns)}", [
                    f"❌ Необходимые колонки: {', '.join(required_columns)}",
                    f"❌ Найденные колонки: {', '.join(existing_columns)}",
                    f"❌ Отсутствуют: {', '.join(missing_columns)}",
                    "💡 Решение: Запустите миграции структуры базы данных"
                ])
            else:
                details = []
                for col_info in columns_info:
                    col_name = col_info['name']
                    col_type = col_info['type']
                    not_null = "NOT NULL" if col_info['notnull'] else "NULL"
                    details.append(f"  • {col_name}: {col_type} ({not_null})")

                result.success(f"Все {len(required_columns)} колонок присутствуют", {
                    "columns": [f"{c['name']} ({c['type']})" for c in columns_info]
                })
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки структуры: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    # ========================================================================
    # ТЕСТЫ ПОЛЬЗОВАТЕЛЕЙ
    # ========================================================================

    def test_users_exist(self) -> TestResult:
        """4. Проверка наличия пользователей"""
        result = TestResult("В системе есть пользователи", "Users")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) as count FROM users")
            count = cursor.fetchone()['count']

            if count == 0:
                result.fail("В базе данных нет пользователей", [
                    "❌ Количество пользователей: 0",
                    "💡 Решение: Запустите миграцию seed_employees или создайте пользователей вручную"
                ])
            else:
                cursor.execute("""
                    SELECT username, full_name, role, position, employee_id
                    FROM users
                    ORDER BY id
                """)
                users = cursor.fetchall()

                user_details = []
                for user in users:
                    user_details.append(
                        f"  • {user['username']:<15} | {user['full_name']:<20} | "
                        f"{user['role']:<10} | {user['position'] or 'NULL':<25} | "
                        f"emp_id: {user['employee_id'] or 'NULL'}"
                    )

                result.success(f"Найдено {count} пользователей", {
                    "total_users": count,
                    "users": [dict(u) for u in users]
                })
                result.details.extend(user_details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки пользователей: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    def test_all_users_have_positions(self) -> TestResult:
        """5. КРИТИЧЕСКИЙ: Все пользователи имеют должности"""
        result = TestResult("Все пользователи имеют должности (CRITICAL)", "Users")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, username, full_name, position, role
                FROM users
                WHERE role IN ('employee', 'admin')
            """)
            users = cursor.fetchall()

            users_without_position = []
            users_with_position = []

            for user in users:
                if not user['position'] or user['position'].strip() == '':
                    users_without_position.append(user)
                else:
                    users_with_position.append(user)

            if users_without_position:
                error_details = [
                    f"❌ Пользователей БЕЗ должности: {len(users_without_position)}",
                    f"✅ Пользователей С должностью: {len(users_with_position)}",
                    "",
                    "❌ ПОЛЬЗОВАТЕЛИ БЕЗ ДОЛЖНОСТИ:"
                ]

                for user in users_without_position:
                    error_details.append(
                        f"  • ID: {user['id']}, Username: {user['username']}, "
                        f"Name: {user['full_name']}, Position: {user['position'] or 'NULL'}, "
                        f"Role: {user['role']}"
                    )

                error_details.extend([
                    "",
                    "💡 РЕШЕНИЕ:",
                    "  1. Проверьте файл backend/db/migrations/data/seed_employees.py",
                    "  2. Убедитесь что position добавляется в INSERT для users (строка ~104)",
                    "  3. Проверьте что assign_user_positions НЕ запускается ДО seed_employees",
                    "  4. Перезапустите приложение с пустой базой данных"
                ])

                result.fail(
                    f"КРИТИЧЕСКАЯ ОШИБКА: {len(users_without_position)} пользователей без должности!",
                    error_details
                )

                result.data = {
                    "users_without_position": [dict(u) for u in users_without_position],
                    "users_with_position": [dict(u) for u in users_with_position]
                }

            else:
                details = ["✅ Все пользователи имеют должности:"]
                for user in users_with_position:
                    details.append(
                        f"  ✅ {user['username']:<15} | {user['full_name']:<20} | {user['position']:<25}"
                    )

                result.success(f"Все {len(users)} пользователей имеют должности", {
                    "total_users": len(users),
                    "users_with_position": len(users_with_position)
                })
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки должностей: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    def test_user_positions_proper_case(self) -> TestResult:
        """6. КРИТИЧЕСКИЙ: Должности пользователей в правильном формате"""
        result = TestResult("Должности в правильном формате (не ALL CAPS)", "Users")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, username, full_name, position
                FROM users
                WHERE position IS NOT NULL AND position != ''
            """)
            users = cursor.fetchall()

            wrong_format_users = []
            correct_format_users = []

            for user in users:
                position = user['position']

                # Проверяем что не все буквы заглавные
                if position == position.upper() and position != position.title():
                    wrong_format_users.append({
                        'user': user,
                        'issue': 'ALL CAPS',
                        'current': position,
                        'expected': position.title()
                    })
                # Проверяем что не все буквы маленькие
                elif position == position.lower():
                    wrong_format_users.append({
                        'user': user,
                        'issue': 'all lowercase',
                        'current': position,
                        'expected': position.title()
                    })
                else:
                    correct_format_users.append(user)

            if wrong_format_users:
                error_details = [
                    f"❌ Должностей в неправильном формате: {len(wrong_format_users)}",
                    f"✅ Должностей в правильном формате: {len(correct_format_users)}",
                    "",
                    "❌ НЕПРАВИЛЬНЫЕ ФОРМАТЫ:"
                ]

                for item in wrong_format_users:
                    user = item['user']
                    error_details.append(
                        f"  • {user['username']:<15} | {user['full_name']:<20} | "
                        f"ТЕКУЩАЯ: '{item['current']:<25}' | ДОЛЖНА БЫТЬ: '{item['expected']:<25}' | "
                        f"ПРОБЛЕМА: {item['issue']}"
                    )

                error_details.extend([
                    "",
                    "💡 РЕШЕНИЕ:",
                    "  Измените должности на правильный формат:",
                    "  ❌ 'HAIR STYLIST' -> ✅ 'Hair Stylist'",
                    "  ❌ 'NAIL MASTER' -> ✅ 'Nail Master'",
                    "  ❌ 'nail master' -> ✅ 'Nail Master'",
                    "",
                    "  Файлы для проверки:",
                    "  - backend/db/migrations/data/seed_employees.py (строки ~27-73)",
                    "  - backend/db/migrations/schema/create_positions_table.py (строки ~46-73)"
                ])

                result.fail(
                    f"Найдено {len(wrong_format_users)} должностей в неправильном формате",
                    error_details
                )

                result.data = {
                    "wrong_format": [item for item in wrong_format_users],
                    "correct_format": [dict(u) for u in correct_format_users]
                }

            else:
                details = ["✅ Все должности в правильном формате:"]
                for user in correct_format_users:
                    details.append(f"  ✅ {user['username']:<15} | {user['position']:<25}")

                result.success(f"Все {len(users)} должностей в правильном формате", {
                    "total_positions": len(users),
                    "correct_format": len(correct_format_users)
                })
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки формата должностей: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    # ========================================================================
    # ТЕСТЫ СОТРУДНИКОВ
    # ========================================================================

    def test_employees_exist(self) -> TestResult:
        """7. Проверка наличия сотрудников"""
        result = TestResult("В системе есть сотрудники", "Employees")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) as count FROM employees WHERE is_active = 1")
            count = cursor.fetchone()['count']

            if count == 0:
                result.fail("В базе данных нет активных сотрудников", [
                    "❌ Количество активных сотрудников: 0",
                    "💡 Решение: Запустите миграцию seed_employees"
                ])
            else:
                cursor.execute("""
                    SELECT id, full_name, position, phone, email
                    FROM employees
                    WHERE is_active = 1
                    ORDER BY sort_order
                """)
                employees = cursor.fetchall()

                employee_details = []
                for emp in employees:
                    employee_details.append(
                        f"  • {emp['id']:<3} | {emp['full_name']:<20} | {emp['position']:<25} | {emp['phone'] or 'N/A':<20}"
                    )

                result.success(f"Найдено {count} активных сотрудников", {
                    "total_employees": count,
                    "employees": [dict(e) for e in employees]
                })
                result.details.extend(employee_details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка проверки сотрудников: {str(e)}", [
                f"❌ Traceback:\n{traceback.format_exc()}"
            ])

        return result

    def test_all_employees_have_positions(self) -> TestResult:
        """8. КРИТИЧЕСКИЙ: Все сотрудники имеют должности"""
        result = TestResult("Все сотрудники имеют должности (CRITICAL)", "Employees")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, full_name, position, phone, email
                FROM employees
                WHERE is_active = 1
            """)
            employees = cursor.fetchall()

            employees_without_position = []
            employees_with_position = []

            for emp in employees:
                if not emp['position'] or emp['position'].strip() == '':
                    employees_without_position.append(emp)
                else:
                    employees_with_position.append(emp)

            if employees_without_position:
                error_details = [
                    f"❌ Сотрудников БЕЗ должности: {len(employees_without_position)}",
                    "",
                    "❌ СОТРУДНИКИ БЕЗ ДОЛЖНОСТИ:"
                ]

                for emp in employees_without_position:
                    error_details.append(
                        f"  • ID: {emp['id']}, Name: {emp['full_name']}, Position: {emp['position'] or 'NULL'}"
                    )

                error_details.extend([
                    "",
                    "💡 РЕШЕНИЕ:",
                    "  Проверьте backend/db/migrations/data/seed_employees.py",
                    "  Убедитесь что position указан для каждого сотрудника (строки ~27-73)"
                ])

                result.fail(
                    f"КРИТИЧЕСКАЯ ОШИБКА: {len(employees_without_position)} сотрудников без должности!",
                    error_details
                )

            else:
                details = []
                for emp in employees_with_position:
                    details.append(f"  ✅ {emp['full_name']:<20} | {emp['position']:<25}")

                result.success(f"Все {len(employees)} сотрудников имеют должности")
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    def test_employee_names_proper_case(self) -> TestResult:
        """9. КРИТИЧЕСКИЙ: Имена сотрудников в правильном формате"""
        result = TestResult("Имена сотрудников в правильном формате", "Employees")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, full_name, position
                FROM employees
                WHERE is_active = 1
            """)
            employees = cursor.fetchall()

            wrong_format_employees = []

            for emp in employees:
                name = emp['full_name']

                if name == name.upper():
                    wrong_format_employees.append({
                        'emp': emp,
                        'issue': 'ALL CAPS',
                        'current': name,
                        'expected': name.title()
                    })
                elif name == name.lower():
                    wrong_format_employees.append({
                        'emp': emp,
                        'issue': 'all lowercase',
                        'current': name,
                        'expected': name.title()
                    })

            if wrong_format_employees:
                error_details = [
                    f"❌ Имен в неправильном формате: {len(wrong_format_employees)}",
                    "",
                    "❌ НЕПРАВИЛЬНЫЕ ФОРМАТЫ:"
                ]

                for item in wrong_format_employees:
                    emp = item['emp']
                    error_details.append(
                        f"  • ID: {emp['id']}, ТЕКУЩЕЕ: '{item['current']}', ДОЛЖНО БЫТЬ: '{item['expected']}', ПРОБЛЕМА: {item['issue']}"
                    )

                error_details.extend([
                    "",
                    "💡 РЕШЕНИЕ:",
                    "  Измените имена на правильный формат:",
                    "  ❌ 'SIMO' -> ✅ 'Simo'",
                    "  ❌ 'MESTAN' -> ✅ 'Mestan'",
                    "",
                    "  Файл: backend/db/migrations/data/seed_employees.py (строки ~27-73)"
                ])

                result.fail(f"Найдено {len(wrong_format_employees)} имен в неправильном формате", error_details)

            else:
                result.success(f"Все {len(employees)} имен сотрудников в правильном формате")

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    # ========================================================================
    # ТЕСТЫ ДОЛЖНОСТЕЙ
    # ========================================================================

    def test_positions_exist(self) -> TestResult:
        """10. Проверка справочника должностей"""
        result = TestResult("Справочник должностей существует", "Positions")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) as count FROM positions WHERE is_active = 1")
            count = cursor.fetchone()['count']

            if count == 0:
                result.fail("Справочник должностей пуст", [
                    "💡 Решение: Запустите миграцию create_positions_table"
                ])
            else:
                cursor.execute("""
                    SELECT id, name, name_en, name_ar
                    FROM positions
                    WHERE is_active = 1
                    ORDER BY sort_order
                """)
                positions = cursor.fetchall()

                details = []
                for pos in positions:
                    details.append(f"  • {pos['name']:<30} | EN: {pos['name_en']:<30}")

                result.success(f"Найдено {count} активных должностей")
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    def test_default_positions_exist(self) -> TestResult:
        """11. Проверка наличия стандартных должностей"""
        result = TestResult("Стандартные должности существуют", "Positions")

        required_positions = [
            "Hair Stylist",
            "Nail Master",
            "Nail/Waxing",
            "Nail Master/Massages"
        ]

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            missing_positions = []
            found_positions = []

            for pos_name in required_positions:
                cursor.execute("SELECT * FROM positions WHERE name = ?", (pos_name,))
                pos = cursor.fetchone()

                if pos:
                    found_positions.append(dict(pos))
                else:
                    missing_positions.append(pos_name)

            if missing_positions:
                error_details = [
                    f"❌ Отсутствующие должности: {', '.join(missing_positions)}",
                    "",
                    "💡 РЕШЕНИЕ:",
                    "  Проверьте backend/db/migrations/schema/create_positions_table.py",
                    "  Убедитесь что эти должности добавляются (строки ~46-56)"
                ]

                result.fail(f"Отсутствуют {len(missing_positions)} стандартных должностей", error_details)

            else:
                details = []
                for pos in found_positions:
                    details.append(f"  ✅ {pos['name']:<30} | EN: {pos['name_en']:<30}")

                result.success(f"Все {len(required_positions)} стандартных должностей присутствуют")
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    # ========================================================================
    # ТЕСТЫ НАСТРОЕК
    # ========================================================================

    def test_salon_settings_exist(self) -> TestResult:
        """12. Проверка настроек салона"""
        result = TestResult("Настройки салона существуют", "Settings")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM salon_settings WHERE id = 1")
            settings = cursor.fetchone()

            if not settings:
                result.fail("Настройки салона не найдены", [
                    "💡 Решение: Запустите миграцию migrate_salon_settings"
                ])
            else:
                critical_fields = ['name', 'address', 'phone', 'booking_url', 'google_maps']
                missing_fields = []

                for field in critical_fields:
                    if not settings[field] or settings[field].strip() == '':
                        missing_fields.append(field)

                if missing_fields:
                    result.fail(f"Отсутствуют критические поля: {', '.join(missing_fields)}")
                else:
                    details = [
                        f"  • Название: {settings['name']}",
                        f"  • Адрес: {settings['address']}",
                        f"  • Телефон: {settings['phone']}",
                        f"  • Booking URL: {settings['booking_url']}",
                        f"  • Google Maps: {settings['google_maps']}"
                    ]

                    # Проверка booking_url
                    if settings['booking_url'] == '/public/booking':
                        details.append("  ✅ Booking URL правильный (/public/booking)")
                    else:
                        details.append(f"  ⚠️ Booking URL: {settings['booking_url']} (ожидается: /public/booking)")

                    result.success("Настройки салона корректны")
                    result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    # ========================================================================
    # ТЕСТЫ УСЛУГ
    # ========================================================================

    def test_services_exist(self) -> TestResult:
        """13. Проверка наличия услуг"""
        result = TestResult("В системе есть услуги", "Services")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) as count FROM services WHERE is_active = 1")
            count = cursor.fetchone()['count']

            if count == 0:
                result.fail("В базе нет активных услуг", [
                    "💡 Решение: Запустите миграцию migrate_services"
                ])
            else:
                cursor.execute("""
                    SELECT category, COUNT(*) as count
                    FROM services
                    WHERE is_active = 1
                    GROUP BY category
                """)
                categories = cursor.fetchall()

                details = []
                for cat in categories:
                    details.append(f"  • {cat['category']:<20}: {cat['count']} услуг")

                result.success(f"Найдено {count} активных услуг")
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    # ========================================================================
    # ТЕСТЫ СВЯЗЕЙ
    # ========================================================================

    def test_user_employee_link(self) -> TestResult:
        """14. Проверка связи пользователей с сотрудниками"""
        result = TestResult("Связь users <-> employees", "Integration")

        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT u.id, u.username, u.full_name, u.employee_id,
                       e.id as emp_id, e.full_name as emp_name
                FROM users u
                LEFT JOIN employees e ON u.employee_id = e.id
                WHERE u.role = 'employee'
            """)
            users = cursor.fetchall()

            unlinked_users = []
            linked_users = []

            for user in users:
                if not user['employee_id']:
                    unlinked_users.append(user)
                else:
                    linked_users.append(user)

            if unlinked_users:
                error_details = [
                    f"❌ Пользователей без связи с employees: {len(unlinked_users)}",
                    ""
                ]

                for user in unlinked_users:
                    error_details.append(f"  • {user['username']}: employee_id = NULL")

                error_details.append("")
                error_details.append("💡 РЕШЕНИЕ: Проверьте seed_employees.py")

                result.fail(f"{len(unlinked_users)} пользователей не связаны с employees", error_details)

            else:
                details = []
                for user in linked_users:
                    details.append(f"  ✅ {user['username']:<15} -> employee #{user['employee_id']} ({user['emp_name']})")

                result.success(f"Все {len(users)} пользователей связаны с employees")
                result.details.extend(details)

            conn.close()

        except Exception as e:
            result.fail(f"Ошибка: {str(e)}", [f"❌ Traceback:\n{traceback.format_exc()}"])

        return result

    # ========================================================================
    # ГЛАВНЫЙ МЕТОД ЗАПУСКА
    # ========================================================================

    def run_all_tests(self) -> bool:
        """Запуск всех тестов"""
        self.start_time = datetime.now()

        self.print_header("🧪 КОМПЛЕКСНАЯ ПРОВЕРКА ВСЕЙ СИСТЕМЫ BEAUTY CRM")

        print(f"{Colors.CYAN}📅 Время запуска: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        print(f"{Colors.CYAN}💾 База данных: {self.db_path}{Colors.END}\n")

        # Список всех тестов
        all_tests = [
            # Database
            ("🗄️  БАЗА ДАННЫХ", [
                self.test_database_exists,
                self.test_tables_exist,
                self.test_users_table_structure,
            ]),
            # Users
            ("👤 ПОЛЬЗОВАТЕЛИ", [
                self.test_users_exist,
                self.test_all_users_have_positions,
                self.test_user_positions_proper_case,
            ]),
            # Employees
            ("👥 СОТРУДНИКИ", [
                self.test_employees_exist,
                self.test_all_employees_have_positions,
                self.test_employee_names_proper_case,
            ]),
            # Positions
            ("📋 ДОЛЖНОСТИ", [
                self.test_positions_exist,
                self.test_default_positions_exist,
            ]),
            # Settings
            ("⚙️  НАСТРОЙКИ", [
                self.test_salon_settings_exist,
            ]),
            # Services
            ("💈 УСЛУГИ", [
                self.test_services_exist,
            ]),
            # Integration
            ("🔗 ИНТЕГРАЦИЯ", [
                self.test_user_employee_link,
            ]),
        ]

        # Запуск тестов по категориям
        for category_name, tests in all_tests:
            self.print_section(category_name)

            for test_func in tests:
                result = test_func()
                self.results.append(result)
                self.print_test_result(result)

        # Итоговый отчет
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()

        self.print_header("📊 ИТОГОВЫЙ ОТЧЕТ")

        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests

        print(f"{Colors.BOLD}📈 Статистика:{Colors.END}")
        print(f"   ├─ Всего тестов: {total_tests}")
        print(f"   ├─ Пройдено: {Colors.GREEN}{passed_tests}{Colors.END}")
        print(f"   ├─ Провалено: {Colors.RED if failed_tests > 0 else Colors.GREEN}{failed_tests}{Colors.END}")
        print(f"   └─ Время выполнения: {duration:.2f} секунд\n")

        # Проваленные тесты
        if failed_tests > 0:
            print(f"{Colors.RED}{Colors.BOLD}❌ ПРОВАЛЕННЫЕ ТЕСТЫ:{Colors.END}\n")

            for result in self.results:
                if not result.passed:
                    print(f"  {Colors.RED}❌ [{result.category}] {result.name}{Colors.END}")
                    if result.error:
                        print(f"     {Colors.RED}Ошибка: {result.error}{Colors.END}")

            print(f"\n{Colors.YELLOW}💡 Подробности об ошибках смотрите выше в разделах тестов{Colors.END}\n")

        # Финальный вердикт
        if failed_tests == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}")
            print("╔════════════════════════════════════════════════════════════════════════╗")
            print("║                                                                        ║")
            print("║                    ✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!                              ║")
            print("║                                                                        ║")
            print("╚════════════════════════════════════════════════════════════════════════╝")
            print(Colors.END)
            return True
        else:
            print(f"{Colors.RED}{Colors.BOLD}")
            print("╔════════════════════════════════════════════════════════════════════════╗")
            print("║                                                                        ║")
            print("║                    ❌ ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ                           ║")
            print("║                                                                        ║")
            print("╚════════════════════════════════════════════════════════════════════════╝")
            print(Colors.END)
            return False


def run_comprehensive_test() -> bool:
    """Запуск комплексного тестирования"""
    try:
        tester = ComprehensiveTest()
        return tester.run_all_tests()
    except Exception as e:
        print(f"{Colors.RED}❌ КРИТИЧЕСКАЯ ОШИБКА: {str(e)}{Colors.END}")
        print(f"{Colors.RED}Traceback:\n{traceback.format_exc()}{Colors.END}")
        return False


if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)
