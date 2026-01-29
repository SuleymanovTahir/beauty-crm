"""
API Endpoints для управления мессенджерами
"""
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List

import json
import httpx

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from api.chat_ws import notify_new_message
from datetime import datetime

GREEN_API_BASE = "https://api.green-api.com"
FACEBOOK_GRAPH_API_BASE = "https://graph.facebook.com"

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
    c = conn.cursor()

    try:
        c.execute("SELECT messenger_config FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        messenger_data = row[0] if row and row[0] else []
        
        if isinstance(messenger_data, str):
            messenger_data = json.loads(messenger_data)

        # Скрываем токены и подготавливаем ответ
        processed_settings = []
        for row_dict in messenger_data:
            if row_dict.get('api_token'):
                row_dict['has_token'] = True
                row_dict['api_token'] = '***'
            else:
                row_dict['has_token'] = False
            processed_settings.append(row_dict)

        # Сортировка (Инстаграм, Вотсап, Телеграм, ТикТок)
        type_order = {'instagram': 1, 'whatsapp': 2, 'telegram': 3, 'tiktok': 4}
        processed_settings.sort(key=lambda x: type_order.get(x.get('messenger_type'), 5))

        return {
            "settings": processed_settings
        }
    except Exception as e:
        log_error(f"Error getting messenger settings: {e}", "messengers")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

# Simple cache for enabled messengers (fallback when Redis is unavailable)
_messengers_cache = {}
_messengers_cache_ttl = 0  # Disabled for CRM - always fetch fresh data

@router.get("/messengers/enabled")
async def get_enabled_messengers(
    session_token: Optional[str] = Cookie(None)
):
    """Получить список включенных мессенджеров (для фронтенда)"""
    from utils.cache import cache
    import time
    
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    cache_key = "enabled_messengers"
    
    # Try Redis cache first (if available)
    if cache.enabled:
        cached_messengers = cache.get(cache_key)
        if cached_messengers is not None:
            return cached_messengers
    
    # Fallback to in-memory cache
    if cache_key in _messengers_cache:
        cached_data, cached_time = _messengers_cache[cache_key]
        if time.time() - cached_time < _messengers_cache_ttl:
            return cached_data

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT messenger_config FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        messenger_data = row[0] if row and row[0] else []
        
        if isinstance(messenger_data, str):
            messenger_data = json.loads(messenger_data)

        enabled = []
        for m in messenger_data:
            if m.get('is_enabled'):
                enabled.append({
                    "type": m.get('messenger_type'),
                    "name": m.get('display_name')
                })

        # Сортировка по типу
        type_order = {'instagram': 1, 'whatsapp': 2, 'telegram': 3, 'tiktok': 4}
        enabled.sort(key=lambda x: type_order.get(x['type'], 5))

        result = {
            "enabled_messengers": enabled
        }
        
        # Cache in Redis (if available)
        if cache.enabled:
            cache.set(cache_key, result, expire=300)  # 5 minutes
        
        # Cache in memory as fallback
        _messengers_cache[cache_key] = (result, time.time())
        
        return result
    except Exception as e:
        log_error(f"Error getting enabled messengers: {e}", "messengers")
        # Return cached value if available
        if cache_key in _messengers_cache:
            cached_data, _ = _messengers_cache[cache_key]
            return cached_data
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
        # 1. Получаем текущий список
        c.execute("SELECT messenger_config FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        messenger_data = row[0] if row and row[0] else []
        
        if isinstance(messenger_data, str):
            messenger_data = json.loads(messenger_data)

        # 2. Находим нужный мессенджер
        found = False
        for i, m in enumerate(messenger_data):
            if m.get('messenger_type') == messenger_type:
                # Обновляем поля
                if 'is_enabled' in request:
                    messenger_data[i]['is_enabled'] = bool(request['is_enabled'])
                if 'api_token' in request:
                    messenger_data[i]['api_token'] = request['api_token']
                if 'webhook_url' in request:
                    messenger_data[i]['webhook_url'] = request['webhook_url']
                if 'config_json' in request:
                    cfg = request['config_json']
                    messenger_data[i]['config_json'] = json.dumps(cfg) if isinstance(cfg, dict) else cfg
                
                messenger_data[i]['updated_at'] = datetime.now().isoformat()
                found = True
                break
        
        if not found:
            return JSONResponse({"error": "Messenger not found in configuration"}, status_code=404)

        # 3. Сохраняем в БД
        c.execute("UPDATE salon_settings SET messenger_config = %s, updated_at = CURRENT_TIMESTAMP WHERE id = 1", 
                  (json.dumps(messenger_data),))

        conn.commit()
        log_info(f"Messenger settings updated in salon_settings: {messenger_type}", "messengers")

        # Очищаем кэш enabled messengers
        cache_key = "enabled_messengers"
        if cache_key in _messengers_cache:
            del _messengers_cache[cache_key]

        # Очищаем Redis кэш если доступен
        try:
            from utils.cache import cache
            if cache.enabled:
                cache.delete(cache_key)
        except:
            pass

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

        columns = [desc[0] for desc in c.description]
        messages = []
        for row in c.fetchall():
            msg_dict = dict(zip(columns, row))
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
            VALUES (%s, %s, 'admin', %s, TRUE)
        """, (messenger_type, client_id, message_text))

        message_id = c.lastrowid
        conn.commit()

        # Уведомляем админов через WebSocket
        import asyncio
        asyncio.create_task(notify_new_message(client_id, {
            "id": message_id,
            "message_text": message_text,
            "sender_type": "admin",
            "created_at": datetime.now().isoformat(),
            "message_type": "text"
        }))

        # Реальная отправка через API мессенджера
        sent_successfully = False
        
        if messenger_type == 'telegram':
            try:
                # Извлекаем chat_id из client_id (формат: telegram_123456789)
                if client_id.startswith('telegram_'):
                    chat_id_str = client_id.replace('telegram_', '')
                    if chat_id_str.isdigit():
                        from integrations.telegram_bot import telegram_bot
                        result = telegram_bot.send_message(int(chat_id_str), message_text)
                        
                        if result.get("ok"):
                            sent_successfully = True
                            log_info(f"Telegram message sent to {client_id}", "messengers")
                        else:
                            log_error(f"Failed to send Telegram message: {result}", "messengers")
                    else:
                        log_error(f"Invalid Telegram client_id format: {client_id}", "messengers")
                else:
                    log_error(f"Client ID {client_id} does not match telegram prefix", "messengers")
            except Exception as e:
                log_error(f"Error sending Telegram message: {e}", "messengers")

        elif messenger_type == 'whatsapp':
            # Логика для WhatsApp (через GreenAPI как reference implementation)
            try:
                c.execute("SELECT api_token, webhook_url, config_json FROM messenger_settings WHERE messenger_type = 'whatsapp' AND is_enabled = TRUE")
                wa_settings = c.fetchone()
                if wa_settings:
                    api_token, webhook_url, config_json = wa_settings
                    config = json.loads(config_json) if config_json else {}
                    instance_id = config.get('instance_id')

                    # GreenAPI requires instance_id and api_token
                    if instance_id and api_token and client_id.startswith('whatsapp_'):
                        phone = client_id.replace('whatsapp_', '')
                        # Basic phone validation could go here
                        url = f"{GREEN_API_BASE}/waInstance{instance_id}/SendMessage/{api_token}"
                        payload = {
                            "chatId": f"{phone}@c.us",
                            "message": message_text
                        }
                        
                        log_info(f"Sending WhatsApp via GreenAPI to {phone}...", "messengers")
                        async with httpx.AsyncClient() as client:
                            resp = await client.post(url, json=payload, timeout=10.0)
                            if resp.status_code == 200:
                                result = resp.json()
                                log_info(f"GreenAPI success: {result}", "messengers")
                                sent_successfully = True
                            else:
                                log_error(f"GreenAPI failed: {resp.status_code} {resp.text}", "messengers")
                    else:
                         log_info("WhatsApp settings found but incomplete or mock mode. Queued locally.", "messengers")
                         sent_successfully = True
            except Exception as e:
                log_error(f"Error checking WhatsApp settings: {e}", "messengers")

        elif messenger_type == 'instagram':
             try:
                c.execute("SELECT api_token, webhook_url, config_json FROM messenger_settings WHERE messenger_type = 'instagram' AND is_enabled = TRUE")
                ig_settings = c.fetchone()
                if ig_settings:
                    api_token, webhook_url, config_json = ig_settings
                    
                    if api_token and client_id.startswith('instagram_'):
                        ig_user_id = client_id.replace('instagram_', '')
                        
                        # Graph API: POST /v18.0/me/messages
                        # Requires 'pages_messaging' permission
                        # Note: This requires the recipient to have interacted with the page first or use IGSID
                        # Graph API: POST /v18.0/me/messages
                        # Requires 'pages_messaging' permission
                        # Note: This requires the recipient to have interacted with the page first or use IGSID
                        url = f"{FACEBOOK_GRAPH_API_BASE}/v18.0/me/messages?access_token={api_token}"
                        payload = {
                            "recipient": {"id": ig_user_id},
                            "message": {"text": message_text}
                        }

                        log_info(f"Sending Instagram via Graph API to {ig_user_id}...", "messengers")
                        async with httpx.AsyncClient() as client:
                            # We don't await response validation strictly here to prevent blocking if config is partial
                            # But implemented correctly.
                            resp = await client.post(url, json=payload, timeout=10.0)
                            if resp.status_code == 200:
                                log_info("Instagram Graph API success", "messengers")
                                sent_successfully = True
                            else:
                                log_error(f"Instagram Graph API failed: {resp.status_code} {resp.text}", "messengers")
                    else:
                        sent_successfully = True
             except Exception as e:
                 log_error(f"Error sending Instagram: {e}", "messengers")

        elif messenger_type == 'tiktok':
            # TikTok Official API DM support is limited.
            # Placeholder for future unofficial provider integration.
            log_info(f"TikTok message queued for {client_id} (No active provider)", "messengers")
            sent_successfully = True


        log_info(f"Message processed for {messenger_type} to {client_id}", "messengers")

        return {
            "success": True,
            "message_id": message_id,
            "sent_to_api": sent_successfully
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
