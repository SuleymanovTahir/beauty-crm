"""
WebSocket endpoint для real-time уведомлений
Заменяет HTTP polling для уведомлений
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from datetime import datetime
from utils.logger import log_info, log_error

router = APIRouter(tags=["Notifications"], prefix="/api")

class NotificationsConnectionManager:
    """Управление WebSocket соединениями для уведомлений"""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        log_info(f"🔔 Notifications WS: User {user_id} connected. Active users: {len(self.active_connections)}", "notifications")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Удалить соединение"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                log_info(f"🔔 Notifications WS: User {user_id} disconnected. Active users: {len(self.active_connections)}", "notifications")

    async def send_to_user(self, user_id: int, message: dict):
        """Отправить сообщение конкретному пользователю"""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending to user {user_id}: {e}", "notifications")
                    disconnected.add(connection)

            # Очистка отключенных соединений
            for conn in disconnected:
                self.disconnect(user_id, conn)

    async def broadcast_to_all(self, message: dict):
        """Отправить сообщение всем подключенным пользователям"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)

# Singleton instance
notifications_manager = NotificationsConnectionManager()


@router.websocket("/ws/notifications")
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
        log_info("🔔 New WS connection attempt", "notifications")

        # Ждём аутентификацию от клиента
        auth_message = await websocket.receive_json()

        if auth_message.get("type") != "auth" or "user_id" not in auth_message:
            await websocket.send_json({"type": "error", "message": "Authentication required"})
            await websocket.close()
            return

        user_id = auth_message["user_id"]
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
                    # Здесь можно запросить из БД и отправить
                    from db.connection import get_db_connection
                    conn = get_db_connection()
                    c = conn.cursor()
                    c.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND read = FALSE", (user_id,))
                    count = c.fetchone()[0]
                    conn.close()

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
