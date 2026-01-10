"""
API для работы с сотрудниками салона
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db.employees import (
    get_all_employees, get_employee, create_employee, update_employee,
    delete_employee, get_employee_services, add_employee_service,
    remove_employee_service, get_employees_by_service, update_employee_service,
    get_employee_schedule, set_employee_schedule, get_available_employees,
    get_employee_busy_slots
)
from utils.utils import require_auth

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error

router = APIRouter(tags=["Employees"])

@router.get("/employees")
async def list_employees(
    active_only: bool = True,
    session_token: Optional[str] = Cookie(None)
):
    """Получить всех сотрудников (публичный endpoint)"""
    employees = get_all_employees(active_only=active_only)
    
    return {
        "employees": [
            {
                "id": e[0],           # id
                "full_name": e[3],    # full_name
                "position": e[9],     # position
                "experience": e[13],  # experience
                "photo": e[10],       # photo
                "bio": e[12],         # bio
                "phone": e[4] if len(e) > 4 else None,  # email used as phone fallback
                "email": e[4],        # email
                "instagram": None,    # instagram not in users table
                "is_active": bool(e[8])  # is_active
            } for e in employees
        ]
    }

# ===== EMPLOYEE SELF-SERVICE PROFILE ENDPOINTS =====

@router.get("/employees/my-profile")
async def get_my_employee_profile(
    session_token: Optional[str] = Cookie(None)
):
    """Получить профиль текущего сотрудника"""
    log_info("🔍 [Profile] Запрос на получение профиля сотрудника", "api")
    
    user = require_auth(session_token)
    if not user:
        log_error("❌ [Profile] Unauthorized - нет токена сессии", "api")
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    log_info(f"✅ [Profile] Пользователь авторизован: user_id={user.get('id')}, username={user.get('username')}, role={user.get('role')}", "api")

    try:
        log_info(f"🔍 [Profile] Загрузка данных пользователя с id={user.get('id')}", "api")
        conn = get_db_connection()
        c = conn.cursor()

        # Запрашиваем данные из таблицы users (не employees!)
        c.execute("""
            SELECT id, full_name, position, email, phone, birthday, 
                   is_service_provider, role, is_active,
                   years_of_experience, bio, specialization, photo, photo_url
            FROM users
            WHERE id = %s
        """, (user["id"],))

        row = c.fetchone()
        conn.close()

        if not row:
            log_error(f"❌ [Profile] Пользователь с id={user.get('id')} не найден в таблице users", "api")
            return JSONResponse({"error": "User not found"}, status_code=404)

        log_info(f"✅ [Profile] Профиль успешно загружен: {row[1]} ({row[2]})", "api")
        
        # Возвращаем данные в формате, который ожидает фронтенд
        profile_data = {
            "id": row[0],
            "username": user.get('username'),
            "full_name": row[1],
            "position": row[2],
            "email": row[3],
            "phone": row[4],
            "birthday": row[5],
            "is_service_provider": bool(row[6]),
            "role": row[7],
            "is_active": bool(row[8]),
            "years_of_experience": row[9],
            "bio": row[10],
            "specialization": row[11],
            "photo": row[12],
            "photo_url": row[13]
        }
        
        return {
            "success": True,
            "profile": profile_data
        }
    except Exception as e:
        log_error(f"❌ [Profile] Ошибка при получении профиля: {type(e).__name__}: {str(e)}", "api")
        import traceback
        log_error(f"❌ [Profile] Traceback: {traceback.format_exc()}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/employees/my-profile")
async def update_my_employee_profile(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить профиль текущего сотрудника"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    employee_id = user.get("employee_id")
    if not employee_id:
        return JSONResponse({"error": "User is not linked to an employee"}, status_code=404)

    try:
        data = await request.json()

        conn = get_db_connection()
        c = conn.cursor()

        # Определяем, какие поля обновлять
        update_fields = []
        update_values = []

        allowed_fields = ['full_name', 'position', 'experience', 'photo', 'bio', 'phone', 'email', 'instagram']

        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])

        if not update_fields:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        # Добавляем updated_at
        update_fields.append("updated_at = NOW()")
        update_values.append(employee_id)

        query = f"UPDATE employees SET {', '.join(update_fields)} WHERE id = %s"
        c.execute(query, tuple(update_values))

        conn.commit()
        conn.close()

        log_info(f"Employee {employee_id} updated their profile", "api")

        return {"success": True}
    except Exception as e:
        log_error(f"Error updating employee profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/employees/{employee_id}")

async def get_employee_detail(employee_id: int):
    """Получить детали сотрудника"""
    employee = get_employee(employee_id)
    
    if not employee:
        return JSONResponse({"error": "Employee not found"}, status_code=404)
    
    services = get_employee_services(employee_id)
    schedule = get_employee_schedule(employee_id)
    
    return {
        "id": employee[0],
        "full_name": employee[1],
        "position": employee[2],
        "experience": employee[3],
        "photo": employee[4],
        "bio": employee[5],
        "phone": employee[6],
        "email": employee[7],
        "instagram": employee[8],
        "is_active": bool(employee[9]),
        "services": [
            {
                "id": s[0], 
                "name": s[2], 
                "price": s[19] if len(s) > 19 and s[19] is not None else s[5], # Use override or default
                "duration": s[20] if len(s) > 20 and s[20] is not None else 60, # Default 60m if not set
                "is_online_booking_enabled": bool(s[21]) if len(s) > 21 and s[21] is not None else True,
                "is_calendar_enabled": bool(s[22]) if len(s) > 22 and s[22] is not None else True,
                "price_min": s[23] if len(s) > 23 else None,
                "price_max": s[24] if len(s) > 24 else None
            } for s in services
        ],
        "schedule": [
            {
                "day_of_week": s[2],
                "start_time": s[3],
                "end_time": s[4]
            } for s in schedule
        ]
    }

@router.post("/employees")
async def create_employee_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать сотрудника (только admin)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    employee_id = create_employee(
        full_name=data.get("full_name"),
        position=data.get("position"),
        experience=data.get("experience"),
        photo=data.get("photo"),
        bio=data.get("bio"),
        phone=data.get("phone"),
        email=data.get("email"),
        instagram=data.get("instagram")
    )
    
    return {"success": True, "employee_id": employee_id}

@router.post("/employees/{employee_id}/update")
async def update_employee_api(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    update_employee(employee_id, **data)
    
    return {"success": True}

@router.delete("/employees/{employee_id}")
async def delete_employee_api(
    employee_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    success = delete_employee(employee_id)
    
    if success:
        return {"success": True}
    return JSONResponse({"error": "Delete failed"}, status_code=400)

@router.post("/employees/{employee_id}/services")
async def add_service_to_employee(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить специализацию сотруднику"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    service_id = data.get("service_id")
    
    success = add_employee_service(employee_id, service_id)
    
    if success:
        return {"success": True}
    return JSONResponse({"error": "Already exists"}, status_code=400)

@router.delete("/employees/{employee_id}/services/{service_id}")
async def remove_service_from_employee(
    employee_id: int,
    service_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить специализацию у сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    remove_employee_service(employee_id, service_id)
    remove_employee_service(employee_id, service_id)
    return {"success": True}

@router.put("/employees/{employee_id}/services/{service_id}")
async def update_service_settings(
    employee_id: int,
    service_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки услуги для сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    success = update_employee_service(
        employee_id, 
        service_id,
        price=data.get('price'),
        duration=data.get('duration'),
        is_online_booking_enabled=data.get('is_online_booking_enabled'),
        is_calendar_enabled=data.get('is_calendar_enabled'),
        price_min=data.get('price_min'),
        price_max=data.get('price_max')
    )
    
    if success:
        return {"success": True}
    return JSONResponse({"error": "Update failed"}, status_code=400)

@router.post("/employees/{employee_id}/schedule")
async def set_schedule(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Установить расписание сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    set_employee_schedule(
        employee_id,
        data["day_of_week"],
        data["start_time"],
        data["end_time"]
    )
    
    return {"success": True}

@router.post("/employees/{employee_id}/reorder")
async def reorder_employee(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить порядок сортировки сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    new_order = data.get('sort_order')
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("UPDATE employees SET sort_order = %s WHERE id = %s", (new_order, employee_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        log_error(f"Error reordering: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.get("/employees/available")
async def get_available(
    service_id: int,
    datetime: str
):
    """Получить доступных мастеров для записи"""
    employees = get_available_employees(service_id, datetime)
    
    return {
        "employees": [
            {
                "id": e[0],
                "full_name": e[1],
                "position": e[2],
                "photo": e[4]
            } for e in employees
        ]
    }

@router.put("/employees/{employee_id}/birthday")
async def update_employee_birthday(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить дату рождения сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        birthday = data.get('birthday')

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            UPDATE users
            SET birthday = %s
            WHERE id = %s
        """, (birthday, employee_id))

        conn.commit()
        conn.close()

        log_info(f"Updated birthday for employee {employee_id}", "api")

        return {"success": True}
    except Exception as e:
        log_error(f"Error updating birthday: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== SMART FILTERING ENDPOINTS =====

@router.get("/services/{service_id}/employees")
async def get_employees_for_service(service_id: int):
    """Получить сотрудников, которые оказывают эту услугу"""
    employees = get_employees_by_service(service_id)

    return {
        "employees": [
            {
                "id": e[0],
                "full_name": e[1],
                "position": e[2],
                "photo": e[4],
                "is_active": bool(e[9])
            } for e in employees
        ]
    }

@router.get("/employees/{employee_id}/busy-slots")
async def get_busy_slots(employee_id: int, date: str):
    """Получить занятые временные слоты сотрудника на дату"""
    busy_slots = get_employee_busy_slots(employee_id, date)

    return {
        "busy_slots": busy_slots
    }