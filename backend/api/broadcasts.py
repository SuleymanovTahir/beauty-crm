"""
API для массовых рассылок
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from datetime import datetime

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import get_current_user
from utils.logger import log_info, log_error

router = APIRouter()

class BroadcastRequest(BaseModel):
    """Модель запроса на отправку рассылки"""
    subscription_type: str  # promotions, news, appointments, etc.
    channels: List[str]  # ["email", "telegram", "instagram"]
    subject: str
    message: str
    target_role: Optional[str] = None  # Если None - все пользователи
    user_ids: Optional[List[int]] = None  # Конкретные ID пользователей для отправки
    force_send: bool = False  # Если true, игнорировать статус подписки (но проверять наличие контактов)

class BroadcastPreviewResponse(BaseModel):
    """Предпросмотр получателей рассылки"""
    total_users: int
    by_channel: dict
    users_sample: List[dict]

@router.post("/broadcasts/preview", response_model=BroadcastPreviewResponse)
async def preview_broadcast(
    broadcast: BroadcastRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Предпросмотр: сколько пользователей получит рассылку по каждому каналу
    """
    # Проверка роли
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль admin или director")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Базовый запрос для получения подписчиков
        query = """
            SELECT DISTINCT u.id, u.username, u.full_name, u.email, u.telegram_id, NULL AS instagram_link, u.role
            FROM users u
            LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.subscription_type = %s
            WHERE u.is_active = TRUE
        """
        params = [broadcast.subscription_type]

        if not broadcast.force_send:
            query += " AND s.is_subscribed = TRUE"

        # Фильтр по роли если указан
        if broadcast.target_role and broadcast.target_role != 'all':
            query += " AND u.role = %s"
            params.append(broadcast.target_role)
        
        # Фильтр по конкретным пользователям если указаны
        if broadcast.user_ids:
            placeholders = ','.join(['%s'] * len(broadcast.user_ids))
            query += f" AND u.id IN ({placeholders})"
            params.extend(broadcast.user_ids)

        c.execute(query, params)
        all_users = c.fetchall()

        # Подсчитываем получателей по каналам
        by_channel = {"email": 0, "telegram": 0, "instagram": 0, "notification": 0}
        users_by_channel = {"email": [], "telegram": [], "instagram": [], "notification": []}

        for user in all_users:
            user_id, username, full_name, email, telegram_chat_id, instagram_link, role = user

            # Проверяем каналы для этого пользователя
            c.execute("""
                SELECT email_enabled, telegram_enabled, instagram_enabled
                FROM user_subscriptions
                WHERE user_id = %s AND subscription_type = %s
            """, (user_id, broadcast.subscription_type))

            channels_data = c.fetchone()

            # Если нет записи о подписке - используем все каналы по умолчанию
            if not channels_data:
                email_enabled, telegram_enabled, instagram_enabled = True, True, True
            else:
                email_enabled, telegram_enabled, instagram_enabled = channels_data

            user_info = {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "role": role
            }

            # Email
            if "email" in broadcast.channels and (email_enabled or broadcast.force_send) and email:
                by_channel["email"] += 1
                if len(users_by_channel["email"]) < 5:  # Первые 5 для превью
                    users_by_channel["email"].append({**user_info, "contact": email})

            # Telegram
            if "telegram" in broadcast.channels and (telegram_enabled or broadcast.force_send) and telegram_chat_id:
                by_channel["telegram"] += 1
                if len(users_by_channel["telegram"]) < 5:
                    users_by_channel["telegram"].append({**user_info, "contact": telegram_chat_id})

            # Instagram
            if "instagram" in broadcast.channels and (instagram_enabled or broadcast.force_send) and instagram_link:
                by_channel["instagram"] += 1
                if len(users_by_channel["instagram"]) < 5:
                    users_by_channel["instagram"].append({**user_info, "contact": instagram_link})

            # In-app Notification
            if "notification" in broadcast.channels:
                by_channel["notification"] += 1
                if len(users_by_channel["notification"]) < 5:
                    users_by_channel["notification"].append({**user_info, "contact": "in-app"})

        conn.close()

        total = sum(by_channel.values())
        sample = []
        for channel, users in users_by_channel.items():
            for user in users[:2]:  # По 2 из каждого канала
                sample.append({**user, "channel": channel})

        log_info(f"Предпросмотр рассылки: {total} получателей ({by_channel})", "broadcasts")

        return {
            "total_users": total,
            "by_channel": by_channel,
            "users_sample": sample[:10]
        }

    except Exception as e:
        log_error(f"Ошибка предпросмотра рассылки: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/broadcasts/send")
