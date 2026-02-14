from fastapi import FastAPI

from site_api.public_admin import router as public_admin_router
from site_api.client_auth import router as client_auth_router
from site_api.sitemap import router as sitemap_router
from site_api.seo_metadata import router as seo_metadata_router
from site_api.settings import router as settings_router
from api.visitor_analytics import router as visitor_analytics_router
from modules import is_module_enabled


def mount_site_account_public_routers(app: FastAPI) -> None:
    """
    Mount routers used by Site/Admin/Account runtime group.
    """
    app.include_router(public_admin_router, prefix="/api")  # router already uses /public-admin paths
    app.include_router(client_auth_router, prefix="/api/client")
    app.include_router(settings_router, prefix="/api")
    app.include_router(visitor_analytics_router, prefix="/api")
    app.include_router(sitemap_router)
    app.include_router(seo_metadata_router)

    if is_module_enabled("public"):
        from site_api.public import router as public_api

        app.include_router(public_api, prefix="/api/public", tags=["public"])
