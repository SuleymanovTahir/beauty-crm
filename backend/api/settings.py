"""
API Endpoints для настроек салона и бота
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import (
    get_salon_settings, update_salon_settings,
    get_bot_settings, update_bot_settings, log_activity,
    get_custom_statuses, create_custom_status,
    delete_custom_status, update_custom_status
)
from utils import require_auth
from logger import log_error, log_info
from bot import get_bot

router = APIRouter(tags=["Settings"])


# ===== НАСТРОЙКИ САЛОНА =====

@router.get("/settings/salon")
async def get_salon_settings_api(session_token: Optional[str] = Cookie(None)):
    """Получить настройки салона"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        settings = get_salon_settings()
        return settings
    except Exception as e:
        log_error(f"Ошибка получения настроек салона: {e}", "api")
        return JSONResponse(
            {"error": str(e), "message": "Запустите init_settings.py"}, 
            status_code=500
        )


@router.post("/settings/salon")
async def update_salon_settings_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки салона (только admin)"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    success = update_salon_settings(data)
    
    if success:
        log_activity(user["id"], "update_salon_settings", "settings", "salon", 
                    "Salon settings updated")
        return {"success": True, "message": "Salon settings updated"}
    else:
        return JSONResponse({"error": "Update failed"}, status_code=400)


# ===== НАСТРОЙКИ БОТА =====

@router.get("/settings/bot")  # ✅ НЕ /api/settings/bot
async def get_bot_settings_api(session_token: Optional[str] = Cookie(None)):
    """Получить настройки бота"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        settings = get_bot_settings()
        log_info(f"✅ Bot settings returned: {len(settings)} fields", "api")
        return settings
    except Exception as e:
        log_error(f"❌ Ошибка получения настроек бота: {e}", "api")
        import traceback
        log_error(traceback.format_exc(), "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/settings/bot")  # ✅ НЕ /api/settings/bot
async def update_bot_settings_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки бота"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    success = update_bot_settings(data)
    
    if success:
        log_activity(user["id"], "update_bot_settings", "bot", "general", 
                    "Bot settings updated")
        return {"success": True, "message": "Bot settings updated"}
    else:
        return JSONResponse({"error": "Update failed"}, status_code=500)

@router.post("/settings/bot/reload")
async def reload_bot_settings(session_token: Optional[str] = Cookie(None)):
    """Перезагрузить настройки бота из БД"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        bot = get_bot()
        bot.reload_settings()
        
        log_info("Настройки бота перезагружены", "api")
        
        return {
            "success": True,
            "message": "Настройки бота перезагружены из БД",
            "salon": bot.salon['name']
        }
    except Exception as e:
        log_error(f"Ошибка перезагрузки настроек: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


# ===== КАСТОМНЫЕ СТАТУСЫ =====

@router.get("/settings/statuses")
async def list_custom_statuses(session_token: Optional[str] = Cookie(None)):
    """Получить все кастомные статусы"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    statuses = get_custom_statuses()
    
    return {
        "statuses": [
            {
                "id": s[0],
                "key": s[1],
                "label": s[2],
                "color": s[3],
                "icon": s[4],
                "created_at": s[5]
            }
            for s in statuses
        ],
        "count": len(statuses)
    }


@router.post("/settings/statuses")
async def create_custom_status_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать кастомный статус"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    success = create_custom_status(
        status_key=data.get('key'),
        status_label=data.get('label'),
        status_color=data.get('color'),
        status_icon=data.get('icon'),
        created_by=user["id"]
    )
    
    if success:
        log_activity(user["id"], "create_status", "status", data.get('key'), 
                    "Status created")
        return {"success": True, "message": "Status created"}
    else:
        return JSONResponse({"error": "Status key already exists"}, 
                          status_code=400)


@router.post("/settings/statuses/{status_key}/update")
async def update_custom_status_api(
    status_key: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить кастомный статус"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    success = update_custom_status(
        status_key=status_key,
        status_label=data.get('label'),
        status_color=data.get('color'),
        status_icon=data.get('icon')
    )
    
    if success:
        log_activity(user["id"], "update_status", "status", status_key, 
                    "Status updated")
        return {"success": True, "message": "Status updated"}
    else:
        return JSONResponse({"error": "Update failed"}, status_code=400)


@router.post("/settings/statuses/{status_key}/delete")
async def delete_custom_status_api(
    status_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить кастомный статус"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    success = delete_custom_status(status_key)
    
    if success:
        log_activity(user["id"], "delete_status", "status", status_key, 
                    "Status deleted")
        return {"success": True, "message": "Status deleted"}
    else:
        return JSONResponse({"error": "Delete failed"}, status_code=400)


# backend/api/settings.py - ДОБАВЬТЕ В КОНЕЦ ФАЙЛА (после строки 237)

# ===== АЛЬТЕРНАТИВНЫЕ ЭНДПОИНТЫ (для обратной совместимости) =====

# ===== АЛЬТЕРНАТИВНЫЕ ЭНДПОИНТЫ (для обратной совместимости) =====

@router.get("/bot-settings")
async def get_bot_settings_legacy(session_token: Optional[str] = Cookie(None)):
    """Получить настройки бота (альтернативный путь)"""
    return await get_bot_settings_api(session_token)


@router.post("/bot-settings")
async def update_bot_settings_legacy(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки бота (альтернативный путь)"""
    return await update_bot_settings_api(request, session_token)


@router.post("/bot-settings/reload")
async def reload_bot_settings_legacy(session_token: Optional[str] = Cookie(None)):
    """Перезагрузить настройки бота (альтернативный путь)"""
    return await reload_bot_settings(session_token)


# ===== SALON SETTINGS ENDPOINTS =====

@router.get("/salon-settings")
async def get_salon_settings_legacy(session_token: Optional[str] = Cookie(None)):
    """Получить настройки салона (альтернативный путь)"""
    return await get_salon_settings_api(session_token)


@router.post("/salon-settings")
async def update_salon_settings_legacy(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки салона (альтернативный путь)"""
    return await update_salon_settings_api(request, session_token)