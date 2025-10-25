"""
API для реакций на сообщения
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

from config import DATABASE_NAME
from utils import require_auth
from logger import log_info, log_error

router = APIRouter(tags=["Reactions"])


@router.post("/chat/react")
async def react_to_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить/удалить реакцию на сообщение"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        if not message_id or not emoji:
            return JSONResponse({"error": "Missing data"}, status_code=400)
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Проверяем есть ли уже реакция
        c.execute("""
            SELECT id FROM message_reactions 
            WHERE message_id = ? AND user_id = ? AND emoji = ?
        """, (message_id, user["id"], emoji))
        
        existing = c.fetchone()
        
        if existing:
            # Удаляем реакцию (toggle)
            c.execute("DELETE FROM message_reactions WHERE id = ?", (existing[0],))
            log_info(f"Removed reaction {emoji} from message {message_id}", "reactions")
        else:
            # Добавляем реакцию
            c.execute("""
                INSERT INTO message_reactions (message_id, emoji, user_id, created_at)
                VALUES (?, ?, ?, ?)
            """, (message_id, emoji, user["id"], datetime.now().isoformat()))
            log_info(f"Added reaction {emoji} to message {message_id}", "reactions")
        
        conn.commit()
        
        # Получаем все реакции для сообщения
        c.execute("""
            SELECT emoji, COUNT(*) as count 
            FROM message_reactions 
            WHERE message_id = ? 
            GROUP BY emoji
        """, (message_id,))
        
        reactions = {row[0]: row[1] for row in c.fetchall()}
        conn.close()
        
        return {"success": True, "reactions": reactions}
        
    except Exception as e:
        log_error(f"Error in react_to_message: {e}", "reactions", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/chat/reactions/{message_id}")
async def get_message_reactions(
    message_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить все реакции на сообщение"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            SELECT emoji, COUNT(*) as count 
            FROM message_reactions 
            WHERE message_id = ? 
            GROUP BY emoji
        """, (message_id,))
        
        reactions = {row[0]: row[1] for row in c.fetchall()}
        conn.close()
        
        return {"reactions": reactions}
        
    except Exception as e:
        log_error(f"Error getting reactions: {e}", "reactions")
        return JSONResponse({"error": str(e)}, status_code=500)