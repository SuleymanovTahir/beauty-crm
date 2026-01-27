"""
API для управления счетами (Invoices) - Архитектура v2.0
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
from api.notifications import create_notification
from db.invoices import get_invoices as db_get_invoices, create_invoice as db_create_invoice, \
    update_invoice as db_update_invoice, add_invoice_payment as db_add_invoice_payment

class StageCreate(BaseModel):
    name: str
    color: str
    order_index: int = 0

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class ReorderStagesRequest(BaseModel):
    ordered_ids: List[int]

class InvoiceCreate(BaseModel):
    client_id: str
    booking_id: Optional[int] = None
    items: List[dict]
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    stage_id: Optional[int] = None
    items: Optional[List[dict]] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None

class InvoicePayment(BaseModel):
    amount: float
    payment_method: str
    notes: Optional[str] = None

router = APIRouter()

@router.get("/invoices/stages")
async def get_invoice_stages(current_user: dict = Depends(get_current_user)):
    """Получить список стадий счетов из workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, name_ru, color, sort_order 
            FROM workflow_stages 
            WHERE entity_type = 'invoice' 
            ORDER BY sort_order
        """)
        stages = []
        for row in c.fetchall():
            stages.append({
                "id": row[0],
                "name": row[2] or row[1],
                "key": row[1],
                "color": row[3],
                "order_index": row[4]
            })
        return stages
    finally:
        conn.close()

@router.post("/invoices/stages")
async def create_invoice_stage(
    stage: StageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новую стадию счета"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO workflow_stages (entity_type, name, name_ru, color, sort_order)
            VALUES ('invoice', %s, %s, %s, %s)
            RETURNING id
        """, (stage.name, stage.name, stage.color, stage.order_index))
        stage_id = c.fetchone()[0]
        conn.commit()
        return {"id": stage_id, "success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/invoices/stages/{stage_id}")
async def update_invoice_stage(
    stage_id: int,
    stage: StageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить стадию счета"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE workflow_stages SET name = %s, name_ru = %s, color = %s WHERE id = %s", (stage.name, stage.name, stage.color, stage_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/invoices/stages/{stage_id}")
async def delete_invoice_stage(
    stage_id: int,
    fallback_stage_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Удалить стадию счета"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if fallback_stage_id:
            c.execute("UPDATE invoices SET stage_id = %s WHERE stage_id = %s", (fallback_stage_id, stage_id))
        c.execute("DELETE FROM workflow_stages WHERE id = %s", (stage_id,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/invoices/stages/reorder")
async def reorder_invoice_stages(
    request: ReorderStagesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Изменить порядок стадий"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        for idx, stage_id in enumerate(request.ordered_ids):
            c.execute("UPDATE workflow_stages SET sort_order = %s WHERE id = %s", (idx, stage_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/invoices")
async def get_invoices(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список счетов (v2.0)"""
    try:
        invoices = db_get_invoices(client_id, status)
        return {"invoices": invoices}
    except Exception as e:
        log_warning(f"❌ Ошибка получения счетов: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices")
async def create_invoice(
    invoice: InvoiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый счет (v2.0)"""
    data = invoice.dict()
    data['created_by'] = current_user['id']
    
    invoice_id = db_create_invoice(data)
    if not invoice_id:
        raise HTTPException(status_code=400, detail="Failed to create invoice")
    
    return {"id": invoice_id, "success": True}

@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    invoice: InvoiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить счет (v2.0)"""
    data = invoice.dict(exclude_unset=True)
    
    # Sync status with stage if provided
    if 'stage_id' in data:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT name FROM workflow_stages WHERE id = %s", (data['stage_id'],))
        res = c.fetchone()
        if res: data['status'] = res[0]
        conn.close()

    if db_update_invoice(invoice_id, data):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to update invoice")

@router.post("/invoices/{invoice_id}/payments")
async def add_payment(
    invoice_id: int,
    payment: InvoicePayment,
    current_user: dict = Depends(get_current_user)
):
    """Добавить платеж к счету (v2.0)"""
    payment_id = db_add_invoice_payment(invoice_id, payment.amount, payment.payment_method, payment.notes or "", current_user['id'])
    if not payment_id:
        raise HTTPException(status_code=400, detail="Failed to add payment")
    return {"id": payment_id, "success": True}

@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    delivery_method: str,
    recipient: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Отправить счет клиенту (v2.0 - Unified Log)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Fetch info
        c.execute("SELECT i.*, cl.name, cl.phone, cl.email FROM invoices i JOIN clients cl ON i.client_id = cl.instagram_id WHERE i.id = %s", (invoice_id,))
        row = c.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Invoice not found")
        
        columns = [desc[0] for desc in c.description]
        inv = dict(zip(columns, row))
        
        # 2. PDF Generation
        if not inv['pdf_path'] or not os.path.exists(inv.get('pdf_path', '')):
            from services.pdf_generator import generate_invoice_pdf
            pdf_path = generate_invoice_pdf(inv, "/tmp")
            db_update_invoice(invoice_id, {'pdf_path': pdf_path})
        else:
            pdf_path = inv['pdf_path']

        # 3. Send
        from services.document_sender import send_document
        subject = f"Счет {inv['invoice_number']}"
        message = f"Здравствуйте, {inv['name']}! Ваш счет на сумму {inv['total_amount']} {inv['currency']}."
        
        background_tasks.add_task(send_document, delivery_method, recipient, subject, message, pdf_path, f"{inv['invoice_number']}.pdf")
        
        # 4. LOG to Unified Communication Log
        c.execute("""
            INSERT INTO unified_communication_log (client_id, user_id, medium, trigger_type, title, content, status)
            VALUES (%s, %s, %s, 'invoice', %s, %s, 'sent')
        """, (inv['client_id'], current_user['id'], delivery_method, subject, message))
        
        # 5. Update invoice
        db_update_invoice(invoice_id, {'sent_at': datetime.now(), 'status': 'sent'})
        
        conn.commit()
        return {"success": True, "pdf_path": pdf_path}
    finally:
        conn.close()

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить счет"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM invoices WHERE id = %s", (invoice_id,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()
