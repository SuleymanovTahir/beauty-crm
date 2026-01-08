
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
