"""
API для внутреннего чата между сотрудниками
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional

import asyncio
from datetime import datetime
import os
import base64

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from db.settings import get_salon_settings
from utils.utils import require_auth
from utils.logger import log_error, log_info
from utils.email import send_email_async

router = APIRouter(tags=["Internal Chat"], prefix="/api/internal-chat")

# Директория для хранения записей
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# === HELPER FUNCTIONS ===

async def send_chat_email_notification(sender_name: str, recipient_email: str, recipient_name: str, message: str):
    """Отправить email уведомление о новом сообщении в чате"""
    if not recipient_email or '@' not in recipient_email:
        log_info(f"Пропуск email уведомления для {recipient_name} - email не указан", "internal_chat")
        return

    try:
        from core.config import APP_NAME
        salon = get_salon_settings()
        salon_name = salon.get('name') or APP_NAME

        subject = f"💬 Новое сообщение от {sender_name}"

        text_message = f"""
Здравствуйте, {recipient_name}!

У вас новое сообщение от {sender_name} во внутреннем чате:

"{message}"

Войдите в систему {salon_name} чтобы ответить.
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
                Войдите в систему {salon_name} чтобы ответить.
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
    language: str = Query('ru', description="Language code"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения внутреннего чата"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

    # Если указан конкретный пользователь, получаем только переписку с ним
    if with_user_id:
        c.execute(f"""
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
        c.execute(f"""
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
    from datetime import timezone
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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

    # Отправляем email уведомление асинхронно (только для обычных текстовых сообщений)
    if recipient_info and recipient_info[0] and msg_type not in ['call_log', 'system']:
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
async def get_chat_users(
    language: str = Query('ru', description="Language code"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить список пользователей для чата"""
    # Debug log
    log_info(f"[InternalChat] Requesting users. Token present: {bool(session_token)}", "DEBUG_MOBILE")
    
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    import time
    start_time = time.time()

    languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

    # Исключаем клиентов из списка внутреннего чата для ускорения загрузки
    # (hundreds of users handling: staff only)
    c.execute(f"""
        SELECT DISTINCT ON (u.id) u.id, u.username, u.full_name, 
               u.role, u.email, u.photo,
               us.is_online, us.last_seen, us.is_dnd
        FROM users u
        LEFT JOIN user_status us ON u.id = us.user_id
        WHERE u.id != %s 
          AND u.is_active = TRUE 
          AND u.deleted_at IS NULL
          AND u.role != 'guest'
        ORDER BY u.id, u.full_name
    """, (user['id'],))
    
    db_duration = time.time() - start_time
    if db_duration > 1.0:
        log_info(f"⚠️ SLOW QUERY: get_chat_users took {db_duration:.4f}s", "perf")
    else:
        log_info(f"⏱️ get_chat_users query took {db_duration:.4f}s", "perf")


    users = []
    for row in c.fetchall():
        uid, username, full_name, role, email, photo, is_online, last_seen, is_dnd = row
        
        # Logic to add cache buster - use timestamp logic if needed, but without updated_at column
        # We can use current time or just assume photo URL changes if updated completely.
        # Ideally we should keep updated_at in DB, but since it's missing, let's skip cache busting based on it.
        final_photo = photo

        users.append({
            'id': uid,
            'username': username,
            'full_name': full_name,
            'role': role,
            'email': email,
            'photo': final_photo,
            'is_online': is_online if is_online is not None else False,
            'is_dnd': is_dnd if is_dnd is not None else False,
            'last_seen': last_seen.isoformat() if last_seen else None
        })



    conn.close()
    
    response = JSONResponse({"users": users})
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

@router.get("/unread-count")
def get_unread_count(session_token: Optional[str] = Cookie(None)):
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

# ==================== RECORDINGS ENDPOINTS ====================

@router.post("/start-recording")
async def start_recording(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Начать запись WebRTC звонка"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    receiver_id = data.get('receiver_id')

    if not receiver_id:
        return JSONResponse({"error": "Не указан получатель"}, status_code=400)

    # Создаем запись в БД для последующего сохранения
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO chat_recordings (sender_id, receiver_id, recording_type, created_at)
            VALUES (%s, %s, 'audio', %s)
            RETURNING id
        """, (user['id'], receiver_id, datetime.now().isoformat()))

        recording_id = c.fetchone()[0]
        conn.commit()

        log_info(f"Recording started: {recording_id} by {user.get('full_name')}", "internal_chat")

        return {
            "success": True,
            "recording_id": recording_id
        }

    except Exception as e:
        conn.rollback()
        log_error(f"Error starting recording: {e}", "internal_chat")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.post("/stop-recording")
async def stop_recording(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Остановить и сохранить запись WebRTC звонка"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    data = await request.json()
    recording_id = data.get('recording_id')
    audio_blob = data.get('audio_blob')  # base64 encoded audio

    if not recording_id or not audio_blob:
        return JSONResponse({"error": "Неполные данные"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Получить информацию о записи
        c.execute("""
            SELECT sender_id, receiver_id
            FROM chat_recordings
            WHERE id = %s
        """, (recording_id,))

        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Запись не найдена"}, status_code=404)

        sender_id, receiver_id = row

        # Проверить, что пользователь имеет право сохранять эту запись
        if sender_id != user['id'] and receiver_id != user['id']:
            return JSONResponse({"error": "Нет прав для сохранения этой записи"}, status_code=403)

        # Получить имена участников для автоматического названия
        c.execute("SELECT full_name FROM users WHERE id = %s", (sender_id,))
        sender_name = c.fetchone()[0]

        c.execute("SELECT full_name FROM users WHERE id = %s", (receiver_id,))
        receiver_name = c.fetchone()[0]

        # Генерируем имя файла
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_{recording_id}_{timestamp}.webm"
        file_path = os.path.join(RECORDINGS_DIR, filename)

        # Декодируем и сохраняем файл
        audio_data = base64.b64decode(audio_blob.split(',')[1] if ',' in audio_blob else audio_blob)
        with open(file_path, 'wb') as f:
            f.write(audio_data)

        # Получить размер файла
        file_size = os.path.getsize(file_path)

        # Получить ID папки "Внутренний чат"
        folder_id = None
        try:
            c.execute("SELECT id FROM recording_folders WHERE name = 'Внутренний чат' AND parent_id IS NULL AND is_deleted = FALSE LIMIT 1")
            folder_row = c.fetchone()
            if folder_row:
                folder_id = folder_row[0]
        except Exception:
            pass

        # Генерируем автоматическое название
        date_str = datetime.now().strftime('%d.%m.%Y %H:%M')
        custom_name = f"{sender_name} - {receiver_name} - {date_str}"

        # Обновляем запись в БД
        c.execute("""
            UPDATE chat_recordings
            SET recording_file = %s,
                recording_url = %s,
                file_size = %s,
                file_format = 'webm',
                custom_name = %s,
                folder_id = %s
            WHERE id = %s
        """, (filename, f"/static/recordings/{filename}", file_size, custom_name, folder_id, recording_id))

        conn.commit()

        log_info(f"Recording saved: {recording_id} - {custom_name}", "internal_chat")

        return {
            "success": True,
            "recording_id": recording_id,
            "filename": filename,
            "url": f"/static/recordings/{filename}",
            "custom_name": custom_name
        }

    except Exception as e:
        conn.rollback()
        log_error(f"Error stopping recording: {e}", "internal_chat")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.get("/recordings")
async def get_chat_recordings(
    session_token: Optional[str] = Cookie(None)
):
    """Получить список записей для текущего пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Требуется авторизация"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Director и Admin видят все записи
        is_admin = user.get('role') in ['director', 'admin']

        if is_admin:
            c.execute("""
                SELECT
                    cr.id,
                    cr.sender_id,
                    cr.receiver_id,
                    cr.custom_name,
                    cr.recording_file,
                    cr.recording_url,
                    cr.duration,
                    cr.file_size,
                    cr.file_format,
                    cr.created_at,
                    cr.folder_id,
                    cr.is_archived,
                    cr.tags,
                    cr.notes,
                    u1.full_name as sender_name,
                    u2.full_name as receiver_name
                FROM chat_recordings cr
                LEFT JOIN users u1 ON u1.id = cr.sender_id
                LEFT JOIN users u2 ON u2.id = cr.receiver_id
                WHERE cr.recording_file IS NOT NULL
                ORDER BY cr.created_at DESC
            """)
        else:
            c.execute("""
                SELECT
                    cr.id,
                    cr.sender_id,
                    cr.receiver_id,
                    cr.custom_name,
                    cr.recording_file,
                    cr.recording_url,
                    cr.duration,
                    cr.file_size,
                    cr.file_format,
                    cr.created_at,
                    cr.folder_id,
                    cr.is_archived,
                    cr.tags,
                    cr.notes,
                    u1.full_name as sender_name,
                    u2.full_name as receiver_name
                FROM chat_recordings cr
                LEFT JOIN users u1 ON u1.id = cr.sender_id
                LEFT JOIN users u2 ON u2.id = cr.receiver_id
                WHERE (cr.sender_id = %s OR cr.receiver_id = %s)
                  AND cr.recording_file IS NOT NULL
                ORDER BY cr.created_at DESC
            """, (user['id'], user['id']))

        rows = c.fetchall()

        recordings = [
            {
                'id': row[0],
                'sender_id': row[1],
                'receiver_id': row[2],
                'custom_name': row[3],
                'recording_file': row[4],
                'recording_url': row[5],
                'duration': row[6],
                'file_size': row[7],
                'file_format': row[8],
                'created_at': row[9].isoformat() if row[9] else None,
                'folder_id': row[10],
                'is_archived': row[11],
                'tags': row[12] or [],
                'notes': row[13],
                'sender_name': row[14],
                'receiver_name': row[15]
            }
            for row in rows
        ]

        return {"recordings": recordings}

    except Exception as e:
        log_error(f"Error fetching chat recordings: {e}", "internal_chat")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.post("/status/dnd")
async def update_status_dnd(dnd: bool, session_token: Optional[str] = Cookie(None)):
    """Обновить режим "Не беспокоить" """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO user_status (user_id, is_dnd, updated_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE 
        SET is_dnd = EXCLUDED.is_dnd, updated_at = CURRENT_TIMESTAMP
    """, (user['id'], dnd))
    conn.commit()
    conn.close()
    return {"status": "success", "is_dnd": dnd}

@router.get("/call-logs")
async def get_call_logs(limit: int = 50, session_token: Optional[str] = Cookie(None)):
    """Получить историю звонков пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT cl.id, cl.caller_id, cl.callee_id, cl.type, cl.status, 
               cl.duration, cl.created_at, 
               u1.full_name as caller_name, u2.full_name as callee_name
        FROM user_call_logs cl
        LEFT JOIN users u1 ON cl.caller_id = u1.id
        LEFT JOIN users u2 ON cl.callee_id = u2.id
        WHERE cl.caller_id = %s OR cl.callee_id = %s
        ORDER BY cl.created_at DESC
        LIMIT %s
    """, (user['id'], user['id'], limit))
    
    logs = []
    for row in c.fetchall():
        created_at = row[6]
        # Append Z if it's a datetime object without timezone to tell frontend it's UTC
        if hasattr(created_at, 'isoformat'):
            ts = created_at.isoformat()
            if '+' not in ts and 'Z' not in ts:
                ts += 'Z'
        else:
            ts = str(created_at)

        logs.append({
            "id": row[0],
            "caller_id": row[1],
            "callee_id": row[2],
            "type": row[3],
            "status": row[4],
            "duration": row[5],
            "created_at": ts,
            "caller_name": row[7],
            "callee_name": row[8],
            "direction": "out" if row[1] == user['id'] else "in"
        })
    
    conn.close()
    return {"logs": logs}
