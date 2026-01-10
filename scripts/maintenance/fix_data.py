
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

def reduce_service_prices(reduction_percent=5):
    """Slightly reduce service prices"""
    print(f"🔧 Starting service price reduction ({reduction_percent}%)...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Update prices: price = price * (1 - reduction/100)
        # We also need to update min_price and max_price if they exist
        c.execute("""
            UPDATE services 
            SET 
                price = ROUND(CAST(price * %s AS NUMERIC), 0),
                min_price = CASE WHEN min_price IS NOT NULL THEN ROUND(CAST(min_price * %s AS NUMERIC), 0) ELSE min_price END,
                max_price = CASE WHEN max_price IS NOT NULL THEN ROUND(CAST(max_price * %s AS NUMERIC), 0) ELSE max_price END
            WHERE price > 0
        """, (1 - reduction_percent/100.0, 1 - reduction_percent/100.0, 1 - reduction_percent/100.0))
        
        count = c.rowcount
        conn.commit()
        print(f"✅ Successfully reduced prices for {count} services by {reduction_percent}%.")
        
    except Exception as e:
        print(f"❌ Error reducing service prices: {e}")
        conn.rollback()
    finally:
        conn.close()

def fix_user_position_ids():
    """Link users to positions by name where position_id is missing"""
    print("🔧 Starting user position_id fix...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Get all positions
        c.execute("SELECT id, name FROM positions")
        positions = {row[1]: row[0] for row in c.fetchall()}
        
        # 2. Get all users with text positions but no position_id
        c.execute("SELECT id, position FROM users WHERE position IS NOT NULL AND position_id IS NULL")
        users = c.fetchall()
        
        if not users:
            print("✅ All users already have a position_id linked.")
            return

        updated = 0
        for uid, pos_name in users:
            if pos_name in positions:
                c.execute("UPDATE users SET position_id = %s WHERE id = %s", (positions[pos_name], uid))
                updated += 1
            elif pos_name == "Hair Stylist": # Special case
                 if "Парикмахер" in positions:
                     c.execute("UPDATE users SET position_id = %s WHERE id = %s", (positions["Парикмахер"], uid))
                     updated += 1
            elif "Director" in pos_name:
                 if "Директор" in positions:
                     c.execute("UPDATE users SET position_id = %s WHERE id = %s", (positions["Директор"], uid))
                     updated += 1

        conn.commit()
        print(f"✅ Successfully linked {updated} users to positions.")
        
    except Exception as e:
        print(f"❌ Error fixing user positions: {e}")
        conn.rollback()
    finally:
        conn.close()

def run_all_fixes():
    fix_pipeline_stages()
    reduce_service_prices()
    fix_user_position_ids()

if __name__ == "__main__":
    run_all_fixes()
