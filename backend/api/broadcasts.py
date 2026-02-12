"""
API для массовых рассылок
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Union, Tuple

import json

from db.connection import get_db_connection
from utils.utils import get_current_user
from utils.logger import log_info, log_error
from utils.language_utils import get_localized_name

router = APIRouter()

class BroadcastRequest(BaseModel):
    """Модель запроса на отправку рассылки"""
    subscription_type: str  # promotions, news, appointments, etc.
    channels: List[str]  # ["email", "telegram", "instagram", "notification"]
    subject: str
    message: str
    target_role: Optional[str] = None
    user_ids: Optional[List[Union[int, str]]] = None
    additional_emails: Optional[List[str]] = []
    manual_contacts: Optional[List[dict]] = []  # [{name, email, telegram, instagram, whatsapp}]
    force_send: bool = False
    attachment_urls: Optional[List[str]] = []
    template_name: Optional[str] = None
    template_b_name: Optional[str] = None # For A/B testing
    split_ratio: Optional[float] = 0.5 # 0.0 to 1.0 (portion for template_b)
    scheduled_at: Optional[str] = None  # ISO format string
    is_test: bool = False  # If true, only send to current user

class BroadcastPreviewResponse(BaseModel):
    """Предпросмотр получателей рассылки"""
    total_users: int
    by_channel: dict
    users_sample: List[dict]


def _split_target_ids(user_ids: Optional[List[Union[int, str]]]) -> Tuple[List[int], List[str]]:
    """Split selected recipients into staff IDs and client IDs."""
    staff_ids: List[int] = []
    client_ids: List[str] = []

    if not user_ids:
        return staff_ids, client_ids

    for user_id in user_ids:
        if isinstance(user_id, int):
            staff_ids.append(user_id)
            continue

        value = str(user_id).strip()
        if value:
            client_ids.append(value)

    return staff_ids, client_ids


def _resolve_preview_contact(channels: List[str], email: Optional[str], telegram: Optional[str], instagram: Optional[str], allow_notification: bool = False) -> Tuple[str, str]:
    """Pick a human-readable preview contact based on selected channels."""
    if "email" in channels and email:
        return email, "email"
    if "telegram" in channels and telegram:
        return str(telegram), "telegram"
    if "instagram" in channels and instagram:
        return str(instagram), "instagram"
    if "notification" in channels and allow_notification:
        return "in_app", "notification"
    return "-", "none"

@router.delete("/broadcasts/history/clear")
async def clear_broadcast_history(
    period: str = "all", # last_hour, today, 3_days, week, month, all
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Очистить историю рассылок за период"""
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        query = "DELETE FROM broadcast_history"
        params = []

        if period != "all":
            if period == "last_hour":
                query += " WHERE created_at >= NOW() - INTERVAL '1 hour'"
            elif period == "today":
                query += " WHERE created_at >= CURRENT_DATE"
            elif period == "3_days":
                query += " WHERE created_at >= NOW() - INTERVAL '3 days'"
            elif period == "week":
                query += " WHERE created_at >= NOW() - INTERVAL '7 days'"
            elif period == "month":
                query += " WHERE created_at >= NOW() - INTERVAL '30 days'"
            elif period == "custom" and custom_start:
                query += " WHERE created_at >= %s"
                params.append(custom_start)
                if custom_end:
                    query += " AND created_at <= %s"
                    params.append(custom_end)

        c.execute(query, params)
        count = c.rowcount
        conn.commit()
        conn.close()

        log_info(f"Администратор {current_user['username']} очистил историю рассылок ({count} записей, период: {period})", "broadcasts")
        return {"success": True, "count": count}
    except Exception as e:
        log_error(f"Error clearing history: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/broadcasts/history")
