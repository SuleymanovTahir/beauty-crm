"""
Salon Holidays Database Orchestrator
Handles all holiday and salon-day-off operations.
"""
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from db.connection import get_db_connection
from utils.logger import log_info, log_error

class SalonHoliday:
    """Holiday data model"""
    def __init__(self, id: int, date: str, name: str, is_closed: bool = True, created_at: Optional[str] = None):
        self.id = id
        self.date = date  # YYYY-MM-DD
        self.name = name
        self.is_closed = is_closed
        self.created_at = created_at

def get_holidays(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all holidays from DB within range"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = "SELECT id, date, name, is_closed, created_at FROM salon_holidays"
        params = []
        
        if start_date and end_date:
            query += " WHERE date BETWEEN %s AND %s"
            params = [start_date, end_date]
            
        query += " ORDER BY date ASC"
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "id": r[0],
                "date": r[1].isoformat() if isinstance(r[1], (date, datetime)) else r[1],
                "name": r[2],
                "is_closed": r[3],
                "created_at": r[4].isoformat() if isinstance(r[4], (date, datetime)) else r[4]
            }
            for r in rows
        ]
    except Exception as e:
        log_error(f"Error fetching holidays: {e}", "db.holidays")
        return []
    finally:
        conn.close()

def add_holiday(h_date: str, name: str, is_closed: bool = True, master_exceptions: List[int] = None) -> bool:
    """Add a holiday to DB"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO salon_holidays (date, name, is_closed)
            VALUES (%s, %s, %s)
            ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, is_closed = EXCLUDED.is_closed
        """, (h_date, name, is_closed))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error adding holiday: {e}", "db.holidays")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_holiday(h_date: str) -> bool:
    """Remove a holiday (accepts YYYY-MM-DD or date object)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM salon_holidays WHERE date = %s", (h_date,))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        log_error(f"Error deleting holiday: {e}", "db.holidays")
        conn.rollback()
        return False
    finally:
        conn.close()

def create_holidays_table():
    """Safety check for table existence (legacy compatible)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''CREATE TABLE IF NOT EXISTS salon_holidays (
            id SERIAL PRIMARY KEY,
            date DATE UNIQUE NOT NULL,
            name TEXT,
            is_closed BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.commit()
    except Exception as e:
        log_error(f"Error creating holidays table: {e}", "db.holidays")
    finally:
        conn.close()

# Re-export functions for backwards compatibility
__all__ = ['SalonHoliday', 'create_holidays_table', 'add_holiday', 'get_holidays', 'delete_holiday']
