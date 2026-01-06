
import sys
import os

# Add project root/backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'backend'))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def fix_pipeline_stages():
    """Assign default pipeline stage to clients who don't have one"""
    print("🔧 Starting pipeline stage fix...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Get default stage
        c.execute("SELECT id, name FROM pipeline_stages WHERE key = 'new' OR order_index = 0 ORDER BY order_index ASC LIMIT 1")
        stage = c.fetchone()
        
        if not stage:
            print("❌ No default stage found! Cannot fix.")
            return

        stage_id, stage_name = stage
        print(f"ℹ️ Default stage: {stage_name} (ID: {stage_id})")
        
        # 2. Find clients with NULL stage
        c.execute("SELECT COUNT(*) FROM clients WHERE pipeline_stage_id IS NULL")
        count = c.fetchone()[0]
        
        if count == 0:
            print("✅ All clients already have a pipeline stage.")
            return

        print(f"⚠️ Found {count} clients without a stage.")
        
        # 3. Update clients
        c.execute("UPDATE clients SET pipeline_stage_id = %s WHERE pipeline_stage_id IS NULL", (stage_id,))
        conn.commit()
        
        print(f"✅ Successfully updated {count} clients to stage '{stage_name}'.")
        
    except Exception as e:
        print(f"❌ Error fixing pipeline stages: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_pipeline_stages()
