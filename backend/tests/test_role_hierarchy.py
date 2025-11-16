"""
Comprehensive тесты для проверки иерархии ролей и прав доступа

Проверяет:
1. Директор может назначать все роли (включая директора)
2. Админ может назначать только нижестоящие роли (НЕ директора)
3. Другие роли не могут назначать роли
4. Никто не может назначить роль выше своей
5. Нельзя изменить свою собственную роль
6. Правильная работа всех функций проверки прав
"""

import sys
import os

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from utils.permissions import RoleHierarchy, PermissionChecker
from core.config import ROLES


class Colors:
    """ANSI цвета для красивого вывода"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_test_header(test_name: str):
    """Печать заголовка теста"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}ТЕСТ: {test_name}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.END}")


def print_success(message: str):
    """Печать успешного теста"""
    print(f"{Colors.GREEN}✅ PASS: {message}{Colors.END}")


def print_failure(message: str):
    """Печать проваленного теста"""
    print(f"{Colors.RED}❌ FAIL: {message}{Colors.END}")


def print_info(message: str):
    """Печать информационного сообщения"""
    print(f"{Colors.YELLOW}ℹ️  INFO: {message}{Colors.END}")


def test_hierarchy_levels():
    """Тест 1: Проверка уровней иерархии"""
    print_test_header("Проверка уровней иерархии ролей")

    passed = 0
    failed = 0

    # Проверяем правильность уровней
    expected_levels = {
        'director': 100,
        'admin': 80,
        'manager': 60,
        'sales': 40,
        'marketer': 30,
        'employee': 20
    }

    for role, expected_level in expected_levels.items():
        actual_level = RoleHierarchy.get_hierarchy_level(role)
        if actual_level == expected_level:
            print_success(f"Роль '{role}' имеет правильный уровень: {actual_level}")
            passed += 1
        else:
            print_failure(f"Роль '{role}' имеет уровень {actual_level}, ожидалось {expected_level}")
            failed += 1

    # Проверяем несуществующую роль
    unknown_level = RoleHierarchy.get_hierarchy_level('unknown_role')
    if unknown_level == 0:
        print_success("Несуществующая роль возвращает уровень 0")
        passed += 1
    else:
        print_failure(f"Несуществующая роль возвращает уровень {unknown_level}, ожидалось 0")
        failed += 1

    return passed, failed


def test_director_can_manage_all():
    """Тест 2: Директор может управлять всеми ролями"""
    print_test_header("Директор может управлять всеми ролями")

    passed = 0
    failed = 0

    all_roles = ['director', 'admin', 'manager', 'sales', 'marketer', 'employee']

    for target_role in all_roles:
        can_manage = RoleHierarchy.can_manage_role('director', target_role)
        if can_manage:
            print_success(f"Директор может управлять ролью '{target_role}'")
            passed += 1
        else:
            print_failure(f"Директор НЕ может управлять ролью '{target_role}' (должен мочь!)")
            failed += 1

    # Проверяем get_manageable_roles
    manageable = RoleHierarchy.get_manageable_roles('director')
    if set(manageable) == set(all_roles):
        print_success(f"get_manageable_roles('director') возвращает все роли: {manageable}")
        passed += 1
    else:
        print_failure(f"get_manageable_roles('director') вернул: {manageable}, ожидалось все роли")
        failed += 1

    return passed, failed


def test_admin_cannot_manage_director():
    """Тест 3: Админ НЕ может управлять ролью директора"""
    print_test_header("Админ НЕ может управлять ролью директора")

    passed = 0
    failed = 0

    # Админ НЕ должен управлять директором
    can_manage_director = RoleHierarchy.can_manage_role('admin', 'director')
    if not can_manage_director:
        print_success("Админ НЕ может назначить роль директора ✓")
        passed += 1
    else:
        print_failure("Админ МОЖЕТ назначить роль директора (ОШИБКА!)")
        failed += 1

    # Админ ДОЛЖЕН управлять нижестоящими
    lower_roles = ['manager', 'sales', 'marketer', 'employee']
    for target_role in lower_roles:
        can_manage = RoleHierarchy.can_manage_role('admin', target_role)
        if can_manage:
            print_success(f"Админ может управлять ролью '{target_role}'")
            passed += 1
        else:
            print_failure(f"Админ НЕ может управлять ролью '{target_role}' (должен мочь!)")
            failed += 1

    # Проверяем get_manageable_roles
    manageable = RoleHierarchy.get_manageable_roles('admin')
    if 'director' not in manageable:
        print_success(f"get_manageable_roles('admin') НЕ содержит 'director': {manageable}")
        passed += 1
    else:
        print_failure(f"get_manageable_roles('admin') содержит 'director': {manageable} (ОШИБКА!)")
        failed += 1

    return passed, failed


