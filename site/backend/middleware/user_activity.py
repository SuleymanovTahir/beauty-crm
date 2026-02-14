from datetime import datetime, timedelta
from db.connection import get_db_connection
from db.users import get_user_by_session
from utils.logger import log_error

# Cache to avoid updating DB on every request
_last_activity_update = {}
ACTIVITY_UPDATE_INTERVAL = 30

class UserActivityMiddleware:
    """
    Native ASGI Middleware to track user activity.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract session_token from cookies in scope
        session_token = None
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()
        if cookie_header:
            import http.cookies
            cookies = http.cookies.SimpleCookie()
            cookies.load(cookie_header)
            if "session_token" in cookies:
                session_token = cookies["session_token"].value

        # Status code tracking
        status_code = [None]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        # Post-request processing (non-blocking status update)
        if session_token and status_code[0] and status_code[0] < 400:
            try:
                # Use a lightweight check
                user = get_user_by_session(session_token)
                if user and user.get('id'):
                    user_id = user['id']
                    now = datetime.now()
                    
                    last_update = _last_activity_update.get(user_id)
                    if not last_update or (now - last_update).total_seconds() > ACTIVITY_UPDATE_INTERVAL:
                        import asyncio
                        asyncio.create_task(self._update_activity_async(user_id, now))
                        _last_activity_update[user_id] = now
            except:
                pass

    async def _update_activity_async(self, user_id, timestamp):
        """Async wrapper for the sync update function"""
        import anyio
        await anyio.to_thread.run_sync(update_user_activity, user_id, timestamp)


def update_user_activity(user_id: int, timestamp: datetime):
    """Update user's online status in database (Sync)"""
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO user_status (user_id, is_online, last_seen, updated_at)
            VALUES (%s, TRUE, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET is_online = TRUE, last_seen = %s, updated_at = %s
        """, (user_id, timestamp, timestamp, timestamp, timestamp))
        conn.commit()
    except Exception as e:
        log_error(f"Error updating user activity: {e}", "middleware")
    finally:
        if conn: conn.close()

def mark_inactive_users():
    """
    Mark users as offline if they haven't had activity in 2 minutes.
    """
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()
        threshold = datetime.now() - timedelta(minutes=2)
        c.execute("""
            UPDATE user_status
            SET is_online = FALSE
            WHERE is_online = TRUE AND updated_at < %s
        """, (threshold,))
        conn.commit()
    except Exception as e:
        log_error(f"Error marking inactive users: {e}", "middleware")
    finally:
        if conn: conn.close()
