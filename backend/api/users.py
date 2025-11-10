"""
API Endpoints для работы с пользователями
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
import hashlib
from auth import get_current_user
from db import get_all_users, delete_user, log_activity
from config import DATABASE_NAME
from utils import require_auth
from logger import log_error

router = APIRouter(tags=["Users"])


@router.post("/users")
async def create_user_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать нового пользователя (только для admin)"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    # Валидация
    username = data.get('username', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip() or None
    role = data.get('role', 'employee')
    
    if len(username) < 3:
        return JSONResponse({"error": "Логин должен быть минимум 3 символа"}, status_code=400)
    
    if len(password) < 6:
        return JSONResponse({"error": "Пароль должен быть минимум 6 символов"}, status_code=400)
    
    if not full_name or len(full_name) < 2:
        return JSONResponse({"error": "Имя должно быть минимум 2 символа"}, status_code=400)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем что логин не занят
        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        if c.fetchone():
            conn.close()
            return JSONResponse({"error": "Пользователь с таким логином уже существует"}, status_code=400)
        
        # Создаем пользователя
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        from datetime import datetime
        now = datetime.now().isoformat()
        
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, email, role, created_at, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, 1)""",
                  (username, password_hash, full_name, email, role, now))
        conn.commit()
        user_id = c.lastrowid
        
        log_activity(user["id"], "create_user", "user", str(user_id), 
                    f"Created: {full_name} ({username})")
        
        conn.close()
        return {
            "success": True,
            "message": "Пользователь успешно создан",
            "user_id": user_id
        }
        
    except sqlite3.IntegrityError as e:
        conn.close()
        log_error(f"Error creating user (IntegrityError): {e}", "api")
        return JSONResponse({"error": "Пользователь с таким логином уже существует"}, status_code=400)
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error creating user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/users")
async def list_users(session_token: Optional[str] = Cookie(None)):
    """Получить всех пользователей (только для admin)"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    users = get_all_users()
    
    return {
        "users": [
            {
                "id": u[0],
                "username": u[1],
                "full_name": u[3],
                "email": u[4],
                "role": u[5],
                "created_at": u[6]
            }
            for u in users
        ],
        "count": len(users)
    }


@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Получить всех пользователей"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row  # ✅ ВАЖНО для dict
        c = conn.cursor()
        
        c.execute("""
            SELECT id, username, full_name, email, role, created_at, is_active
            FROM users
            ORDER BY created_at DESC
        """)
        
        users = []
        for row in c.fetchall():
            users.append({
                "id": row["id"],
                "username": row["username"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": row["role"],
                "created_at": row["created_at"],
                "is_active": row["is_active"]
            })
        
        conn.close()
        
        return {"users": users}  # ✅ Обёрнуто в объект
        
    except Exception as e:
        log_error(f"Error fetching users: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Активировать пользователя"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("UPDATE users SET is_active = 1 WHERE id = ?", (user_id,))
        conn.commit()
        
        if c.rowcount > 0:
            log_activity(user["id"], "approve_user", "user", str(user_id), 
                        "User approved")
            conn.close()
            return {"success": True, "message": "User approved"}
        else:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error approving user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Отклонить регистрацию пользователя"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM users WHERE id = ? AND is_active = 0", (user_id,))
        conn.commit()
        
        if c.rowcount > 0:
            log_activity(user["id"], "reject_user", "user", str(user_id), 
                        "User rejected")
            conn.close()
            return {"success": True, "message": "User rejected"}
        else:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error rejecting user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/users/{user_id}/delete")
async def delete_user_api(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить пользователя"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Cannot delete yourself"}, status_code=400)
    
    success = delete_user(user_id)
    
    if success:
        log_activity(user["id"], "delete_user", "user", str(user_id), 
                    "User deleted")
        return {"success": True, "message": "User deleted"}
    
    return JSONResponse({"error": "Delete failed"}, status_code=400)


# После строки 286 (после функции update_user_profile)

@router.post("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить роль пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Проверяем что пользователь может управлять ролями
    from config import ROLES, can_manage_role
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя изменить свою роль"}, status_code=400)
    
    data = await request.json()
    new_role = data.get('role')
    
    if not new_role or new_role not in ROLES:
        return JSONResponse({"error": "Неверная роль"}, status_code=400)
    
    # Директор может назначить любую роль
    if user["role"] != "director":
        # Проверяем может ли текущий пользователь назначить эту роль
        if not can_manage_role(user["role"], new_role):
            return JSONResponse(
                {"error": f"У вас нет прав назначать роль '{ROLES[new_role]['name']}'"}, 
                status_code=403
            )
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        conn.commit()
        
        if c.rowcount > 0:
            log_activity(user["id"], "update_user_role", "user", str(user_id), 
                        f"Role changed to: {new_role}")
            conn.close()
            return {
                "success": True, 
                "message": f"Роль изменена на '{ROLES[new_role]['name']}'"
            }
        else:
            conn.close()
            return JSONResponse({"error": "Пользователь не найден"}, status_code=404)
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error updating user role: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить профиль пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Админ может смотреть всех, остальные только себя
    if user["role"] != "admin" and user["id"] != user_id:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, email, role, created_at, last_login
                 FROM users WHERE id = ?""", (user_id,))
    
    result = c.fetchone()
    conn.close()
    
    if not result:
        return JSONResponse({"error": "User not found"}, status_code=404)
    
    return {
        "id": result[0],
        "username": result[1],
        "full_name": result[2],
        "email": result[3],
        "role": result[4],
        "created_at": result[5],
        "last_login": result[6]
    }


