"""
WebSocket endpoint для real-time чата
Заменяет HTTP polling для сообщений
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from datetime import datetime
from utils.logger import log_info, log_error

router = APIRouter(tags=["Chat"], prefix="/api")

class ChatConnectionManager:
    """Управление WebSocket соединениями для чата"""

    def __init__(self):
        # Подключения сотрудников/админов: {user_id: [websockets]}
        self.admin_connections: Dict[int, Set[WebSocket]] = {}
        # Подключения клиентов (если будут): {client_id: [websockets]}
        self.client_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_admin(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение админа"""
        if user_id not in self.admin_connections:
            self.admin_connections[user_id] = set()
        self.admin_connections[user_id].add(websocket)
        log_info(f"💬 Chat WS: Admin {user_id} connected. Active admins: {len(self.admin_connections)}", "chat")

    def disconnect_admin(self, user_id: int, websocket: WebSocket):
        """Удалить соединение админа"""
        if user_id in self.admin_connections:
            if websocket in self.admin_connections[user_id]:
                self.admin_connections[user_id].remove(websocket)
            if not self.admin_connections[user_id]:
                del self.admin_connections[user_id]
                log_info(f"💬 Chat WS: Admin {user_id} disconnected. Active admins: {len(self.admin_connections)}", "chat")

    async def notify_admins(self, message: dict):
        """Отправить сообщение всем подключенным админам"""
        for user_id in list(self.admin_connections.keys()):
            for connection in self.admin_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending chat update to admin {user_id}: {e}", "chat")
                    # Соединение будет удалено при следующем disconnect или ошибке

chat_manager = ChatConnectionManager()

@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint для чата
    
    Клиент (админ-панель) отправляет:
    - {"type": "auth", "user_id": 123} - для аутентификации
    - {"type": "ping"} - для поддержания соединения
    """
    user_id = None
    try:
        await websocket.accept()
        log_info("💬 New Chat WS connection accepted", "chat")
        
        # Ждём аутентификацию
        try:
            auth_message = await websocket.receive_json()
        except:
            await websocket.close()
            return

        if auth_message.get("type") != "auth" or "user_id" not in auth_message:
            await websocket.send_json({"type": "error", "message": "Authentication required"})
            await websocket.close()
            return

        user_id = int(auth_message["user_id"])
        await chat_manager.connect_admin(user_id, websocket)

        # Подтверждение
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
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
        pass
    finally:
        if user_id:
            chat_manager.disconnect_admin(user_id, websocket)

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
