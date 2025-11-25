import sqlite3
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from db.connection import get_db_connection
from core.config import DATABASE_NAME

def verify():
    print("🔍 Verifying Database Fixes...")
    
    # 1. Check Foreign Keys
    conn = get_db_connection()
    cursor = conn.execute("PRAGMA foreign_keys")
    fk_status = cursor.fetchone()[0]
    print(f"Foreign Keys Status: {'✅ ON' if fk_status == 1 else '❌ OFF'}")
    
    if fk_status != 1:
        print("❌ Error: Foreign keys should be enabled by get_db_connection()")
        return False

    # 2. Check employee_schedule schema
    cursor = conn.execute("PRAGMA table_info(employee_schedule)")
    columns = {row[1]: row for row in cursor.fetchall()}
    
    start_time_col = columns.get('start_time')
    end_time_col = columns.get('end_time')
    
    # row format: (cid, name, type, notnull, dflt_value, pk)
    # notnull is index 3. 0 means nullable, 1 means NOT NULL
    
    if start_time_col[3] == 0:
        print("✅ employee_schedule.start_time is NULLABLE")
    else:
        print("❌ employee_schedule.start_time is NOT NULL")
        
    if end_time_col[3] == 0:
        print("✅ employee_schedule.end_time is NULLABLE")
    else:
        print("❌ employee_schedule.end_time is NOT NULL")

    # 3. Try to insert a record with NULL times (simulating a day off)
    try:
        # Ensure we have a test employee
        cursor.execute("INSERT INTO employees (full_name) VALUES ('Test Master')")
        emp_id = cursor.lastrowid
        
        cursor.execute("""
            INSERT INTO employee_schedule (employee_id, day_of_week, start_time, end_time)
            VALUES (?, ?, NULL, NULL)
        """, (emp_id, 0))
        print("✅ Successfully inserted schedule with NULL times (Day Off)")
        
        # Cleanup
        conn.rollback() # Don't save test data
    except Exception as e:
        print(f"❌ Failed to insert schedule with NULL times: {e}")
        return False
        
    conn.close()
    return True

if __name__ == "__main__":
    verify()
