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
from utils import require_auth
from logger import log_error

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("")
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


@router.get("/{service_key}/price")
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


@router.post("")
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
            price=float(data.get('price', 0)),
            currency=data.get('currency', 'AED'),
            category=data.get('category'),
            description=data.get('description'),
            description_ru=data.get('description_ru'),
            benefits=data.get('benefits', [])
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


@router.post("/{service_id}/update")
async def update_service_api(
    service_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить услугу"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    try:
        update_service(service_id, **data)
        log_activity(user["id"], "update_service", "service", 
                    str(service_id), "Service updated")
        return {"success": True, "message": "Service updated"}
    except Exception as e:
        log_error(f"Error updating service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/{service_id}/delete")
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

@router.get("/special-packages")
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


@router.post("/special-packages")
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


@router.post("/special-packages/{package_id}")
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


@router.delete("/special-packages/{package_id}")
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