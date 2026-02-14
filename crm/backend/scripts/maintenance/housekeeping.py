
"""
Housekeeping script: Periodic database maintenance tasks.
- Permanently delete items from trash older than 30 days.
- Clean up old audit logs (older than 90 days, excluding critical actions).
- Clean up expired sessions.
"""
import sys
import os
from datetime import datetime, timedelta

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_housekeeping():
    """Run all maintenance tasks"""
    log_info("🧹 Starting housekeeping tasks...", "housekeeping")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Permanent delete from trash (30 days)
        # We need to find entity_id and entity_type to delete from original tables
        c.execute("""
            SELECT entity_type, entity_id FROM deleted_items 
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
            AND restored_at IS NULL
        """)
        to_delete = c.fetchall()
        
        for entity_type, entity_id in to_delete:
            try:
                if entity_type == 'booking':
                    c.execute("DELETE FROM bookings WHERE id = %s", (entity_id,))
                elif entity_type == 'client':
                    c.execute("DELETE FROM clients WHERE instagram_id = %s", (entity_id,))
                elif entity_type == 'user':
                    c.execute("DELETE FROM users WHERE id = %s", (entity_id,))
                
                # Mark as permanently deleted in deleted_items
                c.execute("""
                    UPDATE deleted_items 
                    SET can_restore = FALSE, reason = reason || ' (Housekeeping: Permanently deleted)'
                    WHERE entity_type = %s AND entity_id = %s
                """, (entity_type, entity_id))
            except Exception as e:
                log_error(f"Error permanently deleting {entity_type} {entity_id}: {e}", "housekeeping")

        if to_delete:
            log_info(f"🗑️ Permanently deleted {len(to_delete)} items from trash", "housekeeping")

        # 2. Cleanup old audit logs (90 days, non-critical)
        c.execute("""
            DELETE FROM audit_log 
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
            AND id NOT IN (SELECT audit_log_id FROM critical_actions)
        """)
        audit_deleted = c.rowcount
        if audit_deleted > 0:
            log_info(f"🧹 Cleaned up {audit_deleted} old audit logs", "housekeeping")

        # 3. Cleanup expired sessions
        now = datetime.now().isoformat()
        c.execute("DELETE FROM sessions WHERE expires_at < %s", (now,))
        sessions_deleted = c.rowcount
        if sessions_deleted > 0:
            log_info(f"🧹 Cleaned up {sessions_deleted} expired sessions", "housekeeping")

        conn.commit()
        log_info("✅ Housekeeping completed successfully", "housekeeping")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Housekeeping failed: {e}", "housekeeping")
    finally:
        conn.close()

if __name__ == "__main__":
    run_housekeeping()
