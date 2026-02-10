"""
Централизованная система проверки прав доступа и иерархии ролей

Использует ROLES из core.config для иерархии и проверки прав.
Импортируйте функции из этого модуля везде, где нужно проверить права.

Пример использования:
    from utils.permissions import RoleHierarchy, PermissionChecker

    # Проверка иерархии
    if RoleHierarchy.can_manage_role(current_user_role, target_user_role):
        # Можно изменить роль

    # Проверка конкретного права
    if PermissionChecker.can_edit_users(user_role):
        # Можно редактировать пользователей
"""

import logging
from typing import Optional, Dict, List, Tuple, Union
from functools import wraps
from fastapi import Cookie
from fastapi.responses import JSONResponse

from core.config import ROLES, has_permission as config_has_permission
from utils.logger import log_info, log_error
from db.connection import get_db_connection

class RoleHierarchy:
    """Класс для работы с иерархией ролей"""

    @staticmethod
    def get_hierarchy_level(role: str) -> int:
        """
        Получить числовой уровень роли

        Args:
            role: Ключ роли (director, admin, manager, etc.)

        Returns:
            int: Уровень иерархии (100 для director, 80 для admin, и т.д.)
        """
        return ROLES.get(role, {}).get('hierarchy_level', 0)

    @staticmethod
    def can_manage_role(manager_role: str, target_role: str, secondary_role: str = None) -> bool:
        """
        Проверить, может ли manager_role (или secondary_role) управлять target_role
        """
        from core.config import can_manage_role as config_can_manage_role
        return config_can_manage_role(manager_role, target_role, secondary_role)

    @staticmethod
    def can_assign_higher_role(current_role: str, target_role: str) -> bool:
        """
        Проверить, не пытается ли пользователь назначить роль выше своей

        Args:
            current_role: Текущая роль пользователя
            target_role: Роль, которую хотят назначить

        Returns:
            bool: True если target_role не выше current_role
        """
        current_level = RoleHierarchy.get_hierarchy_level(current_role)
        target_level = RoleHierarchy.get_hierarchy_level(target_role)

        # Можно назначить роль только если она не выше текущей
        return target_level <= current_level

    @staticmethod
    def get_manageable_roles(role: str) -> List[str]:
        """
        Получить список ролей, которыми может управлять данная роль

        Args:
            role: Роль пользователя

        Returns:
            List[str]: Список ключей ролей
        """
        # Директор видит все роли (включая director)
        if role == 'director':
            return list(ROLES.keys())

        # Остальные видят только те роли, которыми могут управлять
        role_data = ROLES.get(role, {})
        return role_data.get('can_manage_roles', [])

    @staticmethod
    def has_permission(role: str, permission: str, secondary_role: str = None, user_id: int = None) -> bool:
        """
        Проверить наличие права (SSOT: Config + DB Overrides)
        """
        # 1. Сначала проверяем статический конфиг (самый быстрый путь)
        if config_has_permission(role, permission, secondary_role):
            return True

        # 2. Если в конфиге нет, но есть user_id - проверяем БД (переопределения)
        if user_id:
            return check_user_permission(user_id, permission)

        return False

    @staticmethod
    def get_all_permissions(role: str, user_id: int = None) -> List[str]:
        """
        Получить все права роли + переопределения из БД
        """
        role_data = ROLES.get(role, {})
        permissions = role_data.get('permissions', [])

        if permissions == '*':
            return ['*']

        final_permissions = list(permissions) if isinstance(permissions, list) else []

        if user_id:
            db_perms = get_user_permissions(user_id)
            for res, perm_obj in db_perms.items():
                for act, granted in perm_obj.items():
                    perm_key = f"{res}_{act}"
                    if granted and perm_key not in final_permissions:
                        final_permissions.append(perm_key)
                    elif not granted and perm_key in final_permissions:
                        final_permissions.remove(perm_key)

        return final_permissions

    @staticmethod
    def validate_role_assignment(
        assigner_role: str,
        assigner_id: int,
        target_user_id: int,
        new_role: str
    ) -> Tuple[bool, str]:
        """
        Комплексная проверка возможности назначения роли

        Проверяет:
        1. Нельзя менять свою собственную роль
        2. Новая роль существует в системе
        3. У assigner есть право управлять этой ролью
        4. Новая роль не выше роли assigner

        Args:
            assigner_role: Роль того, кто назначает
            assigner_id: ID того, кто назначает
            target_user_id: ID пользователя, которому назначают роль
            new_role: Новая роль для назначения

        Returns:
            Tuple[bool, str]: (success, error_message)
                success: True если можно назначить роль
                error_message: Сообщение об ошибке (пустая строка если успех)
        """
        # 1. Нельзя менять свою роль
        if assigner_id == target_user_id:
            return False, "Нельзя изменить свою собственную роль"

        # 2. Проверка существования роли
        if new_role not in ROLES:
            return False, f"Роль '{new_role}' не существует"

        # 3. Проверка права управлять этой ролью
        if not RoleHierarchy.can_manage_role(assigner_role, new_role, kwargs.get('secondary_role')):
            return False, f"У вас нет прав для назначения роли '{ROLES[new_role]['name']}'"

        # 4. Проверка, что не назначаем роль выше своей
        if not RoleHierarchy.can_assign_higher_role(assigner_role, new_role):
            return False, "Нельзя назначать роль выше своей"

        return True, ""

