"""
Timing Middleware для мониторинга производительности API
Логирует время выполнения каждого запроса
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from utils.logger import log_info, log_warning, log_error

class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware для логирования времени выполнения запросов
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        path = request.url.path
        method = request.method
        
        try:
            response = await call_next(request)
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            # Safe logging with fallback
            try:
                log_error(f"❌ REQUEST FAILED in {process_time:.2f}ms: {method} {path} - {e}", "performance")
            except Exception:
                print(f"❌ REQUEST FAILED in {process_time:.2f}ms: {method} {path} - {e}")
            raise
            
        process_time = (time.time() - start_time) * 1000

        # Safe logging with try-except to prevent middleware crashes
        try:
            if process_time > 1000:
                status_code = getattr(response, "status_code", "Unknown")
                log_warning(
                    f"⚠️ SLOW REQUEST ({process_time:.2f}ms): {method} {path} ({status_code})",
                    "performance"
                )
            elif process_time > 500:
                log_info(f"⏱️ {method} {path} - {process_time:.2f}ms", "performance")
        except Exception as log_err:
            # Fallback to print if logger fails
            print(f"⚠️ Logging error in timing middleware: {log_err}")
        
        # Добавляем заголовок с временем выполнения
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response