def test_lower_roles_cannot_manage():
    """Тест 4: Нижестоящие роли не могут управлять никем"""
    print_test_header("Нижестоящие роли не могут управлять никем")

    passed = 0
    failed = 0

    lower_roles = ['manager', 'sales', 'marketer', 'employee']
    test_targets = ['director', 'admin', 'manager', 'sales', 'marketer', 'employee']

    for role in lower_roles:
        manageable = RoleHierarchy.get_manageable_roles(role)
        if len(manageable) == 0:
            print_success(f"Роль '{role}' не может управлять никем: {manageable}")
            passed += 1
        else:
            print_failure(f"Роль '{role}' может управлять: {manageable} (должна быть пустая!)")
            failed += 1

        # Проверяем, что не может управлять никакой ролью
        for target in test_targets:
            can_manage = RoleHierarchy.can_manage_role(role, target)
            if not can_manage:
                passed += 1
            else:
                print_failure(f"Роль '{role}' может управлять '{target}' (НЕ должна!)")
                failed += 1

    return passed, failed


def test_cannot_assign_higher_role():
    """Тест 5: Нельзя назначить роль выше своей"""
    print_test_header("Нельзя назначить роль выше своей")

    passed = 0
    failed = 0

    # Админ не может назначить директора (выше)
    can_assign = RoleHierarchy.can_assign_higher_role('admin', 'director')
    if not can_assign:
        print_success("Админ НЕ может назначить роль директора (выше своей)")
        passed += 1
    else:
        print_failure("Админ МОЖЕТ назначить роль директора (ОШИБКА!)")
        failed += 1

    # Админ может назначить роли своего уровня и ниже
    can_assign_admin = RoleHierarchy.can_assign_higher_role('admin', 'admin')
    can_assign_manager = RoleHierarchy.can_assign_higher_role('admin', 'manager')

    if can_assign_admin:
        print_success("Админ может назначить роль своего уровня (admin)")
        passed += 1
    else:
        print_failure("Админ НЕ может назначить роль admin")
        failed += 1

    if can_assign_manager:
        print_success("Админ может назначить роль ниже своей (manager)")
        passed += 1
    else:
        print_failure("Админ НЕ может назначить роль manager")
        failed += 1

    # Менеджер не может назначить админа
    can_assign = RoleHierarchy.can_assign_higher_role('manager', 'admin')
    if not can_assign:
        print_success("Менеджер НЕ может назначить роль админа (выше своей)")
        passed += 1
    else:
        print_failure("Менеджер МОЖЕТ назначить роль админа (ОШИБКА!)")
        failed += 1

    # Директор может назначить любую роль
    can_assign_any = RoleHierarchy.can_assign_higher_role('director', 'director')
    if can_assign_any:
        print_success("Директор может назначить роль своего уровня (director)")
        passed += 1
    else:
        print_failure("Директор НЕ может назначить роль director")
        failed += 1

    return passed, failed


