"""
Функции для работы с индивидуальными правами пользователей
"""
from typing import Dict, List, Optional, Tuple
from db.connection import get_db_connection
from core.config import ROLES
from utils.logger import log_info, log_error, log_warning


def get_user_individual_permissions(user_id: int) -> Dict[str, bool]:
    """
    Получить индивидуальные права пользователя
    
    Returns:
        Dict с ключами permission_key и значениями granted (True/False)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT permission_key, granted
            FROM user_permissions
            WHERE user_id = %s
        """, (user_id,))
        
        permissions = {}
        for row in c.fetchall():
            permissions[row[0]] = bool(row[1])
        
        return permissions
        
    except Exception as e:
        log_error(f"Error getting individual permissions for user {user_id}: {e}", "permissions")
        return {}
    finally:
        conn.close()


def get_user_effective_permissions(user_id: int, user_role: str) -> Dict[str, bool]:
    """
    Получить эффективные права пользователя (роль + индивидуальные)
    
    Args:
        user_id: ID пользователя
        user_role: Роль пользователя
        
    Returns:
        Dict с permission_key: granted
    """
    # 1. Получить базовые права из роли
    role_data = ROLES.get(user_role, {})
    role_permissions = role_data.get('permissions', [])
    
    # Если роль имеет все права (*)
    effective = {}
    if role_permissions == '*':
        # Директор имеет все права
        from db.settings import AVAILABLE_PERMISSIONS
        for perm_key in AVAILABLE_PERMISSIONS.keys():
            effective[perm_key] = True
    else:
        # Обычная роль - только указанные права
        for perm in role_permissions:
            effective[perm] = True
    
    # 2. Получить индивидуальные права
    individual = get_user_individual_permissions(user_id)
    
    # 3. Индивидуальные права переопределяют базовые
    for perm_key, granted in individual.items():
        effective[perm_key] = granted
    
    return effective


def grant_user_permission(
    user_id: int,
    permission_key: str,
    granted: bool,
    granted_by: int,
    notes: Optional[str] = None
) -> bool:
    """
    Выдать или отозвать индивидуальное право пользователя
    
    Args:
        user_id: ID пользователя
        permission_key: Ключ права
        granted: True - выдать, False - отозвать
        granted_by: ID пользователя, который выдаёт право
        notes: Примечания
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем существует ли уже запись
        c.execute("""
            SELECT id FROM user_permissions
            WHERE user_id = %s AND permission_key = %s
        """, (user_id, permission_key))
        
        existing = c.fetchone()
        
        if existing:
            # Обновляем существующую запись
            c.execute("""
                UPDATE user_permissions
                SET granted = %s, granted_by = %s, granted_at = CURRENT_TIMESTAMP, notes = %s
                WHERE user_id = %s AND permission_key = %s
            """, (1 if granted else 0, granted_by, notes, user_id, permission_key))
        else:
            # Создаём новую запись
            c.execute("""
                INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, permission_key, 1 if granted else 0, granted_by, notes))
        
        conn.commit()
        action = "granted" if granted else "revoked"
        log_info(f"✅ Permission {permission_key} {action} for user {user_id} by {granted_by}", "permissions")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error granting permission: {e}", "permissions")
        return False
    finally:
        conn.close()


def bulk_update_user_permissions(
    user_id: int,
    permissions: Dict[str, bool],
    granted_by: int
) -> bool:
    """
    Массовое обновление прав пользователя
    
    Args:
        user_id: ID пользователя
        permissions: Dict {permission_key: granted}
        granted_by: ID пользователя, который изменяет права
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        for perm_key, granted in permissions.items():
            c.execute("""
                INSERT INTO user_permissions (user_id, permission_key, granted, granted_by)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT(user_id, permission_key) DO UPDATE SET
                    granted = excluded.granted,
                    granted_by = excluded.granted_by,
                    granted_at = CURRENT_TIMESTAMP
            """, (user_id, perm_key, 1 if granted else 0, granted_by))
        
        conn.commit()
        log_info(f"✅ Bulk updated {len(permissions)} permissions for user {user_id}", "permissions")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error bulk updating permissions: {e}", "permissions")
        return False
    finally:
        conn.close()


def remove_user_permission(user_id: int, permission_key: str) -> bool:
    """
    Удалить индивидуальное право (вернуть к базовому из роли)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            DELETE FROM user_permissions
            WHERE user_id = %s AND permission_key = %s
        """, (user_id, permission_key))
        
        conn.commit()
        log_info(f"✅ Removed individual permission {permission_key} for user {user_id}", "permissions")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error removing permission: {e}", "permissions")
        return False
    finally:
        conn.close()


def can_grant_permission(granter_id: int, granter_role: str, target_user_id: int, target_role: str, permission_key: str) -> Tuple[bool, str]:
    """
    Проверить может ли granter выдать permission_key пользователю target
    
    Returns:
        (can_grant: bool, error_message: str)
    """
    # Директор может всё
    if granter_role == 'director':
        return (True, "")
    
    # Нельзя изменять права пользователей с ролью >= своей
    granter_level = ROLES.get(granter_role, {}).get('hierarchy_level', 0)
    target_level = ROLES.get(target_role, {}).get('hierarchy_level', 0)
    
    if target_level >= granter_level:
        return (False, "Нельзя изменять права пользователей с ролью равной или выше вашей")
    
    # Можно давать только те права, которые есть у самого granter
    granter_permissions = get_user_effective_permissions(granter_id, granter_role)
    
    if not granter_permissions.get(permission_key, False):
        return (False, f"У вас нет права '{permission_key}', поэтому вы не можете его выдать")
    
    return (True, "")
