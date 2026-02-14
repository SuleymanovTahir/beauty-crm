#!/usr/bin/env python3
"""
Скрипт для очистки дубликатов в visitor_tracking
Удаляет повторные записи от одного IP в пределах 10-секундных окон
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.connection import get_db_connection

def clean_visitor_duplicates():
    """Remove duplicate visitor tracking records"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        print("🔍 Analyzing visitor_tracking duplicates...")
        
        # Get total count before
        c.execute('SELECT COUNT(*) FROM visitor_tracking')
        total_before = c.fetchone()[0]
        print(f"📊 Total records before: {total_before}")
        
        # Delete duplicates - keep only the first record per IP per 10-second window
        # Using ROW_NUMBER() to identify duplicates within time windows
        c.execute('''
            WITH ranked_visits AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY ip_address, 
                                        DATE_TRUNC('minute', visited_at),
                                        FLOOR(EXTRACT(SECOND FROM visited_at) / 10)
                           ORDER BY visited_at ASC
                       ) as rn
                FROM visitor_tracking
            )
            DELETE FROM visitor_tracking
            WHERE id IN (
                SELECT id FROM ranked_visits WHERE rn > 1
            )
        ''')
        
        deleted = c.rowcount
        conn.commit()
        
        # Get total count after
        c.execute('SELECT COUNT(*) FROM visitor_tracking')
        total_after = c.fetchone()[0]
        
        print(f"📊 Total records after: {total_after}")
        print(f"✅ Deleted {deleted} duplicate records")
        
        # Show sample of remaining records
        c.execute('''
            SELECT ip_address, city, country, visited_at 
            FROM visitor_tracking 
            ORDER BY visited_at DESC 
            LIMIT 10
        ''')
        
        print(f"\n📋 Sample of remaining records (last 10):")
        for row in c.fetchall():
            ip = row[0] or 'N/A'
            city = row[1] or 'N/A'
            country = row[2] or 'N/A'
            visited = row[3]
            print(f"  {ip:15} {city:15} {country:15} {visited}")
        
        print("\n✅ Cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    clean_visitor_duplicates()