def test_role_assignment_validation():
    """Тест 6: Комплексная валидация назначения ролей"""
    print_test_header("Комплексная валидация назначения ролей")

    passed = 0
    failed = 0

    # Тест 1: Нельзя менять свою роль
    success, error = RoleHierarchy.validate_role_assignment('director', 1, 1, 'admin')
    if not success and 'свою собственную роль' in error:
        print_success(f"Нельзя изменить свою роль: {error}")
        passed += 1
    else:
        print_failure("Можно изменить свою роль (ОШИБКА!)")
        failed += 1

    # Тест 2: Несуществующая роль
    success, error = RoleHierarchy.validate_role_assignment('director', 1, 2, 'nonexistent')
    if not success and 'не существует' in error:
        print_success(f"Несуществующая роль отклонена: {error}")
        passed += 1
    else:
        print_failure("Несуществующая роль принята (ОШИБКА!)")
        failed += 1

    # Тест 3: Директор может назначить любую роль
    success, error = RoleHierarchy.validate_role_assignment('director', 1, 2, 'director')
    if success and error == "":
        print_success("Директор может назначить роль директора другому пользователю")
        passed += 1
    else:
        print_failure(f"Директор НЕ может назначить директора: {error}")
        failed += 1

    success, error = RoleHierarchy.validate_role_assignment('director', 1, 2, 'admin')
    if success and error == "":
        print_success("Директор может назначить роль админа")
        passed += 1
    else:
        print_failure(f"Директор НЕ может назначить админа: {error}")
        failed += 1

    # Тест 4: Админ НЕ может назначить директора
    success, error = RoleHierarchy.validate_role_assignment('admin', 3, 2, 'director')
    if not success and 'нет прав' in error.lower():
        print_success(f"Админ НЕ может назначить директора: {error}")
        passed += 1
    else:
        print_failure("Админ МОЖЕТ назначить директора (ОШИБКА!)")
        failed += 1

    # Тест 5: Админ может назначить менеджера
    success, error = RoleHierarchy.validate_role_assignment('admin', 3, 2, 'manager')
    if success and error == "":
        print_success("Админ может назначить роль менеджера")
        passed += 1
    else:
        print_failure(f"Админ НЕ может назначить менеджера: {error}")
        failed += 1

    # Тест 6: Менеджер не может назначать роли
    success, error = RoleHierarchy.validate_role_assignment('manager', 4, 2, 'employee')
    if not success:
        print_success(f"Менеджер НЕ может назначать роли: {error}")
        passed += 1
    else:
        print_failure("Менеджер МОЖЕТ назначать роли (ОШИБКА!)")
        failed += 1

    return passed, failed


def test_permission_checks():
    """Тест 7: Проверка конкретных прав ролей"""
    print_test_header("Проверка конкретных прав доступа")

    passed = 0
    failed = 0

    # Директор имеет все права
    if PermissionChecker.can_view_all_users('director'):
        print_success("Директор может просматривать всех пользователей")
        passed += 1
    else:
        print_failure("Директор НЕ может просматривать пользователей")
        failed += 1

    if PermissionChecker.can_edit_users('director'):
        print_success("Директор может редактировать пользователей")
        passed += 1
    else:
        print_failure("Директор НЕ может редактировать пользователей")
        failed += 1

    if PermissionChecker.can_delete_users('director'):
        print_success("Директор может удалять пользователей")
        passed += 1
    else:
        print_failure("Директор НЕ может удалять пользователей")
        failed += 1

    # Админ имеет большинство прав
    if PermissionChecker.can_view_all_users('admin'):
        print_success("Админ может просматривать всех пользователей")
        passed += 1
    else:
        print_failure("Админ НЕ может просматривать пользователей")
        failed += 1

    if PermissionChecker.can_create_users('admin'):
        print_success("Админ может создавать пользователей")
        passed += 1
    else:
        print_failure("Админ НЕ может создавать пользователей")
        failed += 1

    # Менеджер имеет ограниченные права
    if PermissionChecker.can_view_all_clients('manager'):
        print_success("Менеджер может просматривать клиентов")
        passed += 1
    else:
        print_failure("Менеджер НЕ может просматривать клиентов")
        failed += 1

    if not PermissionChecker.can_view_all_users('manager'):
        print_success("Менеджер НЕ может просматривать всех пользователей")
        passed += 1
    else:
        print_failure("Менеджер МОЖЕТ просматривать всех пользователей (должен не мочь!)")
        failed += 1

    # Продажник имеет ограниченный доступ
    if PermissionChecker.can_view_instagram_chat('sales'):
        print_success("Продажник может просматривать Instagram чат")
        passed += 1
    else:
        print_failure("Продажник НЕ может просматривать Instagram чат")
        failed += 1

    if not PermissionChecker.can_view_client_contacts('sales'):
        print_success("Продажник НЕ может видеть контакты клиентов")
        passed += 1
    else:
        print_failure("Продажник МОЖЕТ видеть контакты клиентов")
        failed += 1

    # Таргетолог может отправлять рассылки
    if PermissionChecker.can_send_broadcasts('marketer'):
        print_success("Таргетолог может отправлять рассылки")
        passed += 1
    else:
        print_failure("Таргетолог НЕ может отправлять рассылки")
        failed += 1

    # Сотрудник имеет минимальные права
    if not PermissionChecker.can_view_all_users('employee'):
        print_success("Сотрудник НЕ может просматривать всех пользователей")
        passed += 1
    else:
        print_failure("Сотрудник МОЖЕТ просматривать всех пользователей")
        failed += 1

    if not PermissionChecker.can_view_all_clients('employee'):
        print_success("Сотрудник НЕ может просматривать всех клиентов")
        passed += 1
    else:
        print_failure("Сотрудник МОЖЕТ просматривать всех клиентов")
        failed += 1

    return passed, failed