@router.post("/users/{user_id}/change-password")
async def change_user_password(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить пароль пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Проверка прав: админ ИЛИ сам пользователь
    if user["role"] != "admin" and user["id"] != user_id:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    new_password = data.get('new_password')
    old_password = data.get('old_password')
    
    if not new_password or len(new_password) < 6:
        return JSONResponse(
            {"error": "Пароль должен быть минимум 6 символов"}, 
            status_code=400
        )
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Если не админ - проверяем старый пароль
        if user["role"] != "admin":
            old_password_hash = hashlib.sha256(old_password.encode()).hexdigest()
            c.execute("SELECT id FROM users WHERE id = ? AND password_hash = ?", 
                     (user_id, old_password_hash))
            if not c.fetchone():
                conn.close()
                return JSONResponse(
                    {"error": "Неверный текущий пароль"}, 
                    status_code=400
                )
        
        # Меняем пароль
        new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        c.execute("UPDATE users SET password_hash = ? WHERE id = ?", 
                 (new_password_hash, user_id))
        conn.commit()
        
        log_activity(user["id"], "change_password", "user", str(user_id), 
                    "Password changed")
        
        conn.close()
        return {"success": True, "message": "Пароль успешно изменён"}
        
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error changing password: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/users/{user_id}/update-profile")
async def update_user_profile(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить профиль пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Проверка прав
    if user["role"] != "admin" and user["id"] != user_id:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    
    if not username or len(username) < 3:
        return JSONResponse(
            {"error": "Логин должен быть минимум 3 символа"}, 
            status_code=400
        )
    
    if not full_name or len(full_name) < 2:
        return JSONResponse(
            {"error": "Имя должно быть минимум 2 символа"}, 
            status_code=400
        )
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем что логин не занят
        c.execute("SELECT id FROM users WHERE username = ? AND id != ?", 
                 (username, user_id))
        if c.fetchone():
            conn.close()
            return JSONResponse(
                {"error": "Логин уже занят"}, 
                status_code=400
            )
        
        # Обновляем профиль
        c.execute("""UPDATE users 
                    SET username = ?, full_name = ?, email = ?
                    WHERE id = ?""",
                 (username, full_name, email, user_id))
        conn.commit()
        
        log_activity(user["id"], "update_profile", "user", str(user_id), 
                    f"Profile updated: {username}")
        
        conn.close()
        return {"success": True, "message": "Профиль обновлён"}
        
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error updating profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)



