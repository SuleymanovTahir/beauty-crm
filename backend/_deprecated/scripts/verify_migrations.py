
import sys
import os

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.migrations.run_all_migrations import run_all_migrations

def verify():
    print("Testing run_all_migrations...")
    try:
        success = run_all_migrations()
        if success:
            print("✅ run_all_migrations completed successfully!")
        else:
            print("❌ run_all_migrations failed!")
    except Exception as e:
        print(f"❌ run_all_migrations raised exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify()
