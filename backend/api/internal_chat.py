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
                ic.id, ic.sender_id, ic.receiver_id, ic.message,
                ic.is_read, ic.timestamp, ic.type,
                u1.full_name as sender_name,
                u2.full_name as recipient_name,
                ic.edited, ic.edited_at, ic.deleted_for_sender, ic.deleted_for_receiver, ic.reactions
            FROM internal_chat ic
            LEFT JOIN users u1 ON ic.sender_id = u1.id
            LEFT JOIN users u2 ON ic.receiver_id = u2.id
            WHERE (ic.sender_id = %s AND ic.receiver_id = %s)
               OR (ic.sender_id = %s AND ic.receiver_id = %s)
            ORDER BY ic.timestamp ASC
            LIMIT %s
        """, (user['id'], with_user_id, with_user_id, user['id'], limit))
    else:
        # Получаем все сообщения пользователя
        c.execute("""
            SELECT
                ic.id, ic.sender_id, ic.receiver_id, ic.message,
                ic.is_read, ic.timestamp, ic.type,
                u1.full_name as sender_name,
                u2.full_name as recipient_name,
                ic.edited, ic.edited_at, ic.deleted_for_sender, ic.deleted_for_receiver, ic.reactions
            FROM internal_chat ic
            LEFT JOIN users u1 ON ic.sender_id = u1.id
            LEFT JOIN users u2 ON ic.receiver_id = u2.id
            WHERE ic.sender_id = %s OR ic.receiver_id = %s
            ORDER BY ic.timestamp DESC
            LIMIT %s
        """, (user['id'], user['id'], limit))

    all_messages = c.fetchall()

    # Фильтруем удаленные сообщения
    messages = []
    for row in all_messages:
        deleted_for_sender = row[11]
        deleted_for_receiver = row[12]
        sender_id = row[1]

        # Пропускаем если удалено для текущего пользователя
        if user['id'] == sender_id and deleted_for_sender:
            continue
        if user['id'] != sender_id and deleted_for_receiver:
            continue

        import json
        reactions = row[13] if row[13] else []
        if isinstance(reactions, str):
            reactions = json.loads(reactions)

        messages.append({
            'id': row[0],
            'from_user_id': row[1],
            'to_user_id': row[2],
            'message': row[3],
            'is_read': bool(row[4]),
            'created_at': row[5],
            'type': row[6] or 'text',
            'sender_name': row[7],
            'recipient_name': row[8],
            'edited': bool(row[9]),
            'edited_at': row[10],
            'deleted_for_sender': deleted_for_sender,
            'deleted_for_receiver': deleted_for_receiver,
            'reactions': reactions
        })

    # Отмечаем сообщения как прочитанные
    if with_user_id:
        c.execute("""
            UPDATE internal_chat
            SET is_read = TRUE
            WHERE receiver_id = %s AND sender_id = %s AND is_read = FALSE
        """, (user['id'], with_user_id))
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
    msg_type = data.get('type', 'text')  # Default to 'text' if not specified

    if not message:
        return JSONResponse({"error": "Сообщение не может быть пустым"}, status_code=400)

    if not to_user_id:
        return JSONResponse({"error": "Не указан получатель"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    # Вставляем сообщение
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO internal_chat (sender_id, receiver_id, message, timestamp, type)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (user['id'], to_user_id, message, now, msg_type))

    message_id = c.fetchone()[0]
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
        SELECT u.id, u.username, u.full_name, u.role, u.email, u.photo,
               us.is_online, us.last_seen
        FROM users u
        LEFT JOIN user_status us ON u.id = us.user_id
        WHERE u.id != %s AND u.is_active = TRUE
        ORDER BY u.full_name
    """, (user['id'],))

    users = [{
        'id': row[0],
        'username': row[1],
        'full_name': row[2],
        'role': row[3],
        'email': row[4],
        'photo': row[5],
        'is_online': row[6] if row[6] is not None else False,
        'last_seen': row[7].isoformat() if row[7] else None
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
        WHERE receiver_id = %s AND is_read = FALSE
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

    c.execute("""
        UPDATE internal_chat
        SET is_read = TRUE
        WHERE receiver_id = %s AND sender_id = %s AND is_read = FALSE
    """, (user['id'], from_user_id))

    conn.commit()
    affected = c.rowcount
    conn.close()

    return {"success": True, "marked_count": affected}

@router.post("/messages/{message_id}/edit")
async def edit_message(
    message_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Редактировать сообщение (только в течение 10 минут)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    new_message = data.get('message')

    if not new_message:
        return JSONResponse({"error": "Новое сообщение не может быть пустым"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    # Проверяем, что сообщение принадлежит пользователю и не старше 10 минут
    c.execute("""
        SELECT sender_id, timestamp
        FROM internal_chat
        WHERE id = %s
    """, (message_id,))

    msg = c.fetchone()
    if not msg:
        conn.close()
        return JSONResponse({"error": "Сообщение не найдено"}, status_code=404)

    if msg[0] != user['id']:
        conn.close()
        return JSONResponse({"error": "Вы можете редактировать только свои сообщения"}, status_code=403)

    # Проверяем время (10 минут = 600 секунд)
    from datetime import datetime
    message_time = datetime.fromisoformat(msg[1])
    now = datetime.now()
    elapsed = (now - message_time).total_seconds()

    if elapsed > 600:
        conn.close()
        return JSONResponse({"error": "Сообщение можно редактировать только в течение 10 минут"}, status_code=403)

    # Обновляем сообщение
    c.execute("""
        UPDATE internal_chat
        SET message = %s, edited = TRUE, edited_at = %s
        WHERE id = %s
    """, (new_message, now.isoformat(), message_id))

    conn.commit()
    conn.close()

    return {"success": True}

@router.post("/messages/{message_id}/delete")
async def delete_message(
    message_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить сообщение (у себя или у всех)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    delete_for_everyone = data.get('delete_for_everyone', False)

    conn = get_db_connection()
    c = conn.cursor()

    # Проверяем, что сообщение существует и пользователь имеет право на удаление
    c.execute("""
        SELECT sender_id, receiver_id, timestamp
        FROM internal_chat
        WHERE id = %s
    """, (message_id,))

    msg = c.fetchone()
    if not msg:
        conn.close()
        return JSONResponse({"error": "Сообщение не найдено"}, status_code=404)

    sender_id, receiver_id, timestamp = msg

    # Пользователь может удалять только свои сообщения или сообщения, отправленные ему
    if user['id'] != sender_id and user['id'] != receiver_id:
        conn.close()
        return JSONResponse({"error": "Нет доступа к этому сообщению"}, status_code=403)

    if delete_for_everyone:
        # Удалить у всех могут только отправители и только в течение 10 минут
        if user['id'] != sender_id:
            conn.close()
            return JSONResponse({"error": "Удалить для всех может только отправитель"}, status_code=403)

        # Проверяем время (10 минут = 600 секунд)
        from datetime import datetime
        message_time = datetime.fromisoformat(timestamp)
        now = datetime.now()
        elapsed = (now - message_time).total_seconds()

        if elapsed > 600:
            conn.close()
            return JSONResponse({"error": "Удалить для всех можно только в течение 10 минут"}, status_code=403)

        # Помечаем как удаленное для обоих
        c.execute("""
            UPDATE internal_chat
            SET deleted_for_sender = TRUE, deleted_for_receiver = TRUE
            WHERE id = %s
        """, (message_id,))
    else:
        # Удаляем только для себя
        if user['id'] == sender_id:
            c.execute("""
                UPDATE internal_chat
                SET deleted_for_sender = TRUE
                WHERE id = %s
            """, (message_id,))
        else:
            c.execute("""
                UPDATE internal_chat
                SET deleted_for_receiver = TRUE
                WHERE id = %s
            """, (message_id,))

    conn.commit()
    conn.close()

    return {"success": True, "deleted_for_everyone": delete_for_everyone}

@router.post("/messages/{message_id}/react")
async def add_reaction(
    message_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить реакцию на сообщение"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    emoji = data.get('emoji')

    if not emoji:
        return JSONResponse({"error": "Не указана реакция"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    # Получаем текущие реакции
    c.execute("""
        SELECT reactions
        FROM internal_chat
        WHERE id = %s
    """, (message_id,))

    result = c.fetchone()
    if not result:
        conn.close()
        return JSONResponse({"error": "Сообщение не найдено"}, status_code=404)

    import json
    reactions = result[0] if result[0] else []
    if isinstance(reactions, str):
        reactions = json.loads(reactions)

    # Проверяем, есть ли уже реакция от этого пользователя
    user_reaction = next((r for r in reactions if r.get('user_id') == user['id']), None)

    if user_reaction:
        # Если пользователь ставит ту же реакцию - убираем её
        if user_reaction.get('emoji') == emoji:
            reactions = [r for r in reactions if r.get('user_id') != user['id']]
        else:
            # Меняем реакцию
            user_reaction['emoji'] = emoji
    else:
        # Добавляем новую реакцию
        reactions.append({
            'user_id': user['id'],
            'user_name': user.get('full_name', user['username']),
            'emoji': emoji
        })

    # Обновляем реакции
    c.execute("""
        UPDATE internal_chat
        SET reactions = %s::jsonb
        WHERE id = %s
    """, (json.dumps(reactions), message_id))

    conn.commit()
    conn.close()

    return {"success": True, "reactions": reactions}

@router.post("/status/online")
async def set_online(session_token: Optional[str] = Cookie(None)):
    """Установить статус онлайн"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    from datetime import datetime
    now = datetime.now()

    c.execute("""
        INSERT INTO user_status (user_id, is_online, last_seen, updated_at)
        VALUES (%s, TRUE, %s, %s)
        ON CONFLICT (user_id)
        DO UPDATE SET is_online = TRUE, updated_at = %s
    """, (user['id'], now, now, now))

    conn.commit()
    conn.close()

    return {"success": True}

@router.post("/status/offline")
async def set_offline(session_token: Optional[str] = Cookie(None)):
    """Установить статус оффлайн"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    from datetime import datetime
    now = datetime.now()

    c.execute("""
        INSERT INTO user_status (user_id, is_online, last_seen, updated_at)
        VALUES (%s, FALSE, %s, %s)
        ON CONFLICT (user_id)
        DO UPDATE SET is_online = FALSE, last_seen = %s, updated_at = %s
    """, (user['id'], now, now, now, now))

    conn.commit()
    conn.close()

    return {"success": True}
