"""
API для управления пользователями: одобрение, управление правами
"""
from fastapi import APIRouter, Request, Cookie, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
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

# ===== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ =====

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    photo_url: Optional[str] = None

@router.get("/api/my-profile")
async def get_my_profile(session_token: Optional[str] = Cookie(None)):
    """Получить свой профиль"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT id, username, full_name, email, role, photo_url
            FROM users
            WHERE id = ?
        """, (user["id"],))

        result = c.fetchone()
        conn.close()

        if not result:
            return JSONResponse({"error": "User not found"}, status_code=404)

        return {
            "success": True,
            "profile": {
                "id": result[0],
                "username": result[1],
                "full_name": result[2],
                "email": result[3],
                "role": result[4],
                "photo_url": result[5]
            }
        }

    except Exception as e:
        log_error(f"Error getting profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/api/my-profile")
async def update_my_profile(
    data: UpdateProfileRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить свой профиль"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        updates = []
        params = []

        # Обновление username
        if data.username:
            if len(data.username) < 3:
                conn.close()
                return JSONResponse({"error": "Логин должен быть минимум 3 символа"}, status_code=400)

            # Проверяем уникальность
            c.execute("SELECT id FROM users WHERE username = ? AND id != ?", (data.username, user["id"]))
            if c.fetchone():
                conn.close()
                return JSONResponse({"error": "Логин уже занят"}, status_code=400)

            updates.append("username = ?")
            params.append(data.username)

        # Обновление full_name
        if data.full_name:
            if len(data.full_name) < 2:
                conn.close()
                return JSONResponse({"error": "Имя должно быть минимум 2 символа"}, status_code=400)

            updates.append("full_name = ?")
            params.append(data.full_name)

        # Обновление email
        if data.email:
            if '@' not in data.email:
                conn.close()
                return JSONResponse({"error": "Некорректный email"}, status_code=400)

            # Проверяем уникальность
            c.execute("SELECT id FROM users WHERE email = ? AND id != ?", (data.email, user["id"]))
            if c.fetchone():
                conn.close()
                return JSONResponse({"error": "Email уже используется"}, status_code=400)

            updates.append("email = ?")
            params.append(data.email)
            # Сбрасываем верификацию при смене email
            updates.append("email_verified = ?")
            params.append(0)

        # Обновление пароля
        if data.new_password:
            if not data.current_password:
                conn.close()
                return JSONResponse({"error": "Укажите текущий пароль"}, status_code=400)

            # Проверяем текущий пароль
            c.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],))
            result = c.fetchone()
            if not result:
                conn.close()
                return JSONResponse({"error": "User not found"}, status_code=404)

            current_hash = hashlib.sha256(data.current_password.encode()).hexdigest()
            if current_hash != result[0]:
                conn.close()
                return JSONResponse({"error": "Неверный текущий пароль"}, status_code=400)

            if len(data.new_password) < 6:
                conn.close()
                return JSONResponse({"error": "Новый пароль должен быть минимум 6 символов"}, status_code=400)

            new_hash = hashlib.sha256(data.new_password.encode()).hexdigest()
            updates.append("password_hash = ?")
            params.append(new_hash)

        # Обновление фото
        if data.photo_url is not None:
            updates.append("photo_url = ?")
            params.append(data.photo_url)

        if not updates:
            conn.close()
            return JSONResponse({"error": "Нет данных для обновления"}, status_code=400)

        # Выполняем обновление
        params.append(user["id"])
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        c.execute(query, params)
        conn.commit()

        # Получаем обновленные данные
        c.execute("""
            SELECT id, username, full_name, email, role, photo_url
            FROM users
            WHERE id = ?
        """, (user["id"],))

        result = c.fetchone()
        conn.close()

        log_info(f"User {user['id']} updated profile", "api")

        return {
            "success": True,
            "message": "Профиль обновлен",
            "profile": {
                "id": result[0],
                "username": result[1],
                "full_name": result[2],
                "email": result[3],
                "role": result[4],
                "photo_url": result[5]
            }
        }

    except Exception as e:
        log_error(f"Error updating profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

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
