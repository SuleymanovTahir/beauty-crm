"""
Newsletter Database Orchestrator
Handles subscriber management for CRM newsletters.
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def add_subscriber(email: str, source: str = 'footer') -> bool:
    """Add a new subscriber to the newsletter list"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO newsletter_subscribers (email, is_active)
            VALUES (%s, TRUE)
            ON CONFLICT (email) DO UPDATE SET is_active = TRUE
        """, (email.lower().strip(),))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error adding newsletter subscriber {email}: {e}", "db.newsletter")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_all_subscribers(include_inactive: bool = False) -> list:
    """Get all newsletter subscribers"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if include_inactive:
            c.execute("""
                SELECT id, email, is_active, created_at
                FROM newsletter_subscribers
                ORDER BY created_at DESC
            """)
        else:
            c.execute("""
                SELECT id, email, is_active, created_at
                FROM newsletter_subscribers
                WHERE is_active = TRUE
                ORDER BY created_at DESC
            """)
        rows = c.fetchall()
        return [
            {
                'id': row[0],
                'email': row[1],
                'is_active': row[2],
                'created_at': row[3].isoformat() if row[3] else None
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting newsletter subscribers: {e}", "db.newsletter")
        return []
    finally:
        conn.close()

def update_subscriber_status(subscriber_id: int, is_active: bool) -> bool:
    """Update subscriber active status"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE newsletter_subscribers
            SET is_active = %s
            WHERE id = %s
        """, (is_active, subscriber_id))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        log_error(f"Error updating subscriber {subscriber_id}: {e}", "db.newsletter")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_subscriber(subscriber_id: int) -> bool:
    """Delete a subscriber from the newsletter list"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM newsletter_subscribers WHERE id = %s", (subscriber_id,))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        log_error(f"Error deleting subscriber {subscriber_id}: {e}", "db.newsletter")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_subscribers_count() -> dict:
    """Get count of active and total subscribers"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = TRUE")
        active = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM newsletter_subscribers")
        total = c.fetchone()[0]
        return {'active': active, 'total': total}
    except Exception as e:
        log_error(f"Error getting subscribers count: {e}", "db.newsletter")
        return {'active': 0, 'total': 0}
    finally:
        conn.close()

def create_newsletter_table():
    """Safety check for table existence (legacy compatible)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.commit()
    except Exception as e:
        log_error(f"Error creating newsletter table: {e}", "db.newsletter")
    finally:
        conn.close()
