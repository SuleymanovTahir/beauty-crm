try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

import json
import os
from utils.logger import log_info, log_error

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

class Cache:
    def __init__(self):
        if not REDIS_AVAILABLE:
            log_info("⚠️ Redis library not installed - cache disabled", "cache")
            self.enabled = False
            self.client = None
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
            log_error(f"❌ Redis connection failed: {e}", "cache")
            log_info("⚠️ Continuing without Redis cache", "cache")
            self.enabled = False
            self.client = None

    def get(self, key: str):
        if not self.enabled or self.client is None:
            return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except (redis.ConnectionError, redis.TimeoutError) as e:
            # Connection lost - disable Redis for this session
            log_error(f"Redis connection lost ({key}): {e}", "cache")
            self.enabled = False
            return None
        except Exception as e:
            log_error(f"Redis get error ({key}): {e}", "cache")
            return None

    def set(self, key: str, value, expire: int = 3600):
        if not self.enabled or self.client is None:
            return False
        try:
            self.client.set(key, json.dumps(value), ex=expire)
            return True
        except (redis.ConnectionError, redis.TimeoutError) as e:
            # Connection lost - disable Redis for this session
            log_error(f"Redis connection lost ({key}): {e}", "cache")
            self.enabled = False
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