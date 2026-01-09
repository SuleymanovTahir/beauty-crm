"""
API для управления договорами (Contracts)
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import os

from db.connection import get_db_connection
from utils.logger import log_info, log_warning, log_error
from utils.utils import get_current_user

router = APIRouter()


class ContractCreate(BaseModel):
    client_id: str
    booking_id: Optional[int] = None
    contract_type: str = "service"
    template_name: Optional[str] = None
    data: dict = {}


class ContractUpdate(BaseModel):
    status: Optional[str] = None
    data: Optional[dict] = None
    signed_at: Optional[str] = None


class ContractSend(BaseModel):
    delivery_method: str  # email, whatsapp, telegram, instagram
    recipient: str


@router.get("/contracts")
async def get_contracts(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список договоров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """
            SELECT c.*, cl.name as client_name, cl.phone as client_phone,
                   u.full_name as created_by_name
            FROM contracts c
            LEFT JOIN clients cl ON c.client_id = cl.instagram_id
            LEFT JOIN users u ON c.created_by = u.id
            WHERE 1=1
        """
        params = []
        
        if client_id:
            query += " AND c.client_id = %s"
            params.append(client_id)
        
        if status:
            query += " AND c.status = %s"
            params.append(status)
        
        query += " ORDER BY c.created_at DESC"
        
        c.execute(query, params)
        contracts = []
        for row in c.fetchall():
            contracts.append({
                "id": row[0],
                "contract_number": row[1],
                "client_id": row[2],
                "booking_id": row[3],
                "contract_type": row[4],
                "template_name": row[5],
                "status": row[6],
                "data": row[7],
                "pdf_path": row[8],
                "created_at": row[9],
                "updated_at": row[10],
                "created_by": row[11],
                "signed_at": row[12],
                "sent_at": row[13],
                "client_name": row[14],
                "client_phone": row[15],
                "created_by_name": row[16]
            })
        
        return {"contracts": contracts}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения договоров: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/contracts")
async def create_contract(
    contract: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый договор"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Генерация номера договора
        c.execute("SELECT COUNT(*) FROM contracts")
        count = c.fetchone()[0]
        contract_number = f"DOG-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"
        
        # Получение данных клиента
        c.execute("""
            SELECT name, phone, email, instagram_id
            FROM clients
            WHERE instagram_id = %s
        """, (contract.client_id,))
        client_data = c.fetchone()
        
        if not client_data:
            raise HTTPException(status_code=404, detail="Клиент не найден")
        
        # Получение данных салона
        c.execute("""
            SELECT name, address, phone, email
            FROM salon_settings
            WHERE id = 1
        """)
        salon_data = c.fetchone()
        
        # Формирование данных договора
        contract_data = {
            **contract.data,
            "client": {
                "name": client_data[0],
                "phone": client_data[1],
                "email": client_data[2],
                "instagram_id": client_data[3]
            },
            "salon": {
                "name": salon_data[0] if salon_data else "",
                "address": salon_data[1] if salon_data else "",
                "phone": salon_data[2] if salon_data else "",
                "email": salon_data[3] if salon_data else ""
            },
            "date": datetime.now().isoformat()
        }
        
        # Если есть booking_id, добавляем данные записи
        if contract.booking_id:
            c.execute("""
                SELECT service_name, master, datetime, revenue
                FROM bookings
                WHERE id = %s
            """, (contract.booking_id,))
            booking_data = c.fetchone()
            if booking_data:
                contract_data["booking"] = {
                    "service": booking_data[0],
                    "master": booking_data[1],
                    "datetime": booking_data[2],
                    "amount": booking_data[3]
                }
        
        # Создание договора
        c.execute("""
            INSERT INTO contracts 
            (contract_number, client_id, booking_id, contract_type, template_name, 
             status, data, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            contract_number,
            contract.client_id,
            contract.booking_id,
            contract.contract_type,
            contract.template_name,
            "draft",
            json.dumps(contract_data),
            current_user["id"]
        ))
        
        contract_id = c.fetchone()[0]
        conn.commit()
        
        log_info(f"✅ Договор {contract_number} создан", "api")
        
        return {
            "id": contract_id,
            "contract_number": contract_number,
            "status": "draft",
            "data": contract_data
        }
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка создания договора: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/contracts/{contract_id}")
async def update_contract(
    contract_id: int,
    contract: ContractUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить договор"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if contract.status:
            updates.append("status = %s")
            params.append(contract.status)
        
        if contract.data:
            updates.append("data = %s")
            params.append(json.dumps(contract.data))
        
        if contract.signed_at:
            updates.append("signed_at = %s")
            params.append(contract.signed_at)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")
        
        updates.append("updated_at = NOW()")
        params.append(contract_id)
        
        query = f"UPDATE contracts SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        
        log_info(f"✅ Договор {contract_id} обновлен", "api")
        
        return {"message": "Договор обновлен"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка обновления договора: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/contracts/{contract_id}/send")
async def send_contract(
    contract_id: int,
    send_data: ContractSend,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Отправить договор клиенту"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получение договора
        c.execute("""
            SELECT contract_number, pdf_path, client_id, data
            FROM contracts
            WHERE id = %s
        """, (contract_id,))
        
        contract = c.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        
        contract_number, pdf_path, client_id, data_json = contract
        contract_data = json.loads(data_json) if data_json else {}
        
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
        
        # Генерируем PDF если его еще нет
        if not pdf_path or not os.path.exists(pdf_path):
            from services.pdf_generator import generate_contract_pdf
            
            # Подготавливаем данные для PDF
            pdf_data = {
                "id": contract_id,
                "contract_number": contract_number,
                "client_name": client_name,
                "client_phone": client_phone,
                "client_email": client_email,
                **contract_data
            }
            
            # Генерируем PDF
            pdf_path = generate_contract_pdf(pdf_data, "/tmp")
            
            # Сохраняем путь к PDF
            c.execute("""
                UPDATE contracts
                SET pdf_path = %s, updated_at = NOW()
                WHERE id = %s
            """, (pdf_path, contract_id))
            conn.commit()
        
        # Отправляем в фоне
        from services.document_sender import send_document
        
        subject = f"Договор {contract_number}"
        message = f"Здравствуйте, {client_name}!\n\nНаправляем вам договор {contract_number} на подпись."
        
        background_tasks.add_task(
            send_document,
            send_data.delivery_method,
            send_data.recipient,
            subject,
            message,
            pdf_path,
            f"{contract_number}.pdf"
        )
        
        # Логирование отправки
        c.execute("""
            INSERT INTO contract_delivery_log
            (contract_id, delivery_method, recipient, status, sent_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (contract_id, send_data.delivery_method, send_data.recipient, "sent"))
        
        # Обновление времени отправки
        c.execute("""
            UPDATE contracts
            SET sent_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """, (contract_id,))
        
        conn.commit()
        
        log_info(f"✅ Договор {contract_number} отправлен через {send_data.delivery_method}", "api")
        
        return {"message": "Договор отправлен", "pdf_path": pdf_path}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка отправки договора: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить договор"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM contracts WHERE id = %s", (contract_id,))
        conn.commit()
        
        log_info(f"✅ Договор {contract_id} удален", "api")
        
        return {"message": "Договор удален"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка удаления договора: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
