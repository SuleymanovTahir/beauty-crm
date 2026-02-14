"""
Bulk delete visitor records with filters
"""

from typing import Optional
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_info, log_error


def bulk_delete_visitor_records(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    device_type: Optional[str] = None
) -> int:
    """
    Bulk delete visitor records based on filters
    Returns number of deleted records
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "DELETE FROM visitor_tracking WHERE 1=1"
        params = []
        
        if start_date:
            query += " AND visited_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND visited_at <= %s"
            params.append(end_date)
        
        if country:
            query += " AND country = %s"
            params.append(country)
        
        if city:
            query += " AND city = %s"
            params.append(city)
        
        if device_type:
            query += " AND device_type = %s"
            params.append(device_type)
        
        cursor.execute(query, params)
        deleted_count = cursor.rowcount
        conn.commit()
        
        log_info(f"🗑️ Bulk deleted {deleted_count} visitor records", "db")
        return deleted_count
        
    except Exception as e:
        log_error(f"Error bulk deleting visitors: {e}", "db")
        conn.rollback()
        return 0
    finally:
        conn.close()
