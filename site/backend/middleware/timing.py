import time
from utils.logger import log_info, log_warning, log_error

class TimingMiddleware:
    """
    Native ASGI Middleware для логирования времени выполнения запросов.
    Избегает накладных расходов BaseHTTPMiddleware.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        path = scope.get("path", "")
        method = scope.get("method", "")
        
        status_code = [None] # Use list to be mutable in closure

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            log_error(f"❌ REQ FAILED ({duration:.2f}ms): {method} {path} - {e}", "performance")
            raise
        finally:
            duration = (time.time() - start_time) * 1000
            
            # Логируем только медленные запросы или информационные
            if duration > 1000:
                log_warning(f"⚠️  SLOW REQ ({duration:.2f}ms): {method} {path} ({status_code[0]})", "performance")
            elif duration > 500:
                log_info(f"⏱️  {method} {path} - {duration:.2f}ms ({status_code[0]})", "performance")
