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
        success = approve_registration(data.user_id, user["id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found or already approved")
        
        log_info(f"Admin {user['username']} approved registration for user ID {data.user_id}", "admin_registrations")
        
        return {
            "success": True,
            "message": "Registration approved successfully"
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
