"""
API для внутреннего чата между сотрудниками
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

from config import DATABASE_NAME
from utils import require_auth, check_permission
from logger import log_error, log_info

router = APIRouter(tags=["Internal Chat"], prefix="/api/internal-chat")


@router.get("/messages")
async def get_internal_messages(
    limit: int = 50,
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения внутреннего чата"""
    user = require_auth(session_token)
    if not user or not check_permission(user, 'internal_chat'):
        return JSONResponse({"error": "Нет доступа к внутреннему чату"}, status_code=403)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT 
            ic.id, ic.sender_id, ic.recipient_id, ic.message, 
            ic.is_group, ic.is_read, ic.created_at,
            u1.full_name as sender_name,
            u2.full_name as recipient_name
        FROM internal_chat ic
        LEFT JOIN users u1 ON ic.sender_id = u1.id
        LEFT JOIN users u2 ON ic.recipient_id = u2.id
        WHERE ic.sender_id = ? OR ic.recipient_id = ? OR ic.is_group = 1
        ORDER BY ic.created_at DESC
        LIMIT ?
    """, (user['id'], user['id'], limit))
    
    messages = [{
        'id': row[0],
        'sender_id': row[1],
        'recipient_id': row[2],
        'message': row[3],
        'is_group': bool(row[4]),
        'is_read': bool(row[5]),
        'created_at': row[6],
        'sender_name': row[7],
        'recipient_name': row[8]
    } for row in c.fetchall()]
    
    conn.close()
    
    return {"messages": messages}


@router.post("/send")
async def send_internal_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение в внутренний чат"""
    user = require_auth(session_token)
    if not user or not check_permission(user, 'internal_chat'):
        return JSONResponse({"error": "Нет доступа к внутреннему чату"}, status_code=403)
    
    data = await request.json()
    message = data.get('message')
    recipient_id = data.get('recipient_id')  # None для группового
    is_group = data.get('is_group', False)
    
    if not message:
        return JSONResponse({"error": "Сообщение не может быть пустым"}, status_code=400)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        INSERT INTO internal_chat (sender_id, recipient_id, message, is_group)
        VALUES (?, ?, ?, ?)
    """, (user['id'], recipient_id, message, 1 if is_group else 0))
    
    message_id = c.lastrowid
    conn.commit()
    conn.close()
    
    log_info(f"Internal message sent by {user['full_name']}", "internal_chat")
    
    return {
        "success": True,
        "message_id": message_id
    }


@router.get("/users")
async def get_chat_users(session_token: Optional[str] = Cookie(None)):
    """Получить список пользователей для чата"""
    user = require_auth(session_token)
    if not user or not check_permission(user, 'internal_chat'):
        return JSONResponse({"error": "Нет доступа"}, status_code=403)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""
        SELECT id, username, full_name, role
        FROM users
        WHERE id != ? AND is_active = 1
        ORDER BY full_name
    """, (user['id'],))
    
    users = [{
        'id': row[0],
        'username': row[1],
        'full_name': row[2],
        'role': row[3]
    } for row in c.fetchall()]
    
    conn.close()
    
    return {"users": users}