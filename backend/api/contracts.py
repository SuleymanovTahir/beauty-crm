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
    delivery_method: str  # email, whatsapp, telegram, instagram
    recipient: str

router = APIRouter()


@router.get("/contracts/stages")
async def get_contract_stages(current_user: dict = Depends(get_current_user)):
    """Получить список стадий договоров"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, key, color, order_index FROM contract_stages WHERE is_active = TRUE ORDER BY order_index")
        stages = []
        for row in c.fetchall():
            stages.append({"id": row[0], "name": row[1], "key": row[2], "color": row[3], "order_index": row[4]})
        return stages
    finally:
        conn.close()


@router.post("/contracts/stages")
async def create_contract_stage(
    stage: StageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новую стадию договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        key = stage.name.lower().replace(" ", "_")[:50]
        c.execute("""
            INSERT INTO contract_stages (name, key, color, order_index)
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


@router.put("/contracts/stages/{stage_id}")
async def update_contract_stage(
    stage_id: int,
    stage: StageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить стадию договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE contract_stages SET name = %s, color = %s WHERE id = %s", (stage.name, stage.color, stage_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/contracts/stages/{stage_id}")
async def delete_contract_stage(
    stage_id: int,
    fallback_stage_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Удалить стадию договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if fallback_stage_id:
            c.execute("UPDATE contracts SET stage_id = %s WHERE stage_id = %s", (fallback_stage_id, stage_id))
        c.execute("DELETE FROM contract_stages WHERE id = %s", (stage_id,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/contracts/stages/reorder")
async def reorder_contract_stages(
    request: ReorderStagesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Изменить порядок стадий"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        for idx, stage_id in enumerate(request.ordered_ids):
            c.execute("UPDATE contract_stages SET order_index = %s WHERE id = %s", (idx, stage_id))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()




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
        
        # Ограничение прав доступа для менеджеров и продажников
        user_role = current_user.get("role")
        if user_role in ["sales", "manager"]:
            # Они видят все кроме офисных (трудовой и аренда)
            query += " AND (c.contract_type NOT IN ('employment', 'rental') OR c.contract_type IS NULL)"
        
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
                "stage_id": row[7],
                "data": row[8],
                "pdf_path": row[9],
                "created_by": row[10],
                "created_at": row[11],
                "updated_at": row[12],
                "sent_at": row[13],
                "signed_at": row[14],
                "client_name": row[15],
                "client_phone": row[16],
                "created_by_name": row[17]
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
        
        # Получение начальной стадии
        c.execute("SELECT id FROM contract_stages WHERE key = 'draft' LIMIT 1")
        res = c.fetchone()
        stage_id = res[0] if res else None

        # Создание договора
        c.execute("""
            INSERT INTO contracts 
            (contract_number, client_id, booking_id, contract_type, template_name, 
             status, stage_id, data, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            contract_number,
            contract.client_id,
            contract.booking_id,
            contract.contract_type,
            contract.template_name,
            "draft",
            stage_id,
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
        
        if contract.stage_id is not None:
            updates.append("stage_id = %s")
            params.append(contract.stage_id)
            # Синхронизация status с key стадии для обратной совместимости
            c.execute("SELECT key FROM contract_stages WHERE id = %s", (contract.stage_id,))
            res = c.fetchone()
            if res:
                updates.append("status = %s")
                params.append(res[0])
        
        if contract.contract_type:
            updates.append("contract_type = %s")
            params.append(contract.contract_type)
        
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


# ===== ТИПЫ ДОГОВОРОВ =====

class ContractTypeCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class ContractTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.get("/contract-types")
async def get_contract_types():
    """Получить список типов договоров"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, code, description, is_system FROM contract_types ORDER BY id")
        types = []
        for row in c.fetchall():
            types.append({
                "id": row[0],
                "name": row[1],
                "code": row[2],
                "description": row[3],
                "is_system": row[4]
            })
        return {"types": types}
    finally:
        conn.close()

@router.post("/contract-types")
async def create_contract_type(
    type_data: ContractTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый тип договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Check if code exists
        c.execute("SELECT 1 FROM contract_types WHERE code = %s", (type_data.code,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Тип с таким кодом уже существует")

        c.execute("""
            INSERT INTO contract_types (name, code, description)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (type_data.name, type_data.code, type_data.description))
        
        type_id = c.fetchone()[0]
        conn.commit()
        log_info(f"✅ Тип договора '{type_data.name}' создан", "api")
        return {"id": type_id, "message": "Тип создан"}
    finally:
        conn.close()

@router.put("/contract-types/{type_id}")
async def update_contract_type(
    type_id: int,
    type_data: ContractTypeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить тип договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        updates = []
        params = []
        if type_data.name:
            updates.append("name = %s")
            params.append(type_data.name)
        if type_data.description:
            updates.append("description = %s")
            params.append(type_data.description)
            
        if not updates:
            return {"message": "Нет данных для обновления"}
            
        params.append(type_id)
        c.execute(f"UPDATE contract_types SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return {"message": "Тип обновлен"}
    finally:
        conn.close()

@router.delete("/contract-types/{type_id}")
async def delete_contract_type(
    type_id: int,
    delete_documents: bool = Query(False, description="Удалить все документы этого типа"),
    current_user: dict = Depends(get_current_user)
):
    """Удалить тип договора"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Get type info
        c.execute("SELECT code, is_system FROM contract_types WHERE id = %s", (type_id,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Тип не найден")
        
        code, is_system = row
        
        # if is_system:
        #    raise HTTPException(status_code=400, detail="Нельзя удалить системный тип")
        
        if delete_documents:
            c.execute("DELETE FROM contracts WHERE contract_type = %s", (code,))
        else:
            c.execute("UPDATE contracts SET contract_type = NULL WHERE contract_type = %s", (code,))
            
        c.execute("DELETE FROM contract_types WHERE id = %s", (type_id,))
        conn.commit()
        log_info(f"✅ Тип договора {code} удален (delete_documents={delete_documents})", "api")
        return {"message": "Тип удален"}
    finally:
        conn.close()
