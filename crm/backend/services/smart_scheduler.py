import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any
from services.master_schedule import MasterScheduleService
from utils.datetime_utils import get_current_time

logger = logging.getLogger(__name__)

# ✅ ФУНКЦИЯ ДЛЯ ЛОКАЛИЗАЦИИ ИМЁН МАСТЕРОВ
# ✅ Импортируем универсальную функцию из utils (убрано дублирование)
from utils.language_utils import get_localized_name

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
        target_date_str: Optional[str] = None, # YYYY-MM-DD
        duration_minutes: int = 60
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
        primary_slots, status = self._get_filtered_slots(master_name, target_date, duration_minutes)
        
        result = {
            "primary_date": target_date.strftime("%Y-%m-%d"),
            "primary_slots": primary_slots,
            "alternatives": [],
            "status": status
        }

        # 3. If full or few slots, check adjacent days
        if len(primary_slots) < 3:
            # Check Next Day
            next_day = target_date + timedelta(days=1)
            next_slots = self._get_filtered_slots(master_name, next_day, duration_minutes)
            if next_slots:
                result["alternatives"].append({
                    "date": next_day.strftime("%Y-%m-%d"),
                    "slots": next_slots
                })
            
            # Check Previous Day (if not in past)
            prev_day = target_date - timedelta(days=1)
            if prev_day >= now.date() and prev_day != target_date:
                prev_slots, _ = self._get_filtered_slots(master_name, prev_day, duration_minutes)
                if prev_slots:
                    result["alternatives"].append({
                        "date": prev_day.strftime("%Y-%m-%d"),
                        "slots": prev_slots
                    })

        return result

    def _get_filtered_slots(self, master_name: str, date_obj, duration_minutes: int) -> Tuple[List[str], str]:
        """Fetch slots and apply Smart Constraints (Travel Buffer). Returns (slots, status)"""
        date_str = date_obj.strftime("%Y-%m-%d")

        # SSOT: существование/график/выходные/праздники/брони валидируются в MasterScheduleService
        user_record = self.schedule_service._get_user_record(master_name)
        if not user_record:
            logger.error(f"Master '{master_name}' not found")
            return [], "not_found"

        master_identifier = str(user_record.get("id") or master_name)

        # 1. Get Raw Slots from SSOT schedule service
        try:
            raw_slots = self.schedule_service.get_available_slots(
                master_name=master_identifier,
                date=date_str,
                duration_minutes=duration_minutes 
            )
        except Exception as e:
            logger.error(f"Error in get_available_slots for {master_name}: {e}", exc_info=True)
            return [], "error"
        
        # ✅ ВАЛИДАЦИЯ: Проверяем тип и формат слотов
        if not isinstance(raw_slots, list):
            logger.error(f"get_available_slots returned invalid type: {type(raw_slots)}")
            return [], "error"
        
        if not raw_slots:
            logger.debug(f"No raw slots found for master='{master_name}', date={date_str}, duration={duration_minutes}min")
        else:
            logger.debug(f"Found {len(raw_slots)} raw slots for {master_name} on {date_str}")
        
        # 2. Apply Travel Buffer Constraint
        now = get_current_time()
        is_today = (date_obj == now.date())
        
        final_slots = []
        for slot in raw_slots:
            # ✅ ВАЛИДАЦИЯ: Проверяем формат слота
            if not isinstance(slot, str):
                logger.warning(f"Invalid slot type: {type(slot)}, value: {slot}")
                continue
            
            if ':' not in slot:
                logger.warning(f"Invalid slot format (no ':'): {slot}")
                continue
            
            try:
                slot_hour, slot_min = map(int, slot.split(':'))
                if not (0 <= slot_hour < 24 and 0 <= slot_min < 60):
                    logger.warning(f"Invalid time values: {slot}")
                    continue
            except (ValueError, AttributeError) as e:
                logger.warning(f"Error parsing slot '{slot}': {e}")
                continue
            
            if is_today:
                # Check if slot is at least X hours from now
                slot_time = now.replace(hour=slot_hour, minute=slot_min, second=0, microsecond=0)
                
                # If slot time is earlier than now (should theoretically be filtered by service, but double check)
                if slot_time < now:
                    continue
                    
                # Buffer Check
                diff = slot_time - now
                if diff < timedelta(hours=self.DEFAULT_BUFFER_HOURS):
                    continue
            
            final_slots.append(slot)
        
        logger.debug(f"✅ Filtered to {len(final_slots)} slots for {master_name} on {date_str}")
        status = "available" if final_slots else "full"
        return final_slots, status
