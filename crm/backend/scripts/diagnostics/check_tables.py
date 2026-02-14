
import sys
import os
# from tabulate import tabulate

# Add backend to path
sys.path.insert(0, os.getcwd())

try:
    from db.connection import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get all tables in public schema
    c.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    existing_tables = [row[0] for row in c.fetchall()]
    
    print(f"DEBUG: Found {len(existing_tables)} tables in DB.")
    
    # List of tables we EXPECT to be created by run_all_migrations based on code analysis
    # This list is manual validation of what run_all_migrations.py triggers.
    
    # From init.py:
    expected_from_init = {
        'clients', 'bot_settings', 'salon_settings', 'chat_history', 'bookings',
        'booking_reminder_settings', 'booking_reminders_sent', 'booking_temp',
        'client_interactions', 'bot_analytics', 'client_referrals', 'conversations',
        'positions', 'users', 'sessions', 'activity_log', 'custom_statuses',
        'services', 'user_services', 'service_positions', 'notification_settings',
        'payroll_payments', 'notifications', 'user_schedule', 'user_permissions',
        'user_time_off', 'salon_holidays', 'loyalty_levels'
    }
    
    # From consolidated migrations:
    # We will assume each schema file creates specific tables.
    # Note: Many consolidated migrations might just ALTER existing tables (like users, bookings).
    # We need to list tables that are PURELY from migrations if they are not in init.py
    
    # schema_newsletter.py
    # create_newsletter_table -> 'newsletter_subscribers', 'newsletter_campaigns'?
    # schema_cookies.py -> 'cookie_consents'
    # schema_tasks_and_pipelines -> 'task_pipelines', 'tasks', 'task_comments'?
    # schema_task_stages -> 'task_stages'
    # schema_currencies -> 'currencies'?
    # schema_challenges -> 'challenges', 'user_challenges'
    # schema_gallery -> 'gallery_images', 'gallery_albums'?
    # schema_public -> 'public_banners', 'public_reviews', 'public_faq'
    # schema_contracts -> 'contracts', 'contract_templates'
    # schema_products -> 'products', 'inventory_transactions'
    # schema_invoices -> 'invoices', 'invoice_items'
    # schema_telephony -> 'call_logs'
    # schema_funnel_checkpoints -> 'funnel_checkpoints'
    # create_audit_log -> 'audit_log' (already in init?), 'critical_actions'
    # add_soft_delete -> 'deleted_items'
    
    # Let's verify by just listing what we have vs what we think we have.
    
    print("\n--- EXISTING TABLES IN DATABASE ---")
    for t in existing_tables:
        print(f"- {t}")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
