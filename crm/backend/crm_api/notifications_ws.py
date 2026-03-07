"""
WebSocket endpoint для real-time уведомлений
Заменяет HTTP polling для уведомлений
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from datetime import datetime
from utils.logger import log_info, log_error
from utils.redis_pubsub import redis_pubsub
from utils.utils import get_total_unread, is_allowed_websocket_origin, require_websocket_auth

router = APIRouter(tags=["Notifications"])

class NotificationsConnectionManager:
    """Управление WebSocket соединениями для уведомлений с поддержкой Redis Pub/Sub"""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        log_info(f"🔔 Notifications WS: User {user_id} connected locally. Local users: {len(self.active_connections)}", "notifications")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Удалить соединение"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                log_info(f"🔔 Notifications WS: User {user_id} disconnected locally. Local users: {len(self.active_connections)}", "notifications")

    async def send_to_user(self, user_id: int, message: dict):
        """Публикуем уведомление в Redis для доставки на все воркеры"""
        published = await redis_pubsub.publish(f"crm:notifications:user:{user_id}", message)
        if not published:
            await self.send_to_user_local(user_id, message)

    async def send_to_user_local(self, user_id: int, message: dict):
        """Отправить сообщение локально подключенному пользователю"""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending local notification to user {user_id}: {e}", "notifications")
                    disconnected.add(connection)

            for conn in disconnected:
                self.disconnect(user_id, conn)

    async def broadcast_to_all(self, message: dict):
        """Публикуем шировещательное уведомление в Redis"""
        published = await redis_pubsub.publish("crm:notifications:broadcast", message)
        if not published:
            await self.broadcast_to_all_local(message)

    async def broadcast_to_all_local(self, message: dict):
        """Отправить сообщение всем локально подключенным пользователям"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user_local(user_id, message)

# Singleton instance
notifications_manager = NotificationsConnectionManager()

# Регистрация обработчика сообщений из Redis
async def notifications_pubsub_handler(channel: str, data: dict):
    if channel == "crm:notifications:broadcast":
        await notifications_manager.broadcast_to_all_local(data)
    elif channel.startswith("crm:notifications:user:"):
        try:
            user_id = int(channel.split(":")[-1])
            await notifications_manager.send_to_user_local(user_id, data)
        except (ValueError, IndexError):
            log_error(f"Invalid notifications user channel: {channel}", "notifications")

# Регистрируем префикс для этого модуля
redis_pubsub.register_handler("crm:notifications:", notifications_pubsub_handler)


@router.websocket("/notifications")
async def notifications_websocket(websocket: WebSocket):
    """
    WebSocket endpoint для real-time уведомлений

    Клиент отправляет:
    - {"type": "auth", "user_id": 123} - для аутентификации
    - {"type": "ping"} - для поддержания соединения

    Сервер отправляет:
    - {"type": "notification", "data": {...}} - новое уведомление
    - {"type": "unread_count", "count": 5} - обновление счетчика
    - {"type": "pong"} - ответ на ping
    """
    user_id = None

    try:
        origin_header = websocket.headers.get("origin")
        if not is_allowed_websocket_origin(origin_header):
            log_error(f"Blocked notifications websocket origin: {origin_header}", "notifications")
            await websocket.close(code=1008, reason="invalid_origin")
            return

        authenticated_user = require_websocket_auth(websocket)
        if not authenticated_user:
            log_error("Blocked notifications websocket without valid session", "notifications")
            await websocket.close(code=1008, reason="unauthorized")
            return

        await websocket.accept()
        log_info("🔔 New WS connection accepted", "notifications")

        # Ждём аутентификацию от клиента
        auth_message = await websocket.receive_json()

        if auth_message.get("type") != "auth":
            await websocket.send_json({"type": "error", "message": "Authentication required"})
            await websocket.close(code=1008)
            return

        claimed_user_id = auth_message.get("user_id")
        user_id = int(authenticated_user["id"])
        if claimed_user_id is not None:
            try:
                if int(claimed_user_id) != user_id:
                    await websocket.send_json({"type": "error", "message": "User mismatch"})
                    await websocket.close(code=1008)
                    return
            except (TypeError, ValueError):
                await websocket.send_json({"type": "error", "message": "Invalid user id"})
                await websocket.close(code=1008)
                return

        await notifications_manager.connect(user_id, websocket)

        # Подтверждение подключения
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        })

        # Основной цикл обработки сообщений
        while True:
            try:
                message = await websocket.receive_json()

                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

                elif message.get("type") == "request_count":
                    # Клиент запросил текущее количество непрочитанных
                    from starlette.concurrency import run_in_threadpool
                    
                    count = await run_in_threadpool(get_total_unread, user_id)

                    await websocket.send_json({
                        "type": "unread_count",
                        "count": count
                    })

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                log_error(f"Invalid JSON from user {user_id}", "notifications")
            except Exception as e:
                log_error(f"Error in websocket loop for user {user_id}: {e}", "notifications")
                break

    except WebSocketDisconnect:
        log_info(f"🔔 WS disconnected for user {user_id}", "notifications")
    except Exception as e:
        log_error(f"WebSocket error: {e}", "notifications")
    finally:
        if user_id:
            notifications_manager.disconnect(user_id, websocket)


# Функция для отправки уведомления пользователю (можно вызывать из других частей кода)
async def notify_user(user_id: int, notification_data: dict):
    """
    Отправить уведомление пользователю через WebSocket

    Args:
        user_id: ID пользователя
        notification_data: Данные уведомления
    """
    await notifications_manager.send_to_user(user_id, {
        "type": "notification",
        "data": notification_data,
        "timestamp": datetime.now().isoformat()
    })


async def broadcast_unread_count_update(user_id: int, count: int):
    """
    Обновить счетчик непрочитанных уведомлений для пользователя

    Args:
        user_id: ID пользователя
        count: Количество непрочитанных
    """
    await notifications_manager.send_to_user(user_id, {
        "type": "unread_count",
        "count": count,
        "timestamp": datetime.now().isoformat()
    })
