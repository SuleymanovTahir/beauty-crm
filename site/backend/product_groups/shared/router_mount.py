from fastapi import FastAPI

from core.auth import router as auth_router
from shared_api.proxy import router as proxy_router


def mount_shared_routers(app: FastAPI) -> None:
    """
    Mount routers shared by all product runtimes.
    """
    app.include_router(auth_router, prefix="/api")
    app.include_router(proxy_router, prefix="/api")