class PermissionChecker:
    """Класс для проверки конкретных прав пользователей"""

    # === ПОЛЬЗОВАТЕЛИ ===

    @staticmethod
    def can_view_all_users(user: dict) -> bool:
        """Может ли роль просматривать всех пользователей"""
        return RoleHierarchy.has_permission(user.get('role'), 'users_view', user.get('secondary_role'), user.get('id'))

    @staticmethod
    def can_create_users(user: dict) -> bool:
        """Может ли роль создавать пользователей"""
        return RoleHierarchy.has_permission(user.get('role'), 'users_create', user.get('secondary_role'), user.get('id'))

    @staticmethod
    def can_edit_users(user: dict) -> bool:
        """Может ли роль редактировать пользователей"""
        return RoleHierarchy.has_permission(user.get('role'), 'users_edit', user.get('secondary_role'), user.get('id'))

    @staticmethod
    def can_delete_users(user: dict) -> bool:
        """Может ли роль удалять пользователей"""
        return RoleHierarchy.has_permission(user.get('role'), 'users_delete', user.get('secondary_role'), user.get('id'))

    @staticmethod
    def can_change_user_role(manager: dict, target_role: str) -> bool:
        """Может ли пользователь изменить роль другого пользователя"""
        return RoleHierarchy.can_manage_role(manager.get('role'), target_role, manager.get('secondary_role'))

    # === КЛИЕНТЫ ===

    @staticmethod
    def can_view_all_clients(user: dict) -> bool:
        """Может ли роль просматривать всех клиентов"""
        return RoleHierarchy.has_permission(user.get('role'), 'clients_view', user.get('secondary_role'))

    @staticmethod
    def can_view_client_contacts(user: dict) -> bool:
        """Может ли роль видеть контактные данные клиентов"""
        # Только те, у кого есть право clients_view (обычно полные данные)
        return RoleHierarchy.has_permission(user.get('role'), 'clients_view', user.get('secondary_role'))

    @staticmethod
    def can_create_clients(user: dict) -> bool:
        """Может ли роль создавать клиентов"""
        return RoleHierarchy.has_permission(user.get('role'), 'clients_create', user.get('secondary_role'))

    @staticmethod
    def can_edit_clients(user: dict) -> bool:
        """Может ли роль редактировать клиентов"""
        return RoleHierarchy.has_permission(user.get('role'), 'clients_edit', user.get('secondary_role'))

    @staticmethod
    def can_delete_clients(user: dict) -> bool:
        """Может ли роль удалять клиентов"""
        return RoleHierarchy.has_permission(user.get('role'), 'clients_delete', user.get('secondary_role'))
        
    @staticmethod
    def can_export_clients(user: dict) -> bool:
        """Может ли роль экспортировать базу клиентов"""
        return RoleHierarchy.has_permission(user.get('role'), 'clients_export', user.get('secondary_role'))

    # === ЗАПИСИ ===

    @staticmethod
    def can_view_all_bookings(user: dict) -> bool:
        """Может ли роль просматривать все записи"""
        return RoleHierarchy.has_permission(user.get('role'), 'bookings_view', user.get('secondary_role'))

    @staticmethod
    def can_create_bookings(user: dict) -> bool:
        """Может ли роль создавать записи"""
        return RoleHierarchy.has_permission(user.get('role'), 'bookings_create', user.get('secondary_role'))

    @staticmethod
    def can_edit_bookings(user: dict) -> bool:
        """Может ли роль редактировать записи"""
        return RoleHierarchy.has_permission(user.get('role'), 'bookings_edit', user.get('secondary_role'))

    @staticmethod
    def can_delete_bookings(user: dict) -> bool:
        """Может ли роль удалять записи"""
        return RoleHierarchy.has_permission(user.get('role'), 'bookings_delete', user.get('secondary_role'))

    # === КАЛЕНДАРЬ ===

    @staticmethod
    def can_view_all_calendars(user: dict) -> bool:
        """Может ли роль видеть календари всех сотрудников"""
        return RoleHierarchy.has_permission(user.get('role'), 'calendar_view_all', user.get('secondary_role'))

    # === АНАЛИТИКА ===

    @staticmethod
    def can_view_analytics(user: dict) -> bool:
        """Может ли роль просматривать аналитику"""
        role = user.get('role')
        s_role = user.get('secondary_role')
        return (
            RoleHierarchy.has_permission(role, 'analytics_view', s_role) or
            RoleHierarchy.has_permission(role, 'analytics_view_anonymized', s_role) or
            RoleHierarchy.has_permission(role, 'analytics_view_stats_only', s_role)
        )

    @staticmethod
    def can_view_full_analytics(user: dict) -> bool:
        """Может ли роль видеть полную аналитику с персональными данными"""
        return RoleHierarchy.has_permission(user.get('role'), 'analytics_view', user.get('secondary_role'))

    @staticmethod
    def can_export_data(role: str) -> bool:
        """Может ли роль экспортировать данные"""
        return role in ['director', 'admin']

    # === УСЛУГИ ===

    @staticmethod
    def can_view_services(user: dict) -> bool:
        """Может ли роль просматривать услуги"""
        return RoleHierarchy.has_permission(user.get('role'), 'services_view', user.get('secondary_role'))

    @staticmethod
    def can_edit_services(user: dict) -> bool:
        """Может ли роль редактировать услуги"""
        return RoleHierarchy.has_permission(user.get('role'), 'services_edit', user.get('secondary_role'))

    # === НАСТРОЙКИ ===

    @staticmethod
    def can_view_settings(user: dict) -> bool:
        """Может ли роль просматривать настройки"""
        return RoleHierarchy.has_permission(user.get('role'), 'settings_view', user.get('secondary_role'))

    @staticmethod
    def can_edit_settings(user: dict) -> bool:
        """Может ли роль изменять настройки (полный доступ)"""
        return RoleHierarchy.has_permission(user.get('role'), 'settings_edit', user.get('secondary_role'))
        
    @staticmethod
    def can_edit_branding(user: dict) -> bool:
        """Может ли роль менять брендинг"""
        return RoleHierarchy.has_permission(user.get('role'), 'settings_edit_branding', user.get('secondary_role'))

    @staticmethod
    def can_view_bot_settings(user: dict) -> bool:
        """Может ли роль просматривать настройки бота"""
        return RoleHierarchy.has_permission(user.get('role'), 'bot_settings_view', user.get('secondary_role'))

    # === РАССЫЛКИ ===

    @staticmethod
    def can_send_broadcasts(user: dict) -> bool:
        """Может ли роль отправлять рассылки"""
        return RoleHierarchy.has_permission(user.get('role'), 'broadcasts_send', user.get('secondary_role'))

    # === INSTAGRAM ===

    @staticmethod
    def can_view_instagram_chat(user: dict) -> bool:
        """Может ли роль просматривать Instagram чат"""
        return RoleHierarchy.has_permission(user.get('role'), 'instagram_chat_view', user.get('secondary_role'), user.get('id'))

