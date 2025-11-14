"""
API для управления подписками пользователей
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from datetime import datetime

from core.config import DATABASE_NAME
from core.auth import get_current_user
from core.subscriptions import get_subscription_types_for_role, get_all_subscription_types
from utils.logger import log_info, log_error

router = APIRouter()


class SubscriptionUpdate(BaseModel):
    """Модель для обновления подписки"""
    subscription_type: str
    is_subscribed: bool


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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем доступные типы подписок для роли
        available_types = get_subscription_types_for_role(role)

        # Получаем текущие подписки пользователя
        c.execute("""
            SELECT subscription_type, is_subscribed
            FROM user_subscriptions
            WHERE user_id = ?
        """, (user_id,))

        user_subscriptions = {}
        for row in c.fetchall():
            user_subscriptions[row[0]] = bool(row[1])

        # Если подписок нет, создаем дефолтные (все включены)
        if not user_subscriptions:
            for sub_type in available_types.keys():
                c.execute("""
                    INSERT OR IGNORE INTO user_subscriptions
                    (user_id, subscription_type, is_subscribed)
                    VALUES (?, ?, 1)
                """, (user_id, sub_type))
                user_subscriptions[sub_type] = True
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Обновляем или создаем подписку
        c.execute("""
            INSERT INTO user_subscriptions
            (user_id, subscription_type, is_subscribed, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, subscription_type)
            DO UPDATE SET is_subscribed = ?, updated_at = ?
        """, (
            user_id, sub_type, int(is_subscribed), datetime.now().isoformat(),
            int(is_subscribed), datetime.now().isoformat()
        ))

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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        for sub in subscriptions:
            if sub.subscription_type not in all_types:
                continue

            c.execute("""
                INSERT INTO user_subscriptions
                (user_id, subscription_type, is_subscribed, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, subscription_type)
                DO UPDATE SET is_subscribed = ?, updated_at = ?
            """, (
                user_id, sub.subscription_type, int(sub.is_subscribed),
                datetime.now().isoformat(),
                int(sub.is_subscribed), datetime.now().isoformat()
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
        from core.auth import verify_password

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("SELECT password FROM users WHERE id = ?", (user_id,))
        result = c.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        stored_password = result[0]

        if not verify_password(delete_request.password, stored_password):
            raise HTTPException(status_code=403, detail="Неверный пароль")

        # Удаляем пользователя и все связанные данные
        # SQLite автоматически удалит записи с ON DELETE CASCADE
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))

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
