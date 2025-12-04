"""
API Endpoints для управления мессенджерами
"""
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List

import json

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Messengers"])

@router.get("/messengers/settings")
async def get_messenger_settings(
    session_token: Optional[str] = Cookie(None)
):
    """Получить настройки всех мессенджеров"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    try:
        c.execute("""
            SELECT
                id, messenger_type, is_enabled, display_name,
                api_token, webhook_url, config_json,
                created_at, updated_at
            FROM messenger_settings
            ORDER BY
                CASE messenger_type
                    WHEN 'instagram' THEN 1
                    WHEN 'whatsapp' THEN 2
                    WHEN 'telegram' THEN 3
                    WHEN 'tiktok' THEN 4
                    ELSE 5
                END
        """)

        settings = []
        for row in c.fetchall():
            row_dict = dict(row)
            # Скрываем токены в списке (показываем только наличие)
            if row_dict['api_token']:
                row_dict['has_token'] = True
                row_dict['api_token'] = '***'
            else:
                row_dict['has_token'] = False

            settings.append(row_dict)

        return {
            "settings": settings
        }
    except Exception as e:
        log_error(f"Error getting messenger settings: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.get("/messengers/enabled")
async def get_enabled_messengers(
    session_token: Optional[str] = Cookie(None)
):
    """Получить список включенных мессенджеров (для фронтенда)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT messenger_type, display_name
            FROM messenger_settings
            WHERE is_enabled = TRUE
            ORDER BY
                CASE messenger_type
                    WHEN 'instagram' THEN 1
                    WHEN 'whatsapp' THEN 2
                    WHEN 'telegram' THEN 3
                    WHEN 'tiktok' THEN 4
                    ELSE 5
                END
        """)

        enabled = []
        for row in c.fetchall():
            enabled.append({
                "type": row[0],
                "name": row[1]
            })

        return {
            "enabled_messengers": enabled
        }
    except Exception as e:
        log_error(f"Error getting enabled messengers: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.put("/messengers/settings/{messenger_type}")
async def update_messenger_setting(
    messenger_type: str,
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройки мессенджера"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Проверяем, что messenger_type валидный
    valid_types = ['instagram', 'whatsapp', 'telegram', 'tiktok']
    if messenger_type not in valid_types:
        return JSONResponse({"error": "Invalid messenger type"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Получаем текущие настройки
        c.execute("SELECT id FROM messenger_settings WHERE messenger_type = %s", (messenger_type,))
        if not c.fetchone():
            return JSONResponse({"error": "Messenger not found"}, status_code=404)

        # Собираем поля для обновления
        updates = []
        params = []

        if 'is_enabled' in request:
            updates.append("is_enabled = %s")
            params.append(1 if request['is_enabled'] else 0)

        if 'api_token' in request:
            updates.append("api_token = %s")
            params.append(request['api_token'])

        if 'webhook_url' in request:
            updates.append("webhook_url = %s")
            params.append(request['webhook_url'])

        if 'config_json' in request:
            updates.append("config_json = %s")
            params.append(json.dumps(request['config_json']) if isinstance(request['config_json'], dict) else request['config_json'])

        if not updates:
            return JSONResponse({"error": "No fields to update"}, status_code=400)

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(messenger_type)

        query = f"UPDATE messenger_settings SET {', '.join(updates)} WHERE messenger_type = %s"
        c.execute(query, params)

        conn.commit()
        log_info(f"Messenger settings updated: {messenger_type}", "messengers")

        return {
            "success": True,
            "message": f"{messenger_type.capitalize()} settings updated successfully"
        }

    except Exception as e:
        log_error(f"Error updating messenger settings: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.get("/messengers/{messenger_type}/messages")
async def get_messenger_messages(
    messenger_type: str,
    client_id: Optional[str] = None,
    limit: int = 100,
    session_token: Optional[str] = Cookie(None)
):
    """Получить сообщения из определенного мессенджера"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    try:
        if client_id:
            c.execute("""
                SELECT
                    m.*,
                    c.name as client_name,
                    c.username as client_username
                FROM messenger_messages m
                LEFT JOIN clients c ON m.client_id = c.instagram_id
                WHERE m.messenger_type = %s AND m.client_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s
            """, (messenger_type, client_id, limit))
        else:
            c.execute("""
                SELECT
                    m.*,
                    c.name as client_name,
                    c.username as client_username
                FROM messenger_messages m
                LEFT JOIN clients c ON m.client_id = c.instagram_id
                WHERE m.messenger_type = %s
                ORDER BY m.created_at DESC
                LIMIT %s
            """, (messenger_type, limit))

        messages = []
        for row in c.fetchall():
            msg_dict = dict(row)
            # Парсим JSON если есть
            if msg_dict.get('attachments_json'):
                try:
                    msg_dict['attachments'] = json.loads(msg_dict['attachments_json'])
                except:
                    msg_dict['attachments'] = []
            messages.append(msg_dict)

        return {
            "messages": messages,
            "count": len(messages)
        }
    except Exception as e:
        log_error(f"Error getting messenger messages: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.post("/messengers/{messenger_type}/messages")
async def send_messenger_message(
    messenger_type: str,
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить сообщение через мессенджер"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    client_id = request.get('client_id')
    message_text = request.get('message_text')

    if not client_id or not message_text:
        return JSONResponse({"error": "client_id and message_text are required"}, status_code=400)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверяем что мессенджер включен
        c.execute("SELECT is_enabled FROM messenger_settings WHERE messenger_type = %s", (messenger_type,))
        row = c.fetchone()
        if not row or not row[0]:
            return JSONResponse({"error": f"{messenger_type} is not enabled"}, status_code=400)

        # Сохраняем сообщение в БД
        c.execute("""
            INSERT INTO messenger_messages
            (messenger_type, client_id, sender_type, message_text, is_read)
            VALUES (%s, %s, 'admin', %s, 1)
        """, (messenger_type, client_id, message_text))

        message_id = c.lastrowid
        conn.commit()

        # TODO: Здесь должна быть реальная отправка через API мессенджера
        # Для Instagram - используем существующий метод
        # Для Telegram - используем Telegram Bot API
        # Для WhatsApp - используем WhatsApp Business API
        # Для TikTok - используем TikTok API

        log_info(f"Message sent via {messenger_type} to {client_id}", "messengers")

        return {
            "success": True,
            "message_id": message_id,
            "message": f"Message sent via {messenger_type}"
        }

    except Exception as e:
        log_error(f"Error sending message via {messenger_type}: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.get("/messengers/unread-count")
async def get_unread_messages_count(
    session_token: Optional[str] = Cookie(None)
):
    """Получить количество непрочитанных сообщений по всем мессенджерам"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT messenger_type, COUNT(*) as count
            FROM messenger_messages
            WHERE is_read = FALSE AND sender_type = 'client'
            GROUP BY messenger_type
        """)

        counts = {}
        total = 0
        for row in c.fetchall():
            counts[row[0]] = row[1]
            total += row[1]

        return {
            "total": total,
            "by_messenger": counts
        }
    except Exception as e:
        log_error(f"Error getting unread count: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()
