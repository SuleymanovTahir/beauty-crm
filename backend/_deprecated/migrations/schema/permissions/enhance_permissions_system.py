"""
Миграция: Улучшение системы прав доступа и регистрации
1. Добавление полей для одобрения пользователей
2. Добавление полей для email верификации
3. Заполнение базовых прав доступа по ролям
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def enhance_permissions_system():
    """Улучшить систему permissions"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # ===== 1. ДОБАВИТЬ ПОЛЯ В ТАБЛИЦУ USERS =====
        log_info("Добавление полей в таблицу users...", "migration")

        # Проверим, какие поля уже существуют
        c.execute("PRAGMA table_info(users)")
        existing_columns = [col[1] for col in c.fetchall()]

        # Добавим поле approved (требуется одобрение админа/директора)
        if 'approved' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0")
            log_info("  ✅ Добавлено поле 'approved'", "migration")

        # Добавим поле approved_by (кто одобрил)
        if 'approved_by' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN approved_by INTEGER")
            log_info("  ✅ Добавлено поле 'approved_by'", "migration")

        # Добавим поле approved_at (когда одобрен)
        if 'approved_at' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN approved_at TEXT")
            log_info("  ✅ Добавлено поле 'approved_at'", "migration")

        # Добавим поле email_verified (подтвержден ли email)
        if 'email_verified' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0")
            log_info("  ✅ Добавлено поле 'email_verified'", "migration")

        # Добавим поле verification_code (код подтверждения email)
        if 'verification_code' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN verification_code TEXT")
            log_info("  ✅ Добавлено поле 'verification_code'", "migration")

        # Добавим поле verification_code_expires (срок действия кода)
        if 'verification_code_expires' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN verification_code_expires TEXT")
            log_info("  ✅ Добавлено поле 'verification_code_expires'", "migration")

        # Одобрить существующих пользователей автоматически
        c.execute("UPDATE users SET approved = 1 WHERE approved IS NULL OR approved = 0")
        log_info("  ✅ Существующие пользователи одобрены автоматически", "migration")

        conn.commit()

        # ===== 2. ЗАПОЛНИТЬ БАЗОВЫЕ ПРАВА ДОСТУПА ПО РОЛЯМ =====
        log_info("Заполнение базовых прав доступа...", "migration")

        # Очистим старые права
        c.execute("DELETE FROM role_permissions")

        # Определяем ресурсы и права для каждой роли
        permissions_data = [
            # ===== ADMIN/DIRECTOR (полный доступ ко всему) =====
            ('admin', 'clients', 1, 1, 1, 1),  # view, create, edit, delete
            ('admin', 'bookings', 1, 1, 1, 1),
            ('admin', 'services', 1, 1, 1, 1),
            ('admin', 'users', 1, 1, 1, 1),
            ('admin', 'employees', 1, 1, 1, 1),
            ('admin', 'analytics', 1, 1, 1, 1),
            ('admin', 'settings', 1, 1, 1, 1),
            ('admin', 'bot_settings', 1, 1, 1, 1),
            ('admin', 'chat', 1, 1, 1, 1),
            ('admin', 'instagram_chat', 1, 1, 1, 1),
            ('admin', 'internal_chat', 1, 1, 1, 1),
            ('admin', 'export_data', 1, 1, 1, 1),  # полный экспорт
            ('admin', 'import_data', 1, 1, 1, 1),  # полный импорт
            ('admin', 'approve_users', 1, 1, 1, 1),  # одобрение пользователей
            ('admin', 'manage_permissions', 1, 1, 1, 1),  # управление правами
            ('admin', 'view_contacts', 1, 1, 1, 1),  # видеть контакты

            # ===== MANAGER (управление, без настроек системы) =====
            ('manager', 'clients', 1, 1, 1, 1),
            ('manager', 'bookings', 1, 1, 1, 1),
            ('manager', 'services', 1, 0, 0, 0),  # только просмотр
            ('manager', 'users', 1, 0, 0, 0),  # только просмотр
            ('manager', 'employees', 1, 0, 1, 0),  # просмотр и редактирование
            ('manager', 'analytics', 1, 0, 0, 0),
            ('manager', 'settings', 0, 0, 0, 0),  # нет доступа
            ('manager', 'bot_settings', 0, 0, 0, 0),
            ('manager', 'chat', 1, 1, 1, 0),
            ('manager', 'instagram_chat', 1, 1, 1, 0),
            ('manager', 'internal_chat', 1, 1, 1, 0),
            ('manager', 'export_data', 1, 0, 0, 0),  # только просмотр
            ('manager', 'import_data', 0, 0, 0, 0),  # нет импорта
            ('manager', 'approve_users', 1, 1, 1, 0),  # может одобрять
            ('manager', 'manage_permissions', 0, 0, 0, 0),
            ('manager', 'view_contacts', 1, 1, 1, 1),  # видеть контакты

            # ===== MARKETER (таргетолог - аналитика, импорт БЕЗ контактов) =====
            ('marketer', 'clients', 1, 1, 0, 0),  # просмотр и создание (без контактов)
            ('marketer', 'bookings', 1, 0, 0, 0),  # только просмотр
            ('marketer', 'services', 1, 0, 0, 0),
            ('marketer', 'users', 0, 0, 0, 0),  # нет доступа
            ('marketer', 'employees', 0, 0, 0, 0),
            ('marketer', 'analytics', 1, 0, 0, 0),  # только просмотр
            ('marketer', 'settings', 0, 0, 0, 0),
            ('marketer', 'bot_settings', 0, 0, 0, 0),
            ('marketer', 'chat', 0, 0, 0, 0),  # по умолчанию нет (можно дать в настройках)
            ('marketer', 'instagram_chat', 0, 0, 0, 0),  # по умолчанию нет
            ('marketer', 'internal_chat', 1, 1, 1, 0),  # есть внутренний чат
            ('marketer', 'export_data', 0, 0, 0, 0),  # нет экспорта
            ('marketer', 'import_data', 1, 0, 0, 0),  # только импорт БЕЗ контактов
            ('marketer', 'approve_users', 0, 0, 0, 0),
            ('marketer', 'manage_permissions', 0, 0, 0, 0),
            ('marketer', 'view_contacts', 0, 0, 0, 0),  # НЕ видеть контакты (можно изменить)

            # ===== SALES (продажник - работа с клиентами) =====
            ('sales', 'clients', 1, 1, 1, 0),  # просмотр, создание, редактирование
            ('sales', 'bookings', 1, 1, 1, 0),
            ('sales', 'services', 1, 0, 0, 0),  # только просмотр
            ('sales', 'users', 0, 0, 0, 0),
            ('sales', 'employees', 1, 0, 0, 0),  # только просмотр
            ('sales', 'analytics', 1, 0, 0, 0),  # только просмотр своих продаж
            ('sales', 'settings', 0, 0, 0, 0),
            ('sales', 'bot_settings', 0, 0, 0, 0),
            ('sales', 'chat', 1, 1, 1, 0),
            ('sales', 'instagram_chat', 0, 0, 0, 0),  # нет доступа к Instagram
            ('sales', 'internal_chat', 1, 1, 1, 0),
            ('sales', 'export_data', 0, 0, 0, 0),  # нет экспорта
            ('sales', 'import_data', 0, 0, 0, 0),  # нет импорта
            ('sales', 'approve_users', 0, 0, 0, 0),
            ('sales', 'manage_permissions', 0, 0, 0, 0),
            ('sales', 'view_contacts', 1, 0, 0, 0),  # видеть контакты (можно изменить)

            # ===== EMPLOYEE (сотрудник - минимальный доступ) =====
            ('employee', 'clients', 1, 0, 0, 0),  # только просмотр своих
            ('employee', 'bookings', 1, 0, 0, 0),  # только свои записи
            ('employee', 'services', 1, 0, 0, 0),  # только просмотр
            ('employee', 'users', 0, 0, 0, 0),
            ('employee', 'employees', 0, 0, 0, 0),
            ('employee', 'analytics', 0, 0, 0, 0),  # нет аналитики
            ('employee', 'settings', 0, 0, 0, 0),
            ('employee', 'bot_settings', 0, 0, 0, 0),
            ('employee', 'chat', 0, 0, 0, 0),  # нет доступа к клиентским чатам
            ('employee', 'instagram_chat', 0, 0, 0, 0),
            ('employee', 'internal_chat', 1, 1, 1, 0),  # есть внутренний чат
            ('employee', 'export_data', 0, 0, 0, 0),
            ('employee', 'import_data', 0, 0, 0, 0),
            ('employee', 'approve_users', 0, 0, 0, 0),
            ('employee', 'manage_permissions', 0, 0, 0, 0),
            ('employee', 'view_contacts', 0, 0, 0, 0),  # не видеть контакты
        ]

        # Вставляем права
        c.executemany("""
            INSERT INTO role_permissions (role_key, permission_key, can_view, can_create, can_edit, can_delete)
            VALUES (?, ?, ?, ?, ?, ?)
        """, permissions_data)

        conn.commit()
        log_info(f"  ✅ Добавлено {len(permissions_data)} прав доступа", "migration")

        log_info("✅ Миграция permissions завершена успешно", "migration")
        return True

    except Exception as e:
        log_error(f"❌ Ошибка миграции permissions: {e}", "migration")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Улучшение системы прав доступа")
    print("=" * 70)
    enhance_permissions_system()
