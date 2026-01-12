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

        response = await call_next(request)

        process_time = (time.time() - start_time) * 1000  # в миллисекундах

        # Логируем медленные запросы (больше 1 секунды)
        if process_time > 1000:
            log_warning(
                f"⚠️ SLOW REQUEST: {request.method} {request.url.path} - {process_time:.2f}ms",
                "performance"
            )
        # Логируем все запросы в режиме DEBUG
        elif process_time > 500:
            log_info(
                f"⏱️ {request.method} {request.url.path} - {process_time:.2f}ms",
                "performance"
            )

        # Добавляем заголовок с временем выполнения
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

        return response
