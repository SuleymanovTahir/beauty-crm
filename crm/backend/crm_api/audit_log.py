"""
Audit Log API endpoints
"""
from fastapi import APIRouter, Cookie, Query, Request
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.audit import get_audit_history
from utils.logger import log_error
from db.connection import get_db_connection

router = APIRouter(tags=["Audit Log"])


@router.get("/audit-log")
async def get_audit_log_api(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    session_token: Optional[str] = Cookie(None),
):
    """Get audit log entries (directors only)"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["director", "admin"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        history = get_audit_history(
            action=action if action and action != "all" else None,
            entity_type=entity_type,
            limit=limit,
        )
        # Normalize datetime fields
        for entry in history:
            if entry.get("created_at") and hasattr(entry["created_at"], "isoformat"):
                entry["created_at"] = entry["created_at"].isoformat()
        return {"success": True, "history": history}
    except Exception as e:
        log_error(f"Error getting audit log: {e}", "audit_log_api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/audit-log/summary")
async def get_audit_summary_api(session_token: Optional[str] = Cookie(None)):
    """Get audit log summary stats"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["director", "admin"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("SELECT COUNT(*) FROM audit_log")
            total = (c.fetchone() or [0])[0]
            c.execute("SELECT COUNT(*) FROM audit_log WHERE success = false")
            errors = (c.fetchone() or [0])[0]
            c.execute("SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours'")
            today = (c.fetchone() or [0])[0]
            c.execute("SELECT COUNT(DISTINCT user_id) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours'")
            active_users = (c.fetchone() or [0])[0]
        finally:
            conn.close()
        return {
            "success": True,
            "summary": {
                "total_entries": total,
                "errors_today": errors,
                "actions_today": today,
                "active_users": active_users,
            }
        }
    except Exception as e:
        log_error(f"Error getting audit summary: {e}", "audit_log_api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/audit-log/{entry_id}")
async def delete_audit_entry_api(entry_id: int, session_token: Optional[str] = Cookie(None)):
    """Delete a single audit log entry"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["director", "admin"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("DELETE FROM audit_log WHERE id = %s", (entry_id,))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error deleting audit entry: {e}", "audit_log_api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/audit-log/delete-batch")
async def delete_audit_batch_api(request: Request, session_token: Optional[str] = Cookie(None)):
    """Batch delete audit log entries"""
    user = require_auth(session_token)
    if not user or user.get("role") not in ["director", "admin"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        data = await request.json()
        ids = data.get("ids", [])
        if not ids:
            return {"success": True}
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("DELETE FROM audit_log WHERE id = ANY(%s)", (ids,))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error batch deleting audit entries: {e}", "audit_log_api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/audit-log")
async def clear_audit_log_api(session_token: Optional[str] = Cookie(None)):
    """Clear all audit log entries"""
    user = require_auth(session_token)
    if not user or user.get("role") != "director":
        return JSONResponse({"error": "Forbidden - director only"}, status_code=403)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("DELETE FROM audit_log")
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        log_error(f"Error clearing audit log: {e}", "audit_log_api")
        return JSONResponse({"error": str(e)}, status_code=500)
