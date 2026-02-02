"""
API Endpoints для управления планами с поддержкой ролей
"""
from fastapi import APIRouter, Query, Cookie, Request
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timedelta

from db.plans import (
    get_plan, set_plan, get_plan_progress, get_all_plans, delete_plan,
    get_plan_for_user, set_role_plan, set_individual_plan,
    get_visible_plans, can_user_edit_plan, get_plans_by_role,
    get_all_plan_metrics, create_plan_metric, delete_plan_metric
)
from utils.utils import require_auth

router = APIRouter(tags=["Plans"])

@router.get("/plans/my-plans")
async def get_my_plans_api(session_token: Optional[str] = Cookie(None)):
    """Получить планы для текущего пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    plans = get_visible_plans(user.get("id"))
    return {"success": True, "plans": plans}

@router.get("/plans/my-plan/{metric_type}")
async def get_my_plan_for_metric(
    metric_type: str,
    period_type: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить план для текущего пользователя по конкретной метрике"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    plan = get_plan_for_user(user.get("id"), metric_type, period_type)
    
    if plan:
        return {"success": True, "plan": plan}
    else:
        return {"success": False, "message": "План не найден"}

@router.get("/plans/role/{role_key}")
async def get_role_plans_api(
    role_key: str,
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None)
):
    """Получить планы для роли"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Check permission - only admin/director can view other roles' plans
    if user.get("role") not in ["admin", "director"]:
        if user.get("role") != role_key:
            return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    plans = get_plans_by_role(role_key, active_only)
    return {"success": True, "plans": plans}

@router.post("/plans/role")
async def create_role_plan_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать план для роли"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Only admin/director can create role plans
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    role_key = data.get("role_key")
    metric_type = data.get("metric_type")
    target_value = data.get("target_value")
    period_type = data.get("period_type", "month")
    visible_to_roles = data.get("visible_to_roles", [])
    can_edit_roles = data.get("can_edit_roles", [])
    
    # Determine dates
    if data.get("start_date") and data.get("end_date"):
        start_date = data["start_date"]
        end_date = data["end_date"]
    else:
        now = datetime.now()
        start_date = now.isoformat()
        if period_type == "week":
            end_date = (now + timedelta(days=7)).isoformat()
        elif period_type == "two_weeks":
            end_date = (now + timedelta(days=14)).isoformat()
        elif period_type == "month":
            end_date = (now + timedelta(days=30)).isoformat()
        elif period_type == "quarter":
            end_date = (now + timedelta(days=90)).isoformat()
        elif period_type == "year":
            end_date = (now + timedelta(days=365)).isoformat()
        else:
            end_date = (now + timedelta(days=30)).isoformat()
    
    plan_id = set_role_plan(
        role_key=role_key,
        metric_type=metric_type,
        target_value=target_value,
        period_type=period_type,
        start_date=start_date,
        end_date=end_date,
        name=data.get("name"),
        comment=data.get("comment"),
        visible_to_roles=visible_to_roles,
        can_edit_roles=can_edit_roles,
        created_by=user.get("id")
    )
    
    if plan_id:
        return {"success": True, "plan_id": plan_id}
    else:
        return JSONResponse(
            {"error": "Не удалось создать план"},
            status_code=500
        )

@router.post("/plans/individual")
async def create_individual_plan_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать индивидуальный план для пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Only admin/director can create individual plans for others
    data = await request.json()
    target_user_id = data.get("user_id")
    
    if target_user_id != user.get("id"):
        if user.get("role") not in ["admin", "director"]:
            return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    metric_type = data.get("metric_type")
    target_value = data.get("target_value")
    period_type = data.get("period_type", "month")
    
    # Determine dates
    if data.get("start_date") and data.get("end_date"):
        start_date = data["start_date"]
        end_date = data["end_date"]
    else:
        now = datetime.now()
        start_date = now.isoformat()
        if period_type == "week":
            end_date = (now + timedelta(days=7)).isoformat()
        elif period_type == "two_weeks":
            end_date = (now + timedelta(days=14)).isoformat()
        elif period_type == "month":
            end_date = (now + timedelta(days=30)).isoformat()
        elif period_type == "quarter":
            end_date = (now + timedelta(days=90)).isoformat()
        elif period_type == "year":
            end_date = (now + timedelta(days=365)).isoformat()
        else:
            end_date = (now + timedelta(days=30)).isoformat()
    
    plan_id = set_individual_plan(
        user_id=target_user_id,
        metric_type=metric_type,
        target_value=target_value,
        period_type=period_type,
        start_date=start_date,
        end_date=end_date,
        name=data.get("name"),
        comment=data.get("comment"),
        created_by=user.get("id")
    )
    
    if plan_id:
        return {"success": True, "plan_id": plan_id}
    else:
        return JSONResponse(
            {"error": "Не удалось создать индивидуальный план"},
            status_code=500
        )

