"""
Утилиты для работы с системой прав доступа
Иерархия ролей: admin > manager > sales/marketer > employee
"""
import sqlite3
from typing import Optional, Dict, List
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

# Иерархия ролей (чем выше число, тем выше роль)
ROLE_HIERARCHY = {
    'employee': 1,
    'sales': 2,
    'marketer': 2,
    'manager': 3,
    'admin': 4,
    'director': 5  # Альтернативное название admin
}

def get_role_level(role: str) -> int:
    """Получить уровень роли"""
    return ROLE_HIERARCHY.get(role, 0)

def has_higher_role(user_role: str, required_role: str) -> bool:
    """Проверить, что роль пользователя выше или равна требуемой"""
    return get_role_level(user_role) >= get_role_level(required_role)

def can_access_resource(user_id: int, resource: str, action: str = 'view') -> bool:
    """
    Проверить, может ли пользователь выполнить действие над ресурсом

    Args:
        user_id: ID пользователя
        resource: Ресурс (например, 'clients', 'bookings', 'settings')
        action: Действие ('view', 'create', 'edit', 'delete')

    Returns:
        bool: True если доступ разрешен
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем роль пользователя
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        if not row:
            return False

        user_role = row[0]

        # Админ всегда имеет доступ
        if user_role in ['admin', 'director']:
            return True

        # Проверяем индивидуальные права пользователя
        c.execute("""
            SELECT granted FROM user_permissions
            WHERE user_id = ? AND permission_key = ?
        """, (user_id, resource))

        user_perm = c.fetchone()
        if user_perm is not None:
            # Если есть индивидуальное право, используем его
            granted = bool(user_perm[0])
            conn.close()
            return granted

        # Проверяем права роли
        action_column = f'can_{action}'
        c.execute(f"""
            SELECT {action_column} FROM role_permissions
            WHERE role_key = ? AND permission_key = ?
        """, (user_role, resource))

        role_perm = c.fetchone()
        conn.close()

        if role_perm:
            return bool(role_perm[0])

        # По умолчанию доступ запрещен
        return False

    except Exception as e:
        log_error(f"Ошибка проверки прав: {e}", "permissions")
        return False

def get_user_permissions(user_id: int) -> Dict[str, Dict[str, bool]]:
    """
    Получить все права пользователя

    Returns:
        Dict: {resource: {view: bool, create: bool, edit: bool, delete: bool}}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем роль пользователя
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        if not row:
            return {}

        user_role = row[0]
        permissions = {}

        # Админ имеет все права
        if user_role in ['admin', 'director']:
            # Возвращаем все возможные ресурсы с полными правами
            resources = ['clients', 'bookings', 'services', 'users', 'employees',
                        'analytics', 'settings', 'bot_settings', 'chat', 'instagram_chat',
                        'internal_chat', 'export_data', 'import_data', 'approve_users',
                        'manage_permissions', 'view_contacts']

            for res in resources:
                permissions[res] = {'view': True, 'create': True, 'edit': True, 'delete': True}

            conn.close()
            return permissions

        # Получаем права роли
        c.execute("""
            SELECT permission_key, can_view, can_create, can_edit, can_delete
            FROM role_permissions
            WHERE role_key = ?
        """, (user_role,))

        for row in c.fetchall():
            resource, view, create, edit, delete = row
            permissions[resource] = {
                'view': bool(view),
                'create': bool(create),
                'edit': bool(edit),
                'delete': bool(delete)
            }

        # Применяем индивидуальные права пользователя
        c.execute("""
            SELECT permission_key, granted
            FROM user_permissions
            WHERE user_id = ?
        """, (user_id,))

        for row in c.fetchall():
            resource, granted = row
            # Индивидуальное право перезаписывает право роли
            if resource in permissions:
                # Если granted = 0, убираем ВСЕ права на ресурс
                # Если granted = 1, даем ВСЕ права на ресурс
                if granted:
                    permissions[resource] = {'view': True, 'create': True, 'edit': True, 'delete': True}
                else:
                    permissions[resource] = {'view': False, 'create': False, 'edit': False, 'delete': False}

        conn.close()
        return permissions

    except Exception as e:
        log_error(f"Ошибка получения прав: {e}", "permissions")
        return {}

