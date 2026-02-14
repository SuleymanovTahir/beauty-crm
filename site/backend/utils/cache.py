try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

import json
import os
from datetime import datetime
from utils.logger import log_info, log_error

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


REDIS_ENABLED = _env_flag("REDIS_ENABLED", default=True)
REDIS_REQUIRED = _env_flag("REDIS_REQUIRED", default=False)

class Cache:
    def __init__(self):
        self.enabled = False
        self.client = None
        self._connection_lost_logged = False

        if not REDIS_ENABLED:
            log_info("ℹ️ Redis cache disabled by REDIS_ENABLED=false", "cache")
            return

        if not REDIS_AVAILABLE:
            if REDIS_REQUIRED:
                log_error("❌ Redis library not installed but REDIS_REQUIRED=true", "cache")
            else:
                log_info("ℹ️ Redis library not installed - cache disabled", "cache")
            return

        try:
            self.client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                password=REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=1,  # Reduced from 2 to fail faster
                socket_connect_timeout=1,  # Connection timeout
                retry_on_timeout=False,  # Don't retry on timeout
                health_check_interval=30  # Check connection health periodically
            )
            # Тестовое подключение с коротким таймаутом
            self.client.ping()
            self.enabled = True
            log_info(f"🚀 Redis connected: {REDIS_HOST}:{REDIS_PORT}", "cache")
        except Exception as e:
            if REDIS_REQUIRED:
                log_error(f"❌ Redis connection failed (REDIS_REQUIRED=true): {e}", "cache")
            else:
                log_info(f"ℹ️ Redis unavailable, continuing without Redis cache: {e}", "cache")
            self.enabled = False
            self.client = None

    def get(self, key: str):
        if not self.enabled or self.client is None:
            return None
        try:
            data = self.client.get(key)
            self._connection_lost_logged = False
            return json.loads(data) if data else None
        except (redis.ConnectionError, redis.TimeoutError) as e:
            # Connection lost - disable Redis for this session
            if not self._connection_lost_logged:
                if REDIS_REQUIRED:
                    log_error(f"Redis connection lost ({key}): {e}", "cache")
                else:
                    log_info(f"ℹ️ Redis connection lost ({key}), fallback to in-memory mode: {e}", "cache")
                self._connection_lost_logged = True
            self.enabled = False
            self.client = None
            return None
        except Exception as e:
            log_error(f"Redis get error ({key}): {e}", "cache")
            return None

    def set(self, key: str, value, expire: int = 3600):
        if not self.enabled or self.client is None:
            return False
        try:
            # Handle datetime objects in JSON serialization
            def datetime_handler(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

            json_data = json.dumps(value, default=datetime_handler)
            self.client.set(key, json_data, ex=expire)
            self._connection_lost_logged = False
            return True
        except (redis.ConnectionError, redis.TimeoutError) as e:
            # Connection lost - disable Redis for this session
            if not self._connection_lost_logged:
                if REDIS_REQUIRED:
                    log_error(f"Redis connection lost ({key}): {e}", "cache")
                else:
                    log_info(f"ℹ️ Redis connection lost ({key}), fallback to in-memory mode: {e}", "cache")
                self._connection_lost_logged = True
            self.enabled = False
            self.client = None
            return False
        except Exception as e:
            log_error(f"Redis set error ({key}): {e}", "cache")
            return False

    def delete(self, key: str):
        if not self.enabled:
            return False
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            log_error(f"Redis delete error ({key}): {e}", "cache")
            return False

    def clear_by_pattern(self, pattern: str):
        if not self.enabled:
            return False
        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            log_error(f"Redis clear pattern error ({pattern}): {e}", "cache")
            return False

# Singleton
cache = Cache()
