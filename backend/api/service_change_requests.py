"""
API для запросов на изменение услуг сотрудниками
Сотрудники могут запрашивать изменения, которые одобряются админом
"""
from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime

from db.connection import get_db_connection
from utils.logger import log_error, log_info
from core.auth import get_current_user_or_redirect as get_current_user

router = APIRouter(tags=["Service Change Requests"])


# ============================================================================
# ENDPOINTS ДЛЯ СОТРУДНИКОВ
# ============================================================================

@router.get("/my/services")
async def get_my_services(
    current_user: dict = Depends(get_current_user)
):
    """Получить свои услуги с возможностью редактирования"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        user_id = current_user["id"]

        # Получить назначенные услуги
        c.execute("""
            SELECT
                s.id, s.name, s.category,
                s.price as default_price, s.duration as default_duration,
                COALESCE(us.price, s.price) as price,
                us.price_min, us.price_max,
                COALESCE(us.duration, s.duration) as duration,
                us.is_online_booking_enabled,
                us.is_calendar_enabled
            FROM services s
            JOIN user_services us ON s.id = us.service_id
            WHERE us.user_id = %s AND s.is_active = TRUE
            ORDER BY s.category, s.name
        """, (user_id,))

        services = []
        for row in c.fetchall():
            services.append({
                "id": row[0],
                "name": row[1],
                "category": row[2],
                "default_price": row[3],
                "default_duration": row[4],
                "price": row[5],
                "price_min": row[6],
                "price_max": row[7],
                "duration": row[8],
                "is_online_booking_enabled": bool(row[9]) if row[9] is not None else True,
                "is_calendar_enabled": bool(row[10]) if row[10] is not None else True
            })

        # Получить pending запросы
        c.execute("""
            SELECT service_id, request_type, requested_price, requested_duration,
                   requested_is_online_booking_enabled, requested_is_calendar_enabled,
                   employee_comment, created_at
            FROM service_change_requests
            WHERE user_id = %s AND status = 'pending'
        """, (user_id,))

        pending_requests = {}
        for row in c.fetchall():
            pending_requests[row[0]] = {
                "request_type": row[1],
                "requested_price": row[2],
                "requested_duration": row[3],
                "requested_is_online_booking_enabled": row[4],
                "requested_is_calendar_enabled": row[5],
                "employee_comment": row[6],
                "created_at": row[7].isoformat() if row[7] else None
            }

        conn.close()

        return {
            "services": services,
            "pending_requests": pending_requests
        }

    except Exception as e:
        log_error(f"Error getting my services: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/my/services/{service_id}/request-change")
async def request_service_change(
    service_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Запросить изменение своей услуги (для одобрения админом)"""
    try:
        data = await request.json()
        user_id = current_user["id"]

        conn = get_db_connection()
        c = conn.cursor()

        # Проверить, что услуга назначена этому сотруднику
        c.execute("""
            SELECT 1 FROM user_services
            WHERE user_id = %s AND service_id = %s
        """, (user_id, service_id))

        if not c.fetchone():
            conn.close()
            return JSONResponse({"error": "Service not assigned to you"}, status_code=403)

        # Проверить, нет ли уже pending запроса
        c.execute("""
            SELECT id FROM service_change_requests
            WHERE user_id = %s AND service_id = %s AND status = 'pending'
        """, (user_id, service_id))

        existing = c.fetchone()
        if existing:
            # Обновляем существующий запрос
            c.execute("""
                UPDATE service_change_requests SET
                    requested_price = %s,
                    requested_price_min = %s,
                    requested_price_max = %s,
                    requested_duration = %s,
                    requested_is_online_booking_enabled = %s,
                    requested_is_calendar_enabled = %s,
                    employee_comment = %s,
                    updated_at = %s
                WHERE id = %s
            """, (
                data.get("price"),
                data.get("price_min"),
                data.get("price_max"),
                data.get("duration"),
                data.get("is_online_booking_enabled"),
                data.get("is_calendar_enabled"),
                data.get("comment"),
                datetime.now(),
                existing[0]
            ))
        else:
            # Создаём новый запрос
            c.execute("""
                INSERT INTO service_change_requests
                (user_id, service_id, request_type,
                 requested_price, requested_price_min, requested_price_max,
                 requested_duration, requested_is_online_booking_enabled,
                 requested_is_calendar_enabled, employee_comment)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, service_id, 'update',
                data.get("price"),
                data.get("price_min"),
                data.get("price_max"),
                data.get("duration"),
                data.get("is_online_booking_enabled"),
                data.get("is_calendar_enabled"),
                data.get("comment")
            ))

        conn.commit()
        conn.close()

        log_info(f"Service change requested by user {user_id} for service {service_id}", "api")

        return {"success": True, "message": "Change request submitted for approval"}

    except Exception as e:
        log_error(f"Error requesting service change: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/my/services/{service_id}/cancel-request")
async def cancel_change_request(
    service_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Отменить свой запрос на изменение"""
    try:
        user_id = current_user["id"]
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            DELETE FROM service_change_requests
            WHERE user_id = %s AND service_id = %s AND status = 'pending'
        """, (user_id, service_id))

        affected = c.rowcount
        conn.commit()
        conn.close()

        if affected > 0:
            return {"success": True, "message": "Request cancelled"}
        else:
            return JSONResponse({"error": "No pending request found"}, status_code=404)

    except Exception as e:
        log_error(f"Error cancelling request: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/my/change-requests")
async def get_my_change_requests(
    current_user: dict = Depends(get_current_user)
):
    """Получить историю своих запросов на изменение"""
    try:
        user_id = current_user["id"]
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                scr.id, scr.service_id, s.name,
                scr.request_type, scr.status,
                scr.requested_price, scr.requested_duration,
                scr.employee_comment, scr.admin_comment,
                scr.created_at, scr.resolved_at
            FROM service_change_requests scr
            JOIN services s ON s.id = scr.service_id
            WHERE scr.user_id = %s
            ORDER BY scr.created_at DESC
            LIMIT 50
        """, (user_id,))

        requests = []
        for row in c.fetchall():
            requests.append({
                "id": row[0],
                "service_id": row[1],
                "service_name": row[2],
                "request_type": row[3],
                "status": row[4],
                "requested_price": row[5],
                "requested_duration": row[6],
                "employee_comment": row[7],
                "admin_comment": row[8],
                "created_at": row[9].isoformat() if row[9] else None,
                "resolved_at": row[10].isoformat() if row[10] else None
            })

        conn.close()
        return {"requests": requests}

    except Exception as e:
        log_error(f"Error getting change requests: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# ENDPOINTS ДЛЯ АДМИНОВ
# ============================================================================

@router.get("/admin/service-change-requests")
async def get_pending_requests(
    status: str = Query("pending"),
    current_user: dict = Depends(get_current_user)
):
    """Получить все запросы на изменение (для админа)"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT
                scr.id, scr.user_id, u.full_name,
                scr.service_id, s.name,
                scr.request_type, scr.status,
                scr.requested_price, scr.requested_price_min, scr.requested_price_max,
                scr.requested_duration,
                scr.requested_is_online_booking_enabled,
                scr.requested_is_calendar_enabled,
                scr.employee_comment,
                scr.created_at,
                us.price as current_price, us.duration as current_duration
            FROM service_change_requests scr
            JOIN users u ON u.id = scr.user_id
            JOIN services s ON s.id = scr.service_id
            LEFT JOIN user_services us ON us.user_id = scr.user_id AND us.service_id = scr.service_id
            WHERE scr.status = %s
            ORDER BY scr.created_at DESC
        """, (status,))

        requests = []
        for row in c.fetchall():
            requests.append({
                "id": row[0],
                "user_id": row[1],
                "employee_name": row[2],
                "service_id": row[3],
                "service_name": row[4],
                "request_type": row[5],
                "status": row[6],
                "requested_price": row[7],
                "requested_price_min": row[8],
                "requested_price_max": row[9],
                "requested_duration": row[10],
                "requested_is_online_booking_enabled": row[11],
                "requested_is_calendar_enabled": row[12],
                "employee_comment": row[13],
                "created_at": row[14].isoformat() if row[14] else None,
                "current_price": row[15],
                "current_duration": row[16]
            })

        conn.close()
        return {"requests": requests, "count": len(requests)}

    except Exception as e:
        log_error(f"Error getting pending requests: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/admin/service-change-requests/{request_id}/approve")
