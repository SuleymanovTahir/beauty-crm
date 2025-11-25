
import sys
import os
import sqlite3

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.init import init_database
from core.config import DATABASE_NAME

def verify():
    print(f"Testing init_database with DATABASE_NAME={DATABASE_NAME}")
    try:
        init_database()
        print("✅ init_database completed successfully without locking!")
    except Exception as e:
        print(f"❌ init_database failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify()
