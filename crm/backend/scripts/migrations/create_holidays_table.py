
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.holidays import create_holidays_table

if __name__ == "__main__":
    print("Creating salon_holidays table...")
    create_holidays_table()
    print("Done!")
