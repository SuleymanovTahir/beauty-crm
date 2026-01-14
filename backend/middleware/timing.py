"""
Timing Middleware для мониторинга производительности API
Логирует время выполнения каждого запроса
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from utils.logger import log_info, log_warning

class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware для логирования времени выполнения запросов
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        path = request.url.path
        method = request.method
        
        # We can't easily hook into dependencies from middleware, 
        # but we can track the overall flow.
        
        try:
            response = await call_next(request)
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            log_error(f"❌ REQUEST FAILED in {process_time:.2f}ms: {method} {path} - {e}", "performance")
            raise
            
        process_time = (time.time() - start_time) * 1000

        if process_time > 1000:
            status_code = getattr(response, "status_code", "Unknown")
            log_warning(
                f"⚠️ SLOW REQUEST ({process_time:.2f}ms): {method} {path} ({status_code})",
                "performance"
            )
            
            # If we are here, we should check if it's a known slow endpoint
            # or if it's every endpoint.
            
        elif process_time > 500:
            log_info(f"⏱️ {method} {path} - {process_time:.2f}ms", "performance")
        
        # Добавляем заголовок с временем выполнения
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response
