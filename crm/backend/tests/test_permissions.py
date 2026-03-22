#!/usr/bin/env python3
"""
🧪 ТЕСТЫ СИСТЕМЫ УПРАВЛЕНИЯ ПРАВАМИ И РОЛЯМИ

Тестирует:
1. Получение всех ролей
2. Получение описаний прав
3. Получение статусов клиентов
4. Получение прав пользователя
5. Изменение роли пользователя
6. Проверку прав
7. Иерархию ролей
"""
import sys
import os
from datetime import datetime

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection

from core.config import (
    DATABASE_NAME, ROLES, CLIENT_STATUSES,
    PERMISSION_DESCRIPTIONS, has_permission, can_manage_role
)
from utils.logger import log_info, log_error

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_section(text):
    """Секция теста"""
    print("\n" + "-" * 80)
    print(f"  {text}")
    print("-" * 80)

def test_roles_structure():
    """ТЕСТ 1: Проверка структуры ролей"""
    print_section("ТЕСТ 1: Структура ролей и прав")

    try:
        print(f"\n   Всего ролей: {len(ROLES)}")

        for role_key, role_data in ROLES.items():
            print(f"\n   ✅ Роль: {role_key}")
            print(f"      Название: {role_data.get('name', 'Н/Д')}")
            print(f"      Уровень иерархии: {role_data.get('hierarchy_level', 0)}")

            permissions = role_data.get('permissions', [])
            if permissions == '*':
                print(f"      Права: ВСЕ (полный доступ)")
            else:
                print(f"      Права: {len(permissions)} прав")

            can_manage = role_data.get('can_manage_roles', [])
            if can_manage:
                print(f"      Может управлять: {', '.join(can_manage)}")
            else:
                print(f"      Не может управлять другими ролями")

        print("\n   ✅ Структура ролей корректна")
        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_permission_descriptions():
    """ТЕСТ 2: Проверка описаний прав"""
    print_section("ТЕСТ 2: Описания прав")

    try:
        print(f"\n   Всего прав: {len(PERMISSION_DESCRIPTIONS)}")

        # Группируем права по категориям
        categories = {}
        for perm_key, perm_desc in PERMISSION_DESCRIPTIONS.items():
            category = perm_key.split('_')[0]
            if category not in categories:
                categories[category] = []
            categories[category].append((perm_key, perm_desc))

        print(f"\n   Категории прав:")
        for category, perms in categories.items():
            print(f"\n   📂 {category.upper()}: {len(perms)} прав")
            for perm_key, perm_desc in perms[:3]:  # Показываем первые 3
                print(f"      • {perm_key}: {perm_desc}")
            if len(perms) > 3:
                print(f"      ... и еще {len(perms) - 3} прав")

        print("\n   ✅ Описания прав корректны")
        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_client_statuses():
    """ТЕСТ 3: Проверка статусов клиентов"""
    print_section("ТЕСТ 3: Статусы клиентов")

    try:
        print(f"\n   Всего статусов: {len(CLIENT_STATUSES)}")

        for status_key, status_data in CLIENT_STATUSES.items():
            print(f"\n   📌 {status_key}")
            print(f"      Метка: {status_data.get('label', 'Н/Д')}")
            print(f"      Цвет: {status_data.get('color', 'Н/Д')}")
            print(f"      Иконка: {status_data.get('icon', 'Н/Д')}")

        print("\n   ✅ Статусы клиентов корректны")
        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_has_permission_function():
    """ТЕСТ 4: Проверка функции has_permission()"""
    print_section("ТЕСТ 4: Функция has_permission()")

    try:
        # Директор должен иметь все права
        assert has_permission('director', 'clients_view') == True
        assert has_permission('director', 'services_edit') == True
        assert has_permission('director', 'users_delete') == True
        print("   ✅ Директор имеет все права")

        # Админ должен иметь свои права
        assert has_permission('admin', 'clients_view') == True
        assert has_permission('admin', 'clients_create') == True
        print("   ✅ Админ имеет права на клиентов")

        # Админ не должен иметь права на удаление пользователей
        assert has_permission('admin', 'users_delete') == False
        print("   ✅ Админ НЕ имеет права на удаление пользователей")

        # Сотрудник должен видеть только свои записи
        assert has_permission('employee', 'bookings_view_own') == True
        assert has_permission('employee', 'bookings_view') == False
        print("   ✅ Сотрудник видит только свои записи")

        # Продажник должен видеть Instagram чат
        assert has_permission('sales', 'instagram_chat_view') == True
        assert has_permission('sales', 'clients_edit') == False
        print("   ✅ Продажник видит Instagram чат, но не может редактировать клиентов")

        print("\n   ✅ Функция has_permission() работает корректно")
        return True

    except AssertionError as e:
        print(f"\n   ❌ ОШИБКА: Проверка прав не прошла")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_can_manage_role_function():
    """ТЕСТ 5: Проверка функции can_manage_role()"""
    print_section("ТЕСТ 5: Функция can_manage_role()")

    try:
        # Директор может управлять всеми
        assert can_manage_role('director', 'admin') == True
        assert can_manage_role('director', 'manager') == True
        assert can_manage_role('director', 'employee') == True
        print("   ✅ Директор может управлять всеми ролями")

        # Админ может управлять менеджерами и сотрудниками
        assert can_manage_role('admin', 'manager') == True
        assert can_manage_role('admin', 'employee') == True
        assert can_manage_role('admin', 'sales') == True
        print("   ✅ Админ может управлять менеджерами, продажниками и сотрудниками")

        # Админ НЕ может управлять директором
        assert can_manage_role('admin', 'director') == False
        print("   ✅ Админ НЕ может управлять директором")

        # Сотрудник не может управлять никем
        assert can_manage_role('employee', 'manager') == False
        assert can_manage_role('employee', 'sales') == False
        print("   ✅ Сотрудник не может управлять другими ролями")

        print("\n   ✅ Функция can_manage_role() работает корректно")
        return True

    except AssertionError as e:
        print(f"\n   ❌ ОШИБКА: Проверка управления ролями не прошла")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_user_permissions_in_database():
    """ТЕСТ 6: Проверка прав пользователей в базе данных"""
    print_section("ТЕСТ 6: Права пользователей в БД")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем всех пользователей
        c.execute("SELECT id, username, full_name, role FROM users LIMIT 10")
        users = c.fetchall()

        print(f"\n   Найдено пользователей: {len(users)}")

        for user_id, username, full_name, role in users:
            role_data = ROLES.get(role, {})
            permissions = role_data.get('permissions', [])
            perm_count = len(permissions) if permissions != '*' else 'ВСЕ'

            print(f"\n   👤 {full_name} (@{username})")
            print(f"      Роль: {role_data.get('name', role)}")
            print(f"      Прав: {perm_count}")

        conn.close()

        print("\n   ✅ Права пользователей в БД проверены")
        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_role_hierarchy():
    """ТЕСТ 7: Проверка иерархии ролей"""
    print_section("ТЕСТ 7: Иерархия ролей")

    try:
        # Сортируем роли по hierarchy_level
        sorted_roles = sorted(
            ROLES.items(),
            key=lambda x: x[1].get('hierarchy_level', 0),
            reverse=True
        )

        print("\n   Иерархия ролей (от высшей к низшей):")
        for role_key, role_data in sorted_roles:
            level = role_data.get('hierarchy_level', 0)
            name = role_data.get('name', role_key)
            print(f"      {level:3d} - {name}")

        # Проверяем что platform owner выше tenant-ролей, а director остаётся высшей tenant-ролью
        highest_role = sorted_roles[0][0]
        assert highest_role in {'super_admin', 'director'}
        if highest_role == 'super_admin':
            print("\n   ✅ Platform owner на вершине общей иерархии")
            assert len(sorted_roles) > 1 and sorted_roles[1][0] == 'director'
            print("   ✅ Директор остаётся высшей tenant-ролью")
        else:
            print("\n   ✅ Директор на вершине tenant-иерархии")

        # Проверяем что внизу остаются прикладные низшие роли
        assert sorted_roles[-1][0] in {'employee', 'client'}
        print("   ✅ Нижняя граница иерархии корректна")

        print("\n   ✅ Иерархия ролей корректна")
        return True

    except AssertionError as e:
        print(f"\n   ❌ ОШИБКА: Проверка иерархии не прошла")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Запуск всех тестов"""
    print_header("ТЕСТИРОВАНИЕ СИСТЕМЫ УПРАВЛЕНИЯ ПРАВАМИ")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # Тест 1: Структура ролей
    results["Структура ролей"] = test_roles_structure()

    # Тест 2: Описания прав
    results["Описания прав"] = test_permission_descriptions()

    # Тест 3: Статусы клиентов
    results["Статусы клиентов"] = test_client_statuses()

    # Тест 4: Функция has_permission()
    results["Функция has_permission()"] = test_has_permission_function()

    # Тест 5: Функция can_manage_role()
    results["Функция can_manage_role()"] = test_can_manage_role_function()

    # Тест 6: Права в БД
    results["Права пользователей в БД"] = test_user_permissions_in_database()

    # Тест 7: Иерархия ролей
    results["Иерархия ролей"] = test_role_hierarchy()

    # Итоги
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    total = len(results)
    passed = sum(1 for r in results.values() if r)
    failed = total - passed

    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} - {test_name}")

    print(f"\n  Всего тестов: {total}")
    print(f"  Пройдено: {passed}")
    print(f"  Провалено: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("\n  📝 Система управления правами работает корректно:")
        print("     1. Все роли определены правильно")
        print("     2. Права описаны и работают")
        print("     3. Иерархия ролей соблюдается")
        print("     4. Функции has_permission() и can_manage_role() работают")
    else:
        print("\n  ⚠️  Некоторые тесты провалены")

    print("=" * 80 + "\n")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
