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
