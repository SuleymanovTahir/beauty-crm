"""
Cache Control Middleware for FastAPI
Adds cache headers for CRM API responses.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Apply conservative cache headers to CRM API responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response
