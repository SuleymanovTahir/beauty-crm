"""
Migration: Convert phone field to JSON array format
Allows storing multiple phone numbers per client
"""
from db.connection import get_db_connection
import json
from utils.logger import log_info, log_error

def migrate():
    """Convert single phone strings to JSON arrays"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔄 Starting phone field migration to array format", "migration")
        
        # Get all clients with phone numbers
        c.execute("SELECT instagram_id, phone FROM clients WHERE phone IS NOT NULL AND phone != ''")
        clients = c.fetchall()
        
        updated_count = 0
        
        for instagram_id, phone in clients:
            # Check if already in array format
            try:
                existing = json.loads(phone)
                if isinstance(existing, list):
                    continue  # Already migrated
            except (json.JSONDecodeError, TypeError):
                pass
            
            # Convert single phone to array
            phone_array = [phone] if phone else []
            phone_json = json.dumps(phone_array)
            
            c.execute(
                "UPDATE clients SET phone = %s WHERE instagram_id = %s",
                (phone_json, instagram_id)
            )
            updated_count += 1
        
        conn.commit()
        log_info(f"✅ Migration completed: {updated_count} clients updated", "migration")
        
        return {
            'success': True,
            'updated': updated_count,
            'total': len(clients)
        }
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Migration failed: {e}", "migration", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }
    finally:
        conn.close()

if __name__ == "__main__":
    result = migrate()
    print(f"Migration result: {result}")
