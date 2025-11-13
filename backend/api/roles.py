"""
API Endpoints для работы с ролями и правами доступа
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import (
    get_all_roles, create_custom_role, delete_custom_role,
    get_role_permissions, update_role_permissions, 
    check_user_permission, AVAILABLE_PERMISSIONS, log_activity
)
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Roles"])


@router.get("/roles")
async def list_roles(session_token: Optional[str] = Cookie(None)):
    """Получить все роли"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    roles = get_all_roles()
    
    return {
        "roles": roles,
        "count": len(roles)
    }


@router.post("/roles")
async def create_role(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать кастомную роль"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
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
async def delete_role(
    role_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить кастомную роль"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    success = delete_custom_role(role_key)
    
    if success:
        log_activity(user["id"], "delete_role", "role", role_key, "Role deleted")
        return {"success": True, "message": "Role deleted"}
    else:
        return JSONResponse({"error": "Cannot delete built-in roles"}, 
                          status_code=400)


@router.get("/roles/{role_key}/permissions")
async def get_role_permissions_api(
    role_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить права роли"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    permissions = get_role_permissions(role_key)
    
    return {
        "role_key": role_key,
        "permissions": permissions,
        "available_permissions": AVAILABLE_PERMISSIONS
    }


@router.post("/roles/{role_key}/permissions")
async def update_role_permissions_api(
    role_key: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить права роли"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
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
async def list_available_permissions(session_token: Optional[str] = Cookie(None)):
    """Получить список всех доступных прав"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    return {
        "permissions": [
            {"key": key, "name": name}
            for key, name in AVAILABLE_PERMISSIONS.items()
        ]
    }