async def approve_request(
    request_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Одобрить запрос на изменение и применить изменения"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        admin_comment = data.get("comment", "")

        conn = get_db_connection()
        c = conn.cursor()

        # Получить данные запроса
        c.execute("""
            SELECT user_id, service_id, requested_price, requested_price_min,
                   requested_price_max, requested_duration,
                   requested_is_online_booking_enabled, requested_is_calendar_enabled
            FROM service_change_requests
            WHERE id = %s AND status = 'pending'
        """, (request_id,))

        req = c.fetchone()
        if not req:
            conn.close()
            return JSONResponse({"error": "Request not found or already processed"}, status_code=404)

        user_id, service_id = req[0], req[1]

        # Применить изменения к user_services
        updates = []
        params = []

        if req[2] is not None:  # requested_price
            updates.append("price = %s")
            params.append(req[2])

        if req[3] is not None:  # requested_price_min
            updates.append("price_min = %s")
            params.append(req[3])

        if req[4] is not None:  # requested_price_max
            updates.append("price_max = %s")
            params.append(req[4])

        if req[5] is not None:  # requested_duration
            updates.append("duration = %s")
            params.append(req[5])

        if req[6] is not None:  # requested_is_online_booking_enabled
            updates.append("is_online_booking_enabled = %s")
            params.append(req[6])

        if req[7] is not None:  # requested_is_calendar_enabled
            updates.append("is_calendar_enabled = %s")
            params.append(req[7])

        if updates:
            params.extend([user_id, service_id])
            c.execute(f"""
                UPDATE user_services
                SET {', '.join(updates)}
                WHERE user_id = %s AND service_id = %s
            """, params)

        # Обновить статус запроса
        c.execute("""
            UPDATE service_change_requests
            SET status = 'approved',
                admin_id = %s,
                admin_comment = %s,
                resolved_at = %s
            WHERE id = %s
        """, (current_user["id"], admin_comment, datetime.now(), request_id))

        conn.commit()
        conn.close()

        log_info(f"Service change request {request_id} approved by admin {current_user['id']}", "api")

        return {"success": True, "message": "Request approved and changes applied"}

    except Exception as e:
        log_error(f"Error approving request: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/admin/service-change-requests/{request_id}/reject")
async def reject_request(
    request_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Отклонить запрос на изменение"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        admin_comment = data.get("comment", "")

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            UPDATE service_change_requests
            SET status = 'rejected',
                admin_id = %s,
                admin_comment = %s,
                resolved_at = %s
            WHERE id = %s AND status = 'pending'
        """, (current_user["id"], admin_comment, datetime.now(), request_id))

        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Request not found or already processed"}, status_code=404)

        conn.commit()
        conn.close()

        log_info(f"Service change request {request_id} rejected by admin {current_user['id']}", "api")

        return {"success": True, "message": "Request rejected"}

    except Exception as e:
        log_error(f"Error rejecting request: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/admin/service-change-requests/count")
async def get_pending_count(
    current_user: dict = Depends(get_current_user)
):
    """Получить количество ожидающих запросов (для бейджа)"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT COUNT(*) FROM service_change_requests
            WHERE status = 'pending'
        """)

        count = c.fetchone()[0]
        conn.close()

        return {"pending_count": count}

    except Exception as e:
        log_error(f"Error getting pending count: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
