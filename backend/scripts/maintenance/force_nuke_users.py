import psycopg2
import os


def force_delete():
    print("🧨 STARTING FORCE DELETE")
    
    # Connect directly to bypass any pool logic
    conn = psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=os.getenv('POSTGRES_PORT', '5432'),
        database=os.getenv('POSTGRES_DB', 'beauty_crm'),
        user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
        password=os.getenv('POSTGRES_PASSWORD', '')
    )
    conn.autocommit = True # AUTOCOMMIT ON!
    
    c = conn.cursor()
    
    # Target users to delete
    targets = [
        'admin1', 'manager1', 'sales1', 'master1', 
        'admin2', 'director1', 'manager2', 'sales2', 'sales3', 'marketer1',
        'master2', 'master3', 'master4', 'master5', 'Akbota'
    ]
    
    for username in targets:
        print(f"Checking {username}...")
        c.execute("SELECT id FROM users WHERE username = %s", (username,))
        row = c.fetchone()
        
        if row:
            user_id = row[0]
            print(f"  Found ID: {user_id}. Nuking dependencies...")
            
            # Nuke dependencies
            tables_user_id = [
                'user_services', 'user_schedule', 'schedule_breaks', 
                'user_permissions', 'user_subscriptions', 'notification_settings',
                'sessions', 'activity_log', 'user_time_off'
            ]
            for t in tables_user_id:
                try:
                    c.execute(f"DELETE FROM {t} WHERE user_id = %s", (user_id,))
                except Exception as e:
                    print(f"    Error cleaning {t}: {e}")

            try:
                c.execute("DELETE FROM payroll_payments WHERE employee_id = %s", (user_id,))
            except: pass

            try:
                 c.execute("DELETE FROM internal_chat WHERE sender_id = %s OR receiver_id = %s", (user_id, user_id))
            except: pass

            try:
                c.execute("DELETE FROM director_approvals WHERE requested_by = %s OR approved_by = %s", (user_id, user_id))
            except: pass

            # created_by references
            tables_ref = [
                'invoices', 'contracts', 'client_notes', 'custom_statuses', 
                'custom_roles', 'invoice_payments', 'plans'
            ]
            for t in tables_ref:
                try:
                    c.execute(f"UPDATE {t} SET created_by = NULL WHERE created_by = %s", (user_id,))
                except: pass

            # Finally delete user
            try:
                c.execute("DELETE FROM users WHERE id = %s", (user_id,))
                print(f"  🔥 DELETED {username}")
            except Exception as e:
                print(f"  ❌ FAILED to delete {username}: {e}")
        else:
             print(f"  🤷 {username} not found")

    conn.close()
    print("🏁 Done.")

if __name__ == "__main__":
    force_delete()
