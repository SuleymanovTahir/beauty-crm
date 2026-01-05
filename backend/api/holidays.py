from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from db.holidays import add_holiday, get_holidays, delete_holiday, SalonHoliday
from db.connection import get_db_connection

router = APIRouter()

class HolidayRequest(BaseModel):
    date: str
    name: str
    is_closed: bool = True
    master_exceptions: Optional[List[int]] = [] # List of master IDs allowed to work

class HolidayResponse(BaseModel):
    id: int
    date: str
    name: str
    is_closed: bool
    created_at: str

@router.get("", response_model=List[HolidayResponse])
async def list_holidays(start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_holidays(start_date, end_date)

@router.post("")
async def create_holiday(holiday: HolidayRequest):
    # 1. Add holiday to DB (including master exceptions)
    success = add_holiday(holiday.date, holiday.name, holiday.is_closed, holiday.master_exceptions)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create holiday")
    
    return {"success": True}

@router.delete("/{date}")
async def remove_holiday(date: str):
    success = delete_holiday(date)
    if not success:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # Optional: Remove the auto-generated time-offs?
    # Ideally yes, but complex to track which ones were auto-generated.
    # User can manually remove time-offs if they decide to open.
    return {"success": True}
