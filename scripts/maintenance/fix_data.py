
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
        # 1. Get default stage from workflow_stages
        c.execute("SELECT id, name FROM workflow_stages WHERE entity_type = 'pipeline' AND (LOWER(name) = 'новый' OR LOWER(name) = 'new' OR sort_order = 0) ORDER BY sort_order ASC LIMIT 1")
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

def deduplicate_workflow_stages():
    """Remove duplicate stages and migrate data (clients, tasks) to standard stages"""
    print("🔧 Starting workflow stage deduplication...")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Map for Pipeline stages (Bad Name -> Good Key-like Name)
        pipeline_mapping = {
            'новое': 'new',
            'переговоры': 'negotiation',
            'отправленное_предложение': 'sent_offer',
            'закрыто_выиграно': 'closed_won',
            'закрыто_проиграно': 'closed_lost'
        }
        
        # 2. Map for Task stages
        task_mapping = {
            'все': 'todo',
            'готово': 'done'
        }

        # 3. Map for Invoice stages
        invoice_mapping = {
            'черновик': 'draft',
            'отправлено': 'sent',
            'оплачено': 'paid',
            'отменено': 'cancelled'
        }
        
        def migrate_and_delete(mapping, entity_type, table_name=None, column_name=None):
            for old_name, new_name in mapping.items():
                # Find the 'Good' stage ID
                c.execute("SELECT id FROM workflow_stages WHERE entity_type = %s AND LOWER(name) = %s", (entity_type, new_name))
                good_stage = c.fetchone()
                
                # Find the 'Bad' stage IDs
                c.execute("SELECT id FROM workflow_stages WHERE entity_type = %s AND LOWER(name) = %s", (entity_type, old_name))
                bad_stages = c.fetchall()
                
                if good_stage and bad_stages:
                    good_id = good_stage[0]
                    for (bad_id,) in bad_stages:
                        if bad_id == good_id: continue
                        
                        # Migrate data if table info is provided
                        if table_name and column_name:
                            c.execute(f"UPDATE {table_name} SET {column_name} = %s WHERE {column_name} = %s", (good_id, bad_id))
                            migrated_count = c.rowcount
                            print(f"✅ Merged stage '{old_name}' (ID: {bad_id}) into '{new_name}' (ID: {good_id}). Migrated {migrated_count} items in {table_name}.")
                        else:
                            print(f"✅ Merged stage '{old_name}' (ID: {bad_id}) into '{new_name}' (ID: {good_id}).")
                        
                        # Delete bad stage
                        c.execute("DELETE FROM workflow_stages WHERE id = %s", (bad_id,))
                elif bad_stages and not good_stage:
                    # If good stage doesn't exist, rename the bad one to the good name
                    bad_id = bad_stages[0][0]
                    c.execute("UPDATE workflow_stages SET name = %s WHERE id = %s", (new_name, bad_id))
                    print(f"📝 Renamed stage '{old_name}' to '{new_name}'.")

        # Process Pipeline
        migrate_and_delete(pipeline_mapping, 'pipeline', 'clients', 'pipeline_stage_id')
        
        # Process Tasks
        migrate_and_delete(task_mapping, 'task', 'tasks', 'stage_id')

        # Process Invoices
        migrate_and_delete(invoice_mapping, 'invoice', 'invoices', 'stage_id')
        
        # Ensure 'in_progress' exists for tasks
        c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'task' AND LOWER(name) IN ('in_progress', 'в работе')")
        if not c.fetchone():
            c.execute("INSERT INTO workflow_stages (entity_type, name, color, sort_order) VALUES ('task', 'in_progress', 'bg-blue-500', 1)")
            print("➕ Added missing 'in_progress' stage for tasks.")

        conn.commit()
        print("✅ Workflow stage deduplication completed.")
        
    except Exception as e:
        print(f"❌ Error deduplicating stages: {e}")
        conn.rollback()
    finally:
        conn.close()

def run_all_fixes():
    fix_pipeline_stages()
    reduce_service_prices()
    fix_user_position_ids()
    deduplicate_workflow_stages()

if __name__ == "__main__":
    run_all_fixes()
