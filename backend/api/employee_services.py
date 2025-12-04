"""
API Endpoints для управления услугами сотрудников
"""
from fastapi import APIRouter, Request, Cookie, Depends
from fastapi.responses import JSONResponse
from typing import Optional

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from core.auth import get_current_user_or_redirect as get_current_user

router = APIRouter(tags=["Employee Services"])

@router.get("/users/{user_id}/services")
async def get_user_services(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить все услуги сотрудника с настройками"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get assigned services
        c.execute("""
            SELECT 
                s.id, s.name, s.name_ru, s.name_ar, s.category,
                COALESCE(us.price, s.price) as price, 
                us.price_min, us.price_max, 
                COALESCE(us.duration, s.duration) as duration,
                us.is_online_booking_enabled, us.is_calendar_enabled
            FROM services s
            JOIN user_services us ON s.id = us.service_id
            WHERE us.user_id = %s
            ORDER BY s.category, s.name
        """, (user_id,))
        
        assigned_services = []
        for row in c.fetchall():
            assigned_services.append({
                "id": row[0],
                "name": row[1],
                "name_ru": row[2],
                "name_ar": row[3],
                "category": row[4],
                "price": row[5],
                "price_min": row[6],
                "price_max": row[7],
                "duration": row[8],
                "is_online_booking_enabled": bool(row[9]),
                "is_calendar_enabled": bool(row[10])
            })
        
        # Get all available services (entire catalog)
        c.execute("""
            SELECT id, name, name_ru, name_ar, category, price, duration
            FROM services
            WHERE is_active = TRUE
            ORDER BY category, name
        """)
        
        all_services = []
        assigned_ids = {s["id"] for s in assigned_services}
        
        for row in c.fetchall():
            all_services.append({
                "id": row[0],
                "name": row[1],
                "name_ru": row[2],
                "name_ar": row[3],
                "category": row[4],
                "default_price": row[5],
                "default_duration": row[6],
                "is_assigned": row[0] in assigned_ids
            })
        
        conn.close()
        
        return {
            "assigned_services": assigned_services,
            "all_services": all_services
        }
        
    except Exception as e:
        log_error(f"Error getting user services: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/users/{user_id}/services")
async def add_user_service(
    user_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Добавить услугу сотруднику"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        service_id = data.get("service_id")
        price = data.get("price")
        price_min = data.get("price_min")
        price_max = data.get("price_max")
        duration = data.get("duration", 60)
        is_online_booking_enabled = data.get("is_online_booking_enabled", True)
        is_calendar_enabled = data.get("is_calendar_enabled", True)
        
        if not service_id:
            return JSONResponse({"error": "service_id required"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if already assigned
        c.execute("SELECT id FROM user_services WHERE user_id = %s AND service_id = %s",
                 (user_id, service_id))
        if c.fetchone():
            conn.close()
            return JSONResponse({"error": "Service already assigned"}, status_code=400)
        
        # Add service
        c.execute("""
            INSERT INTO user_services 
            (user_id, service_id, price, price_min, price_max, duration, 
             is_online_booking_enabled, is_calendar_enabled)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, service_id, price, price_min, price_max, duration,
              True if is_online_booking_enabled else False,
              True if is_calendar_enabled else False))
        
        conn.commit()
        conn.close()
        
        log_info(f"Service {service_id} added to user {user_id}", "api")
        
        return {"success": True, "message": "Service added"}
        
    except Exception as e:
        log_error(f"Error adding user service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/users/{user_id}/services/{service_id}")
async def update_user_service(
    user_id: int,
    service_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Обновить настройки услуги сотрудника"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Build update query
        updates = []
        params = []
        
        if "price" in data:
            updates.append("price = %s")
            params.append(data["price"])
        
        if "price_min" in data:
            updates.append("price_min = %s")
            params.append(data["price_min"])
        
        if "price_max" in data:
            updates.append("price_max = %s")
            params.append(data["price_max"])
        
        if "duration" in data:
            updates.append("duration = %s")
            params.append(data["duration"])
        
        if "is_online_booking_enabled" in data:
            updates.append("is_online_booking_enabled = %s")
            params.append(True if data["is_online_booking_enabled"] else False)
        
        if "is_calendar_enabled" in data:
            updates.append("is_calendar_enabled = %s")
            params.append(True if data["is_calendar_enabled"] else False)
        
        if not updates:
            conn.close()
            return JSONResponse({"error": "No fields to update"}, status_code=400)
        
        params.extend([user_id, service_id])
        
        query = f"UPDATE user_services SET {', '.join(updates)} WHERE user_id = %s AND service_id = %s"
        c.execute(query, params)
        
        conn.commit()
        conn.close()
        
        log_info(f"Service {service_id} updated for user {user_id}", "api")
        
        return {"success": True, "message": "Service updated"}
        
    except Exception as e:
        log_error(f"Error updating user service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/users/{user_id}/services/{service_id}")
async def delete_user_service(
    user_id: int,
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить услугу у сотрудника"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("DELETE FROM user_services WHERE user_id = %s AND service_id = %s",
                 (user_id, service_id))
        
        conn.commit()
        affected = c.rowcount
        conn.close()
        
        if affected > 0:
            log_info(f"Service {service_id} removed from user {user_id}", "api")
            return {"success": True, "message": "Service removed"}
        else:
            return JSONResponse({"error": "Service not found"}, status_code=404)
        
    except Exception as e:
        log_error(f"Error deleting user service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
