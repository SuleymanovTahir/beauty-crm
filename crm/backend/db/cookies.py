"""
Cookies and Consents Database Orchestrator
Handles logging and checking user cookie preferences.
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error
import json

def log_cookie_consent(ip: str, action: str, user_agent: str = "") -> bool:
    """Log user choice for cookies"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        preferences = json.dumps({"action": action, "user_agent": user_agent})
        c.execute("""
            INSERT INTO cookie_consents (ip_address, preferences)
            VALUES (%s, %s)
        """, (ip, preferences))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error logging cookie consent for {ip}: {e}", "db.cookies")
        conn.rollback()
        return False
    finally:
        conn.close()

def check_cookie_consent(ip: str) -> str:
    """Check if user with IP has accepted or declined cookies"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT preferences FROM cookie_consents 
            WHERE ip_address = %s 
            ORDER BY accepted_at DESC LIMIT 1
        """, (ip,))
        row = c.fetchone()
        if row:
            prefs = row[0]
            if isinstance(prefs, str):
                prefs = json.loads(prefs)
            return prefs.get("action")
        return None
    except Exception as e:
        log_error(f"Error checking cookie consent for {ip}: {e}", "db.cookies")
        return None
    finally:
        conn.close()

def create_cookie_consents_table():
    """Safety check for table existence (legacy compatible)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS cookie_consents (
            id SERIAL PRIMARY KEY,
            ip_address TEXT,
            accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            preferences JSONB DEFAULT '{}'
        )''')
        conn.commit()
    except Exception as e:
        log_error(f"Error creating cookie_consents table: {e}", "db.cookies")
    finally:
        conn.close()
