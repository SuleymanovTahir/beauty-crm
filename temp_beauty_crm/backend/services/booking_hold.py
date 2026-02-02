from datetime import datetime, timedelta
from typing import Optional, List, Dict
from db.connection import get_db_connection
from utils.logger import log_error, log_info

class BookingHoldService:
    """Service for managing temporary booking holds to prevent double booking."""
    
    HOLD_DURATION_MINUTES = 10

    def create_hold(
        self,
        service_id: int,
        master_name: str,
        date: str,
        time: str,
        client_id: str
    ) -> bool:
        """Create a temporary hold for a slot."""
        conn = get_db_connection()
        c = conn.cursor()
        
        try:
            # First, clean up expired holds
            self._cleanup_expired(c)
            
            # Check if already held by SOMEONE ELSE
            c.execute("""
                SELECT client_id, expires_at FROM booking_holds
                WHERE master = %s AND date = %s AND time = %s
            """, (master_name, date, time))
            
            existing = c.fetchone()
            if existing:
                holder_id, expires_at = existing
                if holder_id != client_id and expires_at > datetime.now():
                    return False # Slot is taken by someone else
                
                # If held by self, refresh it
                if holder_id == client_id:
                     expires_at = datetime.now() + timedelta(minutes=self.HOLD_DURATION_MINUTES)
                     c.execute("""
                        UPDATE booking_holds
                        SET expires_at = %s
                        WHERE master = %s AND date = %s AND time = %s
                     """, (expires_at, master_name, date, time))
                     conn.commit()
                     return True

            # Create new hold
            expires_at = datetime.now() + timedelta(minutes=self.HOLD_DURATION_MINUTES)
            c.execute("""
                INSERT INTO booking_holds (service_id, master, date, time, client_id, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (service_id, master_name, date, time, client_id, expires_at))
            
            conn.commit()
            return True
            
        except Exception as e:
            log_error(f"Error creating hold: {e}", "booking_hold")
            conn.rollback()
            return False
        finally:
            conn.close()

    def check_is_held(self, master_name: str, date: str, time: str, current_client_id: str) -> bool:
        """Return True if slot is held by SOMEONE ELSE."""
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("""
                SELECT client_id FROM booking_holds
                WHERE master = %s AND date = %s AND time = %s
                AND expires_at > NOW()
            """, (master_name, date, time))
            row = c.fetchone()
            if row:
                if row[0] != current_client_id:
                    return True
            return False
        except Exception as e:
            log_error(f"Error checking hold: {e}", "booking_hold")
            return False # Assume free on error to avoid blocking? Or opposite.
        finally:
            conn.close()
            
    def _cleanup_expired(self, cursor):
        """Internal helper to clean expired holds."""
        try:
            cursor.execute("DELETE FROM booking_holds WHERE expires_at < NOW()")
        except Exception:
            pass
