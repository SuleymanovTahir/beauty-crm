# backend/api.py - REST API endpoints для React фронтенда
# Чистый FastAPI без HTML templates

from fastapi import APIRouter, Request, Query, Cookie, HTTPException, Form
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
from datetime import datetime
import csv
import io

# ===== ИМПОРТЫ =====
from logger import logger, log_info, log_error, log_warning
from database import (
    get_all_clients, get_client_by_id, get_all_bookings, 
    update_client_info, update_client_status, pin_client,
    get_chat_history, mark_messages_as_read, save_message,
    get_all_messages, get_stats, get_analytics_data, get_funnel_data,
    get_all_services, update_booking_status, log_activity,
    get_unread_messages_count, get_or_create_client, save_booking,
    get_all_users, delete_user, create_custom_status, delete_custom_status,
    get_custom_statuses, create_service, update_service, delete_service
)
from config import CLIENT_STATUSES, SALON_INFO, DATABASE_NAME
from instagram import send_message

router = APIRouter(prefix="/api", tags=["API"])


# ===== MIDDLEWARE АВТОРИЗАЦИИ =====
async def require_auth(session_token: Optional[str] = Cookie(None)):
    """Проверить авторизацию"""
    if not session_token:
        return None
    from database import get_user_by_session
    return get_user_by_session(session_token)


def get_total_unread():
    """Получить общее кол-во непрочитанных"""
    clients = get_all_clients()
    return sum(get_unread_messages_count(c[0]) for c in clients)


def get_all_statuses():
    """Получить все статусы"""
    statuses = CLIENT_STATUSES.copy()
    for status in get_custom_statuses():
        statuses[status[1]] = {
            "label": status[2],
            "color": status[3],
            "icon": status[4]
        }
    return statuses


def get_client_display_name(client):
    """Форматировать имя клиента"""
    if client[3]:  # name
        return client[3]
    elif client[1]:  # username
        return f"@{client[1]}"
    else:
        return client[0][:15] + "..."


# ===== ОСНОВНЫЕ API ENDPOINTS =====

@router.get("/api/dashboard")
async def get_dashboard(session_token: Optional[str] = Cookie(None)):
    """Получить данные дашборда"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    stats = get_stats()
    analytics = get_analytics_data()
    funnel = get_funnel_data()
    
    return {
        "stats": stats,
        "analytics": analytics,
        "funnel": funnel,
        "unread_count": get_total_unread()
    }


# ===== КЛИЕНТЫ =====

@router.get("/clients")
async def list_clients(session_token: Optional[str] = Cookie(None)):
    """Получить всех клиентов"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    clients = get_all_clients()
    return {
        "clients": [
            {
                "id": c[0],
                "instagram_id": c[0],
                "username": c[1],
                "phone": c[2],
                "name": c[3],
                "display_name": get_client_display_name(c),
                "first_contact": c[4],
                "last_contact": c[5],
                "total_messages": c[6],
                "status": c[8] if len(c) > 8 else "new",
                "lifetime_value": c[9] if len(c) > 9 else 0,
                "profile_pic": c[10] if len(c) > 10 else None,
                "notes": c[11] if len(c) > 11 else "",
                "is_pinned": c[12] if len(c) > 12 else 0
            }
            for c in clients
        ],
        "count": len(clients),
        "unread_count": get_total_unread()
    }


@router.get("/clients/{client_id}")
async def get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    """Получить деталь клиента"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    client = get_client_by_id(client_id)
    if not client:
        return JSONResponse({"error": "Client not found"}, status_code=404)
    
    history = get_chat_history(client_id, limit=50)
    bookings = [b for b in get_all_bookings() if b[1] == client_id]
    
    return {
        "client": {
            "id": client[0],
            "username": client[1],
            "phone": client[2],
            "name": client[3],
            "first_contact": client[4],
            "last_contact": client[5],
            "total_messages": client[6],
            "status": client[8] if len(client) > 8 else "new",
            "lifetime_value": client[9] if len(client) > 9 else 0,
            "notes": client[11] if len(client) > 11 else ""
        },
        "chat_history": [
            {
                "message": msg[0],
                "sender": msg[1],
                "timestamp": msg[2],
                "type": msg[3] if len(msg) > 3 else "text"
            }
            for msg in history
        ],
        "bookings": [
            {
                "id": b[0],
                "service": b[2],
                "datetime": b[3],
                "phone": b[4],
                "status": b[6]
            }
            for b in bookings
        ]
    }


@router.post("/clients/{client_id}/status")
async def update_client_status_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить статус клиента"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    status = data.get('status')
    
    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)
    
    update_client_status(client_id, status)
    log_activity(user["id"], "update_client_status", "client", client_id, f"Status: {status}")
    
    return {"success": True, "message": "Client status updated"}


@router.post("/clients/{client_id}/update")
async def update_client_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить информацию клиента"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    success = update_client_info(
        client_id,
        name=data.get('name'),
        phone=data.get('phone'),
        notes=data.get('notes')
    )
    
    if success:
        log_activity(user["id"], "update_client_info", "client", client_id, "Info updated")
        return {"success": True, "message": "Client updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)


@router.post("/clients/{client_id}/pin")
async def pin_client_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Закрепить/открепить клиента"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    client = get_client_by_id(client_id)
    if not client:
        return JSONResponse({"error": "Client not found"}, status_code=404)
    
    is_pinned = client[12] if len(client) > 12 else 0
    pin_client(client_id, not is_pinned)
    
    log_activity(user["id"], "pin_client", "client", client_id, 
                 f"{'Pinned' if not is_pinned else 'Unpinned'}")
    
    return {
        "success": True,
        "pinned": not is_pinned,
        "message": "Pinned" if not is_pinned else "Unpinned"
    }


# ===== ЗАПИСИ =====

@router.get("/bookings")
async def list_bookings(session_token: Optional[str] = Cookie(None)):
    """Получить все записи"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    bookings = get_all_bookings()
    return {
        "bookings": [
            {
                "id": b[0],
                "client_id": b[1],
                "service": b[2],
                "datetime": b[3],
                "phone": b[4],
                "name": b[5],
                "status": b[6],
                "created_at": b[7],
                "revenue": b[8] if len(b) > 8 else 0
            }
            for b in bookings
        ],
        "count": len(bookings)
    }


