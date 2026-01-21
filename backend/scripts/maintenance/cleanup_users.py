from db.connection import get_db_connection
from utils.logger import log_info

def cleanup_users():
    conn = get_db_connection()
    c = conn.cursor()

    # Users to keep (Whitelist) - ONLY Real Team
    keep_usernames = [
        'admin',      # Director (Main)
        'tursunai',   # Director (Real)
        'simo',       # Employee (Real)
        'mestan',     # Employee (Real)
        'lyazzat',    # Employee (Real)
        'gulya',      # Employee (Real)
        'jennifer',   # Employee (Real)
    ]

    print("🔍 Checking users to remove...")
    
    # Get all users
    c.execute("SELECT id, username, role, full_name FROM users")
    all_users = c.fetchall()
    
    deleted_count = 0
    for r in all_users:
        user_id = r[0]
        username = r[1]
        role = r[2]
        full_name = r[3]
        
        if username not in keep_usernames:
            print(f"❌ Deleting: {username} ({role}) - {full_name}")
            
            try:
                # 1. Delete direct dependencies
                # Standard user_id tables
                tables_user_id = [
                    'user_services', 'user_schedule', 'schedule_breaks', 
                    'user_permissions', 'user_subscriptions', 'notification_settings',
                    'sessions', 'activity_log', 'user_time_off'
                ]
                for table in tables_user_id:
                    # Check if table exists to avoid errors
                    c.execute("SELECT to_regclass(%s)", (table,))
                    if c.fetchone()[0]:
                        c.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
                
                # Special column names
                # payroll_payments uses employee_id
                c.execute("SELECT to_regclass('payroll_payments')")
                if c.fetchone()[0]:
                     c.execute("DELETE FROM payroll_payments WHERE employee_id = %s", (user_id,))

                # 2. Neutralize references (created_by)
                tables_ref = [
                    'invoices', 'contracts', 'client_notes', 'custom_statuses', 'custom_roles',
                    'invoice_payments', 'contract_delivery_log', 'invoice_delivery_log', 'plans'
                ]
                for table in tables_ref:
                    c.execute("SELECT to_regclass(%s)", (table,))
                    if c.fetchone()[0]:
                        # Check if column exists
                        c.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name=%s AND column_name='created_by'", (table,))
                        if c.fetchone():
                            c.execute(f"UPDATE {table} SET created_by = NULL WHERE created_by = %s", (user_id,))

                # 3. Specific Logic
                c.execute("SELECT to_regclass('director_approvals')")
                if c.fetchone()[0]:
                    c.execute("DELETE FROM director_approvals WHERE requested_by = %s OR approved_by = %s", (user_id, user_id))
                
                c.execute("SELECT to_regclass('internal_chat')")
                if c.fetchone()[0]:
                    c.execute("DELETE FROM internal_chat WHERE sender_id = %s OR receiver_id = %s", (user_id, user_id))

                # 4. Delete User
                c.execute("DELETE FROM users WHERE id = %s", (user_id,))
                deleted_count += 1
                
                # Commit after each user to prevent massive rollback if one fails
                conn.commit()
                
            except Exception as e:
                print(f"  ❌ FAILED to delete user {username}: {e}")
                conn.rollback() # Rollback only this user's transaction attempt
                
        else:
            print(f"✅ Keeping: {username} ({role})")
            
    conn.close()
    print(f"\n🗑️ Total deleted: {deleted_count}")

if __name__ == "__main__":
    cleanup_users()
