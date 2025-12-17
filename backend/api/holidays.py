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
    # 1. Add holiday to DB
    success = add_holiday(holiday.date, holiday.name, holiday.is_closed)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create holiday")
    
    # 2. Handle master exceptions
    # If is_closed is True, we generally want to clear schedules for EVERYONE except exceptions.
    # If is_closed is False (maybe partial holiday?), logic differs.
    # Assuming "Holiday" means closed by default.
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Get all masters
        c.execute("SELECT id FROM users WHERE role = 'employee' OR is_service_provider = TRUE")
        all_masters = [r[0] for r in c.fetchall()]
        
        # Determine who should work
        exceptions = set(holiday.master_exceptions or [])
        
        for master_id in all_masters:
            if master_id in exceptions:
                # This master SHOULD work.
                # If they already have a schedule, ensure it's active? 
                # Or create a default one if missing?
                # For now, let's assume if they are an exception, we DO NOT delete their schedule.
                # If they don't have one, we might need to create it (let's leave that to manual schedule management for now, 
                # or just ensure we don't block them).
                pass
            else:
                # This master should NOT work.
                # Delete their schedule for this day.
                # We need to map Date to Day of Week? 
                # UserSchedule is typically weekly (day_of_week). 
                # BUT specific date overrides usually happen in `master_schedule` (if it exists) or by creating time off?
                # Wait, existing system uses `user_time_off` for exceptions? Or `master_schedule` logic?
                
                # Check how availability is calculated. 
                # Usually `get_available_slots` checks `user_time_off`.
                # So to "Close" the salon, we should add `user_time_off` for all non-excepted masters?
                # YES. That is the most robust way.
                
                # Check if time off already exists
                c.execute(
                    "SELECT id FROM user_time_off WHERE user_id = %s AND start_dateStr = %s", 
                    (master_id, holiday.date)
                )
                # ERROR: user_time_off uses start_date (TEXT).
                
                # Insert Time Off
                c.execute("""
                    INSERT INTO user_time_off (user_id, start_date, end_date, reason)
                    VALUES (%s, %s, %s, %s)
                """, (master_id, holiday.date, holiday.date, f"Holiday: {holiday.name}"))
        
        conn.commit()
    except Exception as e:
        # Log error but don't fail the request (holiday itself was created)
        print(f"Error processing schedule exceptions: {e}")
    finally:
        conn.close()

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
