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
    
    Для динамических API устанавливает no-cache.
    Для публичных данных (баннеры, услуги, настройки) разрешает кэширование на короткое время.
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Пути, которые можно кэшировать (публичные данные)
        cacheable_paths = [
            "/api/public/banners",
            "/api/public/services",
            "/api/public/salon-info",
            "/api/public/seo-metadata",
            "/api/public/reviews",
            "/api/public/gallery",
            "/api/public/initial-load"
        ]

        # Employees have shorter cache due to photo updates
        if request.url.path.startswith("/api/public/employees"):
            # Кэшируем на 5 минут для сотрудников (чтобы фото обновлялись быстрее)
            response.headers["Cache-Control"] = "public, max-age=300"
        elif any(request.url.path.startswith(path) for path in cacheable_paths):
            # Кэшируем на 10 минут
            response.headers["Cache-Control"] = "public, max-age=600"
        elif request.url.path.startswith("/api/"):
            # Для остальных API - запретить кэширование
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response

