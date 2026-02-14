import json
import asyncio
import os
from typing import Dict, Any, Callable, Awaitable, Optional
from utils.logger import log_info, log_error, log_warning
import redis.asyncio as redis


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class RedisPubSubManager:
    """
    Manager for Redis Pub/Sub to synchronize multiple Gunicorn workers.
    """
    def __init__(self):
        self.redis_url = f"redis://{os.getenv('REDIS_HOST', '127.0.0.1')}:{os.getenv('REDIS_PORT', '6379')}/{os.getenv('REDIS_DB', '0')}"
        self.redis_password = os.getenv('REDIS_PASSWORD')
        self.redis_enabled = _env_flag("REDIS_ENABLED", default=True)
        self.redis_required = _env_flag("REDIS_REQUIRED", default=False)
        self.pub_client = None
        self.sub_client = None
        self.pubsub = None
        self.is_running = False
        self.is_available = False
        self._connect_lock = asyncio.Lock()
        self._last_connect_error: Optional[str] = None
        self._last_publish_error: Optional[str] = None
        self._handlers: Dict[str, Callable[[str, Dict[str, Any]], Awaitable[None]]] = {}

    async def _safe_close_client(self, client) -> None:
        """Safely close redis client if it exists."""
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
        """Safely close pubsub listener."""
        if not self.pubsub:
            return
        try:
            await self.pubsub.punsubscribe("site:*")
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

    async def _disconnect_all(self) -> None:
        """Reset all redis resources."""
        await self._safe_close_pubsub()
        await self._safe_close_client(self.pub_client)
        await self._safe_close_client(self.sub_client)
        self.pub_client = None
        self.sub_client = None
        self.is_available = False

    async def connect(self) -> bool:
        """Initialize Redis connections and validate health."""
        if not self.redis_enabled:
            self.is_available = False
            return False

        async with self._connect_lock:
            if self.is_available and self.pub_client and self.sub_client:
                return True

            await self._disconnect_all()

            try:
                self.pub_client = redis.from_url(
                    self.redis_url,
                    password=self.redis_password,
                    decode_responses=True
                )
                self.sub_client = redis.from_url(
                    self.redis_url,
                    password=self.redis_password,
                    decode_responses=True
                )

                # Validate both connections now to avoid false "connected" state.
                await self.pub_client.ping()
                await self.sub_client.ping()

                self.is_available = True
                if self._last_connect_error:
                    log_info("✅ Redis Pub/Sub reconnected", "pubsub")
                log_info(f"📡 Redis Pub/Sub connected to {self.redis_url}", "pubsub")
                self._last_connect_error = None
                return True
            except Exception as e:
                err_text = str(e)
                if err_text != self._last_connect_error:
                    if self.redis_required:
                        log_warning(
                            f"⚠️ Redis Pub/Sub unavailable (REDIS_REQUIRED=true): {e}",
                            "pubsub"
                        )
                    else:
                        log_info(
                            f"ℹ️ Redis Pub/Sub unavailable. Falling back to local-only delivery: {e}",
                            "pubsub"
                        )
                    self._last_connect_error = err_text
                await self._disconnect_all()
                return False

    async def publish(self, channel: str, message: Dict[str, Any]) -> bool:
        """Publish a message to a channel."""
        if not self.pub_client:
            connected = await self.connect()
            if not connected:
                return False

        try:
            await self.pub_client.publish(channel, json.dumps(message))
            self._last_publish_error = None
            return True
        except Exception as e:
            err_text = str(e)
            if err_text != self._last_publish_error:
                if self.redis_required:
                    log_error(f"Error publishing to {channel}: {e}", "pubsub")
                else:
                    log_info(f"ℹ️ Redis publish unavailable for {channel}, using local delivery", "pubsub")
                self._last_publish_error = err_text
            await self._disconnect_all()
            return False

    def register_handler(self, prefix: str, handler: Callable[[str, Dict[str, Any]], Awaitable[None]]) -> None:
        """Register a handler for a channel prefix."""
        self._handlers[prefix] = handler

    async def start_listening(self) -> None:
        """Background loop to listen for messages with auto-reconnect."""
        if not self.redis_enabled:
            log_info("ℹ️ Redis Pub/Sub listener disabled by REDIS_ENABLED=false", "pubsub")
            return

        self.is_running = True
        log_info("📡 Redis Pub/Sub listener started", "pubsub")

        try:
            while self.is_running:
                try:
                    if not self.sub_client:
                        connected = await self.connect()
                        if not connected:
                            await asyncio.sleep(2)
                            continue

                    if not self.pubsub:
                        self.pubsub = self.sub_client.pubsub()
                        await self.pubsub.psubscribe("site:*")
                        log_info("📡 Redis Pub/Sub subscribed to site:*", "pubsub")

                    message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message:
                        channel = message.get("channel", "")
                        raw_data = message.get("data")
                        if not isinstance(channel, str):
                            channel = str(channel)

                        try:
                            data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                        except Exception:
                            data = {}

                        # Find matching handler based on prefix
                        for prefix, handler in self._handlers.items():
                            if channel.startswith(prefix):
                                await handler(channel, data)
                                break
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    if self.redis_required:
                        log_error(f"Error in Pub/Sub loop: {e}", "pubsub")
                    else:
                        log_info("ℹ️ Redis Pub/Sub loop interrupted, retrying in local-fallback mode", "pubsub")
                    await self._disconnect_all()
                    await asyncio.sleep(1)
        finally:
            await self._disconnect_all()
            self.is_running = False

    async def stop(self) -> None:
        """Stop the listener."""
        self.is_running = False
        await self._disconnect_all()

# Global instance
redis_pubsub = RedisPubSubManager()
