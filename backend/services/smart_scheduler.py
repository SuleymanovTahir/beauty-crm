import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from services.master_schedule import MasterScheduleService
from utils.datetime_utils import get_current_time

logger = logging.getLogger(__name__)

class SmartScheduler:
    """
    Intelligent scheduling layer on top of MasterScheduleService.
    Handles:
    - Travel buffers (don't suggest slots in 15 mins)
    - Date intent parsing overrides
    - Multi-day fallback suggestions
    """
    
    def __init__(self):
        self.schedule_service = MasterScheduleService()
        self.DEFAULT_BUFFER_HOURS = 3  # Minimum hours advance for 'today'
        self.SEARCH_WINDOW_DAYS = 2    # Look ahead/behind X days

    def get_smart_suggestions(
        self, 
        service_name: str,
        master_name: str,
        target_date_str: Optional[str] = None # YYYY-MM-DD
    ) -> Dict[str, Any]:
        """
        Get intelligent slot suggestions based on constraints.
        
        Returns:
            {
                "primary_date": "YYYY-MM-DD",
                "primary_slots": ["14:00", "16:00"],
                "alternatives": [
                    {"date": "YYYY-MM-DD", "slots": ["10:00"]}
                ],
                "message": "Suggested text..."
            }
        """
        now = get_current_time()
        
        # 1. Determine Target Date
        if not target_date_str:
            target_date = now.date()
        else:
            try:
                target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = now.date()
        
        # 2. Check Primary Date Availability
        primary_slots = self._get_filtered_slots(master_name, target_date)
        
        result = {
            "primary_date": target_date.strftime("%Y-%m-%d"),
            "primary_slots": primary_slots,
            "alternatives": [],
            "status": "available" if primary_slots else "full"
        }

        # 3. If full or few slots, check adjacent days
        if len(primary_slots) < 3:
            # Check Next Day
            next_day = target_date + timedelta(days=1)
            next_slots = self._get_filtered_slots(master_name, next_day)
            if next_slots:
                result["alternatives"].append({
                    "date": next_day.strftime("%Y-%m-%d"),
                    "slots": next_slots
                })
            
            # Check Previous Day (if not in past)
            prev_day = target_date - timedelta(days=1)
            if prev_day >= now.date() and prev_day != target_date:
                prev_slots = self._get_filtered_slots(master_name, prev_day)
                if prev_slots:
                    result["alternatives"].append({
                        "date": prev_day.strftime("%Y-%m-%d"),
                        "slots": prev_slots
                    })

        return result

    def _get_filtered_slots(self, master_name: str, date_obj) -> List[str]:
        """Fetch slots and apply Smart Constraints (Travel Buffer)"""
        date_str = date_obj.strftime("%Y-%m-%d")
        
        # 1. Get Raw Slots
        # We assume 1h duration for now, ideally this comes from service
        raw_slots = self.schedule_service.get_available_slots(
            master_name=master_name,
            date=date_str,
            duration_minutes=60 
        )
        
        # 2. Apply Travel Buffer Constraint
        now = get_current_time()
        is_today = (date_obj == now.date())
        
        final_slots = []
        for slot in raw_slots:
            if is_today:
                # Check if slot is at least X hours from now
                slot_hour, slot_min = map(int, slot.split(':'))
                slot_time = now.replace(hour=slot_hour, minute=slot_min, second=0, microsecond=0)
                
                # If slot time is earlier than now (should theoretically be filtered by service, but double check)
                if slot_time < now:
                    continue
                    
                # Buffer Check
                diff = slot_time - now
                if diff < timedelta(hours=self.DEFAULT_BUFFER_HOURS):
                    continue
            
            final_slots.append(slot)
            
        return final_slots
