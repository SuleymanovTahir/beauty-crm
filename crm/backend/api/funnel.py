
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from db.pipelines import (
    get_pipeline_stages, 
    get_clients_by_stage, 
    update_client_stage, 

    get_funnel_stats,
    create_pipeline_stage,
    update_pipeline_stage,
    delete_pipeline_stage,
    reorder_pipeline_stages,
    remove_client_from_funnel
)
from utils.utils import get_current_user

router = APIRouter()

class MoveClientRequest(BaseModel):
    client_id: str
    stage_id: int

@router.delete("/funnel/clients/{client_id}")
async def remove_client(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    if remove_client_from_funnel(client_id):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to remove client from funnel")


class StageCreateRequest(BaseModel):
    name: str
    color: str
    order_index: int = 0

class StageUpdateRequest(BaseModel):
    name: str
    color: str

class ReorderStagesRequest(BaseModel):
    ordered_ids: List[int]

@router.get("/funnel/stages")
async def get_stages(current_user: dict = Depends(get_current_user)):
    return get_pipeline_stages()

@router.post("/funnel/stages")
async def create_stage(
    request: StageCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    stage_id = create_pipeline_stage(request.name, request.color, request.order_index)
    if stage_id:
        return {"success": True, "id": stage_id}
    raise HTTPException(status_code=500, detail="Failed to create stage")

@router.put("/funnel/stages/{stage_id}")
async def update_stage(
    stage_id: int,
    request: StageUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    if update_pipeline_stage(stage_id, request.name, request.color):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to update stage")

@router.delete("/funnel/stages/{stage_id}")
async def delete_stage(
    stage_id: int,
    fallback_stage_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    if delete_pipeline_stage(stage_id, fallback_stage_id):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to delete stage")

@router.post("/funnel/stages/reorder")
async def reorder_stages(
    request: ReorderStagesRequest,
    current_user: dict = Depends(get_current_user)
):
    if reorder_pipeline_stages(request.ordered_ids):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to reorder stages")

# Роли которые видят ВСЕХ клиентов в воронке
ADMIN_ROLES = ['admin', 'director', 'manager']

@router.get("/funnel/clients")
async def get_clients(
    stage_id: int = Query(...),
    limit: int = 50,
    offset: int = 0,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    # Admin/director/manager видят всех клиентов
    # Остальные (sales, marketer, employee) - только своих назначенных
    user_id = None
    if current_user['role'] not in ADMIN_ROLES:
        user_id = current_user['id']

    return get_clients_by_stage(stage_id, limit, offset, search, user_id)

@router.post("/funnel/move")
async def move_client(
    request: MoveClientRequest,
    current_user: dict = Depends(get_current_user)
):
    if update_client_stage(request.client_id, request.stage_id):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to move client")

@router.get("/funnel/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    # Admin/director/manager видят статистику по всем клиентам
    # Остальные - только по своим назначенным
    user_id = None
    if current_user['role'] not in ADMIN_ROLES:
        user_id = current_user['id']

    return get_funnel_stats(user_id=user_id)

class CreateClientRequest(BaseModel):
    name: str
    phone: str
    username: Optional[str] = None
    stage_id: int
    notes: Optional[str] = None
    assigned_employee_id: Optional[int] = None

@router.post("/funnel/clients")
async def create_funnel_client(
    request: CreateClientRequest,
    current_user: dict = Depends(get_current_user)
):
    from db.clients import get_or_create_client, update_client_info

    # Generate username if not provided (required for unique constraint usually, but let's see db logic)
    # Using phone as fallback username is a common pattern or letting db handle it
    username = request.username or f"user_{request.phone.replace('+', '')}"

    client = get_or_create_client(username, username=username, phone=request.phone)
    if not client:
        raise HTTPException(status_code=500, detail="Failed to create client")

    # Update name and stage
    client_id = client['instagram_id'] if isinstance(client, dict) else client

    # Update stage
    update_client_stage(client_id, request.stage_id)

    # Если ответственный не указан, назначаем создателя (для sales/marketer/employee)
    assigned_id = request.assigned_employee_id
    if assigned_id is None and current_user['role'] not in ADMIN_ROLES:
        assigned_id = current_user['id']

    # Update name, notes, and assigned employee
    update_client_info(client_id, name=request.name, notes=request.notes, assigned_employee_id=assigned_id)

    return {"success": True, "client_id": client_id}
