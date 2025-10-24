"""
API Endpoints для работы с клиентами
"""
from fastapi import APIRouter, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import time

from db import (
    get_all_clients, get_client_by_id, get_or_create_client,
    update_client_info, update_client_status, pin_client,
    delete_client, get_chat_history, get_all_bookings,
    log_activity
)
from utils import require_auth, get_total_unread, get_client_display_name
from logger import log_error

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("")
async def list_clients(session_token: Optional[str] = Cookie(None)):
    """Получить всех клиентов"""
    user = require_auth(session_token)
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


@router.get("/{client_id}")
async def get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    """Получить детальную информацию о клиенте"""
    user = require_auth(session_token)
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
                "status": b[6],
                "revenue": b[8] if len(b) > 8 else 0
            }
            for b in bookings
        ]
    }


@router.post("")
async def create_client_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать нового клиента вручную"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    try:
        instagram_id = data.get('instagram_id') or f"manual_{int(time.time())}"
        get_or_create_client(instagram_id, username=data.get('name'))
        
        if data.get('phone') or data.get('notes') or data.get('name'):
            update_client_info(
                instagram_id,
                name=data.get('name'),
                phone=data.get('phone'),
                notes=data.get('notes')
            )
        
        log_activity(user["id"], "create_client", "client", instagram_id, 
                    f"Client: {data.get('name')}")
        return {"success": True, "message": "Client created", "id": instagram_id}
    except Exception as e:
        log_error(f"Error creating client: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/{client_id}/update")
async def update_client_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить информацию клиента"""
    user = require_auth(session_token)
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
        log_activity(user["id"], "update_client_info", "client", 
                    client_id, "Info updated")
        return {"success": True, "message": "Client updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)


@router.post("/{client_id}/status")
async def update_client_status_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить статус клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    status = data.get('status')
    
    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)
    
    update_client_status(client_id, status)
    log_activity(user["id"], "update_client_status", "client", 
                client_id, f"Status: {status}")
    
    return {"success": True, "message": "Client status updated"}


@router.post("/{client_id}/pin")
async def pin_client_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Закрепить/открепить клиента"""
    user = require_auth(session_token)
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


@router.post("/{client_id}/delete")
async def delete_client_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        success = delete_client(client_id)
        if success:
            log_activity(user["id"], "delete_client", "client", 
                        client_id, "Client deleted")
            return {"success": True, "message": "Client deleted"}
        else:
            return JSONResponse({"error": "Client not found"}, 
                              status_code=404)
    except Exception as e:
        log_error(f"Error deleting client: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)