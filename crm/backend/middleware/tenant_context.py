from http.cookies import SimpleCookie

from db.users import get_user_by_session
from utils.tenant_context import reset_tenant_context, set_tenant_context


class TenantContextMiddleware:
    """
    Resolve current authenticated tenant once per request and expose it
    through ContextVar so DB/session helpers can apply tenant-aware behavior.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return

        tokens = None
        cookie_header = b""
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"cookie":
                cookie_header = header_value
                break

        session_token = None
        if cookie_header:
            try:
                cookies = SimpleCookie()
                cookies.load(cookie_header.decode())
                if "session_token" in cookies:
                    session_token = cookies["session_token"].value
            except Exception:
                session_token = None

        user = get_user_by_session(session_token) if session_token else None
        tokens = set_tenant_context(user=user)

        try:
            await self.app(scope, receive, send)
        finally:
            reset_tenant_context(tokens)
