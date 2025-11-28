import os
import shutil
import sqlite3
import sys
from pathlib import Path
import uuid

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import DATABASE_NAME

SOURCE_DIR = "/Users/tahir/Desktop/beauty-crm/frontend/public_landing/styles/M le Diamant  портфолио/Сотрудники"
TARGET_DIR = "static/uploads/images"
ABS_TARGET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), TARGET_DIR)

def setup_directories():
    if not os.path.exists(ABS_TARGET_DIR):
        os.makedirs(ABS_TARGET_DIR)
        print(f"Created directory: {ABS_TARGET_DIR}")

def get_employees(cursor):
    cursor.execute("SELECT id, full_name, username FROM users WHERE is_service_provider = 1")
    return cursor.fetchall()

def normalize_name(name):
    return name.lower().strip().replace(" ", "")

def import_photos():
    print(f"Source Directory: {SOURCE_DIR}")
    print(f"Target Directory: {ABS_TARGET_DIR}")
    
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory not found: {SOURCE_DIR}")
        return

    setup_directories()

    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    employees = get_employees(cursor)
    print(f"Found {len(employees)} employees in database.")

    files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Found {len(files)} images in source directory.")

    updated_count = 0
    
    # Manual mapping for known cases
    name_mapping = {
        "дженнифер": "jennifer",
        "ляззат": "lyazzat",
        "местан": "mestan",
        "симо": "simo",
        "simo": "simo",
        "гуля": "gulya"
    }

    for filename in files:
        name_part = os.path.splitext(filename)[0]
        normalized_filename = normalize_name(name_part)
        
        # Check mapping first
        mapped_name = name_mapping.get(normalized_filename)
        if mapped_name:
            normalized_filename = mapped_name
        
        matched_employee = None
        
        # Try to find a match
        for emp_id, full_name, username in employees:
            db_name = normalize_name(full_name)
            
            # Check full name
            if db_name in normalized_filename or normalized_filename in db_name:
                matched_employee = (emp_id, full_name)
                break
            
            # Check first name (simple split)
            first_name = full_name.split()[0]
            if normalize_name(first_name) == normalized_filename:
                matched_employee = (emp_id, full_name)
                break

        if matched_employee:
            emp_id, emp_name = matched_employee
            print(f"✅ Match found: '{filename}' -> {emp_name} (ID: {emp_id})")
            
            # Generate new filename
            ext = os.path.splitext(filename)[1].lower()
            new_filename = f"{uuid.uuid4()}{ext}"
            target_path = os.path.join(ABS_TARGET_DIR, new_filename)
            source_path = os.path.join(SOURCE_DIR, filename)
            
            # Copy file
            shutil.copy2(source_path, target_path)
            
            # Update DB
            db_path = f"/{TARGET_DIR}/{new_filename}"
            cursor.execute("UPDATE users SET photo = ? WHERE id = ?", (db_path, emp_id))
            updated_count += 1
        else:
            print(f"⚠️  No match for: '{filename}'")

    conn.commit()
    conn.close()
    print(f"\nImport completed. Updated {updated_count} employees.")

if __name__ == "__main__":
    import_photos()
