
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from db.pipelines import get_pipeline_stages, get_clients_by_stage, update_client_stage, get_funnel_stats
from utils.utils import get_current_user

router = APIRouter()

class MoveClientRequest(BaseModel):
    client_id: str
    stage_id: int

@router.get("/funnel/stages")
async def get_stages(current_user: dict = Depends(get_current_user)):
    return get_pipeline_stages()

@router.get("/funnel/clients")
async def get_clients(
    stage_id: int = Query(...),
    limit: int = 50,
    offset: int = 0,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    return get_clients_by_stage(stage_id, limit, offset, search)

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
    return get_funnel_stats()

class CreateClientRequest(BaseModel):
    name: str
    phone: str
    username: Optional[str] = None
    stage_id: int
    notes: Optional[str] = None

@router.post("/funnel/clients")
async def create_funnel_client(
    request: CreateClientRequest,
    current_user: dict = Depends(get_current_user)
):
    from db.clients import get_or_create_client
    
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
    
    # Update name if provided
    if request.name:
        from db.clients import update_client_info
        update_client_info(client_id, name=request.name, notes=request.notes)
        
    return {"success": True, "client_id": client_id}
