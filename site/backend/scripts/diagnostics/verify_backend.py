import argparse
import importlib
import re
import sys
from pathlib import Path


def _resolve_paths() -> tuple[Path, Path, str]:
    script_path = Path(__file__).resolve()
    backend_root = script_path.parents[2]
    project_root = backend_root.parent
    project_name = project_root.name
    return project_root, backend_root, project_name


def _iter_python_files(target_paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for target_path in target_paths:
        if target_path.is_file() and target_path.suffix == ".py":
            files.append(target_path)
            continue

        if not target_path.is_dir():
            continue

        for py_file in target_path.rglob("*.py"):
            if any(part == "__pycache__" or part.startswith("_disabled_") for part in py_file.parts):
                continue
            files.append(py_file)

    return sorted(set(files))


def _check_forbidden_imports(backend_root: Path, project_name: str) -> list[str]:
    if project_name == "crm":
        target_paths = [
            backend_root / "main.py",
            backend_root / "product_groups" / "crm",
            backend_root / "product_groups" / "shared",
            backend_root / "core" / "auth.py",
            backend_root / "crm_api" / "integration.py",
        ]
        forbidden_patterns = [
            re.compile(r"\bfrom\s+product_groups\.site\b"),
            re.compile(r"\bfrom\s+site_api\b"),
            re.compile(r"\bimport\s+site_api\b"),
        ]
    elif project_name == "site":
        target_paths = [
            backend_root / "main.py",
            backend_root / "product_groups" / "site",
            backend_root / "product_groups" / "shared",
            backend_root / "site_api" / "public_admin.py",
            backend_root / "site_api" / "client_auth.py",
            backend_root / "site_api" / "sitemap.py",
            backend_root / "site_api" / "seo_metadata.py",
            backend_root / "site_api" / "public.py",
            backend_root / "site_api" / "uploads.py",
            backend_root / "core" / "auth.py",
            backend_root / "integrations" / "telegram_bot.py",
            backend_root / "services" / "universal_messenger.py",
            backend_root / "services" / "feedback_service.py",
            backend_root / "services" / "crm_integration.py",
            backend_root / "notifications" / "admin_notifications.py",
        ]
        forbidden_patterns = [
            re.compile(r"\bfrom\s+product_groups\.crm\b"),
            re.compile(r"\bfrom\s+crm_api\b"),
            re.compile(r"\bimport\s+crm_api\b"),
            re.compile(r"\bfrom\s+bot\b"),
            re.compile(r"\bfrom\s+scheduler\b"),
        ]
    else:
        return [f"❌ Unsupported project root: {project_name}"]

    violations: list[str] = []
    for py_file in _iter_python_files(target_paths):
        content = py_file.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines()
        for line_number, line in enumerate(lines, start=1):
            for pattern in forbidden_patterns:
                if pattern.search(line):
                    rel_path = py_file.relative_to(backend_root)
                    violations.append(
                        f"❌ Forbidden import in {rel_path}:{line_number} -> {line.strip()}"
                    )

    return violations


def _check_forbidden_directories(backend_root: Path, project_name: str) -> list[str]:
    if project_name == "crm":
        active_forbidden_paths = [
            backend_root / "product_groups" / "site",
            backend_root / "site_api",
        ]
        deleted_legacy_paths = [
            backend_root / "_disabled_site_api",
            backend_root / "product_groups" / "_disabled_site",
        ]
    elif project_name == "site":
        active_forbidden_paths = [
            backend_root / "product_groups" / "crm",
            backend_root / "crm_api",
        ]
        deleted_legacy_paths = [
            backend_root / "_disabled_crm_api",
            backend_root / "product_groups" / "_disabled_crm",
        ]
    else:
        return [f"❌ Unsupported project root: {project_name}"]

    violations: list[str] = []
    for forbidden_path in active_forbidden_paths:
        if forbidden_path.exists():
            rel_path = forbidden_path.relative_to(backend_root)
            violations.append(
                f"❌ Forbidden runtime contour directory exists: {rel_path}"
            )
    for legacy_path in deleted_legacy_paths:
        if legacy_path.exists():
            rel_path = legacy_path.relative_to(backend_root)
            violations.append(
                f"❌ Deleted legacy contour must not be restored: {rel_path}"
            )
    return violations


def _check_legacy_namespace_markers(backend_root: Path) -> list[str]:
    main_file = backend_root / "main.py"
    if not main_file.exists():
        return ["❌ main.py not found"]

    content = main_file.read_text(encoding="utf-8", errors="ignore")
    forbidden_markers = [
        "create_site_app",
        "create_crm_app",
        "_rewrite_namespaced_api_path",
        "ApiNamespaceWebSocketMiddleware",
        "BACKEND_PRODUCT_GROUP",
        "ENFORCE_API_NAMESPACE_SPLIT",
        '"/api/crm"',
        "'/api/crm'",
        '"/api/site"',
        "'/api/site'",
    ]

    violations: list[str] = []
    for marker in forbidden_markers:
        if marker in content:
            violations.append(f"❌ Legacy marker found in main.py -> {marker}")

    return violations


def _check_forbidden_route_namespaces(backend_root: Path, project_name: str) -> list[str]:
    if project_name == "crm":
        target_paths = [
            backend_root / "main.py",
            backend_root / "product_groups" / "crm",
            backend_root / "product_groups" / "shared",
            backend_root / "crm_api",
            backend_root / "core",
            backend_root / "shared_api",
        ]
        forbidden_markers = ["/api/site"]
    elif project_name == "site":
        target_paths = [
            backend_root / "main.py",
            backend_root / "product_groups" / "site",
            backend_root / "product_groups" / "shared",
            backend_root / "site_api",
            backend_root / "core",
            backend_root / "shared_api",
            backend_root / "services" / "crm_integration.py",
        ]
        forbidden_markers = ["/api/crm"]
    else:
        return [f"❌ Unsupported project root: {project_name}"]

    violations: list[str] = []
    for py_file in _iter_python_files(target_paths):
        lines = py_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        for line_number, line in enumerate(lines, start=1):
            for marker in forbidden_markers:
                if marker in line:
                    rel_path = py_file.relative_to(backend_root)
                    violations.append(
                        f"❌ Forbidden legacy namespace in {rel_path}:{line_number} -> {line.strip()}"
                    )
    return violations


def _check_integration_contract(backend_root: Path, project_name: str) -> list[str]:
    violations: list[str] = []

    if project_name == "crm":
        integration_file = backend_root / "crm_api" / "integration.py"
        required_markers = [
            'prefix="/integration/v1"',
            "@router.get(\"/health\")",
            "@router.get(\"/services\")",
            "@router.get(\"/employees\")",
            "@router.post(\"/bookings\")",
            "X-Integration-Token",
            "CRM_INTEGRATION_TOKEN",
            "secrets.compare_digest",
        ]
    elif project_name == "site":
        integration_file = backend_root / "services" / "crm_integration.py"
        required_markers = [
            "/api/integration/v1/health",
            "/api/integration/v1/services",
            "/api/integration/v1/employees",
            "/api/integration/v1/bookings",
            "X-Integration-Token",
            "CRM_INTEGRATION_TOKEN",
            "CRM_INTEGRATION_ENABLED",
        ]
    else:
        return [f"❌ Unsupported project root: {project_name}"]

    if not integration_file.exists():
        rel_path = integration_file.relative_to(backend_root)
        return [f"❌ Missing integration contract file: {rel_path}"]

    content = integration_file.read_text(encoding="utf-8", errors="ignore")
    for marker in required_markers:
        if marker not in content:
            rel_path = integration_file.relative_to(backend_root)
            violations.append(
                f"❌ Integration contract marker missing in {rel_path} -> {marker}"
            )

    return violations


def _run_runtime_smoke_checks() -> int:
    _, backend_root, project_name = _resolve_paths()
    print(f"🔧 Runtime smoke check started for project: {project_name}")

    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    try:
        main_module = importlib.import_module("main")
    except Exception as error:
        print(f"❌ Runtime smoke check failed: cannot import main ({error})")
        return 1

    app = getattr(main_module, "app", None)
    if app is None:
        create_app = getattr(main_module, "create_app", None)
        if callable(create_app):
            try:
                app = create_app()
            except Exception as error:
                print(f"❌ Runtime smoke check failed: create_app error ({error})")
                return 1

    if app is None:
        print("❌ Runtime smoke check failed: FastAPI app is missing")
        return 1

    route_paths = {
        str(getattr(route, "path", "")).strip()
        for route in getattr(app, "routes", [])
        if getattr(route, "path", None)
    }

    violations: list[str] = []

    if "/health" not in route_paths:
        violations.append("❌ Runtime smoke check: /health route is missing")
    if "/api/runtime-profile" not in route_paths:
        violations.append("❌ Runtime smoke check: /api/runtime-profile route is missing")

    backend_group = getattr(getattr(app, "state", None), "backend_product_group", None)
    if backend_group != project_name:
        violations.append(
            f"❌ Runtime smoke check: app.state.backend_product_group={backend_group} expected={project_name}"
        )

    if project_name == "crm":
        required_prefixes = ["/api/integration/v1"]
        forbidden_prefixes = ["/api/public/integration-status", "/api/public/initial-load"]
    elif project_name == "site":
        required_prefixes = ["/api/public"]
        forbidden_prefixes = ["/api/dashboard", "/api/funnel", "/api/tasks"]
    else:
        print(f"❌ Unsupported project root: {project_name}")
        return 1

    for required_prefix in required_prefixes:
        has_required = any(
            route_path == required_prefix or route_path.startswith(f"{required_prefix}/")
            for route_path in route_paths
        )
        if not has_required:
            violations.append(
                f"❌ Runtime smoke check: required route prefix missing -> {required_prefix}"
            )

    for forbidden_prefix in forbidden_prefixes:
        has_forbidden = any(
            route_path == forbidden_prefix or route_path.startswith(f"{forbidden_prefix}/")
            for route_path in route_paths
        )
        if has_forbidden:
            violations.append(
                f"❌ Runtime smoke check: forbidden route prefix is mounted -> {forbidden_prefix}"
            )

    if violations:
        print("❌ Runtime smoke check failed")
        for violation in violations:
            print(violation)
        return 1

    print("✅ Runtime smoke check passed")
    return 0


def _run_boundary_checks() -> int:
    project_root, backend_root, project_name = _resolve_paths()
    print(f"🔧 Boundary check started for project: {project_name}")
    print(f"🔧 Project root: {project_root}")

    violations: list[str] = []
    violations.extend(_check_forbidden_directories(backend_root, project_name))
    violations.extend(_check_forbidden_imports(backend_root, project_name))
    violations.extend(_check_forbidden_route_namespaces(backend_root, project_name))
    violations.extend(_check_legacy_namespace_markers(backend_root))
    violations.extend(_check_integration_contract(backend_root, project_name))

    if violations:
        print("❌ Boundary check failed")
        for violation in violations:
            print(violation)
        return 1

    print("✅ Boundary check passed")
    return 0


def _run_db_init() -> int:
    _, backend_root, _ = _resolve_paths()
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    try:
        from db import init_database

        print("🔧 Import successful")
        init_database()
        print("✅ Database initialization successful")
        return 0
    except Exception as error:
        print(f"❌ Error: {error}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Backend diagnostics")
    parser.add_argument(
        "--boundaries",
        action="store_true",
        help="Run runtime boundary checks",
    )
    parser.add_argument(
        "--smoke-runtime",
        action="store_true",
        help="Run FastAPI runtime smoke checks",
    )
    parser.add_argument(
        "--db-init",
        action="store_true",
        help="Run database init smoke check",
    )
    args = parser.parse_args()

    # Backward-compatible behavior: if no flags passed, run db-init check.
    if not args.boundaries and not args.smoke_runtime and not args.db_init:
        args.db_init = True

    exit_code = 0
    if args.boundaries:
        exit_code = _run_boundary_checks()
        if exit_code != 0:
            return exit_code

    if args.smoke_runtime:
        exit_code = _run_runtime_smoke_checks()
        if exit_code != 0:
            return exit_code

    if args.db_init:
        exit_code = _run_db_init()

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
