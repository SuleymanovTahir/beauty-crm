"""
API для заметок клиентов
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Notes"])


@router.get("/clients/{client_id}/notes")
async def get_client_notes(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить все заметки клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT n.id, n.note_text, n.created_at, u.full_name
            FROM client_notes n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.client_id = ?
            ORDER BY n.created_at DESC
        """, (client_id,))

        notes = [
            {
                "id": row[0],
                "text": row[1],
                "created_at": row[2],
                "created_by": row[3]
            }
            for row in c.fetchall()
        ]

        conn.close()
        return {"notes": notes}

    except Exception as e:
        log_error(f"Error getting notes: {e}", "notes")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/clients/{client_id}/notes")
async def add_client_note(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить заметку"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        note_text = data.get('note_text')
        
        if not note_text:
            return JSONResponse({"error": "Missing note_text"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO client_notes (client_id, note_text, created_by)
            VALUES (?, ?, ?)
        """, (client_id, note_text, user["id"]))
        
        conn.commit()
        note_id = c.lastrowid
        conn.close()
        
        log_info(f"Added note for client {client_id}", "notes")
        return {"success": True, "note_id": note_id}
        
    except Exception as e:
        log_error(f"Error adding note: {e}", "notes")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/clients/{client_id}/notes/{note_id}")
async def delete_client_note(
    client_id: str,
    note_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить заметку"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("DELETE FROM client_notes WHERE id = ? AND client_id = ?", 
                 (note_id, client_id))
        
        conn.commit()
        conn.close()
        
        log_info(f"Deleted note {note_id}", "notes")
        return {"success": True}
        
    except Exception as e:
        log_error(f"Error deleting note: {e}", "notes")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/clients/{client_id}/notes/{note_id}")
async def update_client_note(
    client_id: str,
    note_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить заметку"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        note_text = data.get('note_text')
        
        if not note_text:
            return JSONResponse({"error": "Missing note_text"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что заметка принадлежит этому клиенту
        c.execute("""
            SELECT created_by FROM client_notes 
            WHERE id = ? AND client_id = ?
        """, (note_id, client_id))
        
        result = c.fetchone()
        if not result:
            conn.close()
            return JSONResponse({"error": "Note not found"}, status_code=404)
        
        # Обновляем заметку
        c.execute("""
            UPDATE client_notes 
            SET note_text = ?
            WHERE id = ? AND client_id = ?
        """, (note_text, note_id, client_id))
        
        conn.commit()
        conn.close()
        
        log_info(f"Updated note {note_id} for client {client_id}", "notes")
        return {"success": True}
        
    except Exception as e:
        log_error(f"Error updating note: {e}", "notes")
        return JSONResponse({"error": str(e)}, status_code=500)