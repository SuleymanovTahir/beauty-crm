#!/usr/bin/env python3
"""
🔧 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ МИГРАЦИЙ
Запускает все миграции в правильном порядке с детальным логированием
"""
import sys
import os
import sqlite3
from datetime import datetime

# Убеждаемся что мы в правильной директории
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME


def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_migration_file(file_path, description=""):
    """Вывод информации о запускаемой миграции"""
    file_name = os.path.basename(file_path)
    print(f"\n📄 Миграция: {file_name}")
    if description:
        print(f"   {description}")
    print("-" * 80)


def run_migration_file(file_path, description=""):
    """
    Запуск файла миграции

    Args:
        file_path: Путь к файлу миграции (относительно db/migrations/)
        description: Описание миграции

    Returns:
        bool: True если успешно
    """
    full_path = os.path.join(current_dir, file_path)
    print_migration_file(file_path, description)

    try:
        # Проверяем существование файла
        if not os.path.exists(full_path):
            print(f"   ⚠️  Файл не найден: {file_path}")
            return False

        # Читаем и выполняем файл
        with open(full_path, 'r', encoding='utf-8') as f:
            code = f.read()

        # Создаем пространство имен для выполнения
        namespace = {
            '__file__': full_path,
            '__name__': '__main__',
            'DATABASE_NAME': DATABASE_NAME
        }

        # Выполняем код миграции
        exec(code, namespace)

        print(f"   ✅ Миграция выполнена успешно")
        return True

    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_migration_function(module_path, function_name, description=""):
    """
    Запуск функции миграции из модуля

    Args:
        module_path: Путь к модулю (например, 'db.migrations.schema.employees.create_employees')
        function_name: Имя функции для вызова
        description: Описание миграции

    Returns:
        bool: True если успешно
    """
    print_migration_file(f"{module_path}.{function_name}", description)

    try:
        # Импортируем модуль
        parts = module_path.split('.')
        module = __import__(module_path, fromlist=[parts[-1]])

        # Получаем функцию
        if not hasattr(module, function_name):
            print(f"   ⚠️  Функция {function_name} не найдена в модуле")
            return False

        func = getattr(module, function_name)

        # Вызываем функцию
        result = func()

        print(f"   ✅ Миграция выполнена успешно")
        return result if isinstance(result, bool) else True

    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Запуск всех миграций"""
    print_header("ЗАПУСК ВСЕХ МИГРАЦИЙ CRM")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"База данных: {DATABASE_NAME}")

    results = {}

    # ========================================================================
    # ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
    # ========================================================================
    print_header("ИНИЦИАЛИЗАЦИЯ БАЗОВЫХ ТАБЛИЦ")
    try:
        from db.init import init_database
        init_database()
        print("✅ Базовые таблицы инициализированы")
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        return False

    # ========================================================================
    # SCHEMA МИГРАЦИИ - Изменения структуры БД
    # ========================================================================
    print_header("SCHEMA МИГРАЦИИ - Структура БД")

    # Employees
    results["schema/employees/create_employees"] = run_migration_function(
        'db.migrations.schema.employees.create_employees',
        'create_employees_table',
        'Создание таблицы employees'
    )

    results["schema/employees/create_positions_table"] = run_migration_function(
        'db.migrations.schema.employees.create_positions_table',
        'create_positions_table',
        'Создание таблицы positions'
    )

    results["schema/employees/link_employees_positions"] = run_migration_function(
        'db.migrations.schema.employees.link_employees_positions',
        'link_employees_positions',
        'Связывание employees ← positions (position_id)'
    )

    results["schema/employees/create_employee_schedules"] = run_migration_function(
        'db.migrations.schema.employees.create_employee_schedules',
        'create_employee_schedules_table',
        'Создание таблицы расписания сотрудников'
    )

    results["schema/employees/create_employee_unavailability"] = run_migration_function(
        'db.migrations.schema.employees.create_employee_unavailability',
        'create_employee_unavailability_table',
        'Создание таблицы отсутствий сотрудников'
    )

    results["schema/employees/create_employee_services"] = run_migration_function(
        'db.migrations.schema.employees.create_employee_services',
        'create_employee_services_table',
        'Создание таблицы услуг сотрудников'
    )

    results["schema/employees/add_employee_translations"] = run_migration_function(
        'db.migrations.schema.employees.add_employee_translations',
        'add_employee_translations',
        'Добавление переводов имен сотрудников (name_en, name_ar)'
    )

    results["schema/employees/add_employee_birthdays"] = run_migration_function(
        'db.migrations.schema.employees.add_employee_birthdays',
        'add_employee_birthdays',
        'Добавление дней рождения сотрудников'
    )

    results["schema/clients/create_conversations_table"] = run_migration_function(
        'db.migrations.schema.clients.create_conversations_table',
        'create_conversations_table',
        'Создание таблицы conversations для диалогов'
    )

    results["schema/employees/add_employee_id_to_bookings"] = run_migration_function(
        'db.migrations.schema.employees.add_employee_id_to_bookings',
        'add_employee_id_to_bookings',
        'Добавление employee_id в bookings'
    )

    results["schema/employees/add_employee_service_provider"] = run_migration_function(
        'db.migrations.schema.employees.add_employee_service_provider',
        'add_service_provider_fields',
        'Связывание сотрудников с услугами'
    )

    results["schema/employees/add_salary_system"] = run_migration_function(
        'db.migrations.schema.employees.add_salary_system',
        'add_salary_system',
        'Добавление системы расчета зарплаты'
    )

    # Bot
    results["schema/bot/add_bot_modes"] = run_migration_function(
        'db.migrations.schema.bot.add_bot_modes',
        'add_bot_modes',
        'Добавление режимов работы бота'
    )

    results["schema/bot/add_manager_consultation"] = run_migration_function(
        'db.migrations.schema.bot.add_manager_consultation',
        'add_manager_consultation_field',
        'Добавление поля консультации менеджера'
    )

    results["schema/bot/add_missing_bot_fields"] = run_migration_function(
        'db.migrations.schema.bot.add_missing_bot_fields',
        'add_missing_bot_fields',
        'Добавление недостающих полей бота'
    )

    results["schema/bot/add_temperature_field"] = run_migration_function(
        'db.migrations.schema.bot.add_temperature_field',
        'add_temperature_field',
        'Добавление параметра temperature для AI'
    )

    results["schema/bot/add_universal_settings"] = run_migration_function(
        'db.migrations.schema.bot.add_universal_settings',
        'add_universal_bot_settings',
        'Универсальные настройки бота'
    )

    # Bookings
    results["schema/bookings/add_booking_reminders_system"] = run_migration_function(
        'db.migrations.schema.bookings.add_booking_reminders_system',
        'add_booking_reminders_system',
        'Создание системы напоминаний о записях'
    )

    results["schema/bookings/add_master_field"] = run_migration_function(
        'db.migrations.schema.bookings.add_master_field',
        'add_master_field_to_bookings',
        'Добавление поля master в bookings'
    )

    results["schema/bookings/add_service_courses"] = run_migration_function(
        'db.migrations.schema.bookings.add_service_courses',
        'add_service_courses',
        'Добавление абонементов и курсов услуг'
    )

    results["schema/bookings/add_waitlist"] = run_migration_function(
        'db.migrations.schema.bookings.add_waitlist',
        'add_waitlist_table',
        'Создание листа ожидания для записей'
    )

    # Clients
    results["schema/clients/add_client_accounts"] = run_migration_function(
        'db.migrations.schema.clients.add_client_accounts',
        'add_client_accounts',
        'Личные кабинеты клиентов'
    )

    results["schema/clients/add_client_interests"] = run_migration_function(
        'db.migrations.schema.clients.add_client_interests',
        'add_client_interests',
        'Интересы и предпочтения клиентов'
    )

    results["schema/clients/add_client_notes"] = run_migration_function(
        'db.migrations.schema.clients.add_client_notes',
        'add_client_notes_table',
        'Заметки о клиентах'
    )

    results["run_migration_client_preferences"] = run_migration_file(
        'run_migration_client_preferences.py',
        'Предпочтения клиентов (время, мастер, услуги)'
    )

    results["run_migration_preferred_messenger"] = run_migration_file(
        'run_migration_preferred_messenger.py',
        'Предпочитаемый мессенджер клиента'
    )

    # Chat
    results["schema/chat/add_chat_features"] = run_migration_function(
        'db.migrations.schema.chat.add_chat_features',
        'add_chat_features_tables',
        'Дополнительные функции чата'
    )

    results["schema/chat/add_messenger_system"] = run_migration_function(
        'db.migrations.schema.chat.add_messenger_system',
        'add_messenger_system',
        'Система поддержки нескольких мессенджеров'
    )

    results["schema/chat/create_internal_chat"] = run_migration_function(
        'db.migrations.schema.chat.create_internal_chat',
        'create_internal_chat',
        'Внутренний чат администраторов'
    )

    # Notifications
    results["schema/notifications/create_birthday_notifications"] = run_migration_function(
        'db.migrations.schema.notifications.create_birthday_notifications',
        'create_birthday_notifications_table',
        'Уведомления о днях рождения клиентов'
    )

    results["run_migration_notification_preferences"] = run_migration_file(
        'run_migration_notification_preferences.py',
        'Настройки уведомлений мастеров'
    )

    # Permissions
    results["schema/permissions/add_permissions_system"] = run_migration_function(
        'db.migrations.schema.permissions.add_permissions_system',
        'add_permissions_system',
        'Базовая система прав доступа'
    )

    results["schema/permissions/enhance_permissions_system"] = run_migration_function(
        'db.migrations.schema.permissions.enhance_permissions_system',
        'enhance_permissions_system',
        'Расширенные права доступа'
    )

    results["add_user_permissions_table"] = run_migration_file(
        'add_user_permissions_table.py',
        'Индивидуальные права пользователей (таблица user_permissions)'
    )

    # Salon
    results["schema/salon/add_hours_weekdays_weekends"] = run_migration_function(
        'db.migrations.schema.salon.add_hours_weekdays_weekends',
        'add_hours_weekdays_weekends',
        'Часы работы салона (будни/выходные)'
    )

    # Users
    results["schema/users/add_birthday_phone_fields"] = run_migration_function(
        'db.migrations.schema.users.add_birthday_phone_fields',
        'add_birthday_phone_fields',
        'День рождения и телефон пользователя'
    )

    results["schema/users/add_email_verification_token"] = run_migration_function(
        'db.migrations.schema.users.add_email_verification_token',
        'add_email_verification_token',
        'Токен подтверждения email'
    )

    results["schema/users/add_language_column"] = run_migration_function(
        'db.migrations.schema.users.add_language_column',
        'add_language_column',
        'Язык интерфейса пользователя'
    )

    results["schema/users/add_notification_preferences"] = run_migration_function(
        'db.migrations.schema.users.add_notification_preferences',
        'add_notification_preferences',
        'Настройки уведомлений пользователей'
    )

    results["schema/users/add_password_reset_fields"] = run_migration_function(
        'db.migrations.schema.users.add_password_reset_fields',
        'add_password_reset_fields',
        'Поля для сброса пароля'
    )

    # ВАЖНО: add_user_subscriptions должен быть ДО add_subscription_channels
    results["schema/users/add_user_subscriptions"] = run_migration_function(
        'db.migrations.schema.users.add_user_subscriptions',
        'add_user_subscriptions',
        'Подписки пользователя (создание таблицы)'
    )

    results["schema/users/add_subscription_channels"] = run_migration_function(
        'db.migrations.schema.users.add_subscription_channels',
        'add_subscription_channels',
        'Каналы подписок на уведомления'
    )

    results["run_migration_telegram_chat_id"] = run_migration_file(
        'run_migration_telegram_chat_id.py',
        'Telegram chat_id для уведомлений'
    )

    results["schema/users/add_telegram_username"] = run_migration_function(
        'db.migrations.schema.users.add_telegram_username',
        'add_telegram_username',
        'Telegram username'
    )

    results["schema/users/add_user_photo"] = run_migration_function(
        'db.migrations.schema.users.add_user_photo',
        'add_user_photo',
        'Фото профиля пользователя'
    )

    results["schema/users/add_user_position"] = run_migration_function(
        'db.migrations.schema.users.add_user_position',
        'add_user_position',
        'Должность пользователя'
    )

    # Other
    results["schema/other/add_notes_field"] = run_migration_function(
        'db.migrations.schema.other.add_notes_field',
        'add_notes_field',
        'Добавление поля notes в различные таблицы'
    )

    results["schema/other/create_broadcast_history"] = run_migration_function(
        'db.migrations.schema.other.create_broadcast_history',
        'create_broadcast_history_table',
        'История массовых рассылок'
    )

    results["schema/other/create_director_approvals"] = run_migration_function(
        'db.migrations.schema.other.create_director_approvals',
        'create_director_approvals_table',
        'Система согласований директора'
    )

    # Services
    results["schema/services/add_service_positions"] = run_migration_function(
        'db.migrations.schema.services.add_service_positions',
        'add_service_positions',
        'Связь услуг с должностями (вместо категорий)'
    )

    # Standalone миграции
    results["run_migration_master_schedule"] = run_migration_file(
        'run_migration_master_schedule.py',
        'Расписание мастеров (рабочие часы, выходные)'
    )

    results["migration_fix_master_schedule_nullable"] = run_migration_file(
        'migration_fix_master_schedule_nullable.py',
        'Исправление расписания (разрешить NULL для выходных)'
    )

    results["run_migration_loyalty_program"] = run_migration_file(
        'run_migration_loyalty_program.py',
        'Программа лояльности (баллы, уровни, транзакции)'
    )

    results["migration_add_position_to_services"] = run_migration_file(
        'migration_add_position_to_services.py',
        'Добавление position_id в services'
    )

    # ========================================================================
    # DATA МИГРАЦИИ - Заполнение данных
    # ========================================================================
    print_header("DATA МИГРАЦИИ - Заполнение данных")

    results["data/bot/migrate_bot_settings"] = run_migration_function(
        'db.migrations.data.bot.migrate_bot_settings',
        'migrate_settings',
        'Начальные настройки AI бота'
    )

    results["data/salon/migrate_salon_settings"] = run_migration_function(
        'db.migrations.data.salon.migrate_salon_settings',
        'migrate_salon_settings',
        'Настройки салона (название, адрес, часы работы)'
    )

    results["data/employees/seed_employees"] = run_migration_function(
        'db.migrations.data.employees.seed_employees',
        'seed_employees',
        'Создание начальных сотрудников из конфига'
    )

    results["data/employees/create_employee_schedules"] = run_migration_function(
        'db.migrations.schema.employees.create_employee_schedules',
        'create_employee_schedules',
        'Создание расписаний для всех мастеров'
    )

    results["data/employees/add_missing_positions"] = run_migration_function(
        'db.migrations.data.employees.add_missing_positions',
        'add_missing_positions',
        'Добавление недостающих должностей'
    )

    results["data/employees/assign_user_positions"] = run_migration_function(
        'db.migrations.data.employees.assign_user_positions',
        'assign_user_positions',
        'Присвоение должностей пользователям'
    )

    results["data/services/migrate_services"] = run_migration_function(
        'db.migrations.data.services.migrate_services',
        'migrate_services',
        'Заполнение услуг салона'
    )

    results["data/services/seed_employee_services"] = run_migration_function(
        'db.migrations.data.services.seed_employee_services',
        'seed_employee_services',
        'Связывание сотрудников с услугами'
    )

    results["data/users/update_existing_users_roles"] = run_migration_function(
        'db.migrations.data.users.update_existing_users_roles',
        'update_existing_users_roles',
        'Обновление ролей существующих пользователей'
    )

    # ========================================================================
    # MAINTENANCE МИГРАЦИИ - Обслуживание
    # ========================================================================
    print_header("MAINTENANCE МИГРАЦИИ - Обслуживание")

    results["maintenance/check_schedules"] = run_migration_function(
        'db.migrations.maintenance.check_schedules',
        'check_schedules',
        'Проверка корректности расписания'
    )

    results["maintenance/check_translations"] = run_migration_function(
        'db.migrations.maintenance.check_translations',
        'check_translations',
        'Проверка переводов'
    )

    results["maintenance/link_employees_to_services"] = run_migration_function(
        'db.migrations.maintenance.link_employees_to_services',
        'link_employees_to_services',
        'Связывание сотрудников с услугами'
    )

    # ========================================================================
    # ИТОГИ
    # ========================================================================
    print_header("ИТОГИ МИГРАЦИЙ")

    total = len(results)
    successful = sum(1 for r in results.values() if r)
    failed = total - successful

    # Группируем по категориям
    schema_results = {k: v for k, v in results.items() if k.startswith('schema/') or k.startswith('run_migration_') or k.startswith('migration_')}
    data_results = {k: v for k, v in results.items() if k.startswith('data/')}
    maintenance_results = {k: v for k, v in results.items() if k.startswith('maintenance/')}

    print("\n📊 SCHEMA миграций:")
    for migration, success in schema_results.items():
        status = "✅" if success else "❌"
        print(f"  {status} {migration}")

    print("\n📊 DATA миграций:")
    for migration, success in data_results.items():
        status = "✅" if success else "❌"
        print(f"  {status} {migration}")

    print("\n📊 MAINTENANCE миграций:")
    for migration, success in maintenance_results.items():
        status = "✅" if success else "❌"
        print(f"  {status} {migration}")

    print(f"\n  Всего миграций: {total}")
    print(f"  Успешно: {successful}")
    print(f"  Ошибок: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!")
        print("\n  ℹ️  База данных готова к работе")
    else:
        print("\n  ⚠️  Некоторые миграции завершились с ошибками")
        print("  ℹ️  Проверьте логи выше для деталей")

    print("=" * 80 + "\n")

    return failed == 0


def run_all_migrations():
    """
    Алиас для main() - для импорта в других модулях
    """
    return main()


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
