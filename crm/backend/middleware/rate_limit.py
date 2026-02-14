"""
Rate Limiting Middleware для защиты от перегрузки
Ограничивает количество запросов от одного IP
"""
import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60, requests_per_second: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        
        # Storage: {ip: [(timestamp, path), ...]}
        self.request_history = defaultdict(list)
        self.last_cleanup = time.time()
    
    def cleanup_old_requests(self):
        """Очистка старых записей каждые 60 секунд"""
        now = time.time()
        if now - self.last_cleanup > 60:
            cutoff = now - 60
            for ip in list(self.request_history.keys()):
                self.request_history[ip] = [
                    (ts, path) for ts, path in self.request_history[ip] 
                    if ts > cutoff
                ]
                if not self.request_history[ip]:
                    del self.request_history[ip]
            self.last_cleanup = now
    
    def get_client_ip(self, request: Request) -> str:
        """Получить IP клиента с учетом прокси"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    async def dispatch(self, request: Request, call_next):
        # Пропускаем статические файлы
        if request.url.path.startswith("/static/"):
            return await call_next(request)
        
        client_ip = self.get_client_ip(request)
        now = time.time()
        path = request.url.path
        
        # Очистка старых записей
        self.cleanup_old_requests()
        
        # Получаем историю запросов для этого IP
        history = self.request_history[client_ip]
        
        # Проверка: не более X запросов в секунду
        recent_requests = [ts for ts, _ in history if now - ts < 1]
        if len(recent_requests) >= self.requests_per_second:
            return JSONResponse(
                {"error": "Too many requests. Please slow down."},
                status_code=429,
                headers={"Retry-After": "1"}
            )
        
        # Проверка: не более Y запросов в минуту
        minute_requests = [ts for ts, _ in history if now - ts < 60]
        if len(minute_requests) >= self.requests_per_minute:
            return JSONResponse(
                {"error": "Rate limit exceeded. Try again later."},
                status_code=429,
                headers={"Retry-After": "60"}
            )
        
        # Добавляем текущий запрос в историю
        history.append((now, path))
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Добавляем заголовки с информацией о лимитах
        remaining = self.requests_per_minute - len(minute_requests) - 1
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        
        return response
