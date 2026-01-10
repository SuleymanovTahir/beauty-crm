"""
API Endpoints для работы с пользователями
"""
from fastapi import APIRouter, Request, Cookie,Depends
from fastapi.responses import JSONResponse
from typing import Optional

import hashlib
from db import get_all_users, delete_user, log_activity
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error
from core.auth import get_current_user_or_redirect as get_current_user
import psycopg2

router = APIRouter(tags=["Users"])

@router.post("/users")
async def create_user_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать нового пользователя (для admin и director)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()

    # Валидация
    username = data.get('username', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip() or None
    role = data.get('role', 'employee')
    position = data.get('position', '').strip() or None
    phone = data.get('phone', '').strip() or ""

    # 🔒 Иерархия: Админ не может создавать других админов или директоров
    if user["role"] == "admin" and role in ["admin", "director"]:
        return JSONResponse(
            {"error": "Администратор не может создавать пользователей с ролью Admin или Director"}, 
            status_code=403
        )


    if len(username) < 3:
        return JSONResponse({"error": "Логин должен быть минимум 3 символа"}, status_code=400)

    if len(password) < 6:
        return JSONResponse({"error": "Пароль должен быть минимум 6 символов"}, status_code=400)

    if not full_name or len(full_name) < 2:
        return JSONResponse({"error": "Имя должно быть минимум 2 символа"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем что логин не занят
        c.execute("SELECT id FROM users WHERE username = %s", (username,))
        if c.fetchone():
            conn.close()
            return JSONResponse({"error": "Пользователь с таким логином уже существует"}, status_code=400)

        # Создаем пользователя
        from utils.utils import hash_password
        password_hash = hash_password(password)
        from datetime import datetime
        now = datetime.now().isoformat()

        c.execute("""INSERT INTO users
                     (username, password_hash, full_name, email, phone, role, position, created_at, is_active, email_verified)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE) RETURNING id""",
                  (username, password_hash, full_name, email, phone, role, position, now))

        conn.commit()
        user_id = c.fetchone()[0]
        
        log_activity(user["id"], "create_user", "user", str(user_id), 
                    f"Created: {full_name} ({username})")
        
        conn.close()
        return {
            "success": True,
            "message": "Пользователь успешно создан",
            "user_id": user_id
        }
        
    except psycopg2.IntegrityError as e:
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
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                id, username, full_name, full_name_ru, email, role, position, 
                phone, bio, photo, is_active, is_service_provider,
                position_ru, position_ar, created_at,
                years_of_experience, specialization, telegram_username,
                base_salary, commission_rate
            FROM users
            WHERE id = %s
        """, (user_id,))

        row = c.fetchone()
        conn.close()

        if not row:
            return JSONResponse({"error": "User not found"}, status_code=404)

        user_data = {
            "id": row[0],
            "username": row[1],
            "full_name": row[2],
            "full_name_ru": row[3],
            "email": row[4],
            "role": row[5],
            "position": row[6],
            "phone": row[7],
            "bio": row[8],
            "photo": row[9],
            "is_active": bool(row[10]),
            "is_service_provider": bool(row[11]),
            "position_ru": row[12],
            "position_ar": row[13],
            "created_at": row[14],
            "years_of_experience": row[15],
            "specialization": row[16],
            "telegram": row[17],
            "base_salary": row[18],
            "commission_rate": row[19]
        }

        return user_data

    except Exception as e:
        log_error(f"Error fetching user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Получить всех пользователей"""
    # RBAC: Only staff can see all users
    if current_user["role"] == "client":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
        
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Query users directly (employees table is consolidated)
        c.execute("""
            SELECT
                u.id, u.username, u.full_name, u.full_name_ru, u.email, u.role,
                u.position, u.created_at, u.is_active,
                u.employee_id,
                u.position_ru,
                u.position_ar,
                COALESCE(u.photo, u.photo_url) as photo,
                u.position_id
            FROM users u
            ORDER BY u.created_at DESC
        """)

        users = []
        for row in c.fetchall():
            user_data = {
                "id": row[0],
                "username": row[1],
                "full_name": row[2],
                "full_name_ru": row[3],
                "email": row[4],
                "role": row[5],
                "position": row[6],
                "position_id": row[13],
                "employee_id": row[9],
                "created_at": row[7],
                "is_active": row[8],
                "position_ru": row[10],
                "position_ar": row[11],
                "photo": row[12]
            }

            users.append(user_data)

        conn.close()

        # Fetch services for all users efficienty
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT us.user_id, s.id, s.name, s.name_ru, s.name_ar
            FROM user_services us
            JOIN services s ON us.service_id = s.id
            WHERE us.is_online_booking_enabled = TRUE
        """)
        services_map = {}
        for row in c.fetchall():
            uid = row[0]
            if uid not in services_map:
                services_map[uid] = []
            services_map[uid].append({
                "id": row[1],
                "name": row[2],
                "name_ru": row[3],
                "name_ar": row[4]
            })
        conn.close()

        for user in users:
            user["services"] = services_map.get(user["id"], [])

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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("UPDATE users SET is_active = TRUE WHERE id = %s", (user_id,))
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM users WHERE id = %s AND is_active = FALSE", (user_id,))
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
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить пользователя (Soft Delete)"""
    from utils.soft_delete import soft_delete_user
    from utils.audit import log_audit

    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя удалить самого себя"}, status_code=400)

    # Проверяем роль и данные удаляемого пользователя
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT role, username, full_name FROM users WHERE id = %s", (user_id,))
    target_data = c.fetchone()
    conn.close()

    if not target_data:
        return JSONResponse({"error": "Пользователь не найден"}, status_code=404)
    
    target_role, target_username, target_full_name = target_data
    
    # Нельзя удалить admin или director, если ты не director
    if target_role in ['admin', 'director'] and user["role"] != 'director':
        return JSONResponse({"error": "Недостаточно прав для удаления этого пользователя"}, status_code=403)
    
    try:
        success = soft_delete_user(user_id, user)
        
        if success:
            # Логируем в аудит
            log_audit(
                user=user,
                action='delete',
                entity_type='user',
                entity_id=str(user_id),
                old_value={
                    "username": target_username,
                    "full_name": target_full_name,
                    "role": target_role
                },
                ip_address=request.client.host
            )
            return {"success": True, "message": "Пользователь успешно удален (перемещен в корзину)"}
        else:
            return JSONResponse({"error": "Ошибка при удалении пользователя"}, status_code=400)
    except Exception as e:
        log_error(f"Error deleting user {user_id}: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, email, role, created_at, last_login, photo,
                        years_of_experience, bio, specialization, phone, birthday, position,
                        base_salary, commission_rate
                 FROM users WHERE id = %s""", (user_id,))
    
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
        "photo": result[7],
        "years_of_experience": result[8],
        "bio": result[9],
        "specialization": result[10],
        "phone": result[11],
        "birthday": result[12],
        "position": result[13],
        "base_salary": result[14],
        "commission_rate": result[15]
    }

@router.get("/users/by-username/{username}/profile")
async def get_user_profile_by_username(
    username: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить профиль пользователя по username"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT id, username, full_name, email, role, created_at, last_login, photo,
                        years_of_experience, bio, specialization, phone, birthday, position
                 FROM users WHERE username = %s""", (username,))
    
    result = c.fetchone()
    conn.close()
    
    if not result:
        return JSONResponse({"error": "User not found"}, status_code=404)
    
    # Админ может смотреть всех, остальные только себя
    if user["role"] != "admin" and user["id"] != result[0]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    return {
        "id": result[0],
        "username": result[1],
        "full_name": result[2],
        "email": result[3],
        "role": result[4],
        "created_at": result[5],
        "last_login": result[6],
        "photo": result[7],
        "years_of_experience": result[8],
        "bio": result[9],
        "specialization": result[10],
        "phone": result[11],
        "birthday": result[12],
        "position": result[13]
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

    conn = get_db_connection()
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
            c.execute("SELECT id FROM users WHERE id = %s AND password_hash = %s",
                     (user_id, old_password_hash))
            if not c.fetchone():
                conn.close()
                return JSONResponse(
                    {"error": "Неверный текущий пароль"},
                    status_code=400
                )
        
        # Меняем пароль
        new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", 
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

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем что логин не занят
        c.execute("SELECT id FROM users WHERE username = %s AND id != %s",
                 (username, user_id))
        if c.fetchone():
            conn.close()
            return JSONResponse(
                {"error": "Логин уже занят"},
                status_code=400
            )

        # Обновляем профиль
        photo = data.get('photo')
        bio = data.get('about_me')
        specialization = data.get('specialization')
        years_of_experience = data.get('years_of_experience')
        phone = data.get('phone_number')
        birthday = data.get('birth_date')
        base_salary = data.get('base_salary')
        commission_rate = data.get('commission_rate')
        
        # Convert years_of_experience to int if possible
        try:
            if years_of_experience is not None and years_of_experience != '':
                years_of_experience = int(years_of_experience)
            else:
                years_of_experience = None
        except (ValueError, TypeError):
            years_of_experience = None

        if photo is not None:
             c.execute("""UPDATE users
                    SET username = %s, full_name = %s, email = %s, position = %s, photo = %s,
                        bio = %s, specialization = %s, years_of_experience = %s, phone = %s, birthday = %s,
                        base_salary = %s, commission_rate = %s
                    WHERE id = %s""",
                 (username, full_name, email, position, photo, bio, specialization, years_of_experience, phone, birthday, 
                  base_salary, commission_rate, user_id))
        else:
            c.execute("""UPDATE users
                        SET username = %s, full_name = %s, email = %s, position = %s,
                            bio = %s, specialization = %s, years_of_experience = %s, phone = %s, birthday = %s,
                            base_salary = %s, commission_rate = %s
                        WHERE id = %s""",
                    (username, full_name, email, position, bio, specialization, years_of_experience, phone, birthday, 
                     base_salary, commission_rate, user_id))
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

    if user["id"] != user_id and user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Пробуем получить из специальной таблицы
        c.execute("""
            SELECT email_notifications, sms_notifications, booking_notifications, 
                   birthday_reminders, chat_notifications, telegram_notifications
            FROM notification_settings
            WHERE user_id = %s
        """, (user_id,))
        
        res = c.fetchone()
        
        # Если настроек нет - создаем дефолтные
        if not res:
            c.execute("""
                INSERT INTO notification_settings (user_id) VALUES (%s)
                RETURNING email_notifications, sms_notifications, booking_notifications, 
                          birthday_reminders, chat_notifications, telegram_notifications
            """, (user_id,))
            res = c.fetchone()
            conn.commit()

        # Также проверим наличие telegram_chat_id в таблице users
        c.execute("SELECT telegram_chat_id, email, phone FROM users WHERE id = %s", (user_id,))
        user_data = c.fetchone()
        conn.close()

        return {
            "notify_email": bool(res[0]),
            "notify_sms": bool(res[1]),
            "notify_on_booking": bool(res[2]),
            "notify_birthday": bool(res[3]),
            "notify_chat": bool(res[4]),
            "notify_telegram": bool(res[5]),
            "has_telegram": bool(user_data[0]) if user_data else False,
            "has_email": bool(user_data[1]) if user_data else False,
            "has_phone": bool(user_data[2]) if user_data else False
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

    if user["id"] != user_id and user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Используем INSERT ... ON CONFLICT для PostgreSQL (UPSERT)
        # Но в нашей схеме UNIQUE(user_id) уже есть
        c.execute("""
            INSERT INTO notification_settings (
                user_id, email_notifications, sms_notifications, booking_notifications,
                birthday_reminders, chat_notifications, telegram_notifications
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                email_notifications = EXCLUDED.email_notifications,
                sms_notifications = EXCLUDED.sms_notifications,
                booking_notifications = EXCLUDED.booking_notifications,
                birthday_reminders = EXCLUDED.birthday_reminders,
                chat_notifications = EXCLUDED.chat_notifications,
                telegram_notifications = EXCLUDED.telegram_notifications,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id,
            bool(data.get('notify_email', True)),
            bool(data.get('notify_sms', False)),
            bool(data.get('notify_on_booking', True)),
            bool(data.get('notify_birthday', True)),
            bool(data.get('notify_chat', True)),
            bool(data.get('notify_telegram', False))
        ))

        conn.commit()
        conn.close()

        log_activity(user["id"], "update_notification_settings", "user",
                    str(user_id), "Updated notification preferences")

        return {"success": True, "message": "Настройки уведомлений обновлены"}

    except Exception as e:
        log_error(f"Error updating notification settings: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

