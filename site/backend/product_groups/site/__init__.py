"""
Site/Admin/Account backend routing group.
"""

from .router_mount import mount_site_account_public_routers
from .route_contract import (
    SITE_ONLY_PREFIXES,
    SITE_ONLY_EXACT_PATHS,
    RUNTIME_SITE_ONLY_NON_API_PATHS,
)
from .runtime_bootstrap import start_site_runtime_services

__all__ = [
    "mount_site_account_public_routers",
    "start_site_runtime_services",
    "SITE_ONLY_PREFIXES",
    "SITE_ONLY_EXACT_PATHS",
    "RUNTIME_SITE_ONLY_NON_API_PATHS",
]
