"""
WebRTC Signaling Server для видео/аудио звонков
Использует WebSocket для обмена SDP предложениями и ICE кандидатами
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
from utils.logger import log_info, log_error

router = APIRouter(tags=["WebRTC"], prefix="/api/webrtc")

# Хранилище активных WebSocket соединений
# Структура: {user_id: WebSocket}
active_connections: Dict[int, WebSocket] = {}

# Хранилище активных звонков
# Структура: {call_id: {caller_id, callee_id, type}}
active_calls: Dict[str, dict] = {}


class ConnectionManager:
    """Управление WebSocket соединениями для WebRTC"""

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        log_info(f"WebRTC: User {user_id} connected. Active: {len(self.active_connections)}", "webrtc")

    def disconnect(self, user_id: int):
        """Удалить соединение"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            log_info(f"WebRTC: User {user_id} disconnected. Active: {len(self.active_connections)}", "webrtc")

    async def send_to_user(self, user_id: int, message: dict):
        """Отправить сообщение конкретному пользователю"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except Exception as e:
                log_error(f"Error sending to user {user_id}: {e}", "webrtc")
                return False
        return False

    def is_user_online(self, user_id: int) -> bool:
        """Проверить, онлайн ли пользователь"""
        return user_id in self.active_connections


manager = ConnectionManager()


@router.websocket("/signal")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для WebRTC сигнализации

    Сообщения:
    - register: {type: "register", user_id: int}
    - call: {type: "call", from: int, to: int, call_type: "audio"|"video"}
    - offer: {type: "offer", from: int, to: int, sdp: string}
    - answer: {type: "answer", from: int, to: int, sdp: string}
    - ice-candidate: {type: "ice-candidate", from: int, to: int, candidate: object}
    - hangup: {type: "hangup", from: int, to: int}
    """
    user_id = None

    try:
        await websocket.accept()

        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_json()
            message_type = data.get("type")

            # Регистрация пользователя
            if message_type == "register":
                user_id = data.get("user_id")
                if user_id:
                    manager.active_connections[user_id] = websocket
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
            manager.disconnect(user_id)
            log_info(f"WebSocket disconnected: user {user_id}", "webrtc")
    except Exception as e:
        log_error(f"WebSocket error: {e}", "webrtc")
        if user_id:
            manager.disconnect(user_id)


@router.get("/online-users")
async def get_online_users():
    """Получить список пользователей онлайн"""
    return {
        "online_users": list(manager.active_connections.keys()),
        "count": len(manager.active_connections)
    }
