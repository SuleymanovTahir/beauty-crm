"""
WebRTC Signaling Server для видео/аудио звонков
Использует WebSocket для обмена SDP предложениями и ICE кандидатами
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import time
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error

router = APIRouter(tags=["WebRTC"])

# Хранилище активных WebSocket соединений
# Структура: {user_id: Set[WebSocket]}
active_connections: Dict[int, Set[WebSocket]] = {}

# Хранилище активных звонков
# Структура: {room_id: {participants: {user_id: {joined_at, socket}}, type, start_time}}
active_calls: Dict[str, dict] = {}

# Статус пользователей (для индикации занятости)
# Структура: {user_id: "available" | "busy" | "calling" | "on_hold"}
user_call_status: Dict[int, str] = {}

def get_user_dnd(user_id: int) -> bool:
    """Проверить DND статус пользователя в БД"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT is_dnd FROM user_status WHERE user_id = %s", (user_id,))
        row = c.fetchone()
        conn.close()
        return bool(row[0]) if row else False
    except Exception as e:
        log_error(f"Error checking DND for user {user_id}: {e}", "webrtc")
        return False

def save_call_log(caller_id: int, callee_id: int, status: str, call_type: str = 'audio', duration: int = 0, metadata: dict = None):
    """Сохранить лог звонка в БД"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO user_call_logs (caller_id, callee_id, status, type, duration, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (caller_id, callee_id, status, call_type, duration, json.dumps(metadata) if metadata else None))
        conn.commit()
        conn.close()
    except Exception as e:
        log_error(f"Error saving call log: {e}", "webrtc")



class ConnectionManager:
    """Управление WebSocket соединениями для WebRTC"""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
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
        await websocket.accept()
        log_info("🔌 WebRTC WS: Connection accepted", "webrtc")

        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_json()
            message_type = data.get("type")

            # Регистрация пользователя
            if message_type == "register":
                user_id_raw = data.get("user_id")
                if user_id_raw is not None:
                    user_id = int(user_id_raw)
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
                from_user = int(data.get("from"))
                to_user = int(data.get("to"))
                call_type = data.get("call_type", "audio")

                # Проверяем, онлайн ли получатель
                if manager.is_user_online(to_user):
                    # Проверяем DND (Do Not Disturb)
                    if get_user_dnd(to_user):
                        await websocket.send_json({
                            "type": "call-rejected",
                            "from": to_user,
                            "reason": "busy" # DND интерпретируется как занят
                        })
                        save_call_log(from_user, to_user, 'busy', call_type)
                        log_info(f"🚫 WebRTC: Call blocked by DND {to_user}", "webrtc")
                        return

                    # Проверяем статус (Call Waiting support)
                    current_status = user_call_status.get(to_user, "available")
                    
                    # Отправляем уведомление о входящем звонке
                    await manager.send_to_user(to_user, {
                        "type": "incoming-call",
                        "from": from_user,
                        "call_type": call_type,
                        "callee_status": current_status
                    })
                    
                    # Устанавливаем статус "calling" (вызывается)
                    if from_user not in user_call_status or user_call_status[from_user] == "available":
                        user_call_status[from_user] = "calling"
                        
                    log_info(f"📞 WebRTC: Call initiated {from_user} -> {to_user} ({call_type}). To-user status: {current_status}", "webrtc")
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

                user_call_status[from_user] = "busy"
                user_call_status[to_user] = "busy"

                await manager.send_to_user(to_user, {
                    "type": "call-accepted",
                    "from": from_user
                })
                log_info(f"✅ WebRTC: Call accepted {from_user} <-> {to_user}", "webrtc")

            # Отклонение звонка
            elif message_type == "reject-call":
                from_user = data.get("from")
                to_user = data.get("to")
                reason = data.get("reason", "rejected")

                # Если отклонил из-за занятости
                if reason == "busy":
                    log_info(f"📵 WebRTC: User {from_user} is busy for {to_user}", "webrtc")
                else:
                    # Сбрасываем статус только если он был в процессе вызова
                    if user_call_status.get(from_user) == "calling":
                        user_call_status[from_user] = "available"

                await manager.send_to_user(to_user, {
                    "type": "call-rejected",
                    "from": from_user,
                    "reason": reason
                })
                save_call_log(to_user, from_user, reason)
                log_info(f"❌ WebRTC: Call {reason}: {from_user} X {to_user}", "webrtc")

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
                duration = data.get("duration", 0)

                user_call_status[from_user] = "available"
                if to_user:
                    user_call_status[to_user] = "available"
                    await manager.send_to_user(to_user, {
                        "type": "hangup",
                        "from": from_user
                    })
                    save_call_log(from_user, to_user, "completed", duration=duration)
                
                log_info(f"📴 WebRTC: Call ended {from_user} -> {to_user if to_user else 'all'}", "webrtc")

            # Перевод звонка (Transfer)
            elif message_type == "transfer":
                from_user = data.get("from")
                target_user = data.get("to")
                party_to_transfer = data.get("party_id") # С кем сейчас говорим
                transfer_type = data.get("transfer_type", "blind") # blind or attended
                
                if manager.is_user_online(target_user):
                    # Отправляем инвайт целевому пользователю
                    await manager.send_to_user(target_user, {
                        "type": "incoming-call",
                        "from": party_to_transfer,
                        "transferred_from": from_user,
                        "call_type": "audio"
                    })
                    
                    # Уведомляем того, кого переводим
                    await manager.send_to_user(party_to_transfer, {
                        "type": "transferring",
                        "to": target_user,
                        "by": from_user
                    })
                    
                    log_info(f"⤴️ WebRTC: Transfer initiated by {from_user}: {party_to_transfer} -> {target_user}", "webrtc")
                else:
                    await websocket.send_json({"type": "error", "message": "Target user offline"})

            # Удержание / Возобновление
            elif message_type in ["hold", "resume"]:
                from_user = data.get("from")
                to_user = data.get("to")
                user_call_status[from_user] = "on_hold" if message_type == "hold" else "busy"
                
                await manager.send_to_user(to_user, {
                    "type": message_type,
                    "from": from_user
                })
                log_info(f"⏸️ WebRTC: Call {message_type} by {from_user}", "webrtc")


    except WebSocketDisconnect:
        if user_id:
            # 1. First remove the connection so we don't try to broadcast to it
            is_offline = manager.disconnect(user_id, websocket)
            
            # 2. Reset status
            user_call_status[user_id] = "available"

            # 3. Then send hangup cleanup to others
            log_info(f"WebSocket disconnect cleanup for user {user_id}", "webrtc")
            await manager.broadcast({
                "type": "hangup",
                "from": user_id
            })
            
            if is_offline:
                if user_id in user_call_status: del user_call_status[user_id]
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
            # Also send cleanup on error
            try:
                await manager.broadcast({
                    "type": "hangup",
                    "from": user_id
                })
            except:
                pass
            manager.disconnect(user_id, websocket)


@router.get("/online-users")
async def get_online_users():
    """Получить список пользователей онлайн"""
    return {
        "online_users": list(manager.active_connections.keys()),
        "count": len(manager.active_connections)
    }
