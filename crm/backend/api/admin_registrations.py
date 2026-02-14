#!/usr/bin/env python3
"""
API для управления ожидающими подтверждения регистрациями
Только для администраторов
"""
from fastapi import APIRouter, HTTPException, Cookie
from pydantic import BaseModel
from typing import Optional

from db.pending_registrations import (
    get_pending_registrations,
    approve_registration,
    reject_registration,
    delete_pending_registration,
    get_registration_audit_log
)
from utils.utils import require_auth
from utils.logger import log_info, log_warning, log_error


router = APIRouter(prefix="/admin/registrations", tags=["Admin Registrations"])


class ApproveRequest(BaseModel):
    user_id: int


class RejectRequest(BaseModel):
    user_id: int
    reason: Optional[str] = ""


class UpdatePendingUserRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None


@router.get("/pending")
async def get_pending_users(session_token: Optional[str] = Cookie(None)):
    """Получить список всех ожидающих одобрения пользователей"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")
    
    try:
        pending_users = get_pending_registrations()
        
        log_info(f"Admin {user['username']} retrieved {len(pending_users)} pending registrations", "admin_registrations")
        
        return {
            "success": True,
            "count": len(pending_users),
            "pending_users": pending_users
        }
        
    except Exception as e:
        log_error(f"Failed to get pending registrations: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve")
async def approve_user_registration(
    data: ApproveRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Одобрить регистрацию пользователя"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")
    
    try:
        # Проверяем роль пользователя, которого хотим одобрить
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT role, username FROM users WHERE id = %s", (data.user_id,))
        target_user = c.fetchone()
        conn.close()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        target_role, target_username = target_user

        # 🔒 КРИТИЧЕСКОЕ ПРАВИЛО: Админа может одобрить ТОЛЬКО Директор
        if target_role == 'admin' and user["role"] != 'director':
            log_warning(f"Security: Admin {user['username']} attempted to approve another Admin {target_username}", "admin_registrations")
            raise HTTPException(
                status_code=403, 
                detail="Registration of an Admin can only be approved by a Director."
            )

        success = approve_registration(data.user_id, user["id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found or already approved")
        
        log_info(f"Admin/Director {user['username']} approved registration for {target_username} ({target_role})", "admin_registrations")
        
        return {
            "success": True,
            "message": f"Registration for {target_username} approved successfully"
        }

        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Failed to approve registration: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject")
async def reject_user_registration(
    data: RejectRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Отклонить регистрацию пользователя"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")
    
    try:
        success = reject_registration(data.user_id, user["id"], data.reason)
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        log_info(f"Admin {user['username']} rejected registration for user ID {data.user_id}. Reason: {data.reason}", "admin_registrations")
        
        return {
            "success": True,
            "message": "Registration rejected successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Failed to reject registration: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
async def delete_registration(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить ожидающую регистрацию полностью"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")
    
    try:
        success = delete_pending_registration(user_id, user["id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found or cannot be deleted (might be active)")
        
        log_info(f"Admin {user['username']} deleted pending registration for user ID {user_id}", "admin_registrations")
        
        return {
            "success": True,
            "message": "Registration deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Failed to delete registration: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}")
async def update_pending_user(
    user_id: int,
    data: UpdatePendingUserRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить данные ожидающего пользователя"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")

    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем что пользователь существует и неактивен
        c.execute("SELECT id, is_active FROM users WHERE id = %s", (user_id,))
        target_user = c.fetchone()

        if not target_user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")

        if target_user[1]:  # is_active = True
            conn.close()
            raise HTTPException(status_code=400, detail="Cannot edit active user through this endpoint")

        # Формируем запрос на обновление
        update_fields = []
        values = []

        if data.full_name is not None:
            update_fields.append("full_name = %s")
            values.append(data.full_name)

        if data.email is not None:
            update_fields.append("email = %s")
            values.append(data.email)

        if data.role is not None:
            update_fields.append("role = %s")
            values.append(data.role)

        if data.phone is not None:
            update_fields.append("phone = %s")
            values.append(data.phone)

        if not update_fields:
            conn.close()
            return {"success": True, "message": "No changes to apply"}

        values.append(user_id)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        c.execute(query, values)
        conn.commit()
        conn.close()

        log_info(f"Admin {user['username']} updated pending user ID {user_id}: {data.dict(exclude_none=True)}", "admin_registrations")

        return {
            "success": True,
            "message": "User updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Failed to update pending user: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-log")
async def get_audit_log(
    user_id: Optional[int] = None,
    limit: int = 100,
    session_token: Optional[str] = Cookie(None)
):
    """Получить лог всех действий с регистрациями"""
    # Проверка авторизации
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Проверка прав (только директора и админы)
    if user.get("role") not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Director or Admin role required.")
    
    try:
        audit_log = get_registration_audit_log(user_id, limit)
        
        return {
            "success": True,
            "count": len(audit_log),
            "audit_log": audit_log
        }
        
    except Exception as e:
        log_error(f"Failed to get audit log: {e}", "admin_registrations")
        raise HTTPException(status_code=500, detail=str(e))
