"""
API Endpoints для работы с услугами
"""
from fastapi import APIRouter, Request, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import (
    get_all_services, get_service_by_key, create_service,
    update_service, delete_service, log_activity,
    get_all_special_packages, create_special_package,
    update_special_package, delete_special_package
)
from utils.utils import require_auth
from utils.logger import log_error, log_info
import core.config as config
from db.connection import get_db_connection

router = APIRouter(tags=["Services"])


@router.get("/services")
@router.get("/services")
async def list_services(
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None)
):
    """Получить услуги"""
    user = require_auth(session_token)
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
                "name_ar": s[4] if len(s) > 4 else None,
                "price": s[5] if len(s) > 5 else 0,
                "min_price": s[6] if len(s) > 6 else None,
                "max_price": s[7] if len(s) > 7 else None,
                "currency": s[8] if len(s) > 8 else "AED",
                "category": s[9] if len(s) > 9 else "other",
                "description": s[10] if len(s) > 10 else "",
                "description_ru": s[11] if len(s) > 11 else "",
                "description_ar": s[12] if len(s) > 12 else "",
                "benefits": s[13].split('|') if len(s) > 13 and s[13] else [],
                "is_active": bool(s[14]) if len(s) > 14 and s[14] is not None else True,
                "duration": s[15] if len(s) > 15 else None,
                "position_id": s[16] if len(s) > 16 else None,
                # Additional language fields
                "name_en": s[20] if len(s) > 20 else None,
                "name_de": s[21] if len(s) > 21 else None,
                "name_es": s[22] if len(s) > 22 else None,
                "name_fr": s[23] if len(s) > 23 else None,
                "name_hi": s[24] if len(s) > 24 else None,
                "name_kk": s[25] if len(s) > 25 else None,
                "name_pt": s[26] if len(s) > 26 else None,
                "description_en": s[27] if len(s) > 27 else "",
                "description_de": s[28] if len(s) > 28 else "",
                "description_es": s[29] if len(s) > 29 else "",
                "description_fr": s[30] if len(s) > 30 else "",
                "description_hi": s[31] if len(s) > 31 else "",
                "description_kk": s[32] if len(s) > 32 else "",
                "description_pt": s[33] if len(s) > 33 else "",
            }
            for s in services
        ],
        "count": len(services)
    }


@router.get("/services/{service_key}/price")
async def get_service_price(
    service_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить цену услуги по ключу"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    service = get_service_by_key(service_key)

    if not service:
        return JSONResponse({"error": "Service not found"}, status_code=404)

    return {
        "service_key": service[1],
        "name": service[2],
        "name_ru": service[3] if len(service) > 3 else service[2],
        "price": service[5] if len(service) > 5 else 0,
        "currency": service[6] if len(service) > 6 else "AED"
    }


@router.post("/services")
async def create_service_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новую услугу"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        success = create_service(
            service_key=data.get('key'),
            name=data.get('name'),
            name_ru=data.get('name_ru'),
            name_ar=data.get('name_ar'),
            price=float(data.get('price', 0)),
            currency=data.get('currency', 'AED'),
            category=data.get('category'),
            description=data.get('description'),
            description_ru=data.get('description_ru'),
            description_ar=data.get('description_ar'),
            benefits=data.get('benefits', []),
            position_id=data.get('position_id')
        )

        if success:
            log_activity(user["id"], "create_service", "service",
                         data.get('key'), "Service created")
            return {"success": True, "message": "Service created"}
        else:
            return JSONResponse({"error": "Service key already exists"},
                                status_code=400)
    except Exception as e:
        log_error(f"Error creating service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/services/{service_id}/update")
