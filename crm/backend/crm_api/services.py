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
    update_special_package, delete_special_package, get_special_package_by_id
)
from utils.utils import require_auth
from utils.logger import log_error, log_info
from utils.currency import get_salon_currency
import core.config as config
from db.connection import get_db_connection

router = APIRouter(tags=["Services"])

@router.get("/services")
async def list_services(
    active_only: bool = Query(True),
    language: str = Query('ru'),
    session_token: Optional[str] = Cookie(None)
):
    """Получить услуги"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Попытка получить из кэша
    from utils.cache import cache
    cache_key = f"services_list_{active_only}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    import time
    start_time = time.time()
    services = get_all_services(active_only=active_only)
    duration = time.time() - start_time
    log_info(f"⏱️ get_all_services took {duration:.4f}s returning {len(services)} items", "perf")
    
    # Column indexes: 0:id, 1:service_key, 2:name, 3:category, 4:price,
    # 5:min_price, 6:max_price, 7:currency, 8:duration, 9:description,
    # 10:benefits, 11:is_active, 12:position_id
    result = {
        "services": [
            {
                "id": s[0],
                "key": s[1],
                "name": s[2],
                "category": s[3],
                "price": s[4] or 0,
                "min_price": s[5],
                "max_price": s[6],
                "currency": s[7] or get_salon_currency(),
                "duration": s[8],
                "description": s[9] or "",
                "benefits": s[10].split('|') if s[10] else [],
                "is_active": bool(s[11]) if s[11] is not None else True,
                "position_id": s[12],
            }
            for s in services
        ],
        "count": len(services)
    }

    # Сохраняем в кэш на 1 час
    cache.set(cache_key, result, expire=3600)
    
    return result

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
        "price": service[4] if len(service) > 4 else 0,
        "currency": service[7] if len(service) > 7 else get_salon_currency()
    }

@router.post("/services")
async def create_service_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новую услугу"""
    user = require_auth(session_token)
    # Позволяем администраторам и директорам создавать услуги
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        success = create_service(
            service_key=data.get('key'),
            name=data.get('name'),
            price=float(data.get('price', 0)),
            currency=data.get('currency', get_salon_currency()),
            category=data.get('category'),
            description=data.get('description'),
            benefits=data.get('benefits', []),
            position_id=data.get('position_id')
        )

        if success:
            log_activity(user["id"], "create_service", "service",
                         data.get('key'), "Service created")
            
            # Инвалидация кэша
            from utils.cache import cache
            cache.clear_by_pattern("services_list_*")
            
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
    # Позволяем администраторам, менеджерам и директорам изменять услуги
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        # Логируем данные для отладки
        log_info(f"Updating service {service_id} with data: {data}", "api")

        update_service(service_id, **data)
        log_activity(user["id"], "update_service", "service",
                     str(service_id), f"Service updated: {data}")
        
        # Инвалидация кэша
        from utils.cache import cache
        cache.clear_by_pattern("services_list_*")
        
        return {"success": True, "message": "Service updated"}
    except Exception as e:
        log_error(f"Error updating service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/services/{service_id}/toggle-status")
