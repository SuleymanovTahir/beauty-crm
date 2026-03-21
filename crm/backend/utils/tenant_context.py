"""
Request-scoped tenant context for multi-tenant CRM.
"""
from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import Any

_company_id_var: ContextVar[int | None] = ContextVar("tenant_company_id", default=None)
_user_id_var: ContextVar[int | None] = ContextVar("tenant_user_id", default=None)
_role_var: ContextVar[str | None] = ContextVar("tenant_user_role", default=None)
_is_super_admin_var: ContextVar[bool] = ContextVar("tenant_is_super_admin", default=False)
_bypass_var: ContextVar[bool] = ContextVar("tenant_bypass", default=True)


def _normalize_company_id(raw_value: Any) -> int | None:
    if raw_value is None:
        return None
    if isinstance(raw_value, bool):
        return None
    try:
        normalized = int(raw_value)
    except (TypeError, ValueError):
        return None
    return normalized if normalized > 0 else None


def set_tenant_context(user: dict | None = None, company_id: Any = None, bypass: bool | None = None) -> dict[str, Token]:
    resolved_company_id = _normalize_company_id(company_id)
    resolved_user_id = None
    resolved_role = None
    resolved_is_super_admin = False

    if isinstance(user, dict):
        resolved_user_id = _normalize_company_id(user.get("id"))
        resolved_role = str(user.get("role") or "").strip() or None
        resolved_company_id = _normalize_company_id(user.get("company_id")) if resolved_company_id is None else resolved_company_id
        resolved_is_super_admin = bool(
            user.get("is_super_admin") is True or
            resolved_role == "super_admin"
        )

    if bypass is None:
        resolved_bypass = resolved_is_super_admin or resolved_company_id is None
    else:
        resolved_bypass = bool(bypass)

    return {
        "company_id": _company_id_var.set(resolved_company_id),
        "user_id": _user_id_var.set(resolved_user_id),
        "role": _role_var.set(resolved_role),
        "is_super_admin": _is_super_admin_var.set(resolved_is_super_admin),
        "bypass": _bypass_var.set(resolved_bypass),
    }


def reset_tenant_context(tokens: dict[str, Token] | None) -> None:
    if not tokens:
        return
    _company_id_var.reset(tokens["company_id"])
    _user_id_var.reset(tokens["user_id"])
    _role_var.reset(tokens["role"])
    _is_super_admin_var.reset(tokens["is_super_admin"])
    _bypass_var.reset(tokens["bypass"])


def clear_tenant_context() -> None:
    set_tenant_context(user=None, company_id=None, bypass=True)


def get_current_company_id() -> int | None:
    return _company_id_var.get()


def get_current_user_id() -> int | None:
    return _user_id_var.get()


def get_current_user_role() -> str | None:
    return _role_var.get()


def is_super_admin_context() -> bool:
    return _is_super_admin_var.get()


def is_tenant_bypass_enabled() -> bool:
    return _bypass_var.get()


@contextmanager
def platform_access():
    tokens = set_tenant_context(user=None, company_id=None, bypass=True)
    try:
        yield
    finally:
        reset_tenant_context(tokens)
