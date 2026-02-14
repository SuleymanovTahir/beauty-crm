"""
API для управления договорами (Contracts) - Архитектура v2.0
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import os

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning
from utils.utils import get_current_user
from db.contracts import get_contracts as db_get_contracts, create_contract as db_create_contract, \
    update_contract as db_update_contract

class StageCreate(BaseModel):
    name: str
    color: str
    order_index: int = 0

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None

class ReorderStagesRequest(BaseModel):
    ordered_ids: List[int]

class ContractCreate(BaseModel):
    client_id: str
    booking_id: Optional[int] = None
    contract_type: str = "service"
    template_name: Optional[str] = None
    data: dict = {}

class ContractUpdate(BaseModel):
    status: Optional[str] = None
    stage_id: Optional[int] = None
    contract_type: Optional[str] = None
    data: Optional[dict] = None
    signed_at: Optional[str] = None

class ContractSend(BaseModel):
    delivery_method: str
    recipient: str

router = APIRouter()

@router.get("/contracts/stages")
async def get_contract_stages(current_user: dict = Depends(get_current_user)):
    """Получить список стадий договоров из workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, color, sort_order
            FROM workflow_stages
            WHERE entity_type = 'contract'
            ORDER BY sort_order
        """)
        stages = []
        for row in c.fetchall():
            stages.append({
                "id": row[0],
                "name": row[1],
                "key": row[1],
                "color": row[2],
                "order_index": row[3]
            })
        return stages
    finally:
        conn.close()

@router.post("/contracts/stages")
async def create_contract_stage(stage: StageCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO workflow_stages (entity_type, name, color, sort_order)
            VALUES ('contract', %s, %s, %s) RETURNING id
        """, (stage.name, stage.color, stage.order_index))
        sid = c.fetchone()[0]
        conn.commit()
        return {"id": sid, "success": True}
    finally:
        conn.close()

@router.get("/contracts")
async def get_contracts(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список договоров (v2.0)"""
    contracts = db_get_contracts(client_id, status, current_user.get("role"))
    return {"contracts": contracts}

@router.post("/contracts")
async def create_contract(
    contract: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый договор (v2.0)"""
    data = contract.dict()
    data['created_by'] = current_user['id']
    
    # Enrich data with client/salon info (logic removed from API, should be in orchestrator but kept simple for now)
    cid = db_create_contract(data)
    if not cid:
        raise HTTPException(status_code=400, detail="Failed to create contract")
    return {"id": cid, "success": True}

@router.put("/contracts/{contract_id}")
async def update_contract(
    contract_id: int,
    contract: ContractUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить договор (v2.0)"""
    data = contract.dict(exclude_unset=True)
    
    if 'stage_id' in data:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT name FROM workflow_stages WHERE id = %s", (data['stage_id'],))
        res = c.fetchone()
        if res: data['status'] = res[0]
        conn.close()

    if db_update_contract(contract_id, data):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to update contract")

@router.post("/contracts/{contract_id}/send")
async def send_contract(
    contract_id: int,
    send_data: ContractSend,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Отправить договор клиенту (v2.0 - Unified Log)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT c.*, cl.name as client_name, cl.instagram_id FROM contracts c JOIN clients cl ON c.client_id = cl.instagram_id WHERE c.id = %s", (contract_id,))
        row = c.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Contract not found")
        
        columns = [desc[0] for desc in c.description]
        con = dict(zip(columns, row))
        
        # PDF logic
        if not con['pdf_path'] or not os.path.exists(con.get('pdf_path', '')):
            from services.pdf_generator import generate_contract_pdf
            pdf_path = generate_contract_pdf(con, "/tmp")
            db_update_contract(contract_id, {'pdf_path': pdf_path})
        else:
            pdf_path = con['pdf_path']

        from services.document_sender import send_document
        subject = f"Договор {con['contract_number']}"
        message = f"Здравствуйте, {con['client_name']}! Направляем вам договор на подпись."
        
        background_tasks.add_task(send_document, send_data.delivery_method, send_data.recipient, subject, message, pdf_path, f"{con['contract_number']}.pdf")
        
        # LOG to Unified Communication Log
        c.execute("""
            INSERT INTO unified_communication_log (client_id, user_id, medium, trigger_type, title, content, status)
            VALUES (%s, %s, %s, 'contract', %s, %s, 'sent')
        """, (con['instagram_id'], current_user['id'], send_data.delivery_method, subject, message))
        
        db_update_contract(contract_id, {'sent_at': datetime.now()})
        conn.commit()
        return {"success": True, "pdf_path": pdf_path}
    finally:
        conn.close()

@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM contracts WHERE id = %s", (contract_id,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()
