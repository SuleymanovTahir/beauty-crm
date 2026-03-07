"""
WebSocket endpoint для real-time чата
Заменяет HTTP polling для сообщений
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from datetime import datetime
from utils.logger import log_info, log_error
from utils.redis_pubsub import redis_pubsub
from utils.utils import is_allowed_websocket_origin, require_websocket_auth

router = APIRouter(tags=["Chat"])

class ChatConnectionManager:
    """Управление WebSocket соединениями для чата"""

    def __init__(self):
        # Подключения сотрудников/админов: {user_id: [websockets]}
        self.admin_connections: Dict[int, Set[WebSocket]] = {}
        # Подключения клиентов (если будут): {client_id: [websockets]}
        self.client_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_admin(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение админа"""
        is_first_connection = user_id not in self.admin_connections
        
        if is_first_connection:
            self.admin_connections[user_id] = set()
            
        self.admin_connections[user_id].add(websocket)
        
        if is_first_connection:
            # Уведомляем других, что этот пользователь теперь онлайн
            await self.broadcast_user_status(user_id, "online")
            
        log_info(f"💬 Chat WS: Admin {user_id} connected. Active admins: {len(self.admin_connections)}", "chat")

    async def disconnect_admin(self, user_id: int, websocket: WebSocket):
        """Удалить соединение админа"""
        if user_id in self.admin_connections:
            if websocket in self.admin_connections[user_id]:
                self.admin_connections[user_id].remove(websocket)
            
            if not self.admin_connections[user_id]:
                del self.admin_connections[user_id]
                # Уведомляем других, что пользователь ушел в оффлайн
                await self.broadcast_user_status(user_id, "offline")
                log_info(f"💬 Chat WS: Admin {user_id} disconnected. Active admins: {len(self.admin_connections)}", "chat")

    async def broadcast_user_status(self, user_id: int, status: str):
        """Разослать изменение статуса пользователя"""
        await self.notify_admins({
            "type": "user_status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        })

    def get_online_users(self):
        """Получить список ID всех онлайн пользователей"""
        return list(self.admin_connections.keys())

    async def notify_admins(self, message: dict):
        """Отправить сообщение всем подключенным админам"""
        published = await redis_pubsub.publish("crm:chat:broadcast", message)
        if published:
            return
        await self.notify_admins_local(message)

    async def notify_admins_local(self, message: dict):
        """Локальная отправка всем подключенным админам"""
        for user_id in list(self.admin_connections.keys()):
            for connection in list(self.admin_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending chat update to admin {user_id}: {e}", "chat")
                    # Соединение будет удалено при следующем disconnect или ошибке

chat_manager = ChatConnectionManager()


async def chat_pubsub_handler(channel: str, data: dict):
    if channel == "crm:chat:broadcast":
        await chat_manager.notify_admins_local(data)


redis_pubsub.register_handler("crm:chat:", chat_pubsub_handler)

@router.websocket("/chat")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint для чата
    
    Клиент (админ-панель) отправляет:
    - {"type": "auth", "user_id": 123} - для аутентификации
    - {"type": "ping"} - для поддержания соединения
    """
    user_id = None
    try:
        origin_header = websocket.headers.get("origin")
        if not is_allowed_websocket_origin(origin_header):
            log_error(f"Blocked chat websocket origin: {origin_header}", "chat")
            await websocket.close(code=1008, reason="invalid_origin")
            return

        authenticated_user = require_websocket_auth(websocket)
        if not authenticated_user:
            log_error("Blocked chat websocket without valid session", "chat")
            await websocket.close(code=1008, reason="unauthorized")
            return

        from utils.permissions import PermissionChecker

        if not PermissionChecker.can_view_instagram_chat(authenticated_user):
            log_error(f"Blocked chat websocket for role {authenticated_user.get('role')}", "chat")
            await websocket.close(code=1008, reason="forbidden")
            return

        await websocket.accept()
        log_info("💬 New Chat WS connection accepted", "chat")
        
        # Ждём аутентификацию
        try:
            auth_message = await websocket.receive_json()
        except:
            await websocket.close()
            return

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

        await chat_manager.connect_admin(user_id, websocket)

        # Подтверждение
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # Отправляем список онлайн пользователей
        online_users = chat_manager.get_online_users()
        await websocket.send_json({
            "type": "online_users",
            "users": online_users
        })

        while True:
            try:
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break
            except Exception as e:
                log_error(f"Chat WS error for user {user_id}: {e}", "chat")
                break

    except WebSocketDisconnect:
        # Это исключение может быть поймано тут, если оно произошло до входа в цикл while (например при send_json)
        # Но основная обработка disconnect внутри finally
        pass
    finally:
        if user_id:
            await chat_manager.disconnect_admin(user_id, websocket)

async def notify_new_message(client_id: str, message_data: dict):
    """
    Уведомить всех админов о новом сообщении
    """
    await chat_manager.notify_admins({
        "type": "new_message",
        "client_id": client_id,
        "message": message_data,
        "timestamp": datetime.now().isoformat()
    })

async def notify_typing(client_id: str, is_typing: bool):
    """
    Уведомить о том, что клиент печатает (если поддерживается мессенджером)
    """
    await chat_manager.notify_admins({
        "type": "typing",
        "client_id": client_id,
        "is_typing": is_typing
    })
