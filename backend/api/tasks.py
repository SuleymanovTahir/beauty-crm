
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from db.tasks import (

    create_task, get_tasks, update_task_stage, get_task_analytics, 
    get_task_stages, create_task_stage, update_task, delete_task,
    update_task_stage_order, update_stage_details, delete_task_stage
)
from utils.utils import get_current_user

router = APIRouter()

class TaskStageCreate(BaseModel):
    name: str
    color: Optional[str] = 'bg-gray-500'

class StageUpdateRequest(BaseModel):
    name: str
    color: str

class ReorderStagesRequest(BaseModel):
    ordered_ids: List[int]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    stage_id: Optional[int] = None
    priority: Optional[str] = 'medium'
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None
    client_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskMove(BaseModel):
    stage_id: int

@router.get("/tasks/stages")
async def list_stages(current_user: dict = Depends(get_current_user)):
    return get_task_stages()

@router.post("/tasks/stages")
async def new_stage(
    stage: TaskStageCreate,
    current_user: dict = Depends(get_current_user)
):
    stage_id = create_task_stage(stage.name, stage.color)
    if not stage_id:
        raise HTTPException(status_code=400, detail="Failed to create stage")
    return {"id": stage_id, **stage.dict()}


    return {"id": stage_id, **stage.dict()}

@router.put("/tasks/stages/{stage_id}")
async def update_stage(
    stage_id: int,
    request: StageUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    if update_stage_details(stage_id, request.name, request.color):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to update stage")

@router.delete("/tasks/stages/{stage_id}")
async def delete_stage(
    stage_id: int,
    fallback_stage_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    if delete_task_stage(stage_id, fallback_stage_id):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to delete stage")

@router.post("/tasks/stages/reorder")
async def reorder_stages(
    request: ReorderStagesRequest,
    current_user: dict = Depends(get_current_user)
):
    if update_task_stage_order(request.ordered_ids):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to reorder stages")

@router.get("/tasks")

async def list_tasks(
    stage_id: int = None, 
    assignee_id: int = None,
    current_user: dict = Depends(get_current_user)
):
    filters = {}
    if stage_id:
        filters['stage_id'] = stage_id
    if assignee_id:
        filters['assignee_id'] = assignee_id
    
    return get_tasks(filters)

@router.get("/tasks/my")
async def list_my_tasks(
    current_user: dict = Depends(get_current_user)
):
    return get_tasks({'assignee_id': current_user['id']})

@router.post("/tasks")
async def new_task(
    task: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    data = task.dict()
    data['created_by'] = current_user['id']
    task_id = create_task(data)
    if not task_id:
        raise HTTPException(status_code=400, detail="Failed to create task")
    return {"id": task_id, **data}

@router.put("/tasks/{task_id}/move")
async def move_task(
    task_id: int,
    move: TaskMove,
    current_user: dict = Depends(get_current_user)
):
    if update_task_stage(task_id, move.stage_id):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to move task")

@router.put("/tasks/{task_id}")
async def edit_task(
    task_id: int,
    update: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    if update_task(task_id, update.dict(exclude_unset=True)):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to update task")

@router.delete("/tasks/{task_id}")
async def remove_task(
    task_id: int,
    current_user: dict = Depends(get_current_user)
):
    if delete_task(task_id):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to delete task")

@router.get("/tasks/analytics")
async def analytics(current_user: dict = Depends(get_current_user)):
    return get_task_analytics()
