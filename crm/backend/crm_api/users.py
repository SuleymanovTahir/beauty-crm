"""
API Endpoints для работы с пользователями
"""
from fastapi import APIRouter, Request, Cookie,Depends,Query
from fastapi.responses import JSONResponse
from typing import Optional

import time
from db import get_all_users, delete_user, log_activity, get_all_roles
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth, sanitize_url, map_image_path, hash_password
from utils.permissions import require_permission
from utils.logger import log_error
from core.auth import get_current_user_or_redirect as get_current_user
import psycopg2
from utils.cache import cache
from utils.language_utils import get_localized_name, translate_position, get_dynamic_translation

router = APIRouter(tags=["Users"])


def _get_localized_position(user_id: int, username: Optional[str], raw_position: Optional[str], language: str) -> str:
    localized_position = ""
    if username:
        localized_position = get_dynamic_translation("users", username, "position", language, "")
    if not localized_position:
        localized_position = get_dynamic_translation("users", user_id, "position", language, "")
    if not localized_position:
        localized_position = translate_position(raw_position or "", language)
    if not localized_position:
        localized_position = raw_position or ""
    if localized_position:
        localized_position = localized_position[0].upper() + localized_position[1:]
    return localized_position

@router.get("/me")
async def get_current_user_api(
    session_token: Optional[str] = Cookie(None)
):
    """API: Получить данные текущего пользователя (для мобильного приложения)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, username, full_name, email, role, phone, photo, position,
                   is_active, created_at, last_login
            FROM users WHERE id = %s
        """, (user["id"],))

        result = c.fetchone()
        conn.close()

        if not result:
            return JSONResponse({"error": "User not found"}, status_code=404)

        return {
            "user": {
                "id": result[0],
                "username": result[1],
                "full_name": result[2],
                "email": result[3],
                "role": result[4],
                "phone": result[5],
                "photo": map_image_path(sanitize_url(result[6])),
                "position": result[7],
                "is_active": bool(result[8]),
                "created_at": result[9],
                "last_login": result[10]
            }
        }

    except Exception as e:
        log_error(f"Error in /me endpoint: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users")
@require_permission("users_create")
async def create_user_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать нового пользователя"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    data = await request.json()

    # Валидация
    username = data.get('username', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip() or None
    from core.config import normalize_role_key
    role = normalize_role_key(data.get('role', 'employee'))
    position = data.get('position', '').strip() or None
    phone = data.get('phone', '').strip() or ""

    existing_roles = {role_data['role_key'] for role_data in get_all_roles()}
    if role not in existing_roles:
        return JSONResponse(
            {"error": "Неверная роль пользователя"},
            status_code=400
        )

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
    language: str = Query('ru', description="Language code"),
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
                id, username, 
                full_name,
                email, role, 
                position, 
                phone, 
                bio,
                photo, is_active, is_service_provider,
                created_at,
                years_of_experience, specialization, telegram_username,
                nickname,
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
            "full_name": get_localized_name(row[0], row[2], language),
            "email": row[3],
            "role": row[4],
            "position": _get_localized_position(row[0], row[1], row[5], language),
            "phone": row[6],
            "bio": row[7],
            "photo": map_image_path(sanitize_url(row[8])),
            "is_active": bool(row[9]),
            "is_service_provider": bool(row[10]),
            "created_at": row[11],
            "years_of_experience": row[12],
            "specialization": row[13],
            "telegram": row[14],
            "nickname": row[15],
            "base_salary": row[16],
            "commission_rate": row[17]
        }

        return user_data

    except Exception as e:
        log_error(f"Error fetching user: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/users")
