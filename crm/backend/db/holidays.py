"""
Salon Holidays Database Orchestrator
Handles all holiday and salon-day-off operations.
"""
from datetime import datetime, date
from typing import List, Optional, Dict, Any
import json
from db.connection import get_db_connection
from utils.logger import log_error

class SalonHoliday:
    """Holiday data model"""
    def __init__(
        self,
        id: int,
        date: str,
        name: str,
        is_closed: bool = True,
        created_at: Optional[str] = None,
        master_exceptions: Optional[List[int]] = None,
    ):
        self.id = id
        self.date = date  # YYYY-MM-DD
        self.name = name
        self.is_closed = is_closed
        self.created_at = created_at
        self.master_exceptions = master_exceptions or []


def _normalize_master_exceptions(raw_value: Any) -> List[int]:
    if raw_value is None:
        return []

    values = raw_value
    if isinstance(raw_value, str):
        try:
            values = json.loads(raw_value)
        except Exception:
            values = []

    if not isinstance(values, list):
        return []

    normalized: List[int] = []
    seen = set()
    for item in values:
        try:
            master_id = int(item)
        except Exception:
            continue

        if master_id in seen:
            continue
        seen.add(master_id)
        normalized.append(master_id)

    return normalized

def get_holidays(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all holidays from DB within range"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = "SELECT id, date, name, is_closed, master_exceptions, created_at FROM salon_holidays"
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
                "master_exceptions": _normalize_master_exceptions(r[4]),
                "created_at": r[5].isoformat() if isinstance(r[5], (date, datetime)) else r[5]
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
        exceptions = _normalize_master_exceptions(master_exceptions)
        c.execute("""
            INSERT INTO salon_holidays (date, name, is_closed, master_exceptions)
            VALUES (%s, %s, %s, %s::jsonb)
            ON CONFLICT (date) DO UPDATE SET
                name = EXCLUDED.name,
                is_closed = EXCLUDED.is_closed,
                master_exceptions = EXCLUDED.master_exceptions
        """, (h_date, name, is_closed, json.dumps(exceptions)))
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
            master_exceptions JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        c.execute("ALTER TABLE salon_holidays ADD COLUMN IF NOT EXISTS master_exceptions JSONB DEFAULT '[]'")
        conn.commit()
    except Exception as e:
        log_error(f"Error creating holidays table: {e}", "db.holidays")
    finally:
        conn.close()

# Re-export functions for backwards compatibility
__all__ = ['SalonHoliday', 'create_holidays_table', 'add_holiday', 'get_holidays', 'delete_holiday']
