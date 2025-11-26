#!/usr/bin/env python3
"""
Migration: Add gender column to users and clients tables
"""
import sqlite3
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.config import DATABASE_NAME

def add_gender_column():
    """Add gender column to users and clients tables with default 'female'"""
    print("="*60)
    print("🔄 MIGRATION: Adding gender column")
    print("="*60)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Check if column already exists in users table
        c.execute("PRAGMA table_info(users)")
        users_columns = [col[1] for col in c.fetchall()]
        
        if 'gender' not in users_columns:
            print("\n1️⃣ Adding gender column to users table...")
            c.execute("""
                ALTER TABLE users 
                ADD COLUMN gender TEXT DEFAULT 'female'
            """)
            print("   ✅ Gender column added to users")
        else:
            print("\n1️⃣ Gender column already exists in users table")
        
        # Check if column already exists in clients table
        c.execute("PRAGMA table_info(clients)")
        clients_columns = [col[1] for col in c.fetchall()]
        
        if 'gender' not in clients_columns:
            print("\n2️⃣ Adding gender column to clients table...")
            c.execute("""
                ALTER TABLE clients 
                ADD COLUMN gender TEXT DEFAULT 'female'
            """)
            print("   ✅ Gender column added to clients")
        else:
            print("\n2️⃣ Gender column already exists in clients table")
        
        conn.commit()
        
        # Verify the changes
        print("\n3️⃣ Verifying changes...")
        c.execute("PRAGMA table_info(users)")
        users_cols = [col[1] for col in c.fetchall()]
        print(f"   Users table columns: {', '.join(users_cols[-5:])}")
        
        c.execute("PRAGMA table_info(clients)")
        clients_cols = [col[1] for col in c.fetchall()]
        print(f"   Clients table columns: {', '.join(clients_cols[-5:])}")
        
        print("\n" + "="*60)
        print("✅ Migration completed successfully!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_gender_column()
