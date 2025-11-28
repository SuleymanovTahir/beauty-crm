"""
API Endpoints для работы с пользователями
"""
from fastapi import APIRouter, Request, Cookie,Depends
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
import hashlib
from db import get_all_users, delete_user, log_activity
from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_error
from core.auth import get_current_user_or_redirect as get_current_user

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
    position = data.get('position', '').strip() or None

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
                     (username, password_hash, full_name, email, role, position, created_at, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
                  (username, password_hash, full_name, email, role, position, now))
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





@router.get("/users/{user_id}")
async def get_user_by_id(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Get single user by ID"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        c.execute("""
            SELECT
                id, username, full_name, email, role, position, 
                phone, bio, photo, is_active, is_service_provider,
                position_ru, position_ar, created_at
            FROM users
            WHERE id = ?
        """, (user_id,))

        row = c.fetchone()
        conn.close()

        if not row:
            return JSONResponse({"error": "User not found"}, status_code=404)

        user_data = {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "email": row["email"],
            "role": row["role"],
            "position": row["position"],
            "phone": row["phone"],
            "bio": row["bio"],
            "photo": row["photo"],
            "is_active": bool(row["is_active"]),
            "is_service_provider": bool(row["is_service_provider"]),
            "position_ru": row["position_ru"],
            "position_ar": row["position_ar"],
            "created_at": row["created_at"]
        }

        return user_data

    except Exception as e:
        log_error(f"Error fetching user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Получить всех пользователей"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row  # ✅ ВАЖНО для dict
        c = conn.cursor()

        # Query users directly (employees table is consolidated)
        c.execute("""
            SELECT
                u.id, u.username, u.full_name, u.email, u.role,
                u.position, u.created_at, u.is_active,
                u.employee_id,
                u.position_ru,
                u.position_ar,
                COALESCE(u.photo, u.photo_url) as photo
            FROM users u
            ORDER BY u.created_at DESC
        """)

        users = []
        for row in c.fetchall():
            # Use position from users table
            position_display = row["position"]
            
            # Construct position object if needed or just use text
            # For now, we'll just use the text position
            
            user_data = {
                "id": row["id"],
                "username": row["username"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": row["role"],
                "position": position_display,
                "position_id": None, # Legacy field
                "employee_id": row["employee_id"],
                "created_at": row["created_at"],
                "is_active": row["is_active"],
                "position_ru": row["position_ru"],
                "position_ar": row["position_ar"],
                "photo": row["photo"]
            }

            users.append(user_data)

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
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя удалить самого себя"}, status_code=400)

    # Проверяем роль удаляемого пользователя
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    target_user = c.fetchone()
    conn.close()

    if not target_user:
        return JSONResponse({"error": "Пользователь не найден"}, status_code=404)

    target_role = target_user[0]

    # Админ не может удалять директоров
    if user["role"] == "admin" and target_role == "director":
        return JSONResponse(
            {"error": "Админ не может удалять директоров"},
            status_code=403
        )

    success = delete_user(user_id)

    if success:
        log_activity(user["id"], "delete_user", "user", str(user_id),
                    f"Deleted user with role: {target_role}")
        return {"success": True, "message": "Пользователь удалён"}

    return JSONResponse({"error": "Ошибка удаления"}, status_code=400)


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
    from core.config import ROLES, can_manage_role
    from utils.logger import log_info, log_warning
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя изменить свою роль"}, status_code=400)
    
    data = await request.json()
    new_role = data.get('role')
    
    # Детальное логирование для отладки
    log_info(f"🔄 Role change request: user_id={user_id}, new_role={new_role}, by={user['username']}", "api")
    log_info(f"📋 Available roles: {list(ROLES.keys())}", "api")
    
    if not new_role or new_role not in ROLES:
        log_warning(f"❌ Invalid role received: '{new_role}'. Available: {list(ROLES.keys())}", "api")
        return JSONResponse({
            "error": f"Неверная роль. Доступные роли: {', '.join(ROLES.keys())}"
        }, status_code=400)
    
    # Директор может назначить любую роль
    if user["role"] != "director":
        # Проверяем может ли текущий пользователь назначить эту роль
        if not can_manage_role(user["role"], new_role):
            log_warning(f"⛔ {user['username']} ({user['role']}) cannot assign role '{new_role}'", "api")
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
            log_info(f"✅ Role changed successfully: user_id={user_id} → {new_role}", "api")
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
    
    c.execute("""SELECT id, username, full_name, email, role, created_at, last_login, photo
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
        "last_login": result[6],
        "photo": result[7]
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

    # Проверка прав: админ/директор ИЛИ сам пользователь
    if user["role"] not in ["admin", "director"] and user["id"] != user_id:
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
        # Если не админ и не директор - проверяем старый пароль
        if user["role"] not in ["admin", "director"]:
            if not old_password:
                conn.close()
                return JSONResponse(
                    {"error": "Необходимо указать текущий пароль"},
                    status_code=400
                )
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
    
    # Проверка прав: директор/админ может редактировать всех, остальные только себя
    if user["role"] not in ["admin", "director"] and user["id"] != user_id:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    position = data.get('position')

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
        photo = data.get('photo')
        
        if photo is not None:
             c.execute("""UPDATE users
                    SET username = ?, full_name = ?, email = ?, position = ?, photo = ?
                    WHERE id = ?""",
                 (username, full_name, email, position, photo, user_id))
        else:
            c.execute("""UPDATE users
                        SET username = ?, full_name = ?, email = ?, position = ?
                        WHERE id = ?""",
                    (username, full_name, email, position, user_id))
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


@router.get("/users/{user_id}/notification-settings")
async def get_user_notification_settings(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить настройки уведомлений пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Пользователь может смотреть только свои настройки или админ любые
    if user["id"] != user_id and user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT notify_telegram, notify_email, notify_whatsapp,
                   notify_on_new_booking, notify_on_booking_change, notify_on_booking_cancel,
                   telegram_chat_id, email, phone
            FROM users
            WHERE id = ?
        """, (user_id,))

        result = c.fetchone()
        conn.close()

        if not result:
            return JSONResponse({"error": "User not found"}, status_code=404)

        return {
            "notify_telegram": bool(result[0]) if result[0] is not None else True,
            "notify_email": bool(result[1]) if result[1] is not None else True,
            "notify_whatsapp": bool(result[2]) if result[2] is not None else False,
            "notify_on_new_booking": bool(result[3]) if result[3] is not None else True,
            "notify_on_booking_change": bool(result[4]) if result[4] is not None else True,
            "notify_on_booking_cancel": bool(result[5]) if result[5] is not None else True,
            "has_telegram": result[6] is not None and result[6] != "",
            "has_email": result[7] is not None and result[7] != "",
            "has_whatsapp": result[8] is not None and result[8] != "",
        }

    except Exception as e:
        log_error(f"Error getting notification settings: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/users/{user_id}/notification-settings")
async def update_user_notification_settings(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки уведомлений пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Пользователь может менять только свои настройки или админ любые
    if user["id"] != user_id and user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Обновляем настройки
        c.execute("""
            UPDATE users
            SET notify_telegram = ?,
                notify_email = ?,
                notify_whatsapp = ?,
                notify_on_new_booking = ?,
                notify_on_booking_change = ?,
                notify_on_booking_cancel = ?
            WHERE id = ?
        """, (
            1 if data.get('notify_telegram', True) else 0,
            1 if data.get('notify_email', True) else 0,
            1 if data.get('notify_whatsapp', False) else 0,
            1 if data.get('notify_on_new_booking', True) else 0,
            1 if data.get('notify_on_booking_change', True) else 0,
            1 if data.get('notify_on_booking_cancel', True) else 0,
            user_id
        ))

        conn.commit()
        conn.close()

        log_activity(user["id"], "update_notification_settings", "user",
                    str(user_id), "Updated notification preferences")

        return {"success": True, "message": "Настройки уведомлений обновлены"}

    except Exception as e:
        log_error(f"Error updating notification settings: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

