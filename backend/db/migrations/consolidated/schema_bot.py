"""
Consolidated Bot Settings Schema Migration
All schema changes for bot_settings table in one place
"""
import sqlite3


def migrate_bot_schema(db_path="salon_bot.db"):
    """
    Apply all bot_settings table schema changes
    """
    print("\n" + "="*60)
    print("🔧 BOT SETTINGS SCHEMA MIGRATION")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("PRAGMA table_info(bot_settings)")
        existing_columns = {col[1] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'bot_mode': 'TEXT DEFAULT "sales"',
            'temperature': 'REAL DEFAULT 0.7',
            'max_message_length': 'INTEGER DEFAULT 4',
            'voice_message_response': 'TEXT',
            'contextual_rules': 'TEXT',
            'auto_cancel_discounts': 'TEXT',
            'comment_reply_settings': 'TEXT DEFAULT "{}"',
            'manager_consultation_enabled': 'INTEGER DEFAULT 1',
            'manager_consultation_prompt': 'TEXT',
            'booking_data_collection': 'TEXT',
            'booking_time_logic': 'TEXT',
            'pre_booking_data_collection': 'TEXT',
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE bot_settings ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to bot_settings table")
        else:
            print("\n✅ All columns already exist")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_bot_schema()
