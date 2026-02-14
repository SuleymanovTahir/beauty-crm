"""
API Endpoints для работы с ролями и правами доступа
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import (
    get_all_roles, create_custom_role, delete_custom_role,
    get_role_permissions, update_role_permissions,
    log_activity
)
from utils.permissions import require_permission
from core.config import PERMISSION_DESCRIPTIONS

router = APIRouter(tags=["Roles"])

@router.get("/roles")
@require_permission("roles_view")
async def list_roles(session_token: Optional[str] = Cookie(None)):
    """Получить все роли (с учетом иерархии)"""
    # require_permission already validates token
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)

    from core.config import ROLES, can_manage_role

    # Получаем все роли
    all_roles = get_all_roles()

    # Фильтруем роли на основе иерархии
    # Директор видит все роли
    if user["role"] == "director":
        manageable_roles = all_roles
    else:
        # Другие видят только те роли, которыми могут управлять
        manageable_roles = [
            role for role in all_roles
            if can_manage_role(user["role"], role["role_key"])
        ]

    # Преобразуем формат для frontend (key, name, level)
    formatted_roles = []
    for role in manageable_roles:
        role_key = role["role_key"]
        # Получаем уровень иерархии из ROLES, если роль там есть
        hierarchy_level = ROLES.get(role_key, {}).get("hierarchy_level", 0)
        
        formatted_roles.append({
            "key": role_key,
            "name": role["role_name"],
            "level": hierarchy_level
        })

    return {
        "roles": formatted_roles,
        "current_user_role": user["role"],
        "count": len(formatted_roles)
    }

@router.post("/roles")
@require_permission("roles_edit")
async def create_role(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать кастомную роль"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    data = await request.json()
    
    if not data.get('role_key') or not data.get('role_name'):
        return JSONResponse({"error": "Missing required fields"}, status_code=400)
    
    success = create_custom_role(
        data['role_key'],
        data['role_name'],
        data.get('role_description', ''),
        user["id"]
    )
    
    if success:
        log_activity(user["id"], "create_role", "role", data['role_key'], 
                    "Role created")
        return {"success": True, "message": "Role created"}
    else:
        return JSONResponse({"error": "Role already exists"}, status_code=400)

@router.delete("/roles/{role_key}")
@require_permission("roles_edit")
async def delete_role(
    role_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить кастомную роль"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    success = delete_custom_role(role_key)
    
    if success:
        log_activity(user["id"], "delete_role", "role", role_key, "Role deleted")
        return {"success": True, "message": "Role deleted"}
    else:
        return JSONResponse({"error": "Cannot delete built-in roles"}, 
                          status_code=400)

@router.get("/roles/{role_key}/permissions")
@require_permission("roles_view")
async def get_role_permissions_api(
    role_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить права роли"""
    permissions = get_role_permissions(role_key)
    
    return {
        "role_key": role_key,
        "permissions": permissions,
        "available_permissions": PERMISSION_DESCRIPTIONS
    }
    


@router.post("/roles/{role_key}/permissions")
@require_permission("roles_edit")
async def update_role_permissions_api(
    role_key: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить права роли"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    data = await request.json()
    permissions = data.get('permissions', {})
    
    success = update_role_permissions(role_key, permissions)
    
    if success:
        log_activity(user["id"], "update_permissions", "role", role_key, 
                    "Permissions updated")
        return {"success": True, "message": "Permissions updated"}
    else:
        return JSONResponse({"error": "Update failed"}, status_code=400)

@router.get("/roles/permissions/available")
@require_permission("roles_view")
async def list_available_permissions(session_token: Optional[str] = Cookie(None)):
    """Получить список всех доступных прав"""
    return {
        "permissions": [
            {"key": key, "name": name}
            for key, name in PERMISSION_DESCRIPTIONS.items()
        ]
    }
    
