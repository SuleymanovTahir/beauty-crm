"""
Централизованная система миграций
Запускает все необходимые миграции в правильном порядке
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error, log_warning
from db.init import init_database

def safe_run_migration(migration_name, function_name=None):
    """
    Безопасно запустить миграцию с обработкой ошибок
    Args:
        migration_name: название модуля миграции (например, 'schema.add_client_interests')
        function_name: название функции (если None, попробует 'migrate' и другие варианты)
    """
    try:
        module = __import__(f'db.migrations.{migration_name}', fromlist=[''])

        # Попробуем найти функцию
        # Извлекаем имя файла без папки для поиска функции
        base_name = migration_name.split('.')[-1]

        if function_name:
            func = getattr(module, function_name, None)
        else:
            # Попробуем стандартные имена
            func = (
                getattr(module, 'migrate', None) or
                getattr(module, f'{base_name}', None) or
                getattr(module, f'{base_name}_table', None) or
                getattr(module, f'{base_name}_field', None)
            )

        if func and callable(func):
            log_info(f"   ▸ Запуск {migration_name}...", "migrations")
            func()
            log_info(f"   ✅ {migration_name} выполнена", "migrations")
            return True
        else:
            log_warning(f"   ⚠️ Не найдена функция в {migration_name}, пропуск", "migrations")
            return False
    except Exception as e:
        log_warning(f"   ⚠️ {migration_name}: {e}", "migrations")
        return False

def run_all_migrations():
    """Запустить все миграции в правильном порядке"""
    log_info("🚀 Запуск всех миграций...", "migrations")

    try:
        # 1. Инициализация базовых таблиц
        log_info("1️⃣ Инициализация базовых таблиц", "migrations")
        init_database()

        # 2. Миграции структуры БД
        log_info("2️⃣ Миграции структуры БД", "migrations")

        # Список миграций структуры (обновлено с новой категориальной структурой)
        structure_migrations = [
            # Client-related
            ('schema.clients.add_client_interests', 'add_client_interests_table'),
            ('schema.clients.add_client_accounts', None),  # использует migrate()
            ('schema.clients.add_client_notes', 'add_client_notes_table'),

            # Bot-related
            ('schema.bot.add_bot_modes', 'add_bot_mode_fields'),
            ('schema.bot.add_universal_settings', None),  # использует migrate()
            ('schema.bot.add_manager_consultation', 'add_manager_consultation_field'),
            ('schema.bot.add_missing_bot_fields', 'add_missing_bot_fields'),
            ('schema.bot.add_temperature_field', 'add_temperature_field'),

            # Booking-related
            ('schema.bookings.add_waitlist', 'add_waitlist_table'),
            ('schema.bookings.add_master_field', 'add_master_field'),
            ('schema.bookings.add_booking_reminders_system', None),
            ('schema.bookings.add_service_courses', 'add_service_courses_table'),

            # Employee-related
            ('schema.employees.create_employees', 'create_employees_table'),
            ('schema.employees.create_employee_services', 'create_employee_services_table'),
            ('schema.employees.add_employee_translations', 'add_employee_translations'),
            ('schema.employees.create_employee_schedules', 'create_employee_schedules_table'),
            ('schema.employees.add_employee_service_provider', 'add_employee_service_provider_field'),
            ('schema.employees.add_employee_birthdays', 'add_employee_birthday_fields'),
            ('schema.employees.add_employee_id_to_bookings', 'add_employee_id_to_bookings'),
            ('schema.employees.add_salary_system', None),  # использует migrate()
            ('schema.employees.create_positions_table', 'create_positions_table'),
            ('schema.employees.link_employees_positions', 'link_employees_positions'),

            # Salon-related
            ('schema.salon.add_hours_weekdays_weekends', 'add_hours_weekdays_weekends'),

            # Chat & Communication
            ('schema.chat.add_chat_features', 'add_chat_features_tables'),
            ('schema.chat.create_internal_chat', 'create_internal_chat_table'),

            # Notifications
            ('schema.notifications.create_birthday_notifications', 'create_birthday_notifications_table'),

            # User-related
            ('schema.users.add_telegram_username', 'add_telegram_username_field'),
            ('schema.users.add_language_column', 'add_language_column'),
            ('schema.users.add_user_position', 'add_user_position_field'),
            ('schema.users.add_user_photo', 'add_user_photo_field'),
            ('schema.users.add_user_subscriptions', 'add_user_subscriptions'),
            ('schema.users.add_subscription_channels', 'add_subscription_channels'),
            ('schema.users.add_password_reset_fields', 'add_password_reset_fields'),
            ('schema.users.add_email_verification_token', 'add_email_verification_token'),
            ('schema.users.add_birthday_phone_fields', 'add_birthday_phone_fields'),

            # Permissions
            ('schema.permissions.add_permissions_system', 'add_permissions_system'),
            ('schema.permissions.enhance_permissions_system', 'enhance_permissions_system'),

            # Other
            ('schema.other.add_notes_field', None),  # использует migrate()
            ('schema.other.create_director_approvals', 'create_director_approvals_table'),
            ('schema.other.create_broadcast_history', 'create_broadcast_history_table'),
        ]

        for migration_name, function_name in structure_migrations:
            safe_run_migration(migration_name, function_name)

        # 3. Миграции данных
        log_info("3️⃣ Миграции данных", "migrations")

        data_migrations = [
            ('data.salon.migrate_salon_settings', 'migrate_salon_settings'),
            ('data.bot.migrate_bot_settings', 'migrate_bot_settings'),
            ('data.services.migrate_services', 'migrate_services'),
            ('data.users.update_existing_users_roles', 'update_existing_users_roles'),
            ('data.employees.add_missing_positions', 'add_missing_positions'),
            # NOTE: assign_user_positions больше не нужен - должности назначаются в seed_employees
        ]

        for migration_name, function_name in data_migrations:
            safe_run_migration(migration_name, function_name)

        # 4. Seed данные (опционально)
        log_info("4️⃣ Заполнение начальных данных (опционально)", "migrations")

        seed_migrations = [
            ('data.employees.seed_employees', 'seed_employees'),
            ('maintenance.link_employees_to_services', 'link_employees_to_services'),
        ]

        for migration_name, function_name in seed_migrations:
            safe_run_migration(migration_name, function_name)

        log_info("✅ Все миграции успешно выполнены!", "migrations")
        return True

    except Exception as e:
        log_error(f"❌ Ошибка при выполнении миграций: {e}", "migrations")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    run_all_migrations()
