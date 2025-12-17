"""
Salon Holidays Database Functions
Reuses consolidated migration functions to avoid duplication
"""
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from db.migrations.consolidated.schema_holidays import (
    migrate_holidays_schema as create_holidays_table,
    add_holiday,
    get_holidays,
    delete_holiday
)

class SalonHoliday:
    """Holiday data model"""
    def __init__(self, id: int, date: str, name: str, is_closed: bool = True, created_at: Optional[str] = None):
        self.id = id
        self.date = date  # stored as YYYY-MM-DD string or DATE object
        self.name = name
        self.is_closed = is_closed
        self.created_at = created_at

# Re-export functions from consolidated migration for backwards compatibility
__all__ = ['SalonHoliday', 'create_holidays_table', 'add_holiday', 'get_holidays', 'delete_holiday']
