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

        # Список миграций структуры
        structure_migrations = [
            # Client-related
            ('schema.add_client_interests', 'add_client_interests_table'),
            ('schema.add_client_accounts', None),  # использует migrate()
            ('schema.add_client_notes', 'add_client_notes_table'),
            ('schema.add_bot_modes', 'add_bot_mode_fields'),

            # Booking-related
            ('schema.add_waitlist', 'add_waitlist_table'),
            ('schema.add_master_field', 'add_master_field'),
            ('schema.add_employee_id_to_bookings', 'add_employee_id_to_bookings'),

            # Service-related
            ('schema.add_service_courses', 'add_service_courses_table'),
            ('schema.add_temperature_field', 'add_temperature_field'),

            # Employee-related
            ('schema.create_employees', 'create_employees_table'),
            ('schema.create_employee_services', 'create_employee_services_table'),
            ('schema.add_employee_translations', 'add_employee_translations'),
            ('schema.create_employee_schedules', 'create_employee_schedules_table'),
            ('schema.add_employee_service_provider', 'add_employee_service_provider'),
            ('schema.add_employee_birthdays', 'add_employee_birthdays'),
            ('schema.add_salary_system', 'add_salary_system'),

            # Chat & Communication
            ('schema.add_chat_features', 'add_chat_features'),
            ('schema.add_telegram_username', 'add_telegram_username'),
            ('schema.add_language_column', 'add_language_column'),
            ('schema.add_notes_field', 'add_notes_field'),

            # Settings
            ('schema.add_universal_settings', 'add_universal_settings'),
            ('schema.add_manager_consultation', 'add_manager_consultation_field'),

            # User/Permissions
            ('schema.add_permissions_system', 'add_permissions_system'),
            ('schema.add_user_position', 'add_user_position_field'),
            ('schema.enhance_permissions_system', 'enhance_permissions_system'),
            ('schema.add_user_photo', 'add_user_photo_field'),
            ('schema.create_director_approvals', 'create_director_approvals_table'),
            ('schema.add_user_subscriptions', 'add_user_subscriptions'),
            ('schema.add_subscription_channels', 'add_subscription_channels'),
            ('schema.create_broadcast_history', 'create_broadcast_history_table'),
            ('schema.create_positions_table', 'create_positions_table'),
            ('schema.add_password_reset_fields', 'add_password_reset_fields'),
            ('schema.add_email_verification_token', 'add_email_verification_token'),
        ]

        for migration_name, function_name in structure_migrations:
            safe_run_migration(migration_name, function_name)

        # 3. Миграции данных
        log_info("3️⃣ Миграции данных", "migrations")

        data_migrations = [
            ('data.migrate_salon_settings', 'migrate_salon_settings'),
            ('data.migrate_bot_settings', 'migrate_bot_settings'),
            ('data.migrate_services', 'migrate_services'),
            ('data.update_existing_users_roles', 'update_existing_users_roles'),
        ]

        for migration_name, function_name in data_migrations:
            safe_run_migration(migration_name, function_name)

        # 4. Seed данные (опционально)
        log_info("4️⃣ Заполнение начальных данных (опционально)", "migrations")

        seed_migrations = [
            ('data.seed_employees', 'seed_employees'),
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
