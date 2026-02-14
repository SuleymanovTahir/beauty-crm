"""
API для управления справочником должностей
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from core.auth import get_current_user_or_redirect as get_current_user
from db.positions import (
    get_all_positions,
    get_position,
    create_position,
    update_position,
    delete_position,
    hard_delete_position,
    get_employees_by_position
)
from utils.logger import log_info, log_error

router = APIRouter()

class PositionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0

class PositionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("/positions")
async def list_positions(
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Получить список всех должностей"""
    try:
        positions = get_all_positions(active_only=active_only)
        return {"positions": positions}
    except Exception as e:
        log_error(f"Error fetching positions: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions/{position_id}")
async def get_position_detail(
    position_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить детали должности"""
    try:
        position = get_position(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")

        # Получить сотрудников с этой должностью
        employees = get_employees_by_position(position_id)
        position['employees_count'] = len(employees)

        return position
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error fetching position: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/positions")
async def create_new_position(
    position_data: PositionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новую должность"""
    try:
        # Проверка прав (только admin и director)
        if current_user['role'] not in ['admin', 'director']:
            raise HTTPException(status_code=403, detail="Access denied")

        position_id = create_position(
            name=position_data.name,
            description=position_data.description,
            sort_order=position_data.sort_order
        )

        if position_id is None:
            raise HTTPException(status_code=400, detail="Position already exists")

        log_info(f"Position created: {position_data.name} by {current_user['username']}", "api")

        return {
            "success": True,
            "position_id": position_id,
            "message": "Position created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error creating position: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/positions/{position_id}")
async def update_position_data(
    position_id: int,
    position_data: PositionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить должность"""
    try:
        # Проверка прав (только admin и director)
        if current_user['role'] not in ['admin', 'director']:
            raise HTTPException(status_code=403, detail="Access denied")

        # Проверяем существование должности
        position = get_position(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")

        # Фильтруем только переданные поля
        update_data = {k: v for k, v in position_data.dict().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")

        success = update_position(position_id, **update_data)

        if not success:
            raise HTTPException(status_code=400, detail="Failed to update position")

        log_info(f"Position {position_id} updated by {current_user['username']}", "api")

        return {
            "success": True,
            "message": "Position updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error updating position: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/positions/{position_id}")
async def delete_position_endpoint(
    position_id: int,
    hard_delete: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Удалить должность (soft delete по умолчанию)"""
    try:
        # Проверка прав (только director)
        if current_user['role'] != 'director':
            raise HTTPException(status_code=403, detail="Only director can delete positions")

        # Проверяем существование должности
        position = get_position(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")

        # Проверяем сколько сотрудников с этой должностью
        employees = get_employees_by_position(position_id)

        if hard_delete:
            success = hard_delete_position(position_id)
            action = "deleted permanently"
        else:
            success = delete_position(position_id)
            action = "deactivated"

        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete position")

        log_info(f"Position {position_id} ({position['name']}) {action} by {current_user['username']}", "api")

        return {
            "success": True,
            "message": f"Position {action} successfully",
            "affected_employees": len(employees)
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error deleting position: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions/{position_id}/employees")
async def get_position_employees(
    position_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить всех сотрудников с определенной должностью"""
    try:
        position = get_position(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")

        employees = get_employees_by_position(position_id)

        return {
            "position": position,
            "employees": employees,
            "count": len(employees)
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error fetching position employees: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