@router.get("/plans/{plan_id}/can-edit")
async def check_can_edit_plan(
    plan_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Проверить может ли пользователь редактировать план"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    can_edit = can_user_edit_plan(user.get("id"), plan_id)
    return {"success": True, "can_edit": can_edit}

# Backward compatibility endpoints
@router.get("/plans")
async def get_all_plans_api(
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None)
):
    """Получить все планы"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    plans = get_all_plans(active_only=active_only)
    return {"success": True, "plans": plans}

@router.get("/plans/{metric_type}")
async def get_plan_api(
    metric_type: str,
    period_type: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить глобальный план для конкретной метрики"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    plan = get_plan(metric_type, period_type)
    if plan:
        return {"success": True, "plan": plan}
    else:
        return {"success": False, "message": "План не найден"}

@router.post("/plans")
async def create_plan_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать или обновить глобальный план"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    
    metric_type = data.get("metric_type")
    target_value = data.get("target_value")
    period_type = data.get("period_type", "month")
    
    if "start_date" in data and "end_date" in data:
        start_date = data["start_date"]
        end_date = data["end_date"]
    else:
        now = datetime.now()
        if period_type == "week":
            start_date = now.isoformat()
            end_date = (now + timedelta(days=7)).isoformat()
        elif period_type == "month":
            start_date = now.isoformat()
            end_date = (now + timedelta(days=30)).isoformat()
        elif period_type == "quarter":
            start_date = now.isoformat()
            end_date = (now + timedelta(days=90)).isoformat()
        else:
            start_date = now.isoformat()
            end_date = (now + timedelta(days=30)).isoformat()
    
    plan_id = set_plan(
        metric_type=metric_type,
        target_value=target_value,
        period_type=period_type,
        start_date=start_date,
        end_date=end_date,
        name=data.get("name"),
        created_by=user.get("id")
    )
    
    if plan_id:
        return {"success": True, "plan_id": plan_id}
    else:
        return JSONResponse(
            {"error": "Не удалось создать план"},
            status_code=500
        )

@router.get("/plans/{metric_type}/progress")
async def get_plan_progress_api(
    metric_type: str,
    current_value: float = Query(...),
    session_token: Optional[str] = Cookie(None)
):
    """Получить прогресс выполнения плана"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    progress = get_plan_progress(metric_type, current_value)
    
    if progress:
        return {"success": True, "progress": progress}
    else:
        return {"success": False, "message": "План не найден"}

@router.delete("/plans/{plan_id}")
async def delete_plan_api(
    plan_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить план"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Check if user can edit this plan
    if not can_user_edit_plan(user.get("id"), plan_id):
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    success = delete_plan(plan_id)
    
    if success:
        return {"success": True}
    else:
        return JSONResponse(
            {"error": "Не удалось удалить план"},
            status_code=500
        )

# Metric Types Endpoints
@router.get("/plans/metrics/all")
async def get_metrics_api(session_token: Optional[str] = Cookie(None)):
    """Получить все доступные типы метрик"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    metrics = get_all_plan_metrics()
    return {"success": True, "metrics": metrics}

@router.post("/plans/metrics")
async def create_metric_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """Создать или обновить тип метрики"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    metric_id = create_plan_metric(
        key=data.get("key"),
        name=data.get("name"),
        unit=data.get("unit"),
        description=data.get("description")
    )
    
    if metric_id:
        return {"success": True, "metric_id": metric_id}
    else:
        return JSONResponse({"error": "Не удалось сохранить метрику"}, status_code=500)

@router.delete("/plans/metrics/{key}")
async def delete_metric_api(key: str, session_token: Optional[str] = Cookie(None)):
    """Удалить тип метрики"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    success = delete_plan_metric(key)
    return {"success": success}
