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
            SELECT DISTINCT u.id, u.username, u.full_name, u.email, u.telegram_id, u.instagram_username, u.role
            FROM users u
            INNER JOIN user_subscriptions s ON u.id = s.user_id
            WHERE s.subscription_type = %s
            AND s.is_subscribed = TRUE
            AND u.is_active = TRUE
            AND u.email_verified = TRUE
        """
        params = [broadcast.subscription_type]

        # Фильтр по роли если указан
        if broadcast.target_role:
            query += " AND u.role = %s"
            params.append(broadcast.target_role)

        c.execute(query, params)
        all_users = c.fetchall()

        # Подсчитываем получателей по каналам
        by_channel = {"email": 0, "telegram": 0, "instagram": 0}
        users_by_channel = {"email": [], "telegram": [], "instagram": []}

        for user in all_users:
            user_id, username, full_name, email, telegram_id, instagram_username, role = user

            # Проверяем каналы для этого пользователя
            c.execute("""
                SELECT email_enabled, telegram_enabled, instagram_enabled
                FROM user_subscriptions
                WHERE user_id = %s AND subscription_type = %s
            """, (user_id, broadcast.subscription_type))

            channels_data = c.fetchone()
            if not channels_data:
                continue

            email_enabled, telegram_enabled, instagram_enabled = channels_data

            user_info = {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "role": role
            }

            # Email
            if "email" in broadcast.channels and email_enabled and email:
                by_channel["email"] += 1
                if len(users_by_channel["email"]) < 5:  # Первые 5 для превью
                    users_by_channel["email"].append({**user_info, "contact": email})

            # Telegram
            if "telegram" in broadcast.channels and telegram_enabled and telegram_id:
                by_channel["telegram"] += 1
                if len(users_by_channel["telegram"]) < 5:
                    users_by_channel["telegram"].append({**user_info, "contact": telegram_id})

            # Instagram
            if "instagram" in broadcast.channels and instagram_enabled and instagram_username:
                by_channel["instagram"] += 1
                if len(users_by_channel["instagram"]) < 5:
                    users_by_channel["instagram"].append({**user_info, "contact": instagram_username})

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
            INNER JOIN user_subscriptions s ON u.id = s.user_id
            WHERE s.subscription_type = %s
            AND s.is_subscribed = TRUE
            AND u.is_active = TRUE
            AND u.email_verified = TRUE
        """
        params = [broadcast.subscription_type]

        if broadcast.target_role:
            query += " AND u.role = %s"
            params.append(broadcast.target_role)

        c.execute(query, params)
        all_users = c.fetchall()

        results = {
            "email": {"sent": 0, "failed": 0},
            "telegram": {"sent": 0, "failed": 0},
            "instagram": {"sent": 0, "failed": 0}
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
            if not channels_data:
                continue

            email_enabled, telegram_enabled, instagram_enabled = channels_data

            # Email
            if "email" in broadcast.channels and email_enabled and email:
                try:
                    from utils.email import send_broadcast_email
                    # Добавляем unsubscribe ссылку
                    unsubscribe_link = f"/unsubscribe%suser={user_id}&type={broadcast.subscription_type}&channel=email"
                    send_broadcast_email(email, broadcast.subject, broadcast.message, full_name, unsubscribe_link)
                    results["email"]["sent"] += 1
                except Exception as e:
                    log_error(f"Email ошибка для {email}: {e}", "broadcasts")
                    results["email"]["failed"] += 1

            # Telegram
            if "telegram" in broadcast.channels and telegram_enabled and telegram_id:
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
            if "instagram" in broadcast.channels and instagram_enabled and instagram_username:
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
            broadcast.target_role,
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

@router.post("/unsubscribe/{user_id}/{subscription_type}/{channel}")
async def unsubscribe_from_channel(
    user_id: int,
    subscription_type: str,
    channel: str
):
    """Отписаться от конкретного канала рассылки"""
    try:
        if channel not in ["email", "telegram", "instagram"]:
            raise HTTPException(status_code=400, detail="Неверный канал")

        conn = get_db_connection()
        c = conn.cursor()

        channel_field = f"{channel}_enabled"
        c.execute(f"""
            UPDATE user_subscriptions
            SET {channel_field} = 0, updated_at = %s
            WHERE user_id = %s AND subscription_type = %s
        """, (datetime.now().isoformat(), user_id, subscription_type))

        conn.commit()
        conn.close()

        log_info(f"Пользователь {user_id} отписался от {channel} для {subscription_type}", "broadcasts")

        return {
            "success": True,
            "message": f"Вы успешно отписались от {subscription_type} в {channel}"
        }

    except Exception as e:
        log_error(f"Ошибка отписки: {e}", "broadcasts")
        raise HTTPException(status_code=500, detail=str(e))
