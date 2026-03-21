"""
Helpers for backend features backed by optional dependency groups.
"""
from fastapi import HTTPException


OPTIONAL_REQUIREMENTS_PATH = "crm/backend/requirements-optional.txt"


class OptionalDependencyError(RuntimeError):
    """Raised when a feature depends on packages outside the core backend runtime."""


def build_optional_dependency_message(feature_name: str) -> str:
    normalized_feature = str(feature_name or "This feature").strip()
    return (
        f"{normalized_feature} requires optional backend dependencies. "
        f"Install {OPTIONAL_REQUIREMENTS_PATH} to enable it."
    )


def raise_optional_dependency_http(feature_name: str, status_code: int = 503) -> None:
    raise HTTPException(
        status_code=status_code,
        detail=build_optional_dependency_message(feature_name),
    )


def raise_optional_dependency_runtime(feature_name: str) -> None:
    raise OptionalDependencyError(build_optional_dependency_message(feature_name))