def test_analytics_permissions():
    """Тест 8: Проверка прав на аналитику"""
    print_test_header("Проверка прав доступа к аналитике")

    passed = 0
    failed = 0

    # Директор имеет полный доступ
    if PermissionChecker.can_view_full_analytics('director'):
        print_success("Директор имеет полный доступ к аналитике")
        passed += 1
    else:
        print_failure("Директор НЕ имеет полного доступа к аналитике")
        failed += 1

    # Админ и менеджер имеют ограниченный доступ
    for role in ['admin', 'manager']:
        if PermissionChecker.can_view_analytics(role):
            print_success(f"{role.capitalize()} может просматривать аналитику")
            passed += 1
        else:
            print_failure(f"{role.capitalize()} НЕ может просматривать аналитику")
            failed += 1

        if not PermissionChecker.can_view_full_analytics(role):
            print_success(f"{role.capitalize()} НЕ имеет полного доступа к аналитике")
            passed += 1
        else:
            print_failure(f"{role.capitalize()} имеет полный доступ (должен не иметь!)")
            failed += 1

    # Продажник и таргетолог имеют ограниченный доступ
    if PermissionChecker.can_view_analytics('sales'):
        print_success("Продажник может просматривать аналитику (ограниченно)")
        passed += 1
    else:
        print_failure("Продажник НЕ может просматривать аналитику")
        failed += 1

    if PermissionChecker.can_view_analytics('marketer'):
        print_success("Таргетолог может просматривать аналитику (ограниченно)")
        passed += 1
    else:
        print_failure("Таргетолог НЕ может просматривать аналитику")
        failed += 1

    # Сотрудник не имеет доступа к аналитике
    if not PermissionChecker.can_view_analytics('employee'):
        print_success("Сотрудник НЕ имеет доступа к аналитике")
        passed += 1
    else:
        print_failure("Сотрудник имеет доступ к аналитике")
        failed += 1

    return passed, failed


def main():
    """Запуск всех тестов"""
    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BOLD}COMPREHENSIVE ТЕСТЫ ИЕРАРХИИ РОЛЕЙ И ПРАВ ДОСТУПА{Colors.END}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.END}")

    total_passed = 0
    total_failed = 0

    # Запускаем все тесты
    tests = [
        ("Уровни иерархии", test_hierarchy_levels),
        ("Директор управляет всеми", test_director_can_manage_all),
        ("Админ не управляет директором", test_admin_cannot_manage_director),
        ("Нижестоящие не управляют", test_lower_roles_cannot_manage),
        ("Нельзя назначить выше", test_cannot_assign_higher_role),
        ("Валидация назначения ролей", test_role_assignment_validation),
        ("Проверка прав", test_permission_checks),
        ("Права на аналитику", test_analytics_permissions),
    ]

    for test_name, test_func in tests:
        passed, failed = test_func()
        total_passed += passed
        total_failed += failed
        print(f"\n{Colors.YELLOW}Тест '{test_name}': {Colors.GREEN}{passed} passed{Colors.END}, {Colors.RED}{failed} failed{Colors.END}")

    # Итоговый результат
    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BOLD}ИТОГОВЫЙ РЕЗУЛЬТАТ{Colors.END}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.GREEN}✅ Успешных тестов: {total_passed}{Colors.END}")
    print(f"{Colors.RED}❌ Проваленных тестов: {total_failed}{Colors.END}")

    if total_failed == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ!{Colors.END}")
        return 1


if __name__ == "__main__":
    exit(main())
