"""
Consolidated Users Schema Migration
All schema changes for users table in one place
"""
from db.connection import get_db_connection
from datetime import datetime


def migrate_users_schema(db_path="salon_bot.db"):
    """
    Apply all users table schema changes
    """
    print("\n" + "="*60)
    print("🔧 USERS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'users\'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'birthday': 'TEXT',
            'phone': 'TEXT',
            'email_verification_token': 'TEXT',
            'email_verified': 'BOOLEAN DEFAULT FALSE',
            'language': "TEXT DEFAULT \'ru\'",
            'notification_preferences': 'TEXT',
            'password_reset_token': 'TEXT',
            'password_reset_expires': 'TEXT',
            'subscription_plan': 'TEXT',
            'subscription_status': 'TEXT',
            'subscription_channels': 'TEXT',
            'telegram_chat_id': 'TEXT',
            'telegram_username': 'TEXT',
            'photo': 'TEXT',
            'photo_url': 'TEXT',
            'position': 'TEXT',
            'bio': 'TEXT',
            'experience': 'TEXT',
            'specialization': 'TEXT',
            'years_of_experience': 'INTEGER',
            'certificates': 'TEXT',
            'is_service_provider': 'BOOLEAN DEFAULT FALSE',
            'gender': 'TEXT',
            # Translations
            'position_ru': 'TEXT', 'position_en': 'TEXT', 'position_ar': 'TEXT',
            'position_es': 'TEXT', 'position_de': 'TEXT', 'position_fr': 'TEXT',
            'position_hi': 'TEXT', 'position_kk': 'TEXT', 'position_pt': 'TEXT',
            
            'bio_ru': 'TEXT', 'bio_en': 'TEXT', 'bio_ar': 'TEXT',
            'bio_es': 'TEXT', 'bio_de': 'TEXT', 'bio_fr': 'TEXT',
            'bio_hi': 'TEXT', 'bio_kk': 'TEXT', 'bio_pt': 'TEXT',
            
            'full_name_ru': 'TEXT', 'full_name_en': 'TEXT', 'full_name_ar': 'TEXT',
            'full_name_es': 'TEXT', 'full_name_de': 'TEXT', 'full_name_fr': 'TEXT',
            'full_name_hi': 'TEXT', 'full_name_kk': 'TEXT', 'full_name_pt': 'TEXT',
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to users table")
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
    migrate_users_schema()
