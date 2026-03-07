"""
WebRTC Signaling Server для видео/аудио звонков
Использует WebSocket для обмена SDP предложениями и ICE кандидатами
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Any, Dict, Optional, Set
import json
import time
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.redis_pubsub import redis_pubsub
from utils.utils import is_allowed_websocket_origin, require_websocket_auth
import asyncio

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

CALL_STATUS_AVAILABLE = "available"
CALL_STATUS_CALLING = "calling"
CALL_STATUS_RINGING = "ringing"
CALL_STATUS_BUSY = "busy"
CALL_STATUS_ON_HOLD = "on_hold"
ALLOWED_CALL_STATUSES = {
    CALL_STATUS_AVAILABLE,
    CALL_STATUS_CALLING,
    CALL_STATUS_RINGING,
    CALL_STATUS_BUSY,
    CALL_STATUS_ON_HOLD,
}


def _is_expected_websocket_close(error: Exception) -> bool:
    close_code = getattr(error, "code", None)
    if isinstance(close_code, int) and (close_code in {1000, 1001, 1005} or 0 <= close_code < 1000):
        return True

    message = str(error).strip().lower()
    if message.isdigit() and 0 <= int(message) < 1000:
        return True

    return (
        message in {"1000", "1001", "1005", "5"}
        or "disconnect message" in message
        or "websocket is not connected" in message
    )

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


def _safe_int(value: Any) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_call_status(status: Optional[str]) -> str:
    normalized = str(status or CALL_STATUS_AVAILABLE).strip().lower()
    if normalized in ALLOWED_CALL_STATUSES:
        return normalized
    return CALL_STATUS_AVAILABLE


def _set_local_call_status(user_id: Optional[int], status: Optional[str]) -> None:
    normalized_user_id = _safe_int(user_id)
    if normalized_user_id is None:
        return

    normalized_status = _normalize_call_status(status)
    if normalized_status == CALL_STATUS_AVAILABLE:
        user_call_status.pop(normalized_user_id, None)
        return

    user_call_status[normalized_user_id] = normalized_status


def _ensure_user_status_rows(cursor, user_ids: list[int]) -> None:
    unique_ids = sorted({int(user_id) for user_id in user_ids if _safe_int(user_id) is not None})
    if not unique_ids:
        return

    for user_id in unique_ids:
        cursor.execute(
            """
            INSERT INTO user_status (
                user_id,
                is_online,
                is_dnd,
                call_status,
                current_call_peer_id,
                call_updated_at,
                updated_at
            )
            VALUES (%s, FALSE, FALSE, %s, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id, CALL_STATUS_AVAILABLE),
        )


def _fetch_user_states(cursor, user_ids: list[int], for_update: bool = False) -> dict[int, dict[str, Any]]:
    unique_ids = sorted({int(user_id) for user_id in user_ids if _safe_int(user_id) is not None})
    if not unique_ids:
        return {}

    _ensure_user_status_rows(cursor, unique_ids)
    placeholders = ", ".join(["%s"] * len(unique_ids))
    suffix = " FOR UPDATE" if for_update else ""
    cursor.execute(
        f"""
        SELECT user_id,
               COALESCE(is_online, FALSE),
               COALESCE(is_dnd, FALSE),
               COALESCE(call_status, %s),
               current_call_peer_id,
               last_seen,
               updated_at
        FROM user_status
        WHERE user_id IN ({placeholders}){suffix}
        """,
        [CALL_STATUS_AVAILABLE, *unique_ids],
    )

    rows = cursor.fetchall()
    states: dict[int, dict[str, Any]] = {}
    for row in rows:
        states[int(row[0])] = {
            "user_id": int(row[0]),
            "is_online": bool(row[1]),
            "is_dnd": bool(row[2]),
            "call_status": _normalize_call_status(row[3]),
            "peer_id": _safe_int(row[4]),
            "last_seen": row[5],
            "updated_at": row[6],
        }
    return states