async def toggle_service_status(
    service_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Переключить статус услуги (активна/неактивна)"""
    user = require_auth(session_token)
    # Позволяем администраторам, менеджерам и директорам переключать статус
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        from core.config import DATABASE_NAME
        from datetime import datetime
        
        log_info(f"🔄 API: Toggle request for service {service_id}", "api")
        
        # Прямой доступ к БД
        conn = get_db_connection()
        c = conn.cursor()
        
        # Получаем текущий статус
        c.execute("SELECT is_active FROM services WHERE id = %s", (service_id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            return JSONResponse({"error": "Service not found"}, status_code=404)
        
        current_status = bool(result[0])
        new_status = not current_status
        new_status_int = True if new_status else False
        
        log_info(f"🔄 API: Toggling service {service_id}: {current_status} → {new_status}", "api")
        
        # Обновляем напрямую
        c.execute(
            "UPDATE services SET is_active = %s, updated_at = %s WHERE id = %s",
            (new_status_int, datetime.now().isoformat(), service_id)
        )
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Failed to update service"}, status_code=500)
        
        conn.commit()
        
        # Инвалидация кэша
        from utils.cache import cache
        cache.clear_by_pattern("services_list_*")
        
        # Проверяем результат
        c.execute("SELECT is_active FROM services WHERE id = %s", (service_id,))
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
    # Позволяем только администраторам и директорам удалять услуги
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        delete_service(service_id)
        log_activity(user["id"], "delete_service", "service",
                     str(service_id), "Service deleted")
        
        # Инвалидация кэша
        from utils.cache import cache
        cache.clear_by_pattern("services_list_*")
        
        return {"success": True, "message": "Service deleted"}
    except Exception as e:
        log_error(f"Error deleting service: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

# ===== СПЕЦИАЛЬНЫЕ ПАКЕТЫ =====

from utils.permissions import require_permission

@router.get("/services/special-packages")
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
                "description": p[2],
                "original_price": p[3],
                "special_price": p[4],
                "currency": p[5],
                "discount_percent": p[6],
                "services_included": p[7].split(',') if p[7] else [],
                "promo_code": p[8],
                "keywords": p[9].split(',') if p[9] else [],
                "valid_from": p[10],
                "valid_until": p[11],
                "is_active": p[12],
                "usage_count": p[13],
                "max_usage": p[14]
            }
            for p in packages
        ],
        "count": len(packages)
    }

@router.post("/services/special-packages")
@require_permission("settings_edit_loyalty")
async def create_special_package_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать специальный пакет"""
    # Auth check handled by decorator
    user = require_auth(session_token) 
    
    data = await request.json()

    try:
        original_price = float(data.get('original_price'))
        special_price = float(data.get('special_price'))
        if original_price <= 0 or special_price < 0 or special_price >= original_price:
            return JSONResponse({"error": "Invalid price range"}, status_code=400)

        valid_from = data.get('valid_from')
        valid_until = data.get('valid_until')
        if not isinstance(valid_from, str) or len(valid_from) == 0:
            return JSONResponse({"error": "valid_from is required"}, status_code=400)
        if not isinstance(valid_until, str) or len(valid_until) == 0:
            return JSONResponse({"error": "valid_until is required"}, status_code=400)
        if valid_until < valid_from:
            return JSONResponse({"error": "valid_until must be after valid_from"}, status_code=400)

        package_id = create_special_package(
            name=data.get('name'),
            original_price=original_price,
            special_price=special_price,
            currency=data.get('currency', get_salon_currency()),
            keywords=data.get('keywords', []),
            valid_from=valid_from,
            valid_until=valid_until,
            description=data.get('description'),
            services_included=data.get('services_included', []),
            promo_code=data.get('promo_code'),
            max_usage=data.get('max_usage'),
            scheduled=data.get('scheduled', False),
            schedule_date=data.get('schedule_date'),
            schedule_time=data.get('schedule_time'),
            auto_activate=data.get('auto_activate', False),
            auto_deactivate=data.get('auto_deactivate', False)
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
@require_permission("settings_edit_loyalty")
async def update_special_package_api(
    package_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить специальный пакет"""
    user = require_auth(session_token)

    data = await request.json()

    try:
        if 'original_price' in data or 'special_price' in data or 'valid_from' in data or 'valid_until' in data:
            existing_package = get_special_package_by_id(package_id)
            if not existing_package:
                return JSONResponse({"error": "Package not found"}, status_code=404)

            def resolve_price(raw_value, fallback_value):
                if raw_value is None:
                    return float(fallback_value)
                if isinstance(raw_value, str) and len(raw_value.strip()) == 0:
                    return float(fallback_value)
                return float(raw_value)

            resolved_original_price = resolve_price(data.get('original_price'), existing_package[3])
            resolved_special_price = resolve_price(data.get('special_price'), existing_package[4])

            if resolved_original_price <= 0 or resolved_special_price < 0 or resolved_special_price >= resolved_original_price:
                return JSONResponse({"error": "Invalid price range"}, status_code=400)

            resolved_valid_from = data.get('valid_from', existing_package[10])
            resolved_valid_until = data.get('valid_until', existing_package[11])
            if isinstance(resolved_valid_from, str) and isinstance(resolved_valid_until, str):
                if len(resolved_valid_from) > 0 and len(resolved_valid_until) > 0 and resolved_valid_until < resolved_valid_from:
                    return JSONResponse({"error": "valid_until must be after valid_from"}, status_code=400)

        update_special_package(package_id, **data)
        log_activity(user["id"], "update_special_package", "package",
                     str(package_id), "Package updated")
        return {"success": True, "message": "Package updated"}
    except Exception as e:
        log_error(f"Error updating package: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.delete("/services/special-packages/{package_id}")
@require_permission("settings_edit_loyalty")
async def delete_special_package_api(
    package_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить специальный пакет"""
    user = require_auth(session_token)

    try:
        delete_special_package(package_id)
        log_activity(user["id"], "delete_special_package", "package",
                     str(package_id), "Package deleted")
        return {"success": True, "message": "Package deleted"}
    except Exception as e:
        log_error(f"Error deleting package: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.get("/services/{service_id}/positions")
async def get_service_positions(
    service_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить должности для услуги"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT p.id, p.name
            FROM positions p
            JOIN service_positions sp ON p.id = sp.position_id
            WHERE sp.service_id = %s
        """, (service_id,))

        positions = []
        for row in c.fetchall():
            positions.append({
                "id": row[0],
                "name": row[1]
            })
        conn.close()
        return {"positions": positions}
    except Exception as e:
        log_error(f"Error fetching service positions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/services/{service_id}/positions")
async def update_service_positions(
    service_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить должности для услуги"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        position_ids = data.get("position_ids", [])
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Удаляем старые связи
        c.execute("DELETE FROM service_positions WHERE service_id = %s", (service_id,))
        
        # Добавляем новые
        if position_ids:
            for pid in position_ids:
                c.execute("INSERT INTO service_positions (service_id, position_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                         (service_id, pid))
        
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating service positions: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/services/{service_id}/employees")
async def get_service_employees(
    service_id: int,
    language: str = Query('ru'),
    session_token: Optional[str] = Cookie(None)
):
    """Получить список сотрудников, назначенных на данную услугу"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT u.id, u.full_name, u.full_name, 
                   u.position, u.position_id
            FROM users u
            JOIN user_services us ON u.id = us.user_id
            WHERE us.service_id = %s
        """, (service_id,))
        
        employees = []
        for row in c.fetchall():
            employees.append({
                "id": row[0],
                "full_name": row[1],
                "position": row[3],
                "position_id": row[4]
            })
        conn.close()
        return {"employees": employees}
    except Exception as e:
        log_error(f"Error fetching service employees: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/services/{service_id}/employees")
async def update_service_employees(
    service_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Массово обновить список сотрудников для услуги"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        employee_ids = data.get("employee_ids", [])
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Получаем текущую цену услуги для дефолтных значений.
        # Длительность хранится только в services.duration (SSOT),
        # поэтому user_services.duration не заполняем.
        c.execute("SELECT price FROM services WHERE id = %s", (service_id,))
        svc = c.fetchone()
        if not svc:
            conn.close()
            return JSONResponse({"error": "Service not found"}, status_code=404)
        
        default_price = svc[0]
        
        # Удаляем старые назначения
        c.execute("DELETE FROM user_services WHERE service_id = %s", (service_id,))
        
        # Добавляем новые
        if employee_ids:
            for uid in employee_ids:
                c.execute("""
                    INSERT INTO user_services (user_id, service_id, price, duration)
                    VALUES (%s, %s, %s, NULL)
                    ON CONFLICT (user_id, service_id) DO NOTHING
                """, (uid, service_id, default_price))
        
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error updating service employees: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
