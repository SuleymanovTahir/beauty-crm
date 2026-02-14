"""
Versioned integration API for external consumers (Site runtime).
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from fastapi.responses import JSONResponse

from .public import BookingCreate, create_public_booking, get_public_employees, get_public_services


router = APIRouter(prefix="/integration/v1", tags=["Integration"])


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _is_integration_enabled() -> bool:
    return _env_flag("CRM_INTEGRATION_ENABLED", default=True)


def _get_integration_token() -> Optional[str]:
    token = str(os.getenv("CRM_INTEGRATION_TOKEN", "")).strip()
    return token or None


def _require_integration_access(x_integration_token: Optional[str]) -> None:
    if not _is_integration_enabled():
        raise HTTPException(
            status_code=503,
            detail="crm_integration_disabled",
        )

    expected_token = _get_integration_token()
    if expected_token is None:
        raise HTTPException(
            status_code=503,
            detail="crm_integration_token_not_configured",
        )

    provided_token = str(x_integration_token or "").strip()
    if not provided_token or not secrets.compare_digest(provided_token, expected_token):
        raise HTTPException(
            status_code=401,
            detail="invalid_integration_token",
        )


@router.get("/health")
def integration_health(
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)
    return {
        "success": True,
        "service": "crm-integration",
        "version": "v1",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/services")
def integration_services(
    language: str = Query("ru"),
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    services = get_public_services(language=language)
    return {
        "success": True,
        "services": services,
        "source": "crm",
        "version": "v1",
    }


@router.get("/employees")
def integration_employees(
    language: str = Query("ru"),
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    employees = get_public_employees(language=language)
    return {
        "success": True,
        "employees": employees,
        "source": "crm",
        "version": "v1",
    }


@router.post("/bookings")
def integration_bookings(
    data: BookingCreate,
    background_tasks: BackgroundTasks,
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    result = create_public_booking(data, background_tasks)

    if isinstance(result, JSONResponse):
        return result

    if isinstance(result, dict):
        enriched = dict(result)
        enriched.setdefault("source", "crm")
        enriched.setdefault("version", "v1")
        return enriched

    return {
        "success": True,
        "source": "crm",
        "version": "v1",
    }