def _update_call_state(cursor, user_id: int, status: str, peer_id: Optional[int]) -> None:
    cursor.execute(
        """
        UPDATE user_status
        SET call_status = %s,
            current_call_peer_id = %s,
            call_updated_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (_normalize_call_status(status), peer_id, user_id),
    )


def _update_online_presence(user_id: int, is_online: bool) -> None:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        _ensure_user_status_rows(c, [user_id])
        if is_online:
            now = datetime.now()
            c.execute(
                """
                UPDATE user_status
                SET is_online = TRUE,
                    last_seen = %s,
                    updated_at = %s
                WHERE user_id = %s
                """,
                (now, now, user_id),
            )
        else:
            c.execute(
                """
                UPDATE user_status
                SET is_online = FALSE,
                    call_status = %s,
                    current_call_peer_id = NULL,
                    last_seen = CURRENT_TIMESTAMP,
                    call_updated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                """,
                (CALL_STATUS_AVAILABLE, user_id),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_user_call_state(user_id: int) -> dict[str, Any]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        states = _fetch_user_states(c, [user_id], for_update=False)
        return states.get(int(user_id), {
            "user_id": int(user_id),
            "is_online": False,
            "is_dnd": False,
            "call_status": CALL_STATUS_AVAILABLE,
            "peer_id": None,
            "last_seen": None,
            "updated_at": None,
        })
    finally:
        conn.close()


def reserve_call_session(caller_id: int, callee_id: int) -> dict[str, Any]:
    if caller_id == callee_id:
        return {"ok": False, "reason": "self_call"}

    conn = get_db_connection()
    c = conn.cursor()
    try:
        states = _fetch_user_states(c, [caller_id, callee_id], for_update=True)
        caller_state = states.get(caller_id)
        callee_state = states.get(callee_id)

        if not caller_state or not callee_state:
            conn.rollback()
            return {"ok": False, "reason": "state_missing"}

        if not callee_state["is_online"]:
            conn.rollback()
            return {"ok": False, "reason": "offline"}

        if caller_state["call_status"] != CALL_STATUS_AVAILABLE:
            conn.rollback()
            return {"ok": False, "reason": "caller_unavailable", "caller_status": caller_state["call_status"]}

        if callee_state["call_status"] != CALL_STATUS_AVAILABLE:
            conn.rollback()
            return {"ok": False, "reason": "busy", "callee_status": callee_state["call_status"]}

        _update_call_state(c, caller_id, CALL_STATUS_CALLING, callee_id)
        _update_call_state(c, callee_id, CALL_STATUS_RINGING, caller_id)
        conn.commit()

        _set_local_call_status(caller_id, CALL_STATUS_CALLING)
        _set_local_call_status(callee_id, CALL_STATUS_RINGING)
        return {"ok": True, "callee_status": CALL_STATUS_AVAILABLE}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def accept_call_session(callee_id: int, caller_id: int) -> dict[str, Any]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        states = _fetch_user_states(c, [caller_id, callee_id], for_update=True)
        caller_state = states.get(caller_id)
        callee_state = states.get(callee_id)

        if not caller_state or not callee_state:
            conn.rollback()
            return {"ok": False, "reason": "state_missing"}

        if caller_state["peer_id"] != callee_id or callee_state["peer_id"] != caller_id:
            conn.rollback()
            return {"ok": False, "reason": "call_mismatch"}

        if caller_state["call_status"] not in {CALL_STATUS_CALLING, CALL_STATUS_RINGING, CALL_STATUS_BUSY}:
            conn.rollback()
            return {"ok": False, "reason": "caller_invalid_state", "caller_status": caller_state["call_status"]}

        if callee_state["call_status"] not in {CALL_STATUS_RINGING, CALL_STATUS_CALLING, CALL_STATUS_BUSY}:
            conn.rollback()
            return {"ok": False, "reason": "callee_invalid_state", "callee_status": callee_state["call_status"]}

        _update_call_state(c, caller_id, CALL_STATUS_BUSY, callee_id)
        _update_call_state(c, callee_id, CALL_STATUS_BUSY, caller_id)
        conn.commit()

        _set_local_call_status(caller_id, CALL_STATUS_BUSY)
        _set_local_call_status(callee_id, CALL_STATUS_BUSY)
        return {"ok": True}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def release_call_session(user_id: int, peer_id: Optional[int] = None) -> dict[str, Any]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        initial_state = get_user_call_state(user_id)
        linked_peer_id = peer_id if _safe_int(peer_id) is not None else initial_state.get("peer_id")
        lock_ids = [user_id]
        if linked_peer_id is not None:
            lock_ids.append(linked_peer_id)

        states = _fetch_user_states(c, lock_ids, for_update=True)
        user_state = states.get(user_id)
        if not user_state:
            conn.rollback()
            return {"peer_id": None}

        actual_peer_id = linked_peer_id if linked_peer_id is not None else user_state.get("peer_id")
        peer_state = states.get(actual_peer_id) if actual_peer_id is not None else None

        _update_call_state(c, user_id, CALL_STATUS_AVAILABLE, None)
        released_peer_id = None
        if peer_state and peer_state.get("peer_id") == user_id:
            _update_call_state(c, actual_peer_id, CALL_STATUS_AVAILABLE, None)
            released_peer_id = actual_peer_id

        conn.commit()

        _set_local_call_status(user_id, CALL_STATUS_AVAILABLE)
        if released_peer_id is not None:
            _set_local_call_status(released_peer_id, CALL_STATUS_AVAILABLE)

        return {"peer_id": released_peer_id}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def is_call_peer(user_id: int, peer_id: int) -> bool:
    user_state = get_user_call_state(user_id)
    return (
        user_state.get("peer_id") == peer_id
        and user_state.get("call_status") in {
            CALL_STATUS_CALLING,
            CALL_STATUS_RINGING,
            CALL_STATUS_BUSY,
            CALL_STATUS_ON_HOLD,
        }
    )


def set_call_session_status(user_id: int, peer_id: int, status: str) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        states = _fetch_user_states(c, [user_id, peer_id], for_update=True)
        user_state = states.get(user_id)
        peer_state = states.get(peer_id)
        if not user_state or not peer_state:
            conn.rollback()
            return False

        if user_state.get("peer_id") != peer_id or peer_state.get("peer_id") != user_id:
            conn.rollback()
            return False

        if user_state.get("call_status") == CALL_STATUS_AVAILABLE:
            conn.rollback()
            return False

        _update_call_state(c, user_id, status, peer_id)
        conn.commit()
        _set_local_call_status(user_id, status)
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()



class ConnectionManager:
    """Управление WebSocket соединениями для WebRTC с поддержкой Redis Pub/Sub"""

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Добавить новое соединение"""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        log_info(f"WebRTC: User {user_id} connected locally. Total sessions here: {len(self.active_connections.get(user_id, []))}", "webrtc")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Удалить соединение"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                log_info(f"WebRTC: User {user_id} fully disconnected from THIS worker.", "webrtc")
                return True # Indicates user is now offline on THIS worker
            else:
                log_info(f"WebRTC: User {user_id} disconnected one local session. Remaining: {len(self.active_connections[user_id])}", "webrtc")
                return False 
        return False

    async def send_to_user(self, user_id: int, message: dict):
        """Публикуем сообщение в Redis для доставки пользователю на любой воркер"""
        published = await redis_pubsub.publish(f"crm:webrtc:user:{user_id}", message)
        if not published:
            return await self.send_to_user_local(user_id, message)
        return True

    async def send_to_user_local(self, user_id: int, message: dict):
        """Отправить сообщение локально подключенному пользователю"""
        if user_id in self.active_connections:
            dead_sockets = []
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Error sending local to user {user_id}: {e}", "webrtc")
                    dead_sockets.append(connection)
            
            for ds in dead_sockets:
                if ds in self.active_connections.get(user_id, set()):
                    self.active_connections[user_id].remove(ds)
            
            if not self.active_connections.get(user_id):
                if user_id in self.active_connections:
                    del self.active_connections[user_id]
            return True
        return False

    async def broadcast(self, message: dict):
        """Публикуем сообщение в Redis для рассылки всем воркерам"""
        published = await redis_pubsub.publish("crm:webrtc:broadcast", message)
        if not published:
            await self.broadcast_local(message)

    async def broadcast_local(self, message: dict):
        """Разослать сообщение всем локально подключенным пользователям"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user_local(user_id, message)

    def is_user_online(self, user_id: int) -> bool:
        """
        Проверить, онлайн ли пользователь (по БД).
        Это работает корректно при любом количестве воркеров.
        """
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT is_online FROM user_status WHERE user_id = %s", (user_id,))
            row = c.fetchone()
            conn.close()
            return bool(row[0]) if row else False
        except Exception as e:
            log_error(f"Error checking online status for user {user_id}: {e}", "webrtc")
            # Fallback to local check if DB fails
            return user_id in self.active_connections


manager = ConnectionManager()

# Регистрация обработчика сообщений из Redis
async def webrtc_pubsub_handler(channel: str, data: dict):
    """
    Обработчик сообщений WebRTC из Redis.
    Маршрутизирует сообщения на локальные WebSocket соединения.
    """
    if channel == "crm:webrtc:broadcast":
        await manager.broadcast_local(data)
    elif channel.startswith("crm:webrtc:user:"):
        try:
            user_id = int(channel.split(":")[-1])
            await manager.send_to_user_local(user_id, data)
        except (ValueError, IndexError):
            log_error(f"Invalid WebRTC user channel: {channel}", "webrtc")

# Регистрируем префикс для этого модуля
redis_pubsub.register_handler("crm:webrtc:", webrtc_pubsub_handler)


@router.websocket("/signal")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для WebRTC сигнализации и статусов
    """
    user_id = None
    authenticated_user = None

    async def cleanup_disconnect() -> None:
        nonlocal user_id

        if not user_id:
            return

        is_offline = manager.disconnect(user_id, websocket)
        release_result = release_call_session(user_id)
        peer_id = release_result.get("peer_id")

        log_info(f"WebSocket disconnect cleanup for user {user_id}", "webrtc")
        if peer_id is not None:
            await manager.send_to_user(peer_id, {
                "type": "hangup",
                "from": user_id
            })

        if is_offline:
            user_call_status.pop(user_id, None)

            await manager.broadcast({
                "type": "user_status",
                "user_id": user_id,
                "status": "offline",
                "last_seen": datetime.now().isoformat()
            })

            try:
                _update_online_presence(user_id, False)
            except Exception as e:
                log_error(f"Error updating offline status in DB: {e}", "webrtc")

        log_info(f"WebSocket disconnected: user {user_id}", "webrtc")

    try:
        origin_header = websocket.headers.get("origin")
        if not is_allowed_websocket_origin(origin_header):
            log_error(f"Blocked WebRTC websocket origin: {origin_header}", "webrtc")
            await websocket.close(code=1008, reason="invalid_origin")
            return

        authenticated_user = require_websocket_auth(websocket)
        if not authenticated_user:
            log_error("Blocked WebRTC websocket without valid session", "webrtc")
            await websocket.close(code=1008, reason="unauthorized")
            return

        await websocket.accept()
        log_info("🔌 WebRTC WS: Connection accepted", "webrtc")

        while True:
            # Получаем сообщение от клиента
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except Exception as receive_error:
                if _is_expected_websocket_close(receive_error):
                    raise WebSocketDisconnect(code=getattr(receive_error, "code", 1005))
                raise
            message_type = data.get("type")

            # Регистрация пользователя
            if message_type == "register":
                claimed_user_id = _safe_int(data.get("user_id"))
                authenticated_user_id = int(authenticated_user["id"])
                if claimed_user_id is not None and claimed_user_id != authenticated_user_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "User mismatch"
                    })
                    await websocket.close(code=1008)
                    return

                user_id = authenticated_user_id
                is_first_local_connection = user_id not in manager.active_connections
                await manager.connect(user_id, websocket)

                if is_first_local_connection:
                    await manager.broadcast({
                        "type": "user_status",
                        "user_id": user_id,
                        "status": "online",
                        "timestamp": datetime.now().isoformat()
                    })

                try:
                    _update_online_presence(user_id, True)
                    _set_local_call_status(user_id, CALL_STATUS_AVAILABLE)
                except Exception as e:
                    log_error(f"Error updating online status in DB: {e}", "webrtc")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to register call session"
                    })
                    continue

                await websocket.send_json({
                    "type": "registered",
                    "user_id": user_id,
                    "success": True
                })

                log_info(f"User {user_id} registered for WebRTC and marked online", "webrtc")
                continue

            if user_id is None:
                await websocket.send_json({
                    "type": "error",
                    "message": "Registration required"
                })
                continue

            # Инициация звонка
            elif message_type == "call":
                from_user = user_id
                to_user = _safe_int(data.get("to"))
                call_type = str(data.get("call_type") or "audio").strip().lower()
                if call_type not in {"audio", "video"}:
                    call_type = "audio"

                if to_user is None:
                    await websocket.send_json({"type": "error", "message": "Invalid call target"})
                    continue

                reservation = reserve_call_session(from_user, to_user)
                if not reservation.get("ok"):
                    reason = reservation.get("reason")
                    if reason == "offline":
                        save_call_log(from_user, to_user, "missed", call_type=call_type)
                        await websocket.send_json({"type": "error", "message": "User is offline"})
                    elif reason == "busy":
                        save_call_log(from_user, to_user, "busy", call_type=call_type)
                        await websocket.send_json({"type": "call-rejected", "from": to_user, "reason": "busy"})
                    elif reason == "caller_unavailable":
                        await websocket.send_json({"type": "error", "message": "Current user already has an active call"})
                    elif reason == "self_call":
                        await websocket.send_json({"type": "error", "message": "Cannot call yourself"})
                    else:
                        await websocket.send_json({"type": "error", "message": "Call could not be started"})
                    continue

                dnd_active = get_user_dnd(to_user)
                if dnd_active:
                    log_info(f"🔇 [Signaling] User {to_user} is in DND, but notifying for missed call tracking", "webrtc")

                try:
                    conn = get_db_connection()
                    c = conn.cursor()
                    c.execute("SELECT full_name, photo, username FROM users WHERE id = %s", (from_user,))
                    caller_info = c.fetchone()
                    conn.close()

                    caller_name = (caller_info[0] if caller_info else None) or (caller_info[2] if caller_info else None) or "Unknown"
                    caller_photo = caller_info[1] if caller_info else None
                    log_info(f"📸 [Signaling] Fetched caller info for {from_user}: {caller_name}", "webrtc")
                except Exception as e:
                    log_error(f"Error fetching caller info: {e}", "webrtc")
                    caller_name = "Unknown"
                    caller_photo = None

                await manager.send_to_user(to_user, {
                    "type": "incoming-call",
                    "from": from_user,
                    "caller_name": caller_name,
                    "caller_photo": caller_photo,
                    "call_type": call_type,
                    "callee_status": reservation.get("callee_status", CALL_STATUS_AVAILABLE),
                    "dnd_active": dnd_active
                })

                log_info(f"📞 WebRTC: Call initiated {from_user} ({caller_name}) -> {to_user} ({call_type})", "webrtc")

            # Принятие звонка
            elif message_type == "accept-call":
                caller_id = _safe_int(data.get("to"))
                if caller_id is None:
                    await websocket.send_json({"type": "error", "message": "Invalid caller"})
                    continue

                accept_result = accept_call_session(user_id, caller_id)
                if not accept_result.get("ok"):
                    await websocket.send_json({"type": "error", "message": "Call is no longer available"})
                    continue

                await manager.send_to_user(caller_id, {
                    "type": "call-accepted",
                    "from": user_id
                })
                log_info(f"✅ WebRTC [Accept]: {user_id} accepted call from {caller_id}. Both marked as BUSY.", "webrtc")

            # Отклонение звонка
            elif message_type == "reject-call":
                caller_id = _safe_int(data.get("to"))
                reason = data.get("reason", "rejected")
                if caller_id is None:
                    await websocket.send_json({"type": "error", "message": "Invalid caller"})
                    continue

                if reason == "busy":
                    log_info(f"📵 WebRTC: User {user_id} is busy for {caller_id}", "webrtc")

                release_call_session(user_id, caller_id)
                await manager.send_to_user(caller_id, {
                    "type": "call-rejected",
                    "from": user_id,
                    "reason": reason
                })
                save_call_log(caller_id, user_id, reason)
                log_info(f"❌ WebRTC [Reject]: {user_id} rejected call from {caller_id}. Reason: {reason}", "webrtc")

            # WebRTC Offer (SDP)
            elif message_type == "offer":
                to_user = _safe_int(data.get("to"))
                sdp = data.get("sdp")
                if to_user is None or not is_call_peer(user_id, to_user):
                    await websocket.send_json({"type": "error", "message": "Invalid call peer for offer"})
                    continue

                await manager.send_to_user(to_user, {
                    "type": "offer",
                    "from": user_id,
                    "sdp": sdp
                })
                log_info(f"📩 WebRTC [SDP]: Offer from {user_id} -> {to_user}", "webrtc")

            # WebRTC Answer (SDP)
            elif message_type == "answer":
                to_user = _safe_int(data.get("to"))
                sdp = data.get("sdp")
                if to_user is None or not is_call_peer(user_id, to_user):
                    await websocket.send_json({"type": "error", "message": "Invalid call peer for answer"})
                    continue

                await manager.send_to_user(to_user, {
                    "type": "answer",
                    "from": user_id,
                    "sdp": sdp
                })
                log_info(f"📩 WebRTC [SDP]: Answer from {user_id} -> {to_user}", "webrtc")

            # ICE Candidate
            elif message_type == "ice-candidate":
                to_user = _safe_int(data.get("to"))
                candidate = data.get("candidate")
                if to_user is None or not is_call_peer(user_id, to_user):
                    await websocket.send_json({"type": "error", "message": "Invalid call peer for ice candidate"})
                    continue

                await manager.send_to_user(to_user, {
                    "type": "ice-candidate",
                    "from": user_id,
                    "candidate": candidate
                })

            # Завершение звонка
            elif message_type == "hangup":
                requested_peer_id = _safe_int(data.get("to"))
                duration = _safe_int(data.get("duration")) or 0
                active_state = get_user_call_state(user_id)
                release_result = release_call_session(user_id, requested_peer_id)
                to_user = release_result.get("peer_id") or requested_peer_id

                if to_user is not None:
                    await manager.send_to_user(to_user, {
                        "type": "hangup",
                        "from": user_id
                    })

                    call_status = "completed"
                    if active_state.get("call_status") not in {CALL_STATUS_BUSY, CALL_STATUS_ON_HOLD}:
                        call_status = "missed"
                    save_call_log(user_id, to_user, call_status, duration=duration)

                log_info(f"📴 WebRTC: Call ended {user_id} -> {to_user if to_user else 'none'}", "webrtc")

            # Перевод звонка (Transfer)
            elif message_type == "transfer":
                target_user = _safe_int(data.get("to"))
                party_to_transfer = _safe_int(data.get("party_id"))
                if target_user is None or party_to_transfer is None:
                    await websocket.send_json({"type": "error", "message": "Invalid transfer payload"})
                    continue

                if not is_call_peer(user_id, party_to_transfer):
                    await websocket.send_json({"type": "error", "message": "Transfer is allowed only for the active call peer"})
                    continue

                target_state = get_user_call_state(target_user)
                if target_state.get("is_online") and target_state.get("call_status") == CALL_STATUS_AVAILABLE:
                    # Отправляем инвайт целевому пользователю
                    await manager.send_to_user(target_user, {
                        "type": "incoming-call",
                        "from": party_to_transfer,
                        "transferred_from": user_id,
                        "call_type": "audio"
                    })
                    
                    # Уведомляем того, кого переводим
                    await manager.send_to_user(party_to_transfer, {
                        "type": "transferring",
                        "to": target_user,
                        "by": user_id
                    })
                    
                    log_info(f"⤴️ WebRTC: Transfer initiated by {user_id}: {party_to_transfer} -> {target_user}", "webrtc")
                else:
                    await websocket.send_json({"type": "error", "message": "Target user unavailable"})

            # Удержание / Возобновление
            elif message_type in ["hold", "resume"]:
                to_user = _safe_int(data.get("to"))
                if to_user is None:
                    await websocket.send_json({"type": "error", "message": "Invalid call peer"})
                    continue

                target_status = CALL_STATUS_ON_HOLD if message_type == "hold" else CALL_STATUS_BUSY
                if not set_call_session_status(user_id, to_user, target_status):
                    await websocket.send_json({"type": "error", "message": "Call state update rejected"})
                    continue

                await manager.send_to_user(to_user, {
                    "type": message_type,
                    "from": user_id
                })
                log_info(f"⏸️ WebRTC: Call {message_type} by {user_id}", "webrtc")


    except WebSocketDisconnect:
        await cleanup_disconnect()
    except Exception as e:
        if _is_expected_websocket_close(e):
            await cleanup_disconnect()
            log_info(f"WebSocket closed without signaling error: {getattr(e, 'code', str(e))}", "webrtc")
            return

        log_error(f"WebSocket error: {e}", "webrtc")
        await cleanup_disconnect()


@router.get("/online-users")
async def get_online_users():
    """Получить список пользователей онлайн"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT user_id
            FROM user_status
            WHERE is_online = TRUE
            ORDER BY user_id
        """)
        online_users = [int(row[0]) for row in c.fetchall()]
        conn.close()
    except Exception as error:
        log_error(f"Failed to fetch online users: {error}", "webrtc")
        online_users = list(manager.active_connections.keys())

    return {
        "online_users": online_users,
        "count": len(online_users)
    }