# ===== ДЕКОРАТОРЫ ДЛЯ FASTAPI =====

def require_role(allowed_roles: List[str]):
    """
    Декоратор для проверки роли пользователя

    Использование:
        @router.get("/admin/users")
        @require_role(['director', 'admin'])
        async def get_users(session_token: Optional[str] = Cookie(None)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, session_token: Optional[str] = Cookie(None), **kwargs):
            from utils.utils import require_auth

            user = require_auth(session_token)
            if not user:
                return JSONResponse({"error": "Unauthorized"}, status_code=401)

            has_role = user["role"] in allowed_roles
            if not has_role and user.get("secondary_role"):
                has_role = user["secondary_role"] in allowed_roles

            if not has_role:
                return JSONResponse(
                    {"error": f"Требуется одна из ролей: {', '.join(allowed_roles)}"},
                    status_code=403
                )

            return await func(*args, session_token=session_token, **kwargs)

        return wrapper
    return decorator

def require_permission(permission: Union[str, List[str]]):
    """
    Декоратор для проверки наличия хотя бы одного права из списка
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, session_token: Optional[str] = Cookie(None), **kwargs):
            from utils.utils import require_auth

            user = require_auth(session_token)
            if not user:
                return JSONResponse({"error": "Unauthorized"}, status_code=401)

            perms = [permission] if isinstance(permission, str) else permission
            
            has_any = False
            for p in perms:
                if RoleHierarchy.has_permission(user["role"], p, user.get("secondary_role"), user.get("id")):
                    has_any = True
                    break
            
            if not has_any:
                perm_str = ", ".join(perms)
                return JSONResponse(
                    {"error": f"Нет необходимых прав. Требуется одно из: {perm_str}"},
                    status_code=403
                )

            return await func(*args, session_token=session_token, **kwargs)

        return wrapper
    return decorator