async def update_service_api(
    service_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить услугу"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        # Логируем данные для отладки
        log_info(f"Updating service {service_id} with data: {data}", "api")

        update_service(service_id, **data)
        log_activity(user["id"], "update_service", "service",
                     str(service_id), f"Service updated: {data}")
        return {"success": True, "message": "Service updated"}
    except Exception as e:
        log_error(f"Error updating service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


# backend/api/services.py - ПОЛНОСТЬЮ ЗАМЕНИТЕ функцию toggle_service_status

@router.post("/services/{service_id}/toggle-status")
async def toggle_service_status(
    service_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Переключить статус услуги (активна/неактивна)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        import sqlite3
        from core.config import DATABASE_NAME
        from datetime import datetime
        
        log_info(f"🔄 API: Toggle request for service {service_id}", "api")
        
        # Прямой доступ к БД
        conn = get_db_connection()
        c = conn.cursor()
        
        # Получаем текущий статус
        c.execute("SELECT is_active FROM services WHERE id = ?", (service_id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            return JSONResponse({"error": "Service not found"}, status_code=404)
        
        current_status = bool(result[0])
        new_status = not current_status
        new_status_int = 1 if new_status else 0
        
        log_info(f"🔄 API: Toggling service {service_id}: {current_status} → {new_status}", "api")
        
        # Обновляем напрямую
        c.execute(
            "UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?",
            (new_status_int, datetime.now().isoformat(), service_id)
        )
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Failed to update service"}, status_code=500)
        
        conn.commit()
        
        # Проверяем результат
        c.execute("SELECT is_active FROM services WHERE id = ?", (service_id,))
        updated = c.fetchone()
        final_status = bool(updated[0]) if updated else None
        
        conn.close()
        
        log_info(f"✅ API: Service {service_id} updated: is_active = {final_status}", "api")
        
        log_activity(user["id"], "toggle_service_status", "service", 
                    str(service_id), f"Status changed to {'active' if final_status else 'inactive'}")
        
        return {
            "success": True,
            "message": f"Service {'activated' if final_status else 'deactivated'}",
            "is_active": final_status
        }
        
    except Exception as e:
        log_error(f"❌ API: Error toggling service status: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/services/{service_id}/delete")
async def delete_service_api(
    service_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить услугу"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        delete_service(service_id)
        log_activity(user["id"], "delete_service", "service",
                     str(service_id), "Service deleted")
        return {"success": True, "message": "Service deleted"}
    except Exception as e:
        log_error(f"Error deleting service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


# ===== СПЕЦИАЛЬНЫЕ ПАКЕТЫ =====

@router.get("/services/special-packages")
async def list_special_packages(
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None)
):
    """Получить специальные пакеты"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    packages = get_all_special_packages(active_only=active_only)

    return {
        "packages": [
            {
                "id": p[0],
                "name": p[1],
                "name_ru": p[2],
                "description": p[3],
                "description_ru": p[4],
                "original_price": p[5],
                "special_price": p[6],
                "currency": p[7],
                "discount_percent": p[8],
                "services_included": p[9].split(',') if p[9] else [],
                "promo_code": p[10],
                "keywords": p[11].split(',') if p[11] else [],
                "valid_from": p[12],
                "valid_until": p[13],
                "is_active": p[14],
                "usage_count": p[15],
                "max_usage": p[16]
            }
            for p in packages
        ],
        "count": len(packages)
    }


@router.post("/services/special-packages")
async def create_special_package_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать специальный пакет"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        package_id = create_special_package(
            name=data.get('name'),
            name_ru=data.get('name_ru'),
            original_price=float(data.get('original_price')),
            special_price=float(data.get('special_price')),
            currency=data.get('currency', 'AED'),
            keywords=data.get('keywords', []),
            valid_from=data.get('valid_from'),
            valid_until=data.get('valid_until'),
            description=data.get('description'),
            description_ru=data.get('description_ru'),
            services_included=data.get('services_included', []),
            promo_code=data.get('promo_code'),
            max_usage=data.get('max_usage')
        )

        if package_id:
            log_activity(user["id"], "create_special_package", "package",
                         str(package_id), "Package created")
            return {"success": True, "message": "Package created", "id": package_id}
        else:
            return JSONResponse({"error": "Failed to create package"},
                                status_code=400)
    except Exception as e:
        log_error(f"Error creating package: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/services/special-packages/{package_id}")
async def update_special_package_api(
    package_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить специальный пакет"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        update_special_package(package_id, **data)
        log_activity(user["id"], "update_special_package", "package",
                     str(package_id), "Package updated")
        return {"success": True, "message": "Package updated"}
    except Exception as e:
        log_error(f"Error updating package: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.delete("/services/special-packages/{package_id}")
async def delete_special_package_api(
    package_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить специальный пакет"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        delete_special_package(package_id)
        log_activity(user["id"], "delete_special_package", "package",
                     str(package_id), "Package deleted")
        return {"success": True, "message": "Package deleted"}
    except Exception as e:
        log_error(f"Error deleting package: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)
