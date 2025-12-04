"""
API для управления подписками пользователей
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from datetime import datetime

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import get_current_user
from core.subscriptions import get_subscription_types_for_role, get_all_subscription_types
from utils.logger import log_info, log_error

router = APIRouter()

class SubscriptionUpdate(BaseModel):
    """Модель для обновления подписки"""
    subscription_type: str
    is_subscribed: bool
    email_enabled: Optional[bool] = None
    telegram_enabled: Optional[bool] = None
    instagram_enabled: Optional[bool] = None

class UserSubscriptionsResponse(BaseModel):
    """Модель ответа с подписками пользователя"""
    subscriptions: dict
    available_types: dict

@router.get("/subscriptions", response_model=UserSubscriptionsResponse)
async def get_user_subscriptions(current_user: dict = Depends(get_current_user)):
    """
    Получить подписки текущего пользователя
    """
    try:
        user_id = current_user['id']
        role = current_user.get('role', 'client')

        conn = get_db_connection()
        c = conn.cursor()

        # Получаем доступные типы подписок для роли
        available_types = get_subscription_types_for_role(role)

        # Получаем текущие подписки пользователя с каналами
        c.execute("""
            SELECT subscription_type, is_subscribed, email_enabled, telegram_enabled, instagram_enabled
            FROM user_subscriptions
            WHERE user_id = %s
        """, (user_id,))

        user_subscriptions = {}
        for row in c.fetchall():
            user_subscriptions[row[0]] = {
                "is_subscribed": bool(row[1]),
                "channels": {
                    "email": bool(row[2]) if row[2] is not None else True,
                    "telegram": bool(row[3]) if row[3] is not None else True,
                    "instagram": bool(row[4]) if row[4] is not None else True
                }
            }

        # Если подписок нет, создаем дефолтные (все включены)
        if not user_subscriptions:
            for sub_type in available_types.keys():
                c.execute("""
                    INSERT INTO user_subscriptions
                    (user_id, subscription_type, is_subscribed, email_enabled, telegram_enabled, instagram_enabled)
                    VALUES (%s, %s, TRUE, TRUE, TRUE, TRUE)
                    ON CONFLICT (user_id, subscription_type) DO NOTHING
                """, (user_id, sub_type))
                user_subscriptions[sub_type] = {
                    "is_subscribed": True,
                    "channels": {"email": True, "telegram": True, "instagram": True}
                }
            conn.commit()

        conn.close()

        log_info(f"Получены подписки пользователя {user_id}", "subscriptions")

        return {
            "subscriptions": user_subscriptions,
            "available_types": available_types
        }

    except Exception as e:
        log_error(f"Ошибка получения подписок: {e}", "subscriptions")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions")
async def update_user_subscription(
    subscription_update: SubscriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Обновить подписку пользователя
    """
    try:
        user_id = current_user['id']
        sub_type = subscription_update.subscription_type
        is_subscribed = subscription_update.is_subscribed

        # Проверяем, что тип подписки существует
        all_types = get_all_subscription_types()
        if sub_type not in all_types:
            raise HTTPException(status_code=400, detail="Неверный тип подписки")

        conn = get_db_connection()
        c = conn.cursor()

        # Строим SQL запрос динамически в зависимости от того, какие каналы обновляются
        update_fields = ["is_subscribed = %s", "updated_at = %s"]
        update_values = [is_subscribed, datetime.now().isoformat()]

        insert_fields = ["user_id", "subscription_type", "is_subscribed", "updated_at"]
        insert_values = [user_id, sub_type, is_subscribed, datetime.now().isoformat()]
        insert_placeholders = ["%s", "%s", "%s", "%s"]

        if subscription_update.email_enabled is not None:
            update_fields.append("email_enabled = %s")
            update_values.append(subscription_update.email_enabled)
            insert_fields.append("email_enabled")
            insert_values.append(subscription_update.email_enabled)
            insert_placeholders.append("%s")

        if subscription_update.telegram_enabled is not None:
            update_fields.append("telegram_enabled = %s")
            update_values.append(subscription_update.telegram_enabled)
            insert_fields.append("telegram_enabled")
            insert_values.append(subscription_update.telegram_enabled)
            insert_placeholders.append("%s")

        if subscription_update.instagram_enabled is not None:
            update_fields.append("instagram_enabled = %s")
            update_values.append(subscription_update.instagram_enabled)
            insert_fields.append("instagram_enabled")
            insert_values.append(subscription_update.instagram_enabled)
            insert_placeholders.append("%s")

        # Обновляем или создаем подписку
        c.execute(f"""
            INSERT INTO user_subscriptions
            ({', '.join(insert_fields)})
            VALUES ({', '.join(insert_placeholders)})
            ON CONFLICT(user_id, subscription_type)
            DO UPDATE SET {', '.join(update_fields)}
        """, insert_values + update_values)

        conn.commit()
        conn.close()

        action = "подписан на" if is_subscribed else "отписан от"
        log_info(f"Пользователь {user_id} {action} {sub_type}", "subscriptions")

        return {"success": True, "message": "Подписка обновлена"}

    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Ошибка обновления подписки: {e}", "subscriptions")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions/bulk")