# ===== LEGACY ФУНКЦИИ (для обратной совместимости) =====

def get_role_level(role: str) -> int:
    """УСТАРЕВШАЯ: Используйте RoleHierarchy.get_hierarchy_level()"""
    return RoleHierarchy.get_hierarchy_level(role)

def has_higher_role(user_role: str, required_role: str) -> bool:
    """УСТАРЕВШАЯ: Используйте RoleHierarchy.get_hierarchy_level() для сравнения"""
    return RoleHierarchy.get_hierarchy_level(user_role) >= RoleHierarchy.get_hierarchy_level(required_role)

def can_access_resource(user_id: int, resource: str, action: str = 'view') -> bool:
    """
    LEGACY: Проверить доступ к ресурсу через БД

    Для новых проверок используйте PermissionChecker
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем роль пользователя
        c.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            return False

        user_role = row[0]

        # Директор всегда имеет доступ
        if user_role == 'director':
            conn.close()
            return True

        # Проверяем индивидуальные права пользователя
        c.execute("""
            SELECT granted FROM user_permissions
            WHERE user_id = %s AND permission_key = %s
        """, (user_id, resource))

        user_perm = c.fetchone()
        if user_perm is not None:
            granted = bool(user_perm[0])
            conn.close()
            return granted

        # Проверяем права роли
        action_column = f'can_{action}'
        # Note: action_column is safe here as it comes from internal logic, not user input
        query = f"""
            SELECT {action_column} FROM role_permissions
            WHERE role_key = %s AND permission_key = %s
        """
        c.execute(query, (user_role, resource))

        role_perm = c.fetchone()
        conn.close()

        if role_perm:
            return bool(role_perm[0])

        return False

    except Exception as e:
        log_error(f"Ошибка проверки прав: {e}", "permissions")
        return False

def get_user_permissions(user_id: int) -> Dict[str, Dict[str, bool]]:
    """
    LEGACY: Получить все права пользователя из БД

    Для новых проверок используйте PermissionChecker
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = c.fetchone()
        if not row:
            conn.close()
            return {}

        user_role = row[0]
        permissions = {}

        # Директор имеет все права
        if user_role == 'director':
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
            WHERE role_key = %s
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
            WHERE user_id = %s
        """, (user_id,))

        for row in c.fetchall():
            resource, granted = row
            if resource in permissions:
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
    """LEGACY: Дать пользователю доступ к ресурсу"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        if not can_access_resource(granted_by_id, 'manage_permissions', 'create'):
            log_error(f"User {granted_by_id} не может давать права", "permissions")
            conn.close()
            return False

        c.execute("""
            INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
            VALUES (%s, %s, TRUE, %s, NOW())
            ON CONFLICT(user_id, permission_key)
            DO UPDATE SET granted = TRUE, granted_by = %s, granted_at = NOW()
        """, (user_id, resource, granted_by_id, granted_by_id))

        conn.commit()
        conn.close()

        log_info(f"User {granted_by_id} дал права на {resource} пользователю {user_id}", "permissions")
        return True

    except Exception as e:
        log_error(f"Ошибка предоставления прав: {e}", "permissions")
        return False

