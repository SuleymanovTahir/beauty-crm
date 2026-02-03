import json
import asyncio
import os
from typing import Dict, Any, Callable, Awaitable, Union
from utils.logger import log_info, log_error
import redis.asyncio as redis

class RedisPubSubManager:
    """
    Manager for Redis Pub/Sub to synchronize multiple Gunicorn workers.
    """
    def __init__(self):
        self.redis_url = f"redis://{os.getenv('REDIS_HOST', '127.0.0.1')}:{os.getenv('REDIS_PORT', '6379')}/{os.getenv('REDIS_DB', '0')}"
        self.redis_password = os.getenv('REDIS_PASSWORD')
        self.pub_client = None
        self.sub_client = None
        self.pubsub = None
        self.is_running = False
        self._handlers: Dict[str, Callable[[str, Dict[str, Any]], Awaitable[None]]] = {}

    async def connect(self):
        """Initialize Redis connections"""
        try:
            self.pub_client = redis.from_url(self.redis_url, password=self.redis_password, decode_responses=True)
            self.sub_client = redis.from_url(self.redis_url, password=self.redis_password, decode_responses=True)
            log_info(f"📡 Redis Pub/Sub connected to {self.redis_url}", "pubsub")
        except Exception as e:
            log_error(f"❌ Redis Pub/Sub connection failed: {e}", "pubsub")

    async def publish(self, channel: str, message: Dict[str, Any]):
        """Publish a message to a channel"""
        if not self.pub_client:
            await self.connect()
        
        if self.pub_client:
            try:
                await self.pub_client.publish(channel, json.dumps(message))
            except Exception as e:
                log_error(f"Error publishing to {channel}: {e}", "pubsub")

    def register_handler(self, prefix: str, handler: Callable[[Dict[str, Any]], Awaitable[None]]):
        """Register a handler for a channel prefix"""
        self._handlers[prefix] = handler

    async def start_listening(self):
        """Background loop to listen for messages"""
        if not self.sub_client:
            await self.connect()
        
        if not self.sub_client:
            return

        self.pubsub = self.sub_client.pubsub()
        # Subscribe to all system channels
        await self.pubsub.psubscribe("crm:*")
        
        self.is_running = True
        log_info("📡 Redis Pub/Sub listener started (psubscribe crm:*)", "pubsub")

        try:
            while self.is_running:
                try:
                    message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message:
                        channel = message['channel']
                        data = json.loads(message['data'])
                        
                        # Find matching handler based on prefix
                        for prefix, handler in self._handlers.items():
                            if channel.startswith(prefix):
                                await handler(channel, data)
                                break
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    log_error(f"Error in Pub/Sub loop: {e}", "pubsub")
                    await asyncio.sleep(1)
        finally:
            if self.pubsub:
                await self.pubsub.punsubscribe("crm:*")
                await self.pubsub.close()
            self.is_running = False

    async def stop(self):
        """Stop the listener"""
        self.is_running = False

# Global instance
redis_pubsub = RedisPubSubManager()
