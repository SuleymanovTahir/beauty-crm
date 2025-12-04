"""
API Endpoints для управления правами и ролями пользователей
"""
from fastapi import APIRouter, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

from db.connection import get_db_connection

from core.config import (
    DATABASE_NAME, ROLES, CLIENT_STATUSES,
    PERMISSION_DESCRIPTIONS, has_permission, can_manage_role
)
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Permissions"])

@router.get("/permissions/roles")
async def get_all_roles(session_token: Optional[str] = Cookie(None)):
    """Получить все роли и их описания"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Только директор и админ могут видеть роли
    if user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "roles": ROLES,
        "count": len(ROLES)
    }

@router.get("/permissions/descriptions")
async def get_permission_descriptions(session_token: Optional[str] = Cookie(None)):
    """Получить описания всех прав"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "permissions": PERMISSION_DESCRIPTIONS,
        "count": len(PERMISSION_DESCRIPTIONS)
    }

@router.get("/permissions/statuses")
async def get_client_statuses(session_token: Optional[str] = Cookie(None)):
    """Получить все статусы клиентов"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "statuses": CLIENT_STATUSES,
        "count": len(CLIENT_STATUSES)
    }

@router.get("/permissions/user/{user_id}")
async def get_user_permissions(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить права конкретного пользователя"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Проверяем права
    if user["role"] not in ["director", "admin"] and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, username, full_name, role, email
            FROM users
            WHERE id =%s
        """, (user_id,))

        target_user = c.fetchone()

        if not target_user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")

        user_id, username, full_name, role, email = target_user

        role_data = ROLES.get(role, {})
        permissions = role_data.get('permissions', [])

        # Получаем индивидуальные права пользователя
        c.execute("""
            SELECT permission_key, granted
            FROM user_permissions
            WHERE user_id =%s
        """, (user_id,))

        custom_permissions = {}
        for row in c.fetchall():
            perm_key, granted = row
            custom_permissions[perm_key] = bool(granted)

        conn.close()

        return {
            "user": {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "role": role,
                "email": email
            },
            "role_info": {
                "name": role_data.get('name', role),
                "hierarchy_level": role_data.get('hierarchy_level', 0),
                "permissions": permissions,
                "can_manage_roles": role_data.get('can_manage_roles', [])
            },
            "custom_permissions": custom_permissions
        }
    except sqlite3.Error as e:
        log_error(f"Database error: {e}", "api")
        raise HTTPException(status_code=500, detail="Database error")

@router.put("/permissions/user/{user_id}/role")
async def update_user_role(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить роль пользователя"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    new_role = data.get("role")

    if not new_role or new_role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Проверяем, может ли текущий пользователь управлять этой ролью
    if not can_manage_role(user["role"], new_role):
        raise HTTPException(
            status_code=403,
            detail=f"You cannot assign role '{new_role}'"
        )

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем текущую роль пользователя
        c.execute("SELECT role FROM users WHERE id =%s", (user_id,))
        result = c.fetchone()

        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")

        old_role = result[0]

        # Проверяем, может ли изменять старую роль
        if not can_manage_role(user["role"], old_role):
            conn.close()
            raise HTTPException(
                status_code=403,
                detail=f"You cannot modify users with role '{old_role}'"
            )

        # Обновляем роль
        c.execute("""
            UPDATE users
            SET role =%s, updated_at = CURRENT_TIMESTAMP
            WHERE id =%s
        """, (new_role, user_id))

        conn.commit()
        conn.close()

        log_info(
            f"User {user['username']} changed role of user {user_id} from {old_role} to {new_role}",
            "permissions"
        )

        return {
            "success": True,
            "message": f"Role updated from {old_role} to {new_role}",
            "old_role": old_role,
            "new_role": new_role
        }

    except sqlite3.Error as e:
        log_error(f"Database error: {e}", "api")
        raise HTTPException(status_code=500, detail="Database error")

@router.put("/permissions/user/{user_id}/custom")
async def update_user_custom_permissions(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить индивидуальные права пользователя"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Только директор может изменять индивидуальные права
    if user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only director can modify custom permissions")

    data = await request.json()
    permissions = data.get("permissions", {})

    if not isinstance(permissions, dict):
        raise HTTPException(status_code=400, detail="Invalid permissions format")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем, существует ли пользователь
        c.execute("SELECT id FROM users WHERE id =%s", (user_id,))
        if not c.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")

        # Обновляем/добавляем права
        for perm_key, granted in permissions.items():
            c.execute("""
                INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
                VALUES (%s,%s,%s,%s, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, permission_key)
                DO UPDATE SET granted =%s, granted_by =%s, granted_at = CURRENT_TIMESTAMP
            """, (user_id, perm_key, int(granted), user["id"], int(granted), user["id"]))

        conn.commit()
        conn.close()

        log_info(
            f"User {user['username']} updated custom permissions for user {user_id}",
            "permissions"
        )

        return {
            "success": True,
            "message": "Custom permissions updated successfully",
            "updated_permissions": permissions
        }

    except sqlite3.Error as e:
        log_error(f"Database error: {e}", "api")
        raise HTTPException(status_code=500, detail="Database error")

@router.post("/permissions/check")
async def check_permission(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Проверить наличие права у текущего пользователя"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    permission = data.get("permission")

    if not permission:
        raise HTTPException(status_code=400, detail="Permission required")

    has_perm = has_permission(user["role"], permission)

    return {
        "user_id": user["id"],
        "role": user["role"],
        "permission": permission,
        "has_permission": has_perm
    }

@router.get("/permissions/users")
async def get_all_users_with_permissions(
    session_token: Optional[str] = Cookie(None)
):
    """Получить всех пользователей с их ролями и правами"""
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, username, full_name, role, email, is_active, created_at
            FROM users
            ORDER BY id
        """)

        users = []
        for row in c.fetchall():
            user_id, username, full_name, role, email, is_active, created_at = row

            role_data = ROLES.get(role, {})

            users.append({
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "role": role,
                "role_name": role_data.get('name', role),
                "email": email,
                "is_active": bool(is_active),
                "created_at": created_at,
                "hierarchy_level": role_data.get('hierarchy_level', 0),
                "can_edit": can_manage_role(user["role"], role)
            })

        conn.close()

        return {
            "users": users,
            "count": len(users)
        }

    except sqlite3.Error as e:
        log_error(f"Database error: {e}", "api")
        raise HTTPException(status_code=500, detail="Database error")
