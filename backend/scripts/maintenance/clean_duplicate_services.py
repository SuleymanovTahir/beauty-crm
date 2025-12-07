#!/usr/bin/env python3
"""
Clean up duplicate services and fix translations:
1. Find services with same price and duration
2. Keep the one with Russian name, delete English-only duplicates
3. Ensure all kept services have proper name_ru and name_en
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

def clean_duplicates():
    """Remove duplicate services"""
    
    print("🧹 Cleaning duplicate services...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find all groups of duplicates (same price + duration)
        cursor.execute("""
            SELECT price, duration, ARRAY_AGG(id ORDER BY 
                CASE 
                    WHEN name_ru IS NOT NULL AND name_ru != '' THEN 1
                    WHEN name IS NOT NULL AND name != '' THEN 2
                    ELSE 3
                END,
                id
            ) as ids
            FROM services
            WHERE price IS NOT NULL AND duration IS NOT NULL
            GROUP BY price, duration
            HAVING COUNT(*) > 1
        """)
        
        duplicate_groups = cursor.fetchall()
        print(f"\n📋 Found {len(duplicate_groups)} groups of duplicates")
        
        total_deleted = 0
        
        for price, duration, ids in duplicate_groups:
            # Keep first ID (the one with Russian name), delete the rest
            keep_id = ids[0]
            delete_ids = ids[1:]
            
            # Get info about kept service
            cursor.execute("SELECT name, name_ru, name_en FROM services WHERE id = %s", (keep_id,))
            keep_info = cursor.fetchone()
            
            print(f"\n💰 {price} AED, {duration}:")
            print(f"   ✅ Keeping ID {keep_id}: {keep_info[1] or keep_info[0] or keep_info[2]}")
            
            # Get info about deleted services to merge data
            for del_id in delete_ids:
                cursor.execute("SELECT name, name_ru, name_en FROM services WHERE id = %s", (del_id,))
                del_info = cursor.fetchone()
                print(f"   ❌ Deleting ID {del_id}: {del_info[1] or del_info[0] or del_info[2]}")
                
                # If kept service doesn't have English name but deleted one does, copy it
                if (not keep_info[2] or keep_info[2] == '') and del_info[2]:
                    cursor.execute("UPDATE services SET name_en = %s WHERE id = %s", (del_info[2], keep_id))
                    print(f"      → Copied English name: {del_info[2]}")
                
                # Delete the duplicate
                cursor.execute("DELETE FROM services WHERE id = %s", (del_id,))
                total_deleted += 1
        
        conn.commit()
        print(f"\n✅ Deleted {total_deleted} duplicate services!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clean_duplicates()
