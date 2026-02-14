"""
Optional CRM integration client for Site runtime.
All calls are best-effort and must gracefully fallback to local mode.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional, Tuple, List

import httpx

from utils.logger import log_info, log_warning


_memory_cache: Dict[str, Tuple[float, Any]] = {}
_last_error_message: Optional[str] = None


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def is_crm_integration_enabled() -> bool:
    return _env_flag("CRM_INTEGRATION_ENABLED", default=False)


def is_crm_integration_strict() -> bool:
    return _env_flag("CRM_INTEGRATION_STRICT", default=False)


def _integration_base_url() -> str:
    return str(os.getenv("CRM_INTEGRATION_BASE_URL", "")).strip().rstrip("/")


def _integration_token() -> str:
    return str(os.getenv("CRM_INTEGRATION_TOKEN", "")).strip()


def _integration_timeout_seconds() -> float:
    raw = str(os.getenv("CRM_INTEGRATION_TIMEOUT_SECONDS", "3.0")).strip()
    try:
        parsed = float(raw)
        if parsed <= 0:
            return 3.0
        return parsed
    except (TypeError, ValueError):
        return 3.0


def _integration_cache_ttl_seconds() -> int:
    raw = str(os.getenv("CRM_INTEGRATION_CACHE_TTL_SECONDS", "60")).strip()
    try:
        parsed = int(raw)
        if parsed <= 0:
            return 60
        return parsed
    except (TypeError, ValueError):
        return 60


def _is_integration_configured() -> bool:
    return bool(_integration_base_url()) and bool(_integration_token())


def _set_last_error(message: Optional[str]) -> None:
    global _last_error_message
    _last_error_message = message


def _cache_get(cache_key: str) -> Optional[Any]:
    cached = _memory_cache.get(cache_key)
    if cached is None:
        return None

    expires_at, value = cached
    if time.time() >= expires_at:
        _memory_cache.pop(cache_key, None)
        return None

    return value


def _cache_set(cache_key: str, value: Any, ttl_seconds: int) -> None:
    _memory_cache[cache_key] = (time.time() + max(1, ttl_seconds), value)


def _call_crm_integration(
    method: str,
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[int], Optional[Dict[str, Any]]]:
    if not is_crm_integration_enabled():
        _set_last_error(None)
        return None, None

    base_url = _integration_base_url()
    token = _integration_token()
    if not base_url:
        message = "crm_integration_base_url_empty"
        _set_last_error(message)
        log_warning("CRM integration enabled, but CRM_INTEGRATION_BASE_URL is empty", "crm_integration")
        return None, None
    if not token:
        message = "crm_integration_token_empty"
        _set_last_error(message)
        log_warning("CRM integration enabled, but CRM_INTEGRATION_TOKEN is empty", "crm_integration")
        return None, None

    url = f"{base_url}{path}"
    timeout_seconds = _integration_timeout_seconds()

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers={
                    "X-Integration-Token": token,
                },
            )
    except Exception as error:
        _set_last_error(str(error))
        log_warning(f"CRM integration request failed ({method} {url}): {error}", "crm_integration")
        return None, None

    _set_last_error(None)
    try:
        payload = response.json()
        if isinstance(payload, dict):
            return response.status_code, payload
        return response.status_code, {"data": payload}
    except Exception:
        if response.status_code >= 500:
            log_warning(
                f"CRM integration returned non-JSON response with status {response.status_code} ({method} {url})",
                "crm_integration",
            )
        return response.status_code, None


def check_health(force_refresh: bool = False) -> Optional[bool]:
    if not is_crm_integration_enabled():
        return None

    if not _is_integration_configured():
        return False

    cache_key = "crm_integration:health"
    if not force_refresh:
        cached = _cache_get(cache_key)
        if isinstance(cached, bool):
            return cached

    status_code, payload = _call_crm_integration("GET", "/api/integration/v1/health")
    is_healthy = bool(
        status_code is not None
        and 200 <= status_code < 300
        and isinstance(payload, dict)
        and payload.get("success") is True
    )
    _cache_set(cache_key, is_healthy, min(30, _integration_cache_ttl_seconds()))
    return is_healthy


def get_integration_status() -> Dict[str, Any]:
    enabled = is_crm_integration_enabled()
    configured = _is_integration_configured()
    strict_mode = is_crm_integration_strict()

    healthy = check_health(force_refresh=False) if enabled and configured else None

    mode = "local"
    if enabled and configured and healthy:
        mode = "crm_integration"
    elif enabled and strict_mode:
        mode = "integration_required"

    return {
        "enabled": enabled,
        "configured": configured,
        "strict_mode": strict_mode,
        "healthy": healthy,
        "mode": mode,
        "last_error": _last_error_message,
    }


def fetch_services(language: str) -> Optional[List[Dict[str, Any]]]:
    if not is_crm_integration_enabled():
        return None

    normalized_language = str(language or "ru").strip().lower() or "ru"
    cache_key = f"crm_integration:services:{normalized_language}"
    cached = _cache_get(cache_key)
    if isinstance(cached, list):
        return cached

    status_code, payload = _call_crm_integration(
        "GET",
        "/api/integration/v1/services",
        params={"language": normalized_language},
    )
    if status_code is None or payload is None:
        return None

    if not (200 <= status_code < 300):
        log_info(f"CRM integration services request returned status {status_code}", "crm_integration")
        return None

    services = payload.get("services")
    if not isinstance(services, list):
        return None

    _cache_set(cache_key, services, _integration_cache_ttl_seconds())
    return services


def fetch_employees(language: str) -> Optional[List[Dict[str, Any]]]:
    if not is_crm_integration_enabled():
        return None

    normalized_language = str(language or "ru").strip().lower() or "ru"
    cache_key = f"crm_integration:employees:{normalized_language}"
    cached = _cache_get(cache_key)
    if isinstance(cached, list):
        return cached

    status_code, payload = _call_crm_integration(
        "GET",
        "/api/integration/v1/employees",
        params={"language": normalized_language},
    )
    if status_code is None or payload is None:
        return None

    if not (200 <= status_code < 300):
        log_info(f"CRM integration employees request returned status {status_code}", "crm_integration")
        return None

    employees = payload.get("employees")
    if not isinstance(employees, list):
        return None

    _cache_set(cache_key, employees, _integration_cache_ttl_seconds())
    return employees


def create_booking(booking_payload: Dict[str, Any]) -> Tuple[Optional[int], Optional[Dict[str, Any]]]:
    if not is_crm_integration_enabled():
        return None, None

    if not isinstance(booking_payload, dict):
        return None, None

    return _call_crm_integration(
        "POST",
        "/api/integration/v1/bookings",
        json_body=booking_payload,
    )
