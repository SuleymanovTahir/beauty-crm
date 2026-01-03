from db.init import init_database
import os
import sys

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🔧 Running database initialization to create new tables...")
    init_database()
    print("✅ Database tables initialized.")
