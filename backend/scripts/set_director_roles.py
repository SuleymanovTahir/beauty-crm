"""
Миграция: Установка ролей директоров

Этот скрипт устанавливает роль 'director' для указанных пользователей.
Скрипт идемпотентный - можно запускать несколько раз безопасно.

Пользователи, которым будет установлена роль 'director':
- admin (Администратор)
- tursunay
"""

import sys
import os
import sqlite3
from datetime import datetime

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.config import DATABASE_NAME


class Colors:
    """ANSI цвета для красивого вывода"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_success(message: str):
    """Печать успешного сообщения"""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")


def print_error(message: str):
    """Печать ошибки"""
    print(f"{Colors.RED}❌ {message}{Colors.END}")


def print_info(message: str):
    """Печать информационного сообщения"""
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")


def print_warning(message: str):
    """Печать предупреждения"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")


def set_director_roles():
    """
    Установить роль 'director' для указанных пользователей
    """
    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BOLD}МИГРАЦИЯ: Установка ролей директоров{Colors.END}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.END}\n")

    # Список пользователей для установки роли director
    # Можно указать по username или по full_name
    director_users = [
        'admin',      # username
        'tursunay',   # username
    ]

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        print_info(f"База данных: {DATABASE_NAME}")
        print_info(f"Дата миграции: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        updated_count = 0
        already_director_count = 0
        not_found_count = 0

        for user_identifier in director_users:
            # Проверяем, существует ли пользователь
            c.execute("""
                SELECT id, username, full_name, role
                FROM users
                WHERE username = ? OR LOWER(full_name) = LOWER(?)
                LIMIT 1
            """, (user_identifier, user_identifier))

            user = c.fetchone()

            if not user:
                print_error(f"Пользователь '{user_identifier}' не найден в БД")
                not_found_count += 1
                continue

            user_id, username, full_name, current_role = user

            # Проверяем текущую роль
            if current_role == 'director':
                print_success(f"Пользователь '{username}' ({full_name}) уже имеет роль 'director'")
                already_director_count += 1
                continue

            # Обновляем роль
            c.execute("""
                UPDATE users
                SET role = 'director'
                WHERE id = ?
            """, (user_id,))

            print_success(f"Роль обновлена: '{username}' ({full_name}): {current_role} → director")
            updated_count += 1

        # Сохраняем изменения
        conn.commit()

        # Выводим статистику
        print(f"\n{Colors.BOLD}{'=' * 70}{Colors.END}")
        print(f"{Colors.BOLD}РЕЗУЛЬТАТЫ МИГРАЦИИ{Colors.END}")
        print(f"{Colors.BOLD}{'=' * 70}{Colors.END}")
        print(f"{Colors.GREEN}Обновлено ролей: {updated_count}{Colors.END}")
        print(f"{Colors.YELLOW}Уже были директорами: {already_director_count}{Colors.END}")
        print(f"{Colors.RED}Не найдено: {not_found_count}{Colors.END}")

        # Проверяем результат
        print(f"\n{Colors.BOLD}Текущие директора в системе:{Colors.END}")
        c.execute("""
            SELECT id, username, full_name, email
            FROM users
            WHERE role = 'director'
            ORDER BY id
        """)

        directors = c.fetchall()
        if directors:
            for director in directors:
                user_id, username, full_name, email = director
                print(f"  • {username} ({full_name}) - {email or 'нет email'}")
        else:
            print_warning("Нет пользователей с ролью 'director'")

        conn.close()

        if updated_count > 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Миграция выполнена успешно!{Colors.END}")
        else:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}ℹ️  Нет изменений - все уже было настроено{Colors.END}")

        return True

    except Exception as e:
        print_error(f"Ошибка при выполнении миграции: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_directors():
    """
    Проверить, что роли директоров установлены правильно
    """
    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BOLD}ВЕРИФИКАЦИЯ РОЛЕЙ{Colors.END}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.END}\n")

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем количество директоров
        c.execute("SELECT COUNT(*) FROM users WHERE role = 'director'")
        director_count = c.fetchone()[0]

        print_info(f"Всего директоров в системе: {director_count}")

        if director_count == 0:
            print_warning("ВНИМАНИЕ: В системе нет ни одного директора!")
            print_warning("Это может привести к проблемам с управлением системой.")
            return False

        # Показываем всех директоров
        c.execute("""
            SELECT username, full_name, email, created_at
            FROM users
            WHERE role = 'director'
            ORDER BY created_at
        """)

        directors = c.fetchall()
        print(f"\n{Colors.BOLD}Список директоров:{Colors.END}")
        for username, full_name, email, created_at in directors:
            print(f"  ✓ {username} ({full_name})")
            print(f"    Email: {email or 'не указан'}")
            print(f"    Создан: {created_at}")
            print()

        conn.close()

        print_success("Верификация прошла успешно")
        return True

    except Exception as e:
        print_error(f"Ошибка при верификации: {e}")
        return False


def main():
    """Главная функция"""
    print(f"\n{Colors.BOLD}🚀 ЗАПУСК МИГРАЦИИ{Colors.END}")

    # Выполняем миграцию
    success = set_director_roles()

    if success:
        # Верифицируем результат
        verify_directors()

        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ВСЕ ГОТОВО!{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ МИГРАЦИЯ ЗАВЕРШИЛАСЬ С ОШИБКАМИ{Colors.END}")
        return 1


if __name__ == "__main__":
    exit(main())
