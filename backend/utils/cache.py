"""
Утилиты для кэширования в Redis
"""
import redis
import json
import os
from utils.logger import log_info, log_error

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

class Cache:
    def __init__(self):
        try:
            self.client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                password=REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=2
            )
            # Тестовое подключение
            self.client.ping()
            self.enabled = True
            log_info(f"🚀 Redis connected: {REDIS_HOST}:{REDIS_PORT}", "cache")
        except Exception as e:
            log_error(f"❌ Redis connection failed: {e}", "cache")
            self.enabled = False

    def get(self, key: str):
        if not self.enabled:
            return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            log_error(f"Redis get error ({key}): {e}", "cache")
            return None

    def set(self, key: str, value, expire: int = 3600):
        if not self.enabled:
            return False
        try:
            self.client.set(key, json.dumps(value), ex=expire)
            return True
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