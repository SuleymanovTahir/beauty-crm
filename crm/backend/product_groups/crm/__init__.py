"""
CRM backend routing group.
"""

from .router_mount import mount_crm_routers
from .route_contract import (
    CRM_MODULE_ROUTE_MATCHERS,
    RUNTIME_CRM_ONLY_PREFIXES,
    CRM_WEBSOCKET_PREFIXES,
)
from .runtime_bootstrap import start_crm_runtime_services, start_crm_schedulers

__all__ = [
    "mount_crm_routers",
    "start_crm_runtime_services",
    "start_crm_schedulers",
    "CRM_MODULE_ROUTE_MATCHERS",
    "RUNTIME_CRM_ONLY_PREFIXES",
    "CRM_WEBSOCKET_PREFIXES",
]