def revoke_user_permission(user_id: int, resource: str, revoked_by_id: int) -> bool:
    """LEGACY: Отобрать у пользователя доступ к ресурсу"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        if not can_access_resource(revoked_by_id, 'manage_permissions', 'delete'):
            log_error(f"User {revoked_by_id} не может забирать права", "permissions")
            conn.close()
            return False

        c.execute("""
            INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
            VALUES (%s, %s, FALSE, %s, NOW())
            ON CONFLICT(user_id, permission_key)
            DO UPDATE SET granted = FALSE, granted_by = %s, granted_at = NOW()
        """, (user_id, resource, revoked_by_id, revoked_by_id))

        conn.commit()
        conn.close()

        log_info(f"User {revoked_by_id} отобрал права на {resource} у пользователя {user_id}", "permissions")
        return True

    except Exception as e:
        log_error(f"Ошибка отзыва прав: {e}", "permissions")
        return False

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

def filter_data_by_permissions(data: List[Dict], user_id: int, hide_contacts: bool = False) -> List[Dict]:
    """
    Фильтровать данные на основе прав пользователя
    """
    if not hide_contacts:
        return data

    if can_access_resource(user_id, 'view_contacts', 'view'):
        return data

    contact_fields = ['phone', 'email', 'telegram_username', 'whatsapp', 'instagram']

    filtered_data = []
    for item in data:
        filtered_item = item.copy()
        for field in contact_fields:
            if field in filtered_item:
                filtered_item[field] = "***"
        filtered_data.append(filtered_item)

    return filtered_data

def check_user_permission(user_id: int, permission_key: str, action: str = 'view') -> bool:
    """
    Проверить есть ли у пользователя право на действие
    
    Args:
        user_id: ID пользователя
        permission_key: ключ права (например 'clients_view')
        action: действие ('view', 'create', 'edit', 'delete')
        
    Returns:
        bool: True если право есть
    """
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        result = c.fetchone()

        if not result:
            return False

        role_key = result[0]

        if role_key == 'director':
            return True

        # Проверка через RoleHierarchy (конфиг)
        if RoleHierarchy.has_permission(role_key, permission_key):
           return True

        # Проверка через БД (legacy/custom roles)
        column = f"can_{action}"
        # Sanitize action to prevent SQL injection (though generic logic usually safe)
        if action not in ['view', 'create', 'edit', 'delete']:
             return False
             
        # Check role_permissions table
        c.execute(f"""SELECT {column} FROM role_permissions 
                     WHERE role_key = %s AND permission_key = %s""",
                  (role_key, permission_key))

        result = c.fetchone()
        if result and result[0]:
            return True
            
        # Check user_permissions table (overrides)
        c.execute("""SELECT granted FROM user_permissions 
                     WHERE user_id = %s AND permission_key = %s""",
                  (user_id, permission_key))
        user_perm = c.fetchone()
        if user_perm:
            return bool(user_perm[0])
            
        return False

    except Exception as e:
        log_error(f"Ошибка проверки прав: {e}", "database")
        return False
    finally:
        conn.close()
