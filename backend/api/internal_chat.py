"""
API для внутреннего чата между сотрудниками
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
import asyncio
from datetime import datetime

from core.config import DATABASE_NAME
from utils.utils import require_auth, check_permission
from utils.logger import log_error, log_info
from utils.email import send_email_async

router = APIRouter(tags=["Internal Chat"], prefix="/api/internal-chat")


# === HELPER FUNCTIONS ===

async def send_chat_email_notification(sender_name: str, recipient_email: str, recipient_name: str, message: str):
    """Отправить email уведомление о новом сообщении в чате"""
    if not recipient_email or '@' not in recipient_email:
        log_info(f"Пропуск email уведомления для {recipient_name} - email не указан", "internal_chat")
        return

    try:
        subject = f"💬 Новое сообщение от {sender_name}"

        text_message = f"""
Здравствуйте, {recipient_name}!

У вас новое сообщение от {sender_name} во внутреннем чате:

"{message}"

Войдите в систему Beauty CRM чтобы ответить.
        """

        html_message = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">💬 Новое сообщение</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <p style="color: #666; font-size: 16px;">Здравствуйте, {recipient_name}!</p>
              <p style="color: #666; font-size: 16px;">У вас новое сообщение от <strong>{sender_name}</strong>:</p>
              <div style="background-color: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin: 0;">"{message}"</p>
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 20px;">
                Войдите в систему Beauty CRM чтобы ответить.
              </p>
            </div>
          </body>
        </html>
        """

        await send_email_async(
            recipients=[recipient_email],
            subject=subject,
            message=text_message,
            html=html_message
        )

        log_info(f"📧 Email уведомление отправлено: {recipient_email}", "internal_chat")

    except Exception as e:
        log_error(f"Ошибка отправки email уведомления: {e}", "internal_chat")


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

    # Получаем информацию о получателе для email уведомления
    recipient_email = None
    recipient_name = None

    if recipient_id and not is_group:
        c.execute("""
            SELECT email, full_name
            FROM users
            WHERE id = ?
        """, (recipient_id,))

        recipient_info = c.fetchone()
        if recipient_info:
            recipient_email = recipient_info[0]
            recipient_name = recipient_info[1]

    conn.close()

    log_info(f"Internal message sent by {user['full_name']}", "internal_chat")

    # Отправляем email уведомление асинхронно (только для личных сообщений)
    if recipient_email and recipient_name and not is_group:
        asyncio.create_task(send_chat_email_notification(
            sender_name=user['full_name'],
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            message=message
        ))

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