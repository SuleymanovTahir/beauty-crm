"""
API для работы с сотрудниками салона
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db.employees import (
    get_all_employees, get_employee, create_employee, update_employee,
    delete_employee, get_employee_services, add_employee_service,
    remove_employee_service, get_employees_by_service,
    get_employee_schedule, set_employee_schedule, get_available_employees
)
from utils.utils import require_auth
import sqlite3
from core.config import DATABASE_NAME
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
                "id": e[0],
                "full_name": e[1],
                "position": e[2],
                "experience": e[3],
                "photo": e[4],
                "bio": e[5],
                "phone": e[6],
                "email": e[7],
                "instagram": e[8],
                "is_active": bool(e[9])
            } for e in employees
        ]
    }


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
            {"id": s[0], "name": s[2], "price": s[3]} for s in services
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
    if not user or user["role"] != "admin":
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
    if not user or user["role"] != "admin":
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
    if not user or user["role"] != "admin":
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
    if not user or user["role"] != "admin":
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
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    remove_employee_service(employee_id, service_id)
    return {"success": True}


@router.post("/employees/{employee_id}/schedule")
async def set_schedule(
    employee_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Установить расписание сотрудника"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
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
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    new_order = data.get('sort_order')
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("UPDATE employees SET sort_order = ? WHERE id = ?", (new_order, employee_id))
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            UPDATE users
            SET birthday = ?
            WHERE id = ?
        """, (birthday, employee_id))

        conn.commit()
        conn.close()

        log_info(f"Updated birthday for employee {employee_id}", "api")

        return {"success": True}
    except Exception as e:
        log_error(f"Error updating birthday: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ===== EMPLOYEE SELF-SERVICE PROFILE ENDPOINTS =====

@router.get("/employees/my-profile")
async def get_my_employee_profile(
    session_token: Optional[str] = Cookie(None)
):
    """Получить профиль текущего сотрудника"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Проверяем, есть ли у пользователя employee_id
    employee_id = user.get("employee_id")
    if not employee_id:
        return JSONResponse({"error": "User is not linked to an employee"}, status_code=404)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT id, full_name, name_ru, name_ar, position, position_ru, position_ar,
                   experience, photo, bio, phone, email, instagram, is_active
            FROM employees
            WHERE id = ?
        """, (employee_id,))

        row = c.fetchone()
        conn.close()

        if not row:
            return JSONResponse({"error": "Employee not found"}, status_code=404)

        return {
            "id": row[0],
            "full_name": row[1],
            "name_ru": row[2],
            "name_ar": row[3],
            "position": row[4],
            "position_ru": row[5],
            "position_ar": row[6],
            "experience": row[7],
            "photo": row[8],
            "bio": row[9],
            "phone": row[10],
            "email": row[11],
            "instagram": row[12],
            "is_active": bool(row[13])
        }
    except Exception as e:
        log_error(f"Error getting employee profile: {e}", "api")
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Определяем, какие поля обновлять
        update_fields = []
        update_values = []

        allowed_fields = ['full_name', 'name_ru', 'name_ar', 'position', 'position_ru',
                          'position_ar', 'experience', 'photo', 'bio', 'phone', 'email', 'instagram']

        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                update_values.append(data[field])

        if not update_fields:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        # Добавляем updated_at
        update_fields.append("updated_at = datetime('now')")
        update_values.append(employee_id)

        query = f"UPDATE employees SET {', '.join(update_fields)} WHERE id = ?"
        c.execute(query, tuple(update_values))

        conn.commit()
        conn.close()

        log_info(f"Employee {employee_id} updated their profile", "api")

        return {"success": True}
    except Exception as e:
        log_error(f"Error updating employee profile: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)