async def send_broadcast(
    broadcast: BroadcastRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Отправить массовую рассылку с учетом подписок и каналов
    """
    # Проверка роли
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль admin или director")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем список получателей
        query = """
            SELECT DISTINCT u.id, u.username, u.full_name, u.email, u.telegram_id, u.instagram_username
            FROM users u
            LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.subscription_type = %s
            WHERE u.is_active = TRUE
        """
        params = [broadcast.subscription_type]

        if not broadcast.force_send:
            query += " AND (s.is_subscribed = TRUE OR s.is_subscribed IS NULL)"

        if broadcast.target_role and broadcast.target_role != 'all':
            query += " AND u.role = %s"
            params.append(broadcast.target_role)

        if broadcast.user_ids:
            placeholders = ','.join(['%s'] * len(broadcast.user_ids))
            query += f" AND u.id IN ({placeholders})"
            params.extend(broadcast.user_ids)

        c.execute(query, params)
        all_users = c.fetchall()

        results = {
            "email": {"sent": 0, "failed": 0},
            "telegram": {"sent": 0, "failed": 0},
            "instagram": {"sent": 0, "failed": 0},
            "notification": {"sent": 0, "failed": 0}
        }

        for user in all_users:
            user_id, username, full_name, email, telegram_id, instagram_username = user

            # Получаем настройки каналов
            c.execute("""
                SELECT email_enabled, telegram_enabled, instagram_enabled
                FROM user_subscriptions
                WHERE user_id = %s AND subscription_type = %s
            """, (user_id, broadcast.subscription_type))

            channels_data = c.fetchone()

            # Если нет записи о подписке или force_send - включаем все каналы по умолчанию
            if not channels_data:
                if broadcast.force_send:
                    email_enabled, telegram_enabled, instagram_enabled = True, True, True
                else:
                    # По умолчанию все каналы включены если нет явной записи
                    email_enabled, telegram_enabled, instagram_enabled = True, True, True
            else:
                email_enabled, telegram_enabled, instagram_enabled = channels_data

            # In-app notification (personal account)
            if "notification" in broadcast.channels:
                try:
                    c.execute("""
                        INSERT INTO notifications (user_id, title, message, type, created_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, broadcast.subject, broadcast.message, 'info', datetime.now().isoformat()))
                    results["notification"]["sent"] += 1
                except Exception as e:
                    log_error(f"In-app notification error for user {user_id}: {e}", "broadcasts")
                    results["notification"]["failed"] += 1

            # Email
            if "email" in broadcast.channels and (email_enabled or broadcast.force_send) and email:
                try:
                    from utils.email import send_broadcast_email
                    # Добавляем unsubscribe ссылку
                    unsubscribe_link = f"/unsubscribe?user={user_id}&type={broadcast.subscription_type}&channel=email"
                    send_broadcast_email(email, broadcast.subject, broadcast.message, full_name, unsubscribe_link)
                    results["email"]["sent"] += 1
                except Exception as e:
                    log_error(f"Email ошибка для {email}: {e}", "broadcasts")
                    results["email"]["failed"] += 1

            # Telegram
            if "telegram" in broadcast.channels and (telegram_enabled or broadcast.force_send) and telegram_id:
                try:
                    from bot import get_bot
                    bot = get_bot()
                    # Добавляем кнопку отписки
                    unsubscribe_text = f"\n\n🔕 Отписаться: /unsubscribe_{broadcast.subscription_type}"
                    await bot.send_message(telegram_id, broadcast.message + unsubscribe_text)
                    results["telegram"]["sent"] += 1
                except Exception as e:
                    log_error(f"Telegram ошибка для {telegram_id}: {e}", "broadcasts")
                    results["telegram"]["failed"] += 1

            # Instagram
            if "instagram" in broadcast.channels and (instagram_enabled or broadcast.force_send) and instagram_username:
                try:
                    from integrations.instagram import send_instagram_dm
                    # Ограничиваем частоту для защиты от спама
                    import time
                    time.sleep(5)  # 5 секунд между сообщениями
                    send_instagram_dm(instagram_username, broadcast.message)
                    results["instagram"]["sent"] += 1
                except Exception as e:
                    log_error(f"Instagram ошибка для {instagram_username}: {e}", "broadcasts")
                    results["instagram"]["failed"] += 1

        # Сохраняем историю рассылки
        c.execute("""
            INSERT INTO broadcast_history
            (sender_id, subscription_type, channels, subject, message, target_role,
             total_sent, results, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            current_user['id'],
            broadcast.subscription_type,
            ','.join(broadcast.channels),
            broadcast.subject,
            broadcast.message,
            broadcast.target_role or 'all',
            sum(r["sent"] for r in results.values()),
            str(results),
            datetime.now().isoformat()
        ))

        conn.commit()
        conn.close()

        log_info(f"Рассылка отправлена: {results}", "broadcasts")

        return {
            "success": True,
            "results": results,
            "message": f"Рассылка отправлена. Всего: {sum(r['sent'] for r in results.values())} сообщений"
        }

    except Exception as e:
        log_error(f"Ошибка отправки рассылки: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcasts/history")
async def get_broadcast_history(
    current_user: dict = Depends(get_current_user)
):
    """Получить историю рассылок"""
    # Проверка роли
    if current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен. Требуется роль admin или director")

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, subscription_type, channels, subject, total_sent, created_at, results
            FROM broadcast_history
            ORDER BY created_at DESC
            LIMIT 50
        """)

        history = []
        for row in c.fetchall():
            history.append({
                "id": row[0],
                "subscription_type": row[1],
                "channels": row[2].split(','),
                "subject": row[3],
                "total_sent": row[4],
                "created_at": row[5],
                "results": row[6]
            })

        conn.close()

        return {"history": history}

    except Exception as e:
        log_error(f"Ошибка получения истории: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/unsubscribe")
