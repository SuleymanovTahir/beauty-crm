"""
API для работы с мастерами
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db.masters import (
    get_all_masters, get_master_by_id, create_master,
    update_master, add_master_time_off, get_master_time_off,
    delete_master_time_off, add_salon_holiday, get_salon_holidays,
    delete_salon_holiday
)
from utils import require_auth
from logger import log_error, log_info

router = APIRouter(tags=["Masters"])


@router.get("/masters")
async def list_masters(session_token: Optional[str] = Cookie(None)):
    """Получить всех мастеров"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    masters = get_all_masters()
    
    return {
        "masters": [
            {
                "id": m[0],
                "name": m[1],
                "phone": m[2],
                "specialization": m[3],
                "services": m[4].split(',') if m[4] else [],
                "is_active": bool(m[5])
            } for m in masters
        ]
    }


@router.post("/masters/{master_id}/time-off")
async def add_time_off(
    master_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить выходной мастеру"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        
        time_off_id = add_master_time_off(
            master_id,
            data['date_from'],
            data['date_to'],
            data.get('reason')
        )
        
        log_info(f"Added time off for master {master_id}", "api")
        
        return {"success": True, "time_off_id": time_off_id}
    except Exception as e:
        log_error(f"Error adding time off: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/masters/{master_id}/time-off")
async def get_time_off(
    master_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить выходные мастера"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    time_offs = get_master_time_off(master_id)
    
    return {
        "time_offs": [
            {
                "id": t[0],
                "date_from": t[2],
                "date_to": t[3],
                "reason": t[4]
            } for t in time_offs
        ]
    }


@router.delete("/masters/time-off/{time_off_id}")
async def remove_time_off(
    time_off_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить выходной"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    delete_master_time_off(time_off_id)
    
    return {"success": True}


@router.post("/salon/holidays")
async def add_holiday(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить выходной салона"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        
        success = add_salon_holiday(data['date'], data.get('name'))
        
        if success:
            log_info(f"Added salon holiday: {data['date']}", "api")
            return {"success": True}
        else:
            return JSONResponse({"error": "Holiday already exists"}, status_code=400)
    except Exception as e:
        log_error(f"Error adding holiday: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/salon/holidays")
async def list_holidays(session_token: Optional[str] = Cookie(None)):
    """Получить выходные салона"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    holidays = get_salon_holidays()
    
    return {
        "holidays": [
            {
                "id": h[0],
                "date": h[1],
                "name": h[2]
            } for h in holidays
        ]
    }


@router.delete("/salon/holidays/{date}")
async def remove_holiday(
    date: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить выходной салона"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    delete_salon_holiday(date)
    
    return {"success": True}