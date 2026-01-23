
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from db.tasks import (

    create_task, get_tasks, update_task_stage, get_task_analytics,
    get_task_stages, create_task_stage, update_task, delete_task,
    update_task_stage_order, update_stage_details, delete_task_stage
)
from db.connection import get_db_connection
from utils.utils import get_current_user
from utils.logger import log_warning, log_info

router = APIRouter()

# Role hierarchy for task assignment
# Higher roles can assign to lower roles
ROLE_HIERARCHY = {
    'director': ['director', 'admin', 'manager', 'employee', 'sales', 'marketer', 'client'],
    'admin': ['admin', 'manager', 'employee', 'sales', 'marketer'],
    'manager': ['manager', 'employee', 'sales', 'marketer'],
    'employee': ['employee'],
    'sales': ['sales'],
    'marketer': ['marketer'],
    'client': ['client']
}

def can_assign_to_user(current_user_role: str, target_user_id: int) -> bool:
    """Check if current user can assign tasks to target user based on role hierarchy"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT role FROM users WHERE id = %s", (target_user_id,))
        result = c.fetchone()
        if not result:
            return False

        target_role = result[0]
        allowed_roles = ROLE_HIERARCHY.get(current_user_role, [current_user_role])
        return target_role in allowed_roles
    except Exception:
        return False
    finally:
        conn.close()

def get_assignable_users(current_user: dict) -> List[dict]:
    """Get list of users that current user can assign tasks to"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        allowed_roles = ROLE_HIERARCHY.get(current_user['role'], [current_user['role']])
        placeholders = ','.join(['%s'] * len(allowed_roles))

        c.execute(f"""
            SELECT id, full_name, role
            FROM users
            WHERE role IN ({placeholders}) AND is_active = TRUE AND deleted_at IS NULL
            ORDER BY full_name
        """, allowed_roles)

        return [{"id": row[0], "full_name": row[1], "role": row[2]} for row in c.fetchall()]
    except Exception:
        return []
    finally:
        conn.close()

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
    assignee_ids: Optional[List[int]] = None  # Multiple assignees support
    client_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = None  # Multiple assignees support

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

@router.get("/tasks/assignable-users")
async def get_assignable_users_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get list of users that current user can assign tasks to based on role hierarchy"""
    users = get_assignable_users(current_user)
    return {"users": users, "current_user_role": current_user['role']}

@router.post("/tasks")
async def new_task(
    task: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    data = task.dict()
    data['created_by'] = current_user['id']

    # Validate assignees based on role hierarchy
    assignee_ids = data.get('assignee_ids') or []
    if data.get('assignee_id') and data['assignee_id'] not in assignee_ids:
        assignee_ids.append(data['assignee_id'])

    # AUTO-ASSIGN: Если ответственные не указаны, назначаем создателя
    if not assignee_ids:
        assignee_ids = [current_user['id']]
        data['assignee_ids'] = assignee_ids
        data['assignee_id'] = current_user['id']
        log_info(f"Auto-assigned creator {current_user['id']} as assignee for new task", "tasks")

    # Check each assignee against hierarchy
    for assignee_id in assignee_ids:
        if not can_assign_to_user(current_user['role'], assignee_id):
            log_warning(f"User {current_user['id']} ({current_user['role']}) tried to assign task to user {assignee_id} - denied", "tasks")
            raise HTTPException(
                status_code=403,
                detail="Вы не можете назначить задачу этому пользователю (недостаточно прав)"
            )

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
    """Статистика задач для текущего пользователя (только его задачи)"""
    return get_task_analytics(user_id=current_user['id'])
