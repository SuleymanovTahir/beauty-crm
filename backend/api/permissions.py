from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional, Dict

from utils.utils import require_auth
from utils.permissions import require_permission
from utils.logger import log_error
from db import log_activity
from db.connection import get_db_connection
from core.config import ROLES, PERMISSION_DESCRIPTIONS

router = APIRouter(tags=["Permissions"])

@router.get("/permissions/user/{user_id}")
@require_permission("users_view")
async def get_user_permissions(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """
    Get full permissions info for a specific user
    Used by PermissionsTab.tsx
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Get user info
        c.execute("""
            SELECT id, username, full_name, role, email 
            FROM users WHERE id = %s
        """, (user_id,))
        user_row = c.fetchone()
        
        if not user_row:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
            
        user_data = {
            "id": user_row[0],
            "username": user_row[1],
            "full_name": user_row[2],
            "role": user_row[3],
            "email": user_row[4]
        }
        
        role_key = user_data["role"]
        
        # 2. Get Role Info
        role_info = ROLES.get(role_key, {
            "name": role_key,
            "permissions": [],
            "hierarchy_level": 0,
            "can_manage_roles": []
        })
        
        # 3. Get Custom Permissions (User specific overrides)
        c.execute("""
            SELECT permission_key, granted 
            FROM user_permissions 
            WHERE user_id = %s
        """, (user_id,))
        
        custom_perms = {}
        for row in c.fetchall():
            custom_perms[row[0]] = bool(row[1])
            
        # 4. Calculate Effective Permissions Map (Structured for frontend)
        # We'll build a map: {resource: {view: bool, create: bool, ...}}
        from utils.permissions import RoleHierarchy
        resources = ['clients', 'bookings', 'services', 'analytics', 'settings', 'users', 'bot_settings', 
                     'export_data', 'import_data', 'view_contacts', 'instagram_chat', 'internal_chat',
                     'employees', 'reports', 'financial_data']
        actions = ['view', 'create', 'edit', 'delete']
        
        effective_map = {}
        for res in resources:
            effective_map[res] = {}
            for act in actions:
                perm_key = f"{res}_{act}"
                # Special cases for some keys that don't follow resource_action pattern
                if res in ['export_data', 'import_data', 'view_contacts']:
                    perm_key = res
                
                effective_map[res][act] = RoleHierarchy.has_permission(
                    user_data["role"], perm_key, user_id=user_id
                )

        conn.close()
        
        return {
            "user": user_data,
            "role_info": {
                "name": role_info.get("name"),
                "hierarchy_level": role_info.get("hierarchy_level", 0),
                "permissions": role_info.get("permissions", []),
                "can_manage_roles": role_info.get("can_manage_roles", [])
            },
            "custom_permissions": custom_perms,
            "permissions": effective_map # Structured for older frontend parts
        }

    except Exception as e:
        log_error(f"Error getting user permissions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/permissions/grant")
@require_permission("users_manage")
async def grant_permission_api(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Явно дать право пользователю (DB override)"""
    from utils.utils import get_current_user_from_token
    from utils.permissions import grant_user_permission
    
    admin = get_current_user_from_token(session_token)
    data = await request.json()
    resource = data.get('resource') or data.get('permission')
    
    if not resource:
        return JSONResponse({"error": "Missing permission key"}, status_code=400)
    
    success = grant_user_permission(user_id, resource, admin["id"])
    if success:
        log_activity(admin["id"], "grant_permission", "user", str(user_id), f"Granted {resource}")
        return {"success": True, "message": f"Право {resource} предоставлено"}
    return JSONResponse({"error": "Failed to grant permission"}, status_code=500)

@router.post("/users/{user_id}/permissions/revoke")
@require_permission("users_manage")
async def revoke_permission_api(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Явно отобрать право у пользователя (DB override)"""
    from utils.utils import get_current_user_from_token
    from utils.permissions import revoke_user_permission
    
    admin = get_current_user_from_token(session_token)
    data = await request.json()
    resource = data.get('resource') or data.get('permission')
    
    if not resource:
        return JSONResponse({"error": "Missing permission key"}, status_code=400)
    
    success = revoke_user_permission(user_id, resource, admin["id"])
    if success:
        log_activity(admin["id"], "revoke_permission", "user", str(user_id), f"Revoked {resource}")
        return {"success": True, "message": f"Право {resource} отозвано"}
    return JSONResponse({"error": "Failed to revoke permission"}, status_code=500)

@router.put("/permissions/user/{user_id}/custom")
@require_permission("users_manage") # Changed from users_edit for consistency
async def update_user_custom_permissions(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Update custom permissions for a user"""
    from utils.utils import get_current_user_from_token
    current_user = get_current_user_from_token(session_token)
    
    data = await request.json()
    permissions: Dict[str, bool] = data.get('permissions', {})
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Clear existing custom permissions for this user (or update incrementally?)
        # For simplicity and to match frontend "save" behavior, we might want to upsert
        # But frontend sends the full map of customized perms?
        # Actually PermissionsTab sends `customPermissions` state.
        
        # We'll iterate and upsert
        for perm_key, granted in permissions.items():
            c.execute("""
                INSERT INTO user_permissions (user_id, permission_key, granted, granted_by, granted_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, permission_key) 
                DO UPDATE SET granted = %s, granted_by = %s, granted_at = NOW()
            """, (user_id, perm_key, granted, current_user['id'], granted, current_user['id']))
            
        conn.commit()
        conn.close()
        
        log_activity(current_user['id'], "update_custom_permissions", "user", str(user_id), "Updated custom permissions")
        
        return {"success": True}
        
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error updating custom permissions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/permissions/check")
async def check_user_permission_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Check if current user has a specific permission
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    data = await request.json()
    permission = data.get("permission")

    if not permission:
        return JSONResponse({"error": "Missing permission key"}, status_code=400)

    from core.config import has_permission
    has_perm = has_permission(user["role"], permission, user.get("secondary_role"))

    # Also check DB overrides
    if not has_perm:
        from utils.permissions import check_user_permission
        has_perm = check_user_permission(user["id"], permission)

    return {
        "user_id": user["id"],
        "role": user["role"],
        "permission": permission,
        "has_permission": has_perm
    }

@router.get("/permissions/users")
@require_permission("users_view")
async def get_users_with_permissions(
    session_token: Optional[str] = Cookie(None)
):
    """
    Get all users with their role metadata and hierarchy levels
    """
    from utils.utils import get_current_user_from_token
    current_user = get_current_user_from_token(session_token)
    
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT id, username, full_name, role, email, is_active, created_at
            FROM users 
            WHERE deleted_at IS NULL
            ORDER BY id
        """)

        users = []
        from core.config import can_manage_role
        
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
                "can_edit": can_manage_role(current_user["role"], role, current_user.get("secondary_role"))
            })

        conn.close()
        return {
            "users": users,
            "count": len(users)
        }

    except Exception as e:
        log_error(f"Error fetching users with permissions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/permissions/roles")
async def get_all_roles_info(session_token: Optional[str] = Cookie(None)):
    """Get all roles info (for dropdowns etc)"""
    return {"roles": ROLES}

@router.get("/permissions/descriptions")
async def get_permission_descriptions(session_token: Optional[str] = Cookie(None)):
    """Get all permission descriptions"""
    return {"permissions": PERMISSION_DESCRIPTIONS}
