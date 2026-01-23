"""
User Activity Middleware
Updates user's online status on every authenticated API request
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from datetime import datetime, timedelta
from db.connection import get_db_connection
from db.users import get_user_by_session
from utils.logger import log_error

# Cache to avoid updating DB on every request
# Format: {user_id: last_update_time}
_last_activity_update = {}

# Minimum time between activity updates (in seconds)
ACTIVITY_UPDATE_INTERVAL = 30


class UserActivityMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track user activity and update online status.
    Updates user_status table periodically when user makes authenticated requests.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only track on successful responses for authenticated routes
        if response.status_code < 400:
            try:
                # Get session token from cookies
                session_token = request.cookies.get('session_token')
                if session_token:
                    # Get user from session (lightweight check)
                    user = get_user_by_session(session_token)
                    if user and user.get('id'):
                        user_id = user['id']
                        now = datetime.now()

                        # Check if we need to update (throttle updates)
                        last_update = _last_activity_update.get(user_id)
                        if not last_update or (now - last_update).total_seconds() > ACTIVITY_UPDATE_INTERVAL:
                            # Update activity in background (don't block response)
                            update_user_activity(user_id, now)
                            _last_activity_update[user_id] = now
            except Exception as e:
                # Don't let activity tracking break the request
                pass

        return response


def update_user_activity(user_id: int, timestamp: datetime):
    """Update user's online status and last_seen in database"""
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
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


def mark_inactive_users():
    """
    Mark users as offline if they haven't had activity in 2 minutes.
    Call this periodically (e.g., from a background task or cron).
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

        affected = c.rowcount
        conn.commit()

        if affected > 0:
            from utils.logger import log_info
            log_info(f"Marked {affected} users as offline (inactive > 2 min)", "middleware")

    except Exception as e:
        log_error(f"Error marking inactive users: {e}", "middleware")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
