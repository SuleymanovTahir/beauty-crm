"""
Push Token API - Управление токенами устройств для push уведомлений
"""

from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import httpx

from db.init import get_db_connection
from core.auth import require_auth

router = APIRouter(prefix="/api", tags=["Push Notifications"])


class PushTokenRequest(BaseModel):
    token: str
    device_type: str = "unknown"  # ios, android, unknown


class PushNotificationRequest(BaseModel):
    user_id: Optional[int] = None
    title: str
    body: str
    data: Optional[dict] = None


@router.post("/push-token")
async def save_push_token(
    request: PushTokenRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Сохранить push token устройства"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Upsert token
        c.execute("""
            INSERT INTO user_push_tokens (user_id, token, device_type, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (user_id, token)
            DO UPDATE SET
                device_type = EXCLUDED.device_type,
                updated_at = NOW(),
                is_active = TRUE
        """, (user["id"], request.token, request.device_type))

        conn.commit()
        return {"success": True, "message": "Push token saved"}

    except Exception as e:
        conn.rollback()
        print(f"Error saving push token: {e}")
        return JSONResponse({"error": "Failed to save push token"}, status_code=500)

    finally:
        conn.close()


@router.delete("/push-token")
async def remove_push_token(
    request: PushTokenRequest,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить push token (при logout)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            UPDATE user_push_tokens
            SET is_active = FALSE, updated_at = NOW()
            WHERE user_id = %s AND token = %s
        """, (user["id"], request.token))

        conn.commit()
        return {"success": True, "message": "Push token removed"}

    except Exception as e:
        conn.rollback()
        print(f"Error removing push token: {e}")
        return JSONResponse({"error": "Failed to remove push token"}, status_code=500)

    finally:
        conn.close()


async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> bool:
    """
    Отправить push уведомление пользователю через Expo Push API

    Args:
        user_id: ID пользователя
        title: Заголовок уведомления
        body: Текст уведомления
        data: Дополнительные данные

    Returns:
        True если отправлено успешно
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Получить активные токены пользователя
        c.execute("""
            SELECT token FROM user_push_tokens
            WHERE user_id = %s AND is_active = TRUE
        """, (user_id,))

        tokens = [row[0] for row in c.fetchall()]

        if not tokens:
            return False

        # Подготовить сообщения для Expo Push API
        messages = []
        for token in tokens:
            if not token.startswith("ExponentPushToken"):
                continue

            message = {
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data or {},
            }
            messages.append(message)

        if not messages:
            return False

        # Отправить через Expo Push API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                },
            )

            if response.status_code == 200:
                result = response.json()
                # Обработать ошибки для конкретных токенов
                for i, ticket in enumerate(result.get("data", [])):
                    if ticket.get("status") == "error":
                        error_type = ticket.get("details", {}).get("error")
                        if error_type in ["DeviceNotRegistered", "InvalidCredentials"]:
                            # Деактивировать невалидный токен
                            c.execute("""
                                UPDATE user_push_tokens
                                SET is_active = FALSE
                                WHERE token = %s
                            """, (tokens[i],))
                conn.commit()
                return True

        return False

    except Exception as e:
        print(f"Error sending push notification: {e}")
        return False

    finally:
        conn.close()


async def send_push_to_multiple_users(
    user_ids: list[int],
    title: str,
    body: str,
    data: Optional[dict] = None
) -> int:
    """
    Отправить push уведомление нескольким пользователям

    Returns:
        Количество успешно отправленных уведомлений
    """
    success_count = 0
    for user_id in user_ids:
        if await send_push_notification(user_id, title, body, data):
            success_count += 1
    return success_count


# Функции для отправки конкретных типов уведомлений

async def notify_booking_reminder(user_id: int, booking_id: int, service_name: str, datetime_str: str):
    """Напоминание о записи"""
    await send_push_notification(
        user_id=user_id,
        title="Напоминание о записи",
        body=f"{service_name} - {datetime_str}",
        data={"type": "booking_reminder", "booking_id": booking_id}
    )


async def notify_booking_confirmed(user_id: int, booking_id: int, service_name: str):
    """Запись подтверждена"""
    await send_push_notification(
        user_id=user_id,
        title="Запись подтверждена",
        body=f"Ваша запись на {service_name} подтверждена",
        data={"type": "booking_confirmed", "booking_id": booking_id}
    )


async def notify_booking_cancelled(user_id: int, booking_id: int, service_name: str):
    """Запись отменена"""
    await send_push_notification(
        user_id=user_id,
        title="Запись отменена",
        body=f"Запись на {service_name} была отменена",
        data={"type": "booking_cancelled", "booking_id": booking_id}
    )


async def notify_new_message(user_id: int, sender_name: str, message_preview: str):
    """Новое сообщение"""
    await send_push_notification(
        user_id=user_id,
        title=f"Сообщение от {sender_name}",
        body=message_preview[:100],
        data={"type": "new_message", "sender": sender_name}
    )
