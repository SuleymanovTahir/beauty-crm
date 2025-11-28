import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from db import init_database
    print("Import successful")
    init_database()
    print("Database initialization successful")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
