"""
WebRTC Signaling Server для видео/аудио звонков
Использует WebSocket для обмена SDP предложениями и ICE кандидатами
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from datetime import datetime
from utils.logger import log_info, log_error

router = APIRouter(tags=["WebRTC"], prefix="/api/webrtc")

# Хранилище активных WebSocket соединений
# Структура: {user_id: Set[WebSocket]}
active_connections: Dict[int, Set[WebSocket]] = {}

# Хранилище активных звонков
# Структура: {call_id: {caller_id, callee_id, type}}
active_calls: Dict[str, dict] = {}


class ConnectionManager:
    """Управление WebSocket соединениями для WebRTC"""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        log_info(f"WebRTC: User {user_id} connected. Total sessions: {len(self.active_connections.get(user_id, []))}", "webrtc")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Удалить соединение"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                log_info(f"WebRTC: User {user_id} fully disconnected (no active sessions).", "webrtc")
                return True # Indicates user is now completely offline
            else:
                log_info(f"WebRTC: User {user_id} disconnected one session. Remaining: {len(self.active_connections[user_id])}", "webrtc")
                return False # User still has other active connections
        return False

    async def send_to_user(self, user_id: int, message: dict):
        """Отправить сообщение конкретному пользователю (на все его устройства)"""
        if user_id in self.active_connections:
            # Отправляем на все активные соединения пользователя
            dead_sockets = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending to user {user_id}: {e}", "webrtc")
                    dead_sockets.append(connection)
            
            # Cleanup dead sockets
            for ds in dead_sockets:
                if ds in self.active_connections.get(user_id, set()):
                    self.active_connections[user_id].remove(ds)
            
            if not self.active_connections.get(user_id):
                if user_id in self.active_connections:
                    del self.active_connections[user_id]
            
            return True
        return False

    async def broadcast(self, message: dict):
        """Broadcast message to all connected users"""
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error broadcasting to user {user_id}: {e}", "webrtc")

    def is_user_online(self, user_id: int) -> bool:
        """Проверить, онлайн ли пользователь"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


manager = ConnectionManager()


@router.websocket("/signal")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для WebRTC сигнализации и статусов
    """
    user_id = None

    try:
        # Note: We don't accept here immediately, let connect() handle acceptance logic or pre-acceptance if needed
        # But for compatibility with existing flow where we wait for register message:
        await websocket.accept() # Accept first to receive register message
        
        # NOTE: Standard flow usually authenticates/registers immediately via query params or headers, 
        # but here we rely on "register" message.
        # So we keep connection open but not managed until "register"

        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_json()
            message_type = data.get("type")

            # Регистрация пользователя
            if message_type == "register":
                user_id = data.get("user_id")
                if user_id:
                    # Manually add to manager (since we already accepted)
                    if user_id not in manager.active_connections:
                        manager.active_connections[user_id] = set()
                        # Notify others only if this is the FIRST connection
                        await manager.broadcast({
                            "type": "user_status",
                            "user_id": user_id,
                            "status": "online",
                            "timestamp": datetime.now().isoformat()
                        })
                    
                    manager.active_connections[user_id].add(websocket)
                    
                    await websocket.send_json({
                        "type": "registered",
                        "user_id": user_id,
                        "success": True
                    })
                    
                    log_info(f"User {user_id} registered for WebRTC", "webrtc")

            # Инициация звонка
            elif message_type == "call":
                from_user = data.get("from")
                to_user = data.get("to")
                call_type = data.get("call_type", "audio")

                # Проверяем, онлайн ли получатель
                if manager.is_user_online(to_user):
                    # Отправляем уведомление о входящем звонке
                    await manager.send_to_user(to_user, {
                        "type": "incoming-call",
                        "from": from_user,
                        "call_type": call_type
                    })
                    log_info(f"Call initiated: {from_user} -> {to_user} ({call_type})", "webrtc")
                else:
                    # Пользователь оффлайн
                    await websocket.send_json({
                        "type": "error",
                        "message": "User is offline"
                    })

            # Принятие звонка
            elif message_type == "accept-call":
                from_user = data.get("from")
                to_user = data.get("to")

                await manager.send_to_user(to_user, {
                    "type": "call-accepted",
                    "from": from_user
                })
                log_info(f"Call accepted: {from_user} <-> {to_user}", "webrtc")

            # Отклонение звонка
            elif message_type == "reject-call":
                from_user = data.get("from")
                to_user = data.get("to")

                await manager.send_to_user(to_user, {
                    "type": "call-rejected",
                    "from": from_user
                })
                log_info(f"Call rejected: {from_user} X {to_user}", "webrtc")

            # WebRTC Offer (SDP)
            elif message_type == "offer":
                from_user = data.get("from")
                to_user = data.get("to")
                sdp = data.get("sdp")

                await manager.send_to_user(to_user, {
                    "type": "offer",
                    "from": from_user,
                    "sdp": sdp
                })
                log_info(f"SDP Offer: {from_user} -> {to_user}", "webrtc")

            # WebRTC Answer (SDP)
            elif message_type == "answer":
                from_user = data.get("from")
                to_user = data.get("to")
                sdp = data.get("sdp")

                await manager.send_to_user(to_user, {
                    "type": "answer",
                    "from": from_user,
                    "sdp": sdp
                })
                log_info(f"SDP Answer: {from_user} -> {to_user}", "webrtc")

            # ICE Candidate
            elif message_type == "ice-candidate":
                from_user = data.get("from")
                to_user = data.get("to")
                candidate = data.get("candidate")

                await manager.send_to_user(to_user, {
                    "type": "ice-candidate",
                    "from": from_user,
                    "candidate": candidate
                })

            # Завершение звонка
            elif message_type == "hangup":
                from_user = data.get("from")
                to_user = data.get("to")

                await manager.send_to_user(to_user, {
                    "type": "hangup",
                    "from": from_user
                })
                log_info(f"Call ended: {from_user} - {to_user}", "webrtc")

    except WebSocketDisconnect:
        if user_id:
            is_offline = manager.disconnect(user_id, websocket)
            if is_offline:
                # Broadcast offline status only if no connections left
                await manager.broadcast({
                    "type": "user_status",
                    "user_id": user_id,
                    "status": "offline",
                    "last_seen": datetime.now().isoformat()
                })
            log_info(f"WebSocket disconnected: user {user_id}", "webrtc")
    except Exception as e:
        log_error(f"WebSocket error: {e}", "webrtc")
        if user_id:
            manager.disconnect(user_id, websocket)


@router.get("/online-users")
async def get_online_users():
    """Получить список пользователей онлайн"""
    return {
        "online_users": list(manager.active_connections.keys()),
        "count": len(manager.active_connections)
    }
