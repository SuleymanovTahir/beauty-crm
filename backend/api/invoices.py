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

router = APIRouter()


class InvoiceCreate(BaseModel):
    client_id: str
    booking_id: Optional[int] = None
    items: List[dict]
    notes: Optional[str] = None
    due_date: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    items: Optional[List[dict]] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None


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
                "total_amount": row[5],
                "paid_amount": row[6],
                "currency": row[7],
                "items": row[8],
                "notes": row[9],
                "due_date": str(row[10]) if row[10] else None,
                "pdf_path": row[11],
                "created_at": row[12],
                "updated_at": row[13],
                "created_by": row[14],
                "paid_at": row[15],
                "sent_at": row[16],
                "client_name": row[17],
                "client_phone": row[18]
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
        
        # Создание счета
        c.execute("""
            INSERT INTO invoices 
            (invoice_number, client_id, booking_id, status, total_amount, paid_amount,
             currency, items, notes, due_date, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            invoice_number,
            invoice.client_id,
            invoice.booking_id,
            "draft",
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