async def unsubscribe_v2(
    user: int,
    type: str,
    channel: str
):
    """Отписаться от конкретного канала рассылки (V2 с query params)"""
    try:
        if channel not in ["email", "telegram", "instagram"]:
            raise HTTPException(status_code=400, detail="Неверный канал")

        conn = get_db_connection()
        c = conn.cursor()

        channel_field = f"{channel}_enabled"
        c.execute(f"""
            UPDATE user_subscriptions
            SET {channel_field} = 0, is_subscribed = CASE WHEN %s = 'promotions' THEN is_subscribed ELSE is_subscribed END, updated_at = %s
            WHERE user_id = %s AND subscription_type = %s
        """, (type, datetime.now().isoformat(), user, type))

        conn.commit()
        conn.close()

        log_info(f"Пользователь {user} отписался от {channel} для {type}", "broadcasts")

        return {
            "success": True,
            "message": f"Вы успешно отписались от {type} в {channel}"
        }

    except Exception as e:
        log_error(f"Ошибка отписки: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/broadcasts/users")
async def get_broadcast_users(
    subscription_type: str,
    target_role: Optional[str] = None,
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

        query = """
            SELECT 
                u.id, u.username, u.full_name, u.role, u.email, u.telegram_id, u.instagram_username,
                COALESCE(s.is_subscribed, FALSE) as is_subscribed,
                COALESCE(s.email_enabled, TRUE) as email_enabled,
                COALESCE(s.telegram_enabled, TRUE) as telegram_enabled,
                COALESCE(s.instagram_enabled, TRUE) as instagram_enabled
            FROM users u
            LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.subscription_type = %s
            WHERE u.is_active = TRUE
        """
        params = [subscription_type]

        if target_role and target_role != 'all':
            query += " AND u.role = %s"
            params.append(target_role)

        c.execute(query, params)
        users = []
        for row in c.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "full_name": row[2],
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

        conn.close()
        return {"users": users}

    except Exception as e:
        log_error(f"Error fetching broadcast users: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))