def grant_user_permission(user_id: int, resource: str, granted_by_id: int) -> bool:
    """Дать пользователю доступ к ресурсу"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем, что тот, кто дает права, имеет на это право
        if not can_access_resource(granted_by_id, 'manage_permissions', 'create'):
            log_error(f"User {granted_by_id} не может давать права", "permissions")
            return False

        # Добавляем или обновляем право
        c.execute("""
            INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
            VALUES (?, ?, 1, ?, datetime('now'))
            ON CONFLICT(user_id, permission_key)
            DO UPDATE SET granted = 1, granted_by = ?, granted_at = datetime('now')
        """, (user_id, resource, granted_by_id, granted_by_id))

        conn.commit()
        conn.close()

        log_info(f"User {granted_by_id} дал права на {resource} пользователю {user_id}", "permissions")
        return True

    except Exception as e:
        log_error(f"Ошибка предоставления прав: {e}", "permissions")
        return False

def revoke_user_permission(user_id: int, resource: str, revoked_by_id: int) -> bool:
    """Отобрать у пользователя доступ к ресурсу"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем, что тот, кто забирает права, имеет на это право
        if not can_access_resource(revoked_by_id, 'manage_permissions', 'delete'):
            log_error(f"User {revoked_by_id} не может забирать права", "permissions")
            return False

        # Обновляем право
        c.execute("""
            INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
            VALUES (?, ?, 0, ?, datetime('now'))
            ON CONFLICT(user_id, permission_key)
            DO UPDATE SET granted = 0, granted_by = ?, granted_at = datetime('now')
        """, (user_id, resource, revoked_by_id, revoked_by_id))

        conn.commit()
        conn.close()

        log_info(f"User {revoked_by_id} отобрал права на {resource} у пользователя {user_id}", "permissions")
        return True

    except Exception as e:
        log_error(f"Ошибка отзыва прав: {e}", "permissions")
        return False

def filter_data_by_permissions(data: List[Dict], user_id: int, hide_contacts: bool = False) -> List[Dict]:
    """
    Фильтровать данные на основе прав пользователя
    Например, скрывать контактные данные для таргетолога/sales если настроено

    Args:
        data: Список объектов (например, клиентов)
        user_id: ID пользователя
        hide_contacts: Скрывать ли контактные данные

    Returns:
        List[Dict]: Отфильтрованные данные
    """
    if not hide_contacts:
        return data

    # Проверяем право view_contacts
    if can_access_resource(user_id, 'view_contacts', 'view'):
        return data

    # Скрываем контактные данные
    contact_fields = ['phone', 'email', 'telegram_username', 'whatsapp', 'instagram']

    filtered_data = []
    for item in data:
        filtered_item = item.copy()
        for field in contact_fields:
            if field in filtered_item:
                filtered_item[field] = "***" # Скрыто
        filtered_data.append(filtered_item)

    return filtered_data

def can_approve_users(user_id: int) -> bool:
    """Может ли пользователь одобрять новых пользователей"""
    return can_access_resource(user_id, 'approve_users', 'create')

def can_manage_permissions(user_id: int) -> bool:
    """Может ли пользователь управлять правами других пользователей"""
    return can_access_resource(user_id, 'manage_permissions', 'edit')

def can_export_data(user_id: int) -> bool:
    """Может ли пользователь экспортировать данные"""
    return can_access_resource(user_id, 'export_data', 'view')

def can_import_data(user_id: int) -> bool:
    """Может ли пользователь импортировать данные"""
    return can_access_resource(user_id, 'import_data', 'create')
