"""
API Endpoints для управления услугами сотрудников
"""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from db.connection import get_db_connection
from utils.logger import log_error, log_info
from utils.duration_utils import parse_duration_to_minutes
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
                s.id, s.name, s.category,
                COALESCE(us.price, s.price) as price,
                us.price_min, us.price_max,
                s.duration as duration_raw,
                us.is_online_booking_enabled, us.is_calendar_enabled
            FROM services s
            JOIN user_services us ON s.id = us.service_id
            WHERE us.user_id = %s
            ORDER BY s.category, s.name
        """, (user_id,))

        assigned_services = []
        for row in c.fetchall():
            duration_minutes = parse_duration_to_minutes(row[6]) or 60
            assigned_services.append({
                "id": row[0],
                "name": row[1],
                "category": row[2],
                "price": row[3],
                "price_min": row[4],
                "price_max": row[5],
                "duration": duration_minutes,
                "is_online_booking_enabled": bool(row[7]) if row[7] is not None else True,
                "is_calendar_enabled": bool(row[8]) if row[8] is not None else True
            })

        # Get all available services (entire catalog)
        c.execute("""
            SELECT id, name, category, price, duration
            FROM services
            WHERE is_active = TRUE
            ORDER BY category, name
        """)

        all_services = []
        assigned_ids = {s["id"] for s in assigned_services}

        for row in c.fetchall():
            default_duration = parse_duration_to_minutes(row[4]) or 60
            all_services.append({
                "id": row[0],
                "name": row[1],
                "category": row[2],
                "default_price": row[3],
                "default_duration": default_duration,
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
            VALUES (%s, %s, %s, %s, %s, NULL, %s, %s)
        """, (user_id, service_id, price, price_min, price_max,
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
        duration_updated = False

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
            normalized_duration = parse_duration_to_minutes(data["duration"])
            if not normalized_duration:
                conn.close()
                return JSONResponse({"error": "Invalid duration value"}, status_code=400)

            c.execute(
                """
                UPDATE services
                SET duration = %s
                WHERE id = %s
                """,
                (str(normalized_duration), service_id),
            )
            duration_updated = c.rowcount > 0

        if "is_online_booking_enabled" in data:
            updates.append("is_online_booking_enabled = %s")
            params.append(True if data["is_online_booking_enabled"] else False)
        
        if "is_calendar_enabled" in data:
            updates.append("is_calendar_enabled = %s")
            params.append(True if data["is_calendar_enabled"] else False)
        
        if not updates and not duration_updated:
            conn.close()
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        if updates:
            params.extend([user_id, service_id])
            query = f"UPDATE user_services SET {', '.join(updates)}, duration = NULL WHERE user_id = %s AND service_id = %s"
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