@router.post("/bookings")
async def create_booking_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать запись"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    
    try:
        instagram_id = data.get('instagram_id')
        service = data.get('service')
        datetime_str = f"{data.get('date')} {data.get('time')}"
        phone = data.get('phone')
        name = data.get('name')
        
        get_or_create_client(instagram_id, username=name)
        save_booking(instagram_id, service, datetime_str, phone, name)
        
        log_activity(user["id"], "create_booking", "booking", instagram_id, f"Service: {service}")
        
        return {"success": True, "message": "Booking created"}
    except Exception as e:
        log_error(f"Booking creation error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/bookings/{booking_id}/status")
async def update_booking_status_api(
    booking_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить статус записи"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    status = data.get('status')
    
    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)
    
    success = update_booking_status(booking_id, status)
    if success:
        log_activity(user["id"], "update_booking_status", "booking", str(booking_id), f"Status: {status}")
        return {"success": True, "message": "Booking status updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)


# ===== ЧАТ =====

@router.get("/chat/messages")
async def get_chat_messages(
    client_id: str = Query(...),
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения чата"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    messages_raw = get_chat_history(client_id, limit=limit)
    mark_messages_as_read(client_id, user["id"])
    
    return {
        "messages": [
            {
                "id": msg[4] if len(msg) > 4 else None,
                "message": msg[0],
                "sender": msg[1],
                "timestamp": msg[2],
                "type": msg[3] if len(msg) > 3 else "text"
            }
            for msg in messages_raw
        ]
    }


@router.post("/chat/send")
async def send_chat_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение клиенту"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    instagram_id = data.get('instagram_id')
    message = data.get('message')
    
    if not instagram_id or not message:
        return JSONResponse({"error": "Missing data"}, status_code=400)
    
    result = await send_message(instagram_id, message)
    
    if "error" not in result:
        save_message(instagram_id, message, "bot")
        log_activity(user["id"], "send_message", "client", instagram_id, f"Message sent")
        return {"success": True, "message": "Message sent"}
    
    return JSONResponse({"error": "Send failed"}, status_code=500)


# ===== АНАЛИТИКА =====

@router.get("/analytics")
async def get_analytics_api(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить аналитику"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if date_from and date_to:
        return get_analytics_data(date_from=date_from, date_to=date_to)
    else:
        return get_analytics_data(days=period)


@router.get("/funnel")
async def get_funnel_api(session_token: Optional[str] = Cookie(None)):
    """Получить данные воронки"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_funnel_data()


@router.get("/stats")
async def get_stats_api(session_token: Optional[str] = Cookie(None)):
    """Получить статистику"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_stats()


# ===== УСЛУГИ =====

@router.get("/services")
async def list_services(
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None)
):
    """Получить услуги"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    services = get_all_services(active_only=active_only)
    
    return {
        "services": [
            {
                "id": s[0],
                "key": s[1],
                "name": s[2],
                "name_ru": s[3] if len(s) > 3 else s[2],
                "price": s[5] if len(s) > 5 else 0,
                "currency": s[6] if len(s) > 6 else "AED",
                "category": s[7] if len(s) > 7 else "other",
                "description": s[8] if len(s) > 8 else "",
                "is_active": s[12] if len(s) > 12 else True
            }
            for s in services
        ],
        "count": len(services)
    }


# ===== ПОЛЬЗОВАТЕЛИ =====

@router.get("/users")
async def list_users(session_token: Optional[str] = Cookie(None)):
    """Получить пользователей (только для admin)"""
    user = await require_auth(session_token)
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


@router.post("/users/{user_id}/delete")
async def delete_user_api(
    user_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить пользователя"""
    user = await require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    if user["id"] == user_id:
        return JSONResponse({"error": "Cannot delete yourself"}, status_code=400)
    
    success = delete_user(user_id)
    
    if success:
        log_activity(user["id"], "delete_user", "user", str(user_id), "User deleted")
        return {"success": True, "message": "User deleted"}
    
    return JSONResponse({"error": "Delete failed"}, status_code=400)


# ===== ЭКСПОРТ =====

@router.get("/export/clients")
async def export_clients(
    format: str = Query("csv"),
    session_token: Optional[str] = Cookie(None)
):
    """Экспортировать клиентов"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if format != "csv":
        return JSONResponse({"error": "Only CSV supported in API"}, status_code=400)
    
    clients = get_all_clients()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'Name', 'Username', 'Phone', 'Status', 'Messages', 'LTV'])
    for c in clients:
        writer.writerow([c[0], c[3] or '', c[1] or '', c[2] or '', c[8], c[6], c[9]])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue().encode('utf-8')]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=clients_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/unread-count")
async def get_unread_count(session_token: Optional[str] = Cookie(None)):
    """Получить количество непрочитанных"""
    user = await require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return {"count": get_total_unread()}