"""
Consolidated Bot Settings Schema Migration
All schema changes for bot_settings table in one place
"""
from db.connection import get_db_connection

def migrate_bot_schema(db_path="salon_bot.db"):
    """
    Apply all bot_settings table schema changes
    """
    print("\n" + "="*60)
    print("🔧 BOT SETTINGS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'bot_settings\'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'bot_mode': "TEXT DEFAULT \'sales\'",
            'temperature': 'REAL DEFAULT 0.7',
            'max_message_length': 'INTEGER DEFAULT 4',
            'voice_message_response': 'TEXT',
            'contextual_rules': 'TEXT',
            'auto_cancel_discounts': 'TEXT',
            'comment_reply_settings': "TEXT DEFAULT \'{}\'",
            'manager_consultation_enabled': 'BOOLEAN DEFAULT TRUE',
            'manager_consultation_prompt': 'TEXT',
            'booking_data_collection': 'TEXT',
            'booking_time_logic': 'TEXT',
            'pre_booking_data_collection': 'TEXT',
            'response_style': "TEXT DEFAULT 'adaptive'",
            # Abandoned Booking Settings
            'abandoned_cart_enabled': 'BOOLEAN DEFAULT TRUE',
            'abandoned_cart_delay': 'INTEGER DEFAULT 30',  # minutes
            'abandoned_cart_message': 'TEXT',
            # Feedback Settings
            'post_visit_feedback_enabled': 'BOOLEAN DEFAULT TRUE',
            'post_visit_delay': 'INTEGER DEFAULT 24',      # hours
            'post_visit_feedback_message': 'TEXT',
            # Return Client (Retention) Settings
            'return_client_reminder_enabled': 'BOOLEAN DEFAULT FALSE',
            'return_client_delay': 'INTEGER DEFAULT 45',   # days
            'return_client_message': 'TEXT',
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
