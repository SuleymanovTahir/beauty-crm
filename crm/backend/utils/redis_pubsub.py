import asyncio
import base64
import json
import os
import select
import zlib
from typing import Any, Awaitable, Callable, Dict, Optional

import psycopg2
import redis.asyncio as redis

from utils.logger import log_error, log_info, log_warning


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_pg_channel(raw_value: str, default_value: str) -> str:
    value = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in str(raw_value or "").strip())
    value = value.strip("_")
    if not value:
        value = default_value
    return value[:63]


class RedisPubSubManager:
    """
    Cross-worker Pub/Sub with Redis primary transport and PostgreSQL fallback.
    """

    def __init__(self):
        self.redis_url = (
            f"redis://{os.getenv('REDIS_HOST', '127.0.0.1')}:"
            f"{os.getenv('REDIS_PORT', '6379')}/{os.getenv('REDIS_DB', '0')}"
        )
        self.redis_password = os.getenv("REDIS_PASSWORD")
        self.redis_enabled = _env_flag("REDIS_ENABLED", default=True)
        self.redis_required = _env_flag("REDIS_REQUIRED", default=False)
        self.pg_enabled = _env_flag("PG_PUBSUB_ENABLED", default=True)
        self.pg_notify_channel = _normalize_pg_channel(
            os.getenv("PG_PUBSUB_CHANNEL", "crm_pubsub"),
            "crm_pubsub",
        )

        self.pub_client = None
        self.sub_client = None
        self.pubsub = None
        self.pg_pub_conn = None
        self.pg_sub_conn = None

        self.is_running = False
        self.is_available = False
        self.transport_name = "none"
        self._connect_lock = asyncio.Lock()
        self._pg_publish_lock = asyncio.Lock()
        self._last_connect_error: Optional[str] = None
        self._last_publish_error: Optional[str] = None
        self._handlers: Dict[str, Callable[[str, Dict[str, Any]], Awaitable[None]]] = {}

    def _pg_connect_kwargs(self) -> dict[str, Any]:
        return {
            "host": os.getenv("POSTGRES_HOST", "localhost"),
            "port": os.getenv("POSTGRES_PORT", "5432"),
            "dbname": os.getenv("POSTGRES_DB", "beauty_crm"),
            "user": os.getenv("POSTGRES_USER", "beauty_crm_user"),
            "password": os.getenv("POSTGRES_PASSWORD", ""),
            "connect_timeout": 5,
            "application_name": "crm_pubsub",
        }

    async def _safe_close_client(self, client) -> None:
        if not client:
            return
        try:
            if hasattr(client, "aclose"):
                await client.aclose()
            else:
                await client.close()
        except Exception:
            pass

    async def _safe_close_pubsub(self) -> None:
        if not self.pubsub:
            return
        try:
            await self.pubsub.punsubscribe("crm:*")
        except Exception:
            pass
        try:
            if hasattr(self.pubsub, "aclose"):
                await self.pubsub.aclose()
            else:
                await self.pubsub.close()
        except Exception:
            pass
        finally:
            self.pubsub = None

    async def _safe_close_pg_conn(self, conn) -> None:
        if not conn:
            return
        try:
            await asyncio.to_thread(conn.close)
        except Exception:
            pass

    async def _disconnect_all(self) -> None:
        await self._safe_close_pubsub()
        await self._safe_close_client(self.pub_client)
        await self._safe_close_client(self.sub_client)
        await self._safe_close_pg_conn(self.pg_pub_conn)
        await self._safe_close_pg_conn(self.pg_sub_conn)
        self.pub_client = None
        self.sub_client = None
        self.pg_pub_conn = None
        self.pg_sub_conn = None
        self.is_available = False
        self.transport_name = "none"

    def _encode_pg_payload(self, channel: str, message: Dict[str, Any]) -> Optional[str]:
        raw_payload = json.dumps(
            {"channel": channel, "data": message},
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")
        if len(raw_payload) <= 7900:
            return raw_payload.decode("utf-8")

        compressed_payload = json.dumps(
            {
                "encoding": "zlib+base64",
                "payload": base64.b64encode(zlib.compress(raw_payload, level=9)).decode("ascii"),
            },
            separators=(",", ":"),
        )
        if len(compressed_payload.encode("utf-8")) <= 7900:
            return compressed_payload

        return None

    def _decode_pg_payload(self, payload: str) -> tuple[str, Dict[str, Any]]:
        data = json.loads(payload)
        if isinstance(data, dict) and data.get("encoding") == "zlib+base64":
            compressed_payload = data.get("payload", "")
            raw_payload = zlib.decompress(base64.b64decode(compressed_payload))
            data = json.loads(raw_payload.decode("utf-8"))

        channel = str(data.get("channel", ""))
        message = data.get("data")
        if not isinstance(message, dict):
            message = {}
        return channel, message

    async def _dispatch(self, channel: str, data: Dict[str, Any]) -> None:
        for prefix, handler in self._handlers.items():
            if channel.startswith(prefix):
                await handler(channel, data)
                break

    def _listen_postgres(self) -> None:
        if not self.pg_sub_conn:
            raise RuntimeError("PostgreSQL subscriber is not initialized")
        cursor = self.pg_sub_conn.cursor()
        cursor.execute(f'LISTEN "{self.pg_notify_channel}"')
        cursor.close()

    async def _connect_postgres(self) -> bool:
        if not self.pg_enabled:
            return False

        try:
            self.pg_pub_conn = await asyncio.to_thread(psycopg2.connect, **self._pg_connect_kwargs())
            self.pg_sub_conn = await asyncio.to_thread(psycopg2.connect, **self._pg_connect_kwargs())
            self.pg_pub_conn.set_session(autocommit=True)
            self.pg_sub_conn.set_session(autocommit=True)
            await asyncio.to_thread(self._listen_postgres)
            self.is_available = True
            self.transport_name = "postgres"
            if self._last_connect_error:
                log_info("✅ PostgreSQL Pub/Sub reconnected", "pubsub")
            log_info(f"📡 PostgreSQL Pub/Sub connected on channel {self.pg_notify_channel}", "pubsub")
            self._last_connect_error = None
            return True
        except Exception as error:
            error_text = str(error)
            if error_text != self._last_connect_error:
                log_warning(f"⚠️ PostgreSQL Pub/Sub unavailable: {error}", "pubsub")
                self._last_connect_error = error_text
            await self._safe_close_pg_conn(self.pg_pub_conn)
            await self._safe_close_pg_conn(self.pg_sub_conn)
            self.pg_pub_conn = None
            self.pg_sub_conn = None
            return False

    async def connect(self) -> bool:
        async with self._connect_lock:
            if self.is_available:
                return True

            await self._disconnect_all()

            if self.redis_enabled:
                try:
                    self.pub_client = redis.from_url(
                        self.redis_url,
                        password=self.redis_password,
                        decode_responses=True,
                    )
                    self.sub_client = redis.from_url(
                        self.redis_url,
                        password=self.redis_password,
                        decode_responses=True,
                    )
                    await self.pub_client.ping()
                    await self.sub_client.ping()
                    self.is_available = True
                    self.transport_name = "redis"
                    if self._last_connect_error:
                        log_info("✅ Redis Pub/Sub reconnected", "pubsub")
                    log_info(f"📡 Redis Pub/Sub connected to {self.redis_url}", "pubsub")
                    self._last_connect_error = None
                    return True
                except Exception as error:
                    error_text = str(error)
                    if error_text != self._last_connect_error:
                        if self.redis_required:
                            log_warning(f"⚠️ Redis Pub/Sub unavailable (REDIS_REQUIRED=true): {error}", "pubsub")
                        else:
                            log_info(f"ℹ️ Redis Pub/Sub unavailable, trying PostgreSQL fallback: {error}", "pubsub")
                        self._last_connect_error = error_text
                    await self._safe_close_client(self.pub_client)
                    await self._safe_close_client(self.sub_client)
                    self.pub_client = None
                    self.sub_client = None

            connected = await self._connect_postgres()
            if connected:
                return True

            if not self.redis_enabled and not self.pg_enabled:
                log_info("ℹ️ Cross-worker Pub/Sub disabled by configuration", "pubsub")
            return False

    async def publish(self, channel: str, message: Dict[str, Any]) -> bool:
        if not self.is_available:
            connected = await self.connect()
            if not connected:
                return False

        if self.transport_name == "redis" and self.pub_client:
            try:
                await self.pub_client.publish(channel, json.dumps(message))
                self._last_publish_error = None
                return True
            except Exception as error:
                error_text = str(error)
                if error_text != self._last_publish_error:
                    if self.redis_required:
                        log_error(f"Error publishing to {channel}: {error}", "pubsub")
                    else:
                        log_info(f"ℹ️ Redis publish unavailable for {channel}, retrying via fallback", "pubsub")
                    self._last_publish_error = error_text
                await self._disconnect_all()
                return False

        if self.transport_name == "postgres" and self.pg_pub_conn:
            encoded_payload = self._encode_pg_payload(channel, message)
            if not encoded_payload:
                log_error(f"PostgreSQL Pub/Sub payload too large for {channel}", "pubsub")
                return False

            async with self._pg_publish_lock:
                try:
                    await asyncio.to_thread(self._publish_postgres, encoded_payload)
                    self._last_publish_error = None
                    return True
                except Exception as error:
                    error_text = str(error)
                    if error_text != self._last_publish_error:
                        log_error(f"PostgreSQL publish failed for {channel}: {error}", "pubsub")
                        self._last_publish_error = error_text
                    await self._disconnect_all()
                    return False

        return False

    def _publish_postgres(self, encoded_payload: str) -> None:
        if not self.pg_pub_conn:
            raise RuntimeError("PostgreSQL publisher is not initialized")
        cursor = self.pg_pub_conn.cursor()
        cursor.execute("SELECT pg_notify(%s, %s)", (self.pg_notify_channel, encoded_payload))
        cursor.close()

    def register_handler(self, prefix: str, handler: Callable[[str, Dict[str, Any]], Awaitable[None]]) -> None:
        self._handlers[prefix] = handler

    def _poll_postgres_messages(self, timeout: float) -> list[str]:
        if not self.pg_sub_conn:
            return []
        if self.pg_sub_conn.notifies:
            payloads = [notify.payload for notify in self.pg_sub_conn.notifies]
            self.pg_sub_conn.notifies.clear()
            return payloads

        ready, _, _ = select.select([self.pg_sub_conn], [], [], timeout)
        if not ready:
            return []
        self.pg_sub_conn.poll()
        if not self.pg_sub_conn.notifies:
            return []
        payloads = [notify.payload for notify in self.pg_sub_conn.notifies]
        self.pg_sub_conn.notifies.clear()
        return payloads

    async def start_listening(self) -> None:
        if not self.redis_enabled and not self.pg_enabled:
            log_info("ℹ️ Pub/Sub listener disabled by configuration", "pubsub")
            return

        self.is_running = True
        log_info("📡 Pub/Sub listener started", "pubsub")

        try:
            while self.is_running:
                try:
                    if not self.is_available:
                        connected = await self.connect()
                        if not connected:
                            await asyncio.sleep(2)
                            continue

                    if self.transport_name == "redis":
                        if not self.sub_client:
                            await self._disconnect_all()
                            await asyncio.sleep(1)
                            continue

                        if not self.pubsub:
                            self.pubsub = self.sub_client.pubsub()
                            await self.pubsub.psubscribe("crm:*")
                            log_info("📡 Redis Pub/Sub subscribed to crm:*", "pubsub")

                        message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                        if not message:
                            continue

                        channel = message.get("channel", "")
                        raw_data = message.get("data")
                        if not isinstance(channel, str):
                            channel = str(channel)

                        try:
                            data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                        except Exception:
                            data = {}

                        if not isinstance(data, dict):
                            data = {}
                        await self._dispatch(channel, data)
                        continue

                    if self.transport_name == "postgres":
                        payloads = await asyncio.to_thread(self._poll_postgres_messages, 1.0)
                        if not payloads:
                            continue

                        for payload in payloads:
                            try:
                                channel, data = self._decode_pg_payload(payload)
                            except Exception as error:
                                log_error(f"Failed to decode PostgreSQL Pub/Sub payload: {error}", "pubsub")
                                continue

                            await self._dispatch(channel, data)
                        continue

                    await asyncio.sleep(1)
                except asyncio.CancelledError:
                    break
                except Exception as error:
                    # EBADF (errno 9) = Bad file descriptor — нормально при shutdown/reload
                    is_shutdown_error = (
                        isinstance(error, OSError) and getattr(error, 'errno', None) == 9
                    ) or "Bad file descriptor" in str(error)
                    if not is_shutdown_error:
                        log_warning(f"⚠️ Pub/Sub loop interrupted, reconnecting: {error}", "pubsub")
                    await self._disconnect_all()
                    await asyncio.sleep(1)
        finally:
            await self._disconnect_all()
            self.is_running = False

    async def stop(self) -> None:
        self.is_running = False
        await self._disconnect_all()


redis_pubsub = RedisPubSubManager()