@require_permission("users_view")
async def get_users(
    language: str = Query('ru', description="Language code"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить всех пользователей"""
    # Token validation handled by decorator
    # But we need current_user for logic
    from utils.utils import get_current_user_from_token
    current_user = get_current_user_from_token(session_token)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        start_time = time.time()
        c.execute("""
            SELECT
                u.id, u.username,
                u.full_name,
                u.email, u.role,
                u.position,
                u.phone,
                u.created_at, u.is_active,
                u.employee_id,
                COALESCE(u.photo, u.photo_url) as photo,
                u.position_id,
                u.is_public_visible,
                u.sort_order,
                u.is_service_provider
            FROM users u
            WHERE u.deleted_at IS NULL AND u.role != 'client'
            ORDER BY u.sort_order ASC, u.created_at DESC
        """)

        users = []
        for row in c.fetchall():
            # Add cache buster to photo
            photo_url = map_image_path(sanitize_url(row[10]))
            localized_position = _get_localized_position(row[0], row[1], row[5], language)

            user_data = {
                "id": row[0],
                "username": row[1],
                "full_name": get_localized_name(row[0], row[2], language),
                "email": row[3],
                "role": row[4],
                "position": localized_position,
                "phone": row[6],
                "created_at": row[7],
                "is_active": bool(row[8]),
                "employee_id": row[9],
                "photo": photo_url,
                "position_id": row[11],
                "is_public_visible": bool(row[12]),
                "sort_order": row[13],
                "is_service_provider": bool(row[14])
            }

            users.append(user_data)

        conn.close()

        # Fetch services for all users efficiently
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT us.user_id, s.id, s.name
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
                "name": row[2]
            })
        conn.close()

        for user in users:
            user["services"] = services_map.get(user["id"], [])

        duration = time.time() - start_time
        from utils.logger import log_info
        log_info(f"⏱️ get_users took {duration:.4f}s returning {len(users)} users", "api")

        return {"users": users}  # ✅ Обёрнуто в объект

    except Exception as e:
        log_error(f"Error fetching users: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/approve")
@require_permission("users_edit")
async def approve_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Активировать пользователя"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
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
@require_permission("users_edit")
async def reject_user(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Отклонить регистрацию пользователя"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
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

@router.post("/users/{user_id}/toggle-active")
@require_permission("users_edit")
async def toggle_user_active(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Заблокировать/разблокировать пользователя"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя заблокировать самого себя"}, status_code=400)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем текущий статус
        c.execute("SELECT is_active, username, full_name FROM users WHERE id = %s", (user_id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            return JSONResponse({"error": "Пользователь не найден"}, status_code=404)
        
        current_status, username, full_name = result
        new_status = not current_status
        
        # Обновляем статус
        c.execute("UPDATE users SET is_active = %s WHERE id = %s", (new_status, user_id))
        conn.commit()
        
        action = "activated" if new_status else "blocked"
        log_activity(user["id"], f"toggle_user_active_{action}", "user", str(user_id), 
                    f"User {username} {action}")
        
        conn.close()
        
        status_text = "активирован" if new_status else "заблокирован"
        return {
            "success": True, 
            "message": f"Пользователь {full_name} успешно {status_text}",
            "is_active": new_status
        }
        
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error toggling user active status: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/delete")
@require_permission("users_delete")
async def delete_user_api(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить пользователя (Soft Delete)"""
    from utils.soft_delete import soft_delete_user
    from utils.audit import log_audit
    from utils.utils import get_current_user_from_token

    user = get_current_user_from_token(session_token)

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
@require_permission("roles_edit")
async def update_user_role(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить роль пользователя"""
    from utils.utils import get_current_user_from_token
    user = get_current_user_from_token(session_token)
    
    # Проверяем что пользователь может управлять ролями
    from core.config import ROLES, can_manage_role, normalize_role_key
    from utils.logger import log_info, log_warning
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Нельзя изменить свою роль"}, status_code=400)
    
    data = await request.json()
    new_role = normalize_role_key(data.get('role'))
    existing_roles_data = get_all_roles()
    existing_roles = {role_data["role_key"] for role_data in existing_roles_data}
    role_labels = {role_data["role_key"]: role_data["role_name"] for role_data in existing_roles_data}
    
    # Детальное логирование для отладки
    log_info(f"🔄 Role change request: user_id={user_id}, new_role={new_role}, by={user['username']}", "api")
    log_info(f"📋 Available roles: {list(existing_roles)}", "api")
    
    if not new_role or new_role not in existing_roles:
        log_warning(f"❌ Invalid role received: '{new_role}'. Available: {list(existing_roles)}", "api")
        return JSONResponse({
            "error": f"Неверная роль. Доступные роли: {', '.join(sorted(existing_roles))}"
        }, status_code=400)
    
    # Директор может назначить любую роль
    if user["role"] != "director":
        if new_role not in ROLES:
            return JSONResponse(
                {"error": "Назначать кастомные роли может только директор"},
                status_code=403
            )

        # Проверяем может ли текущий пользователь назначить эту роль
        if not can_manage_role(user["role"], new_role, user.get("secondary_role")):
            log_warning(f"⛔ {user['username']} ({user['role']}) cannot assign role '{new_role}'", "api")
            return JSONResponse(
                {"error": f"У вас нет прав назначать роль '{role_labels.get(new_role, new_role)}'"}, 
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
                "message": f"Роль изменена на '{role_labels.get(new_role, new_role)}'"
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
                        base_salary, commission_rate, secondary_role, is_active
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
        "photo": map_image_path(sanitize_url(result[7])),
        "years_of_experience": result[8],
        "bio": result[9],
        "specialization": result[10],
        "phone": result[11],
        "birthday": result[12],
        "position": result[13],
        "base_salary": result[14],
        "commission_rate": result[15],
        "secondary_role": result[16],
        "is_active": result[17]
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
                        years_of_experience, bio, specialization, phone, birthday, position,
                        base_salary, commission_rate, secondary_role, is_active
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
        "photo": map_image_path(sanitize_url(result[7])),
        "years_of_experience": result[8],
        "bio": result[9],
        "specialization": result[10],
        "phone": result[11],
        "birthday": result[12],
        "position": result[13],
        "base_salary": result[14],
        "commission_rate": result[15],
        "secondary_role": result[16],
        "is_active": result[17]
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
            
            c.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
            user_row = c.fetchone()
            if not user_row:
                conn.close()
                return JSONResponse({"error": "Пользователь не найден"}, status_code=404)
            
            from utils.utils import verify_password
            if not verify_password(old_password, user_row[0]):
                conn.close()
                return JSONResponse(
                    {"error": "Неверный текущий пароль"},
                    status_code=400
                )
        
        # Меняем пароль используя PBKDF2 (hash_password из utils)
        new_password_hash = hash_password(new_password)
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
    # Менеджеры могут редактировать специалистов (service providers)
    is_admin_or_director = user["role"] in ["admin", "director"]
    is_self = user["id"] == user_id
    
    if not is_admin_or_director and not is_self:
        if user["role"] == "manager":
            # Проверяем является ли целевой пользователь специалистом
            conn_check = get_db_connection()
            c_check = conn_check.cursor()
            c_check.execute("SELECT is_service_provider FROM users WHERE id = %s", (user_id,))
            target_is_sp = c_check.fetchone()
            conn_check.close()
            
            if not target_is_sp or not target_is_sp[0]:
                return JSONResponse({"error": "Forbidden: Managers can only edit service providers"}, status_code=403)
        else:
            return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Fetch current user data for partial updates
        c.execute("""
            SELECT username, full_name, email, position, photo, bio, specialization,
                   years_of_experience, phone, birthday, base_salary, commission_rate,
                   telegram_id, instagram_username, is_public_visible, sort_order, secondary_role, nickname
            FROM users WHERE id = %s
        """, (user_id,))
        curr = c.fetchone()

        if not curr:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        # 2. Merge data (incoming takes precedence, fallback to current)
        # Note: We must handle field mapping between JSON keys and DB columns

        username = data.get('username', curr[0])
        full_name = data.get('full_name', curr[1])
        email = data.get('email', curr[2])
        position = data.get('position', curr[3])
        # photo handled specially below

        # Mapped fields
        bio = data.get('about_me', curr[5])
        specialization = data.get('specialization', curr[6])
        phone = data.get('phone_number', curr[8])
        birthday = data.get('birth_date', curr[9])
        base_salary = data.get('base_salary', curr[10])
        commission_rate = data.get('commission_rate', curr[11])
        telegram_id = data.get('telegram', curr[12])
        instagram_username = data.get('instagram', curr[13])
        is_public_visible = data.get('is_public_visible', curr[14])
        sort_order = data.get('sort_order', curr[15])
        secondary_role = data.get('secondary_role', curr[16])
        nickname = data.get('nickname', curr[17])
        
        # Handle years_of_experience specially due to conversion
        if 'years_of_experience' in data:
            raw_years = data.get('years_of_experience')
            try:
                if raw_years is not None and raw_years != '':
                    years_of_experience = int(raw_years)
                else:
                    years_of_experience = None
            except (ValueError, TypeError):
                years_of_experience = None
        else:
            years_of_experience = curr[7]

        # 3. Validation
        if not username or len(username) < 3:
            return JSONResponse({"error": "Логин должен быть минимум 3 символа"}, status_code=400)

        if not full_name or len(full_name) < 2:
            return JSONResponse({"error": "Имя должно быть минимум 2 символа"}, status_code=400)

        # 4. Check uniqueness only if username changed
        if username != curr[0]:
            c.execute("SELECT id FROM users WHERE username = %s AND id != %s", (username, user_id))
            if c.fetchone():
                conn.close()
                return JSONResponse({"error": "Логин уже занят"}, status_code=400)

        # 5. Handle photo update
        photo = data.get('photo')
        current_photo_path = curr[4]
        
        if 'photo' in data: # Explicit update logic
             if photo is not None and photo != current_photo_path:
                from crm_api.uploads import delete_old_photo_if_exists
                delete_old_photo_if_exists(current_photo_path, photo)
             # photo var is already set from data
        else:
             photo = current_photo_path

        # 6. Execute Update
        start_time = time.time()
        
        c.execute("""UPDATE users
               SET username = %s, full_name = %s, email = %s, position = %s, photo = %s,
                   bio = %s, specialization = %s, years_of_experience = %s, phone = %s, birthday = %s,
                   base_salary = %s, commission_rate = %s, telegram_id = %s, instagram_username = %s,
                   is_public_visible = %s, sort_order = %s, secondary_role = %s, nickname = %s
               WHERE id = %s""",
            (username, full_name, email, position, photo, bio, specialization, years_of_experience, phone, birthday,
             base_salary, commission_rate, telegram_id, instagram_username, is_public_visible, sort_order, secondary_role, nickname, user_id))
        
        conn.commit()

        # Invalidate Public Employees Cache
        try:
            cache.clear_by_pattern("public_employees_*")
        except:
            pass
        
        duration = time.time() - start_time
        from utils.logger import log_info
        log_info(f"⏱️ Update profile took {duration:.4f}s for user_id={user_id} (Partial: {'username' not in data})", "api")

        log_activity(user["id"], "update_profile", "user", str(user_id), 
                    f"Profile updated: {username}")
        
        conn.close()
        return {"success": True, "message": "Профиль обновлён"}

    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error updating profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/update-contact")
async def update_user_contact(
    user_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить контактные данные пользователя (Email, Telegram, Instagram)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Проверка прав: админ/директор
    if user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Формируем запрос динамически
        updates = []
        params = []
        
        if 'email' in data:
            updates.append("email = %s")
            params.append(data['email'])
            
        if 'telegram_id' in data:
            updates.append("telegram_id = %s")
            params.append(data['telegram_id'])
            
        if 'instagram_username' in data:
            updates.append("instagram_username = %s")
            params.append(data['instagram_username'])
            
        if not updates:
             return {"success": True, "message": "Нет данных для обновления"}
             
        params.append(user_id)
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        
        log_activity(user["id"], "update_contact", "user", str(user_id), 
                    f"Contact info updated: {data.keys()}")
        
        conn.close()
        return {"success": True, "message": "Контактные данные обновлены"}
        
    except Exception as e:
        conn.rollback()
        conn.close()
        log_error(f"Error updating user contact: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

