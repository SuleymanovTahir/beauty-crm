"""
API для внутреннего чата между сотрудниками
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

import asyncio
from datetime import datetime

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
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

        # Обновляем статус отправки email в БД
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            UPDATE internal_chat
            SET email_sent = 1, email_sent_at = %s
            WHERE to_user_id = %s AND from_user_id = (
                SELECT id FROM users WHERE full_name = %s
            )
            ORDER BY created_at DESC
            LIMIT 1
        """, (datetime.now().isoformat(), recipient_email, sender_name))
        conn.commit()
        conn.close()

        log_info(f"📧 Email уведомление отправлено: {recipient_email}", "internal_chat")

    except Exception as e:
        log_error(f"Ошибка отправки email уведомления: {e}", "internal_chat")

@router.get("/messages")
async def get_internal_messages(
    with_user_id: Optional[int] = None,
    limit: int = 50,
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения внутреннего чата"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    # Если указан конкретный пользователь, получаем только переписку с ним
    if with_user_id:
        c.execute("""
            SELECT
                ic.id, ic.from_user_id, ic.to_user_id, ic.message,
                ic.is_read, ic.created_at, ic.email_sent,
                u1.full_name as sender_name,
                u2.full_name as recipient_name
            FROM internal_chat ic
            LEFT JOIN users u1 ON ic.from_user_id = u1.id
            LEFT JOIN users u2 ON ic.to_user_id = u2.id
            WHERE (ic.from_user_id = %s AND ic.to_user_id = %s)
               OR (ic.from_user_id = %s AND ic.to_user_id = %s)
            ORDER BY ic.created_at ASC
            LIMIT %s
        """, (user['id'], with_user_id, with_user_id, user['id'], limit))
    else:
        # Получаем все сообщения пользователя
        c.execute("""
            SELECT
                ic.id, ic.from_user_id, ic.to_user_id, ic.message,
                ic.is_read, ic.created_at, ic.email_sent,
                u1.full_name as sender_name,
                u2.full_name as recipient_name
            FROM internal_chat ic
            LEFT JOIN users u1 ON ic.from_user_id = u1.id
            LEFT JOIN users u2 ON ic.to_user_id = u2.id
            WHERE ic.from_user_id = %s OR ic.to_user_id = %s
            ORDER BY ic.created_at DESC
            LIMIT %s
        """, (user['id'], user['id'], limit))

    messages = [{
        'id': row[0],
        'from_user_id': row[1],
        'to_user_id': row[2],
        'message': row[3],
        'is_read': bool(row[4]),
        'created_at': row[5],
        'email_sent': bool(row[6]),
        'sender_name': row[7],
        'recipient_name': row[8]
    } for row in c.fetchall()]

    # Отмечаем сообщения как прочитанные
    if with_user_id:
        c.execute("""
            UPDATE internal_chat
            SET is_read = TRUE, read_at = %s
            WHERE to_user_id = %s AND from_user_id = %s AND is_read = FALSE
        """, (datetime.now().isoformat(), user['id'], with_user_id))
        conn.commit()

    conn.close()

    return {"messages": messages}

@router.post("/send")
async def send_internal_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение в внутренний чат"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    message = data.get('message')
    to_user_id = data.get('to_user_id')

    if not message:
        return JSONResponse({"error": "Сообщение не может быть пустым"}, status_code=400)

    if not to_user_id:
        return JSONResponse({"error": "Не указан получатель"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    # Вставляем сообщение
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO internal_chat (from_user_id, to_user_id, message, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
    """, (user['id'], to_user_id, message, now, now))

    message_id = c.lastrowid
    conn.commit()

    # Получаем информацию о получателе для email уведомления
    c.execute("""
        SELECT email, full_name
        FROM users
        WHERE id = %s
    """, (to_user_id,))

    recipient_info = c.fetchone()
    conn.close()

    log_info(f"Internal message sent by {user.get('full_name', user['username'])}", "internal_chat")

    # Отправляем email уведомление асинхронно
    if recipient_info and recipient_info[0]:
        asyncio.create_task(send_chat_email_notification(
            sender_name=user.get('full_name', user['username']),
            recipient_email=recipient_info[0],
            recipient_name=recipient_info[1],
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
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT id, username, full_name, role, email
        FROM users
        WHERE id != %s AND is_active = TRUE
        ORDER BY full_name
    """, (user['id'],))

    users = [{
        'id': row[0],
        'username': row[1],
        'full_name': row[2],
        'role': row[3],
        'email': row[4]
    } for row in c.fetchall()]

    conn.close()

    return {"users": users}

@router.get("/unread-count")
async def get_unread_count(session_token: Optional[str] = Cookie(None)):
    """Получить количество непрочитанных сообщений"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT COUNT(*)
        FROM internal_chat
        WHERE to_user_id = %s AND is_read = FALSE
    """, (user['id'],))

    count = c.fetchone()[0]
    conn.close()

    return {"unread_count": count}

@router.post("/mark-read")
async def mark_messages_read(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отметить сообщения как прочитанные"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    from_user_id = data.get('from_user_id')

    if not from_user_id:
        return JSONResponse({"error": "Не указан отправитель"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now().isoformat()
    c.execute("""
        UPDATE internal_chat
        SET is_read = TRUE, read_at = %s
        WHERE to_user_id = %s AND from_user_id = %s AND is_read = FALSE
    """, (now, user['id'], from_user_id))

    conn.commit()
    affected = c.rowcount
    conn.close()

    return {"success": True, "marked_count": affected}
