
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from utils.utils import get_current_user
from utils.audit import get_audit_history

router = APIRouter()

@router.get("/admin/audit-log")
async def list_audit_log(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100),
    current_user: dict = Depends(get_current_user)
):
    """API: Получить историю действий (Audit Log)"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can access full audit log")
    
    history = get_audit_history(
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        action=action,
        limit=limit
    )
    return {"history": history}

@router.get("/admin/audit-log/summary")
async def get_audit_summary(
    current_user: dict = Depends(get_current_user)
):
    """API: Статистика действий для дашборда аудита"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    
    # Сводная статистика за 24 часа
    c.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failures,
            COUNT(DISTINCT user_id) as active_users
        FROM audit_log 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    """)
    totals = c.fetchone()
    
    # По типам действий
    c.execute("""
        SELECT action, COUNT(*) as count 
        FROM audit_log 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY action
    """)
    actions = {row[0]: row[1] for row in c.fetchall()}
    
    conn.close()
    return {
        "summary": {
            "total_24h": totals[0],
            "failures_24h": totals[1] or 0,
            "active_users_24h": totals[2],
            "actions_breakdown": actions
        }
    }

@router.delete("/admin/audit-log/clear")
async def clear_audit_log(
    current_user: dict = Depends(get_current_user)
):
    """API: Полная очистка журнала аудита (только для Директора)"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can clear audit log")
        
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Use CASCADE to also clear critical_actions table which depends on audit_log
        c.execute("TRUNCATE TABLE audit_log CASCADE")
        conn.commit()
        return {"success": True, "message": "Audit log cleared successfully"}
    except Exception as e:
        conn.rollback()
        from utils.logger import log_error
        log_error(f"Error clearing audit log: {e}", "audit")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/admin/audit-log/{log_id}")
async def delete_audit_log(
    log_id: int,
    current_user: dict = Depends(get_current_user)
):
    """API: Удаление одной записи аудита"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM audit_log WHERE id = %s", (log_id,))
        conn.commit()
        return {"success": True, "message": "Entry deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/admin/audit-log/delete-batch")
async def delete_audit_logs_batch(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """API: Массовое удаление записей аудита"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    log_ids = request.get("ids", [])
    if not log_ids:
        return {"success": True, "count": 0}
        
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM audit_log WHERE id IN %s", (tuple(log_ids),))
        count = c.rowcount
        conn.commit()
        return {"success": True, "count": count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