async def update_multiple_subscriptions(
    subscriptions: List[SubscriptionUpdate],
    current_user: dict = Depends(get_current_user)
):
    """
    Обновить несколько подписок одновременно
    """
    try:
        user_id = current_user['id']
        all_types = get_all_subscription_types()

        conn = get_db_connection()
        c = conn.cursor()

        for sub in subscriptions:
            if sub.subscription_type not in all_types:
                continue

            c.execute("""
                INSERT INTO user_subscriptions
                (user_id, subscription_type, is_subscribed, updated_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT(user_id, subscription_type)
                DO UPDATE SET is_subscribed = %s, updated_at = %s
            """, (
                user_id, sub.subscription_type, sub.is_subscribed,
                datetime.now().isoformat(),
                sub.is_subscribed, datetime.now().isoformat()
            ))

        conn.commit()
        conn.close()

        log_info(f"Обновлено {len(subscriptions)} подписок для пользователя {user_id}", "subscriptions")

        return {"success": True, "message": f"Обновлено {len(subscriptions)} подписок"}

    except Exception as e:
        log_error(f"Ошибка массового обновления подписок: {e}", "subscriptions")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteAccountRequest(BaseModel):
    """Модель запроса на удаление аккаунта"""
    password: str
    confirm: bool = False

@router.post("/account/delete")
async def delete_account(
    delete_request: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Удалить аккаунт текущего пользователя

    Требует подтверждение пароля и явное согласие
    """
    try:
        user_id = current_user['id']
        username = current_user.get('username', 'unknown')

        # Проверяем подтверждение
        if not delete_request.confirm:
            raise HTTPException(
                status_code=400,
                detail="Необходимо подтвердить удаление аккаунта"
            )

        # Проверяем пароль
        import hashlib

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        result = c.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        stored_password_hash = result[0]
        input_password_hash = hashlib.sha256(delete_request.password.encode()).hexdigest()

        if input_password_hash != stored_password_hash:
            raise HTTPException(status_code=403, detail="Неверный пароль")

        # Удаляем связанные данные вручную (для PostgreSQL без CASCADE)
        c.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
        c.execute("DELETE FROM user_subscriptions WHERE user_id = %s", (user_id,))
        c.execute("DELETE FROM notification_settings WHERE user_id = %s", (user_id,))
        c.execute("DELETE FROM activity_log WHERE user_id = %s", (user_id,))
        
        # Удаляем пользователя
        c.execute("DELETE FROM users WHERE id = %s", (user_id,))

        conn.commit()
        conn.close()

        log_info(f"Пользователь {username} (ID: {user_id}) удалил свой аккаунт", "account")

        return {
            "success": True,
            "message": "Аккаунт успешно удален"
        }

    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Ошибка удаления аккаунта: {e}", "account")
        raise HTTPException(status_code=500, detail=str(e))
