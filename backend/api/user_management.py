"""
API для управления пользователями: одобрение, управление правами
"""
from fastapi import APIRouter, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.permissions import (
    can_approve_users, can_manage_permissions,
    grant_user_permission, revoke_user_permission,
    get_user_permissions
)
from utils.logger import log_info, log_error

router = APIRouter(tags=["User Management"])

# ===== ОДОБРЕНИЕ ПОЛЬЗОВАТЕЛЕЙ =====

@router.get("/api/pending-users")
async def get_pending_users(session_token: Optional[str] = Cookie(None)):
    """Получить список пользователей, ожидающих одобрения"""
    user = require_auth(session_token)
    if not user or not can_approve_users(user["id"]):
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT id, username, full_name, email, role, created_at, email_verified
            FROM users
            WHERE approved = 0 AND is_active = 1
            ORDER BY created_at DESC
        """)

        users = []
        for row in c.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "full_name": row[2],
                "email": row[3],
                "role": row[4],
                "created_at": row[5],
                "email_verified": bool(row[6])
            })

        conn.close()
        return {"users": users}

    except Exception as e:
        log_error(f"Error getting pending users: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Одобрить пользователя"""
    user = require_auth(session_token)
    if not user or not can_approve_users(user["id"]):
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем email и имя пользователя
        c.execute("SELECT email, full_name, email_verified FROM users WHERE id = ?", (user_id,))
        result = c.fetchone()

        if not result:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        email, full_name, email_verified = result

        # Проверяем что email подтвержден
        if not email_verified:
            conn.close()
            return JSONResponse(
                {"error": "Нельзя одобрить пользователя без подтверждения email"},
                status_code=400
            )

        # Одобряем пользователя (is_active = 1)
        c.execute("""
            UPDATE users
            SET approved = 1, is_active = 1, approved_by = ?, approved_at = datetime('now')
            WHERE id = ?
        """, (user["id"], user_id))

        conn.commit()
        conn.close()

        # Отправляем уведомление на email
        from utils.email import send_approval_notification
        send_approval_notification(email, full_name, approved=True)

        log_info(f"User {user['id']} approved user {user_id}", "api")
        return {"success": True, "message": "Пользователь одобрен"}

    except Exception as e:
        log_error(f"Error approving user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/users/{user_id}/reject")
async def reject_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Отклонить пользователя (деактивировать)"""
    user = require_auth(session_token)
    if not user or not can_approve_users(user["id"]):
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем email и имя пользователя
        c.execute("SELECT email, full_name FROM users WHERE id = ?", (user_id,))
        result = c.fetchone()

        if not result:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        email, full_name = result

        # Деактивируем пользователя
        c.execute("""
            UPDATE users
            SET is_active = 0, approved = 0
            WHERE id = ?
        """, (user_id,))

        conn.commit()
        conn.close()

        # Отправляем уведомление на email
        from utils.email import send_approval_notification
        send_approval_notification(email, full_name, approved=False)

        log_info(f"User {user['id']} rejected user {user_id}", "api")
        return {"success": True, "message": "Пользователь отклонен"}

    except Exception as e:
        log_error(f"Error rejecting user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ===== УПРАВЛЕНИЕ ПРАВАМИ =====

@router.get("/api/users/{user_id}/permissions")
async def get_user_permissions_api(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить права пользователя"""
    user = require_auth(session_token)
    if not user or not can_manage_permissions(user["id"]):
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    permissions = get_user_permissions(user_id)
    return {"permissions": permissions}


@router.post("/api/users/{user_id}/permissions/{resource}/grant")
async def grant_permission_api(
    user_id: int,
    resource: str,
    session_token: Optional[str] = Cookie(None)
):
    """Дать права пользователю на ресурс"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    success = grant_user_permission(user_id, resource, user["id"])
    if success:
        return {"success": True}
    else:
        return JSONResponse({"error": "Failed to grant permission"}, status_code=500)


@router.post("/api/users/{user_id}/permissions/{resource}/revoke")
async def revoke_permission_api(
    user_id: int,
    resource: str,
    session_token: Optional[str] = Cookie(None)
):
    """Отобрать права у пользователя на ресурс"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    success = revoke_user_permission(user_id, resource, user["id"])
    if success:
        return {"success": True}
    else:
        return JSONResponse({"error": "Failed to revoke permission"}, status_code=500)
