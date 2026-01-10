"""
API для управления счетами (Invoices)
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

class StageCreate(BaseModel):
    name: str
    color: str
    order_index: int

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

router = APIRouter()


@router.get("/invoices/stages")
async def get_invoice_stages(current_user: dict = Depends(get_current_user)):
    """Получить список стадий счетов"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, key, color, order_index FROM invoice_stages WHERE is_active = TRUE ORDER BY order_index")
        stages = []
        for row in c.fetchall():
            stages.append({"id": row[0], "name": row[1], "key": row[2], "color": row[3], "order_index": row[4]})
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
        key = stage.name.lower().replace(" ", "_")[:50]
        c.execute("""
            INSERT INTO invoice_stages (name, key, color, order_index)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (stage.name, key, stage.color, stage.order_index))
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
        c.execute("UPDATE invoice_stages SET name = %s, color = %s WHERE id = %s", (stage.name, stage.color, stage_id))
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
        c.execute("DELETE FROM invoice_stages WHERE id = %s", (stage_id,))
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
            c.execute("UPDATE invoice_stages SET order_index = %s WHERE id = %s", (idx, stage_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


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


class StageCreate(BaseModel):
    name: str
    color: str
    order_index: int = 0


class StageUpdate(BaseModel):
    name: str
    color: str


class ReorderStagesRequest(BaseModel):
    ordered_ids: List[int]


class InvoicePayment(BaseModel):
    amount: float
    payment_method: str
    notes: Optional[str] = None


@router.get("/invoices")
async def get_invoices(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список счетов"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """
            SELECT i.*, cl.name as client_name, cl.phone as client_phone
            FROM invoices i
            LEFT JOIN clients cl ON i.client_id = cl.instagram_id
            WHERE 1=1
        """
        params = []
        
        if client_id:
            query += " AND i.client_id = %s"
            params.append(client_id)
        
        if status:
            query += " AND i.status = %s"
            params.append(status)
        
        query += " ORDER BY i.created_at DESC"
        
        c.execute(query, params)
        invoices = []
        for row in c.fetchall():
            invoices.append({
                "id": row[0],
                "invoice_number": row[1],
                "client_id": row[2],
                "booking_id": row[3],
                "status": row[4],
                "stage_id": row[5],
                "total_amount": row[6],
                "paid_amount": row[7],
                "currency": row[8],
                "items": row[9],
                "notes": row[10],
                "due_date": str(row[11]) if row[11] else None,
                "pdf_path": row[12],
                "created_at": row[13],
                "updated_at": row[14],
                "created_by": row[15],
                "paid_at": row[16],
                "sent_at": row[17],
                "client_name": row[18],
                "client_phone": row[19]
            })
        
        return {"invoices": invoices}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения счетов: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/invoices")
async def create_invoice(
    invoice: InvoiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый счет"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Генерация номера счета
        c.execute("SELECT COUNT(*) FROM invoices")
        count = c.fetchone()[0]
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"
        
        # Расчет общей суммы
        total_amount = sum(item.get('amount', 0) for item in invoice.items)
        
        # Получение валюты из настроек
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        currency_row = c.fetchone()
        currency = currency_row[0] if currency_row else "AED"
        
        # Получение начальной стадии
        c.execute("SELECT id FROM invoice_stages WHERE key = 'draft' LIMIT 1")
        res = c.fetchone()
        stage_id = res[0] if res else None

        # Создание счета
        c.execute("""
            INSERT INTO invoices 
            (invoice_number, client_id, booking_id, status, stage_id, total_amount, paid_amount,
             currency, items, notes, due_date, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            invoice_number,
            invoice.client_id,
            invoice.booking_id,
            "draft",
            stage_id,
            total_amount,
            0,
            currency,
            json.dumps(invoice.items),
            invoice.notes,
            invoice.due_date,
            current_user["id"]
        ))
        
        invoice_id = c.fetchone()[0]
        conn.commit()
        
        log_info(f"✅ Счет {invoice_number} создан", "api")
        
        return {
            "id": invoice_id,
            "invoice_number": invoice_number,
            "total_amount": total_amount,
            "currency": currency
        }
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка создания счета: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    invoice: InvoiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить счет"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if invoice.status:
            updates.append("status = %s")
            params.append(invoice.status)
        
        if invoice.stage_id is not None:
            updates.append("stage_id = %s")
            params.append(invoice.stage_id)
            # Синхронизация status с key стадии
            c.execute("SELECT key FROM invoice_stages WHERE id = %s", (invoice.stage_id,))
            res = c.fetchone()
            if res:
                updates.append("status = %s")
                params.append(res[0])
        
        if invoice.items:
            total_amount = sum(item.get('amount', 0) for item in invoice.items)
            updates.append("items = %s")
            updates.append("total_amount = %s")
            params.extend([json.dumps(invoice.items), total_amount])
        
        if invoice.notes is not None:
            updates.append("notes = %s")
            params.append(invoice.notes)
        
        if invoice.due_date:
            updates.append("due_date = %s")
            params.append(invoice.due_date)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")
        
        updates.append("updated_at = NOW()")
        params.append(invoice_id)
        
        query = f"UPDATE invoices SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        
        log_info(f"✅ Счет {invoice_id} обновлен", "api")
        
        return {"message": "Счет обновлен"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка обновления счета: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/invoices/{invoice_id}/payments")
async def add_payment(
    invoice_id: int,
    payment: InvoicePayment,
    current_user: dict = Depends(get_current_user)
):
    """Добавить платеж к счету"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Добавление платежа
        c.execute("""
            INSERT INTO invoice_payments
            (invoice_id, amount, payment_method, notes, created_by, payment_date)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (invoice_id, payment.amount, payment.payment_method, payment.notes, current_user["id"]))
        
        payment_id = c.fetchone()[0]
        
        # Обновление суммы оплаты в счете
        c.execute("""
            UPDATE invoices
            SET paid_amount = paid_amount + %s,
                status = CASE 
                    WHEN (paid_amount + %s) >= total_amount THEN 'paid'
                    WHEN (paid_amount + %s) > 0 THEN 'partial'
                    ELSE status
                END,
                paid_at = CASE 
                    WHEN (paid_amount + %s) >= total_amount THEN NOW()
                    ELSE paid_at
                END,
                updated_at = NOW()
            WHERE id = %s
        """, (payment.amount, payment.amount, payment.amount, payment.amount, invoice_id))
        
        conn.commit()
        
        log_info(f"✅ Платеж добавлен к счету {invoice_id}", "api")
        
        return {"id": payment_id, "message": "Платеж добавлен"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка добавления платежа: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    delivery_method: str,
    recipient: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Отправить счет клиенту"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получение счета
        c.execute("""
            SELECT invoice_number, pdf_path, client_id, items, total_amount, currency
            FROM invoices
            WHERE id = %s
        """, (invoice_id,))
        
        invoice = c.fetchone()
        if not invoice:
            raise HTTPException(status_code=404, detail="Счет не найден")
        
        invoice_number, pdf_path, client_id, items_json, total_amount, currency = invoice
        items = json.loads(items_json) if items_json else []
        
        # Получаем данные клиента
        c.execute("""
            SELECT name, phone, email
            FROM clients
            WHERE instagram_id = %s
        """, (client_id,))
        client = c.fetchone()
        
        if not client:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        
        client_name, client_phone, client_email = client
        
        # Получаем данные салона
        c.execute("""
            SELECT name, address, phone, email, inn
            FROM salon_settings
            WHERE id = 1
        """)
        salon = c.fetchone()
        
        # Генерируем PDF если его еще нет
        if not pdf_path or not os.path.exists(pdf_path):
            from services.pdf_generator import generate_invoice_pdf
            
            # Подготавливаем данные для PDF
            pdf_data = {
                "id": invoice_id,
                "invoice_number": invoice_number,
                "issue_date": datetime.now().strftime('%d.%m.%Y'),
                "client_name": client_name,
                "client_phone": client_phone,
                "client_email": client_email,
                "company_name": salon[0] if salon else "",
                "company_address": salon[1] if salon else "",
                "company_phone": salon[2] if salon else "",
                "company_email": salon[3] if salon else "",
                "company_inn": salon[4] if salon else "",
                "items": items,
                "total_amount": total_amount,
                "currency": currency
            }
            
            # Генерируем PDF
            pdf_path = generate_invoice_pdf(pdf_data, "/tmp")
            
            # Сохраняем путь к PDF
            c.execute("""
                UPDATE invoices
                SET pdf_path = %s, updated_at = NOW()
                WHERE id = %s
            """, (pdf_path, invoice_id))
            conn.commit()
        
        # Отправляем в фоне
        from services.document_sender import send_document
        
        subject = f"Счет на оплату {invoice_number}"
        message = f"Здравствуйте, {client_name}!\n\nНаправляем вам счет {invoice_number} на сумму {total_amount} {currency}."
        
        background_tasks.add_task(
            send_document,
            delivery_method,
            recipient,
            subject,
            message,
            pdf_path,
            f"{invoice_number}.pdf"
        )
        
        # Логирование отправки
        c.execute("""
            INSERT INTO invoice_delivery_log
            (invoice_id, delivery_method, recipient, status, sent_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (invoice_id, delivery_method, recipient, "sent"))
        
        # Обновление времени отправки
        c.execute("""
            UPDATE invoices
            SET sent_at = NOW(), status = 'sent', updated_at = NOW()
            WHERE id = %s
        """, (invoice_id,))
        
        conn.commit()
        
        log_info(f"✅ Счет {invoice_number} отправлен через {delivery_method}", "api")
        
        return {"message": "Счет отправлен", "pdf_path": pdf_path}
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка отправки счета: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
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
        
        log_info(f"✅ Счет {invoice_id} удален", "api")
        
        return {"message": "Счет удален"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка удаления счета: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
