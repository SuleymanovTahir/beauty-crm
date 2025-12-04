"""
Cache Control Middleware для FastAPI
Добавляет правильные заголовки кэширования для API endpoints
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware для управления кэшированием HTTP ответов
    
    Для API endpoints (/api/*) устанавливает заголовки no-cache,
    чтобы предотвратить агрессивное кэширование на мобильных устройствах
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Для всех API endpoints - запретить кэширование
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response