async def get_broadcast_history(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю рассылок."""
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        safe_limit = max(1, min(limit, 500))
        c.execute("""
            SELECT id, subscription_type, channels, subject, total_sent, results, created_at
            FROM broadcast_history
            ORDER BY created_at DESC
            LIMIT %s
        """, (safe_limit,))

        history = []
        for row in c.fetchall():
            raw_results = row[5]
            parsed_results = {}
            if isinstance(raw_results, dict):
                parsed_results = raw_results
            elif raw_results:
                try:
                    parsed_results = json.loads(raw_results)
                except Exception:
                    parsed_results = {}

            channels = []
            if row[2]:
                channels = [channel.strip() for channel in str(row[2]).split(",") if channel.strip()]

            history.append({
                "id": row[0],
                "subscription_type": row[1] or "",
                "channels": channels,
                "subject": row[3] or "",
                "total_sent": row[4] or 0,
                "results": parsed_results,
                "created_at": row[6].isoformat() if row[6] and hasattr(row[6], "isoformat") else row[6]
            })

        conn.close()
        return {"history": history}
    except Exception as e:
        log_error(f"Error loading broadcast history: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcasts/preview", response_model=BroadcastPreviewResponse)
async def preview_broadcast(
    broadcast: BroadcastRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Предпросмотр: сколько пользователей и клиентов получит рассылку
    """
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    try:
        conn = get_db_connection()
        c = conn.cursor()
        staff_ids, client_ids = _split_target_ids(broadcast.user_ids)

        if broadcast.is_test:
            sample = [{
                "id": current_user['id'],
                "username": current_user['username'],
                "full_name": current_user.get('full_name'),
                "role": current_user.get("role", "staff"),
                "contact": current_user.get("email") or current_user.get("username"),
                "channel": "test"
            }]
            return {"total_users": 1, "by_channel": {"test": 1}, "users_sample": sample}

        by_channel = {"email": 0, "telegram": 0, "instagram": 0, "notification": 0}
        users_sample = []

        # 1. FETCH FROM USERS (Staff)
        if not broadcast.target_role or broadcast.target_role != 'client':
            query_users = """
                SELECT DISTINCT u.id, u.username, u.full_name, u.email, u.telegram_id, u.instagram_username as instagram_link, u.role
                FROM users u
                LEFT JOIN marketing_unsubscriptions s ON u.id = s.user_id AND s.mailing_type = %s
                WHERE u.is_active = TRUE AND s.id IS NULL
            """
            params = [broadcast.subscription_type]
            
            if broadcast.user_ids:
                if staff_ids:
                    placeholders = ','.join(['%s'] * len(staff_ids))
                    query_users += f" AND u.id IN ({placeholders})"
                    params.extend(staff_ids)
                else:
                    query_users += " AND FALSE"
            elif broadcast.target_role and broadcast.target_role != 'all':
                query_users += " AND u.role = %s"
                params.append(broadcast.target_role)

            c.execute(query_users, params)
            for user in c.fetchall():
                user_id, username, full_name, email, telegram_id, ig_link, role = user
                for ch in broadcast.channels:
                    if ch == "email" and email: by_channel["email"] += 1
                    elif ch == "telegram" and telegram_id: by_channel["telegram"] += 1
                    elif ch == "instagram" and ig_link: by_channel["instagram"] += 1
                    elif ch == "notification": by_channel["notification"] += 1
                if len(users_sample) < 3:
                    contact, channel = _resolve_preview_contact(
                        broadcast.channels,
                        email,
                        str(telegram_id) if telegram_id else None,
                        ig_link,
                        allow_notification=True
                    )
                    users_sample.append({
                        "id": user_id,
                        "username": username,
                        "full_name": full_name or username or str(user_id),
                        "role": role or "staff",
                        "contact": contact,
                        "channel": channel
                    })

        # 2. FETCH FROM CLIENTS
        if not broadcast.target_role or broadcast.target_role in ['all', 'client']:
            query_clients = """
                SELECT DISTINCT c.instagram_id, c.name, c.email, c.telegram_id
                FROM clients c
                LEFT JOIN marketing_unsubscriptions s ON (c.instagram_id = s.client_id OR c.telegram_id = s.client_id OR c.email = s.email) 
                     AND s.mailing_type = %s
                WHERE s.id IS NULL
            """
            params = [broadcast.subscription_type]
            if broadcast.user_ids:
                if client_ids:
                    placeholders = ','.join(['%s'] * len(client_ids))
                    query_clients += f" AND (c.instagram_id IN ({placeholders}) OR c.id::text IN ({placeholders}))"
                    params.extend(client_ids)
                    params.extend(client_ids)
                else:
                    query_clients += " AND FALSE"

            c.execute(query_clients, params)
            for client in c.fetchall():
                ig_id, name, email, tg_id = client
                for ch in broadcast.channels:
                    if ch == "email" and email: by_channel["email"] += 1
                    elif ch == "telegram" and tg_id: by_channel["telegram"] += 1
                    elif ch == "instagram" and ig_id: by_channel["instagram"] += 1
                if len(users_sample) < 6:
                    contact, channel = _resolve_preview_contact(
                        broadcast.channels,
                        email,
                        str(tg_id) if tg_id else None,
                        ig_id
                    )
                    users_sample.append({
                        "id": ig_id,
                        "username": ig_id,
                        "full_name": name or ig_id,
                        "role": "client",
                        "contact": contact,
                        "channel": channel
                    })

        conn.close()
        return {
            "total_users": sum(by_channel.values()),
            "by_channel": by_channel,
            "users_sample": users_sample
        }

    except Exception as e:
        log_error(f"Error in preview: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcasts/send")
async def send_broadcast(
    broadcast: BroadcastRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Отправить массовую рассылку (фоновая задача)
    """
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    # Add task to background
    background_tasks.add_task(process_broadcast_sending, broadcast, current_user['id'])

    return {
        "success": True,
        "message": "Рассылка запущена" if not broadcast.is_test else "Тестовая рассылка отправлена"
    }

async def process_broadcast_sending(broadcast: BroadcastRequest, sender_id: int):
    """
    Асинхронная отправка рассылки через UniversalMessenger (Users + Clients)
    """
    from services.universal_messenger import send_universal_message
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()
        sent_count = 0
        failed_count = 0
        staff_ids, client_ids = _split_target_ids(broadcast.user_ids)

        # Collect targets
        targets = [] # List of (id, name, email, tg_id, platform_id, type)

        if broadcast.is_test:
            c.execute("SELECT id, full_name, email, telegram_chat_id, instagram_username FROM users WHERE id = %s", (sender_id,))
            row = c.fetchone()
            if row: targets.append((row[0], row[1], row[2], row[3], row[4], 'staff'))
        else:
            # 1. Staff
            if not broadcast.target_role or broadcast.target_role != 'client':
                query_users = """
                    SELECT u.id, u.full_name, u.email, u.telegram_chat_id, u.instagram_username
                    FROM users u
                    LEFT JOIN marketing_unsubscriptions s ON u.id = s.user_id AND s.mailing_type = %s
                    WHERE u.is_active = TRUE AND s.id IS NULL
                """
                params = [broadcast.subscription_type]
                if broadcast.user_ids:
                    if staff_ids:
                        query_users += " AND u.id IN ({})".format(','.join(['%s'] * len(staff_ids)))
                        params.extend(staff_ids)
                    else:
                        query_users += " AND FALSE"
                elif broadcast.target_role and broadcast.target_role != 'all':
                    query_users += " AND u.role = %s"
                    params.append(broadcast.target_role)
                
                c.execute(query_users, params)
                for r in c.fetchall(): targets.append((r[0], r[1], r[2], r[3], r[4], 'staff'))

            # 2. Clients
            if not broadcast.target_role or broadcast.target_role in ['all', 'client']:
                query_clients = """
                    SELECT instagram_id, name, email, telegram_id, instagram_id
                    FROM clients c
                    LEFT JOIN marketing_unsubscriptions s ON (
                        c.instagram_id = s.client_id OR 
                        c.telegram_id = s.client_id OR 
                        (c.email IS NOT NULL AND c.email = s.email)
                    ) AND s.mailing_type = %s
                    WHERE s.id IS NULL
                """
                params = [broadcast.subscription_type]

                if broadcast.user_ids:
                    if client_ids:
                        placeholders = ','.join(['%s'] * len(client_ids))
                        query_clients += f" AND (c.instagram_id IN ({placeholders}) OR c.id::text IN ({placeholders}))"
                        params.extend(client_ids)
                        params.extend(client_ids)
                    else:
                        query_clients += " AND FALSE"

                c.execute(query_clients, params)
                for r in c.fetchall(): targets.append((r[0], r[1], r[2], r[3], r[4], 'client'))

        # 3. Handle additional emails (manual entry)
        if broadcast.additional_emails and 'email' in broadcast.channels:
            for email in broadcast.additional_emails:
                if not email or '@' not in email: continue
                # target_id, name, email, tg, ig, type
                # Use email as ID for manual
                targets.append((0, "Anonymous", email.strip(), None, None, 'manual'))
        
        # 4. Handle manual contacts (new feature)
        if broadcast.manual_contacts:
            for contact in broadcast.manual_contacts:
                name = contact.get('name', 'Manual Contact')
                email = contact.get('email')
                telegram = contact.get('telegram')
                instagram = contact.get('instagram')
                whatsapp = contact.get('whatsapp')
                
                # Добавляем контакт только если есть хотя бы один канал связи
                if email or telegram or instagram or whatsapp:
                    targets.append((0, name, email, telegram, instagram, 'manual'))

        # Sending
        for target in targets:
            t_id, t_name, t_email, t_tg, t_ig, t_type = target
            context = {"name": t_name or "Client", "lang": "ru"}

            for channel in broadcast.channels:
                recipient = None
                platform = None
                
                if channel == "email" and t_email:
                    recipient, platform = t_email, "email"
                    context["unsubscribe_link"] = "/unsubscribe?email={}&type={}&channel=email".format(t_email, broadcast.subscription_type)
                elif channel == "telegram" and t_tg:
                    recipient, platform = str(t_tg), "telegram"
                elif channel == "instagram" and t_ig:
                    recipient, platform = t_ig, "instagram"
                elif channel == "notification" and t_type == 'staff':
                    recipient, platform = str(t_id), "in_app"
                
                if not recipient: continue

                res = await send_universal_message(
                    recipient_id=recipient,
                    text=broadcast.message,
                    subject=broadcast.subject,
                    context=context,
                    platform=platform,
                    template_name=broadcast.template_name
                )
                if res.get("success"): sent_count += 1
                else: failed_count += 1

        # Save History
        c.execute("""
            INSERT INTO broadcast_history (sender_id, subscription_type, channels, subject, message, total_sent, results)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (sender_id, broadcast.subscription_type, ','.join(broadcast.channels), broadcast.subject, broadcast.message, sent_count, json.dumps({"success": sent_count, "failed": failed_count})))
        conn.commit()
    except Exception as e:
        log_error(f"Error in broadcast process: {e}", "broadcasts")
    finally:
        if conn: conn.close()

@router.post("/unsubscribe")
async def unsubscribe_v2(
    type: str,
    channel: str,
    email: Optional[str] = None,
    user_id: Optional[int] = None,
    client_id: Optional[str] = None,
    reason: Optional[str] = "User requested opt-out"
):
    """Отписаться от рассылки с сохранением причины"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO marketing_unsubscriptions (client_id, user_id, email, mailing_type, reason)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (client_id, user_id, email, type, reason))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Вы успешно отписались"}
    except Exception as e:
        log_error(f"Unsubscribe error: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcasts/users")
async def get_broadcast_users(
    subscription_type: Optional[str] = None,
    target_role: Optional[str] = None,
    lang: str = 'ru',
    current_user: dict = Depends(get_current_user)
):
    """
    Получить список пользователей с их статусом подписки для конкретного типа рассылки
    """
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    try:
        conn = get_db_connection()
        c = conn.cursor()
        users = []

        # 1. Fetch Staff (Users) - UNLESS target_role is 'client'
        if target_role != 'client':
            # Handle optional subscription_type by using a dummy/all condition if not provided
            sub_type_param = subscription_type if subscription_type else ''
            
            query = """
                SELECT 
                    u.id, u.username, u.full_name, u.role, u.email, u.telegram_id, u.instagram_username,
                    COALESCE(s.is_subscribed, TRUE) as is_subscribed,
                    COALESCE(s.email_enabled, TRUE) as email_enabled,
                    COALESCE(s.telegram_enabled, TRUE) as telegram_enabled,
                    COALESCE(s.instagram_enabled, TRUE) as instagram_enabled
                FROM users u
                LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.subscription_type = %s
                WHERE u.is_active = TRUE AND u.role != 'client' AND u.deleted_at IS NULL
            """
            params = [sub_type_param] # Param must be present even if empty

            if target_role and target_role != 'all':
                query += " AND u.role = %s"
                params.append(target_role)

            c.execute(query, params)
            for row in c.fetchall():
                users.append({
                    "id": row[0],
                    "username": row[1],
                    "full_name": get_localized_name(row[0], row[2], lang),
                    "role": row[3],
                    "email": row[4],
                    "telegram_id": row[5],
                    "instagram_username": row[6],

                    "is_subscribed": bool(row[7]),
                    "channels": {
                        "email": bool(row[8]),
                        "telegram": bool(row[9]),
                        "instagram": bool(row[10])
                    }
                })

        # 2. Fetch Clients - IF target_role is 'client' or 'all'
        if not target_role or target_role in ['all', 'client']:
            # Use instagram_id as ID because clients don't have integer ID
            # Clients use instagram_id as PK (text)
            query_clients = """
                SELECT 
                    c.instagram_id, c.instagram_id, c.name, c.email, c.telegram_id, c.instagram_id
                FROM clients c
                -- Check unsubscriptions (clients unsubscribe via marketing_unsubscriptions)
                LEFT JOIN marketing_unsubscriptions s ON (
                    c.instagram_id = s.client_id OR 
                    c.telegram_id = s.client_id OR 
                    (c.email IS NOT NULL AND c.email = s.email)
                ) AND s.mailing_type = %s
                WHERE s.id IS NULL AND c.deleted_at IS NULL
            """
            # Handle empty subscription_type for clients query too if needed, but usually strictly needed here
            client_sub_type = subscription_type if subscription_type else ''
            
            c.execute(query_clients, (client_sub_type,))
            for row in c.fetchall():
                # For clients, we use instagram_id instead of integer ID
                # get_localized_name expects an ID, but for clients we can pass 0 or their unique hash if needed
                client_name = row[2] or "Client"
                users.append({
                    "id": row[0], # String ID (instagram_id)
                    "username": row[1] or "client", # instagram_id
                    "full_name": get_localized_name(0, client_name, lang),
                    "role": "client",
                    "email": row[3],
                    "telegram_id": row[4],
                    "instagram_username": row[5],
                    "is_subscribed": True, # Clients are subscribed by default unless in marketing_unsubscriptions
                    "channels": { 
                        "email": bool(row[3]), 
                        "telegram": bool(row[4]), 
                        "instagram": bool(row[5]) 
                    }
                })

        conn.close()
        return {"users": users}

    except Exception as e:
        log_error(f"Error fetching broadcast users: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcasts/unsubscribed")
async def get_unsubscribed_users(
    current_user: dict = Depends(get_current_user)
):
    """
    Получить всех людей, отписавшихся от рассылок
    """
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT u.id, u.full_name, u.username, u.email, m.mailing_type, m.unsubscribed_at, m.reason
            FROM marketing_unsubscriptions m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.unsubscribed_at DESC
        """)
        
        unsubs = []
        for row in c.fetchall():
            unsubs.append({
                "id": row[0],
                "full_name": row[1],
                "username": row[2],
                "email": row[3],
                "mailing_type": row[4],
                "unsubscribed_at": row[5],
                "reason": row[6]
            })

        # Also add newsletter_subscribers who are inactive
        c.execute("SELECT id, email, created_at FROM newsletter_subscribers WHERE is_active = FALSE")
        for row in c.fetchall():
            unsubs.append({
                "id": f"ns_{row[0]}",
                "full_name": "Newsletter Subscriber",
                "username": row[1],
                "email": row[1],
                "mailing_type": "newsletter",
                "unsubscribed_at": row[2],
                "reason": "Inactive newsletter status"
            })

        conn.close()
        return {"unsubscribed": unsubs}

    except Exception as e:
        log_error(f"Error fetching unsubscribed users: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))
