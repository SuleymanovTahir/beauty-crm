"""
Middleware package для FastAPI приложения
"""
from .cache_control import CacheControlMiddleware

__all__ = ["CacheControlMiddleware"]
