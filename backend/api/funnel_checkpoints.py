"""
API для управления контрольными точками воронки
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import json

from core.auth import get_current_user
from db.connection import get_db_connection
from utils.logger import log_info, log_warning

router = APIRouter()


class CheckpointCreate(BaseModel):
    stage_id: int
    name: str
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_required: bool = False
    auto_complete_conditions: Optional[dict] = None
    notification_settings: Optional[dict] = None
    is_active: bool = True


class CheckpointUpdate(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_required: Optional[bool] = None
    auto_complete_conditions: Optional[dict] = None
    notification_settings: Optional[dict] = None
    is_active: Optional[bool] = None


class CheckpointProgressUpdate(BaseModel):
    status: str  # pending, completed, skipped
    notes: Optional[str] = None


@router.get("/funnel/checkpoints")
async def get_checkpoints(
    stage_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список контрольных точек"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """
            SELECT fc.*, fs.name as stage_name
            FROM funnel_checkpoints fc
            LEFT JOIN funnel_stages fs ON fc.stage_id = fs.id
            WHERE 1=1
        """
        params = []
        
        if stage_id:
            query += " AND fc.stage_id = %s"
            params.append(stage_id)
        
        if is_active is not None:
            query += " AND fc.is_active = %s"
            params.append(is_active)
        
        query += " ORDER BY fc.stage_id, fc.sort_order"
        
        c.execute(query, params)
        checkpoints = []
        for row in c.fetchall():
            checkpoints.append({
                "id": row[0],
                "stage_id": row[1],
                "name": row[2],
                "name_ru": row[3],
                "name_en": row[4],
                "name_ar": row[5],
                "description": row[6],
                "sort_order": row[7],
                "is_required": row[8],
                "auto_complete_conditions": row[9],
                "notification_settings": row[10],
                "is_active": row[11],
                "created_at": row[12],
                "updated_at": row[13],
                "stage_name": row[14]
            })
        
        return {"checkpoints": checkpoints}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения контрольных точек: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/funnel/checkpoints")
async def create_checkpoint(
    checkpoint: CheckpointCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать контрольную точку"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO funnel_checkpoints
            (stage_id, name, name_ru, name_en, name_ar, description, sort_order,
             is_required, auto_complete_conditions, notification_settings, is_active,
             created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            checkpoint.stage_id,
            checkpoint.name,
            checkpoint.name_ru,
            checkpoint.name_en,
            checkpoint.name_ar,
            checkpoint.description,
            checkpoint.sort_order,
            checkpoint.is_required,
            json.dumps(checkpoint.auto_complete_conditions) if checkpoint.auto_complete_conditions else None,
            json.dumps(checkpoint.notification_settings) if checkpoint.notification_settings else None,
            checkpoint.is_active
        ))
        
        checkpoint_id = c.fetchone()[0]
        conn.commit()
        
        log_info(f"✅ Контрольная точка {checkpoint.name} создана (ID: {checkpoint_id})", "api")
        
        return {"id": checkpoint_id, "message": "Контрольная точка создана"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка создания контрольной точки: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/funnel/checkpoints/{checkpoint_id}")
async def update_checkpoint(
    checkpoint_id: int,
    checkpoint: CheckpointUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить контрольную точку"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        for field, value in checkpoint.dict(exclude_unset=True).items():
            if field in ['auto_complete_conditions', 'notification_settings'] and value:
                updates.append(f"{field} = %s")
                params.append(json.dumps(value))
            else:
                updates.append(f"{field} = %s")
                params.append(value)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")
        
        updates.append("updated_at = NOW()")
        params.append(checkpoint_id)
        
        query = f"UPDATE funnel_checkpoints SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        
        log_info(f"✅ Контрольная точка {checkpoint_id} обновлена", "api")
        
        return {"message": "Контрольная точка обновлена"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка обновления контрольной точки: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/funnel/checkpoints/{checkpoint_id}")
async def delete_checkpoint(
    checkpoint_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить контрольную точку"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM funnel_checkpoints WHERE id = %s", (checkpoint_id,))
        conn.commit()
        
        log_info(f"✅ Контрольная точка {checkpoint_id} удалена", "api")
        
        return {"message": "Контрольная точка удалена"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка удаления контрольной точки: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/funnel/clients/{client_id}/progress")
async def get_client_progress(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить прогресс клиента по контрольным точкам"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT ccp.*, fc.name as checkpoint_name, fc.stage_id,
                   u.full_name as completed_by_name
            FROM client_checkpoint_progress ccp
            LEFT JOIN funnel_checkpoints fc ON ccp.checkpoint_id = fc.id
            LEFT JOIN users u ON ccp.completed_by = u.id
            WHERE ccp.client_id = %s
            ORDER BY fc.stage_id, fc.sort_order
        """, (client_id,))
        
        progress = []
        for row in c.fetchall():
            progress.append({
                "id": row[0],
                "client_id": row[1],
                "checkpoint_id": row[2],
                "status": row[3],
                "completed_at": row[4],
                "completed_by": row[5],
                "notes": row[6],
                "created_at": row[7],
                "checkpoint_name": row[8],
                "stage_id": row[9],
                "completed_by_name": row[10]
            })
        
        return {"progress": progress}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения прогресса клиента: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/funnel/clients/{client_id}/checkpoints/{checkpoint_id}")
async def update_client_checkpoint(
    client_id: str,
    checkpoint_id: int,
    progress: CheckpointProgressUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить прогресс клиента по контрольной точке"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверка существования записи
        c.execute("""
            SELECT id FROM client_checkpoint_progress
            WHERE client_id = %s AND checkpoint_id = %s
        """, (client_id, checkpoint_id))
        
        existing = c.fetchone()
        
        if existing:
            # Обновление существующей записи
            updates = ["status = %s"]
            params = [progress.status]
            
            if progress.status == "completed":
                updates.append("completed_at = NOW()")
                updates.append("completed_by = %s")
                params.append(current_user["id"])
            
            if progress.notes:
                updates.append("notes = %s")
                params.append(progress.notes)
            
            params.extend([client_id, checkpoint_id])
            
            query = f"""
                UPDATE client_checkpoint_progress
                SET {', '.join(updates)}
                WHERE client_id = %s AND checkpoint_id = %s
            """
            c.execute(query, params)
        else:
            # Создание новой записи
            c.execute("""
                INSERT INTO client_checkpoint_progress
                (client_id, checkpoint_id, status, completed_at, completed_by, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                client_id,
                checkpoint_id,
                progress.status,
                datetime.now() if progress.status == "completed" else None,
                current_user["id"] if progress.status == "completed" else None,
                progress.notes
            ))
        
        conn.commit()
        
        log_info(f"✅ Прогресс клиента {client_id} по точке {checkpoint_id} обновлен", "api")
        
        return {"message": "Прогресс обновлен"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка обновления прогресса: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
