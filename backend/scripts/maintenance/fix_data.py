from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run_all_fixes():
    """Entry point for centralized maintenance runner"""
    return run_fix()

def run_fix():
    print("🚀 Running system data maintenance...")
    
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Deduplicate Achievement Templates
        log_info("🧹 Cleaning up duplicate achievements...", "maintenance")
        c.execute("""
            DELETE FROM client_achievements 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM client_achievements 
                WHERE client_id = 'template'
                GROUP BY achievement_type, COALESCE(title_ru, '')
            ) AND client_id = 'template';
        """)
        log_info(f"✅ Removed {c.rowcount} redundant templates", "maintenance")

        # 2. Staff Schedule Generation
        log_info("📅 Verifying staff schedules...", "maintenance")
        c.execute("SELECT id, full_name FROM users WHERE role IN ('master', 'employee', 'director', 'admin') AND is_active = TRUE")
        users = c.fetchall()
        
        gen_count = 0
        for user in users:
            uid = user[0]
            for day in range(7):
                c.execute("SELECT id FROM user_schedule WHERE user_id = %s AND day_of_week = %s", (uid, day))
                if not c.fetchone():
                    c.execute("""
                        INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                        VALUES (%s, %s, '10:30', '21:00', true)
                    """, (uid, day))
                    gen_count += 1
        
        if gen_count > 0:
            log_info(f"✅ Generated {gen_count} missing shifts", "maintenance")
        else:
            log_info("🗓️ All staff schedules are complete", "maintenance")

        # 3. Schedule Uniqueness check
        c.execute("""
            DELETE FROM user_schedule 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM user_schedule 
                GROUP BY user_id, day_of_week
            );
        """)

        # 4. Sync Service Positions (Migration from position_id to service_positions)
        log_info("🔗 Syncing service positions...", "maintenance")
        c.execute("""
            INSERT INTO service_positions (service_id, position_id)
            SELECT id, position_id 
            FROM services 
            WHERE position_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)
        if c.rowcount > 0:
            log_info(f"✅ Synced {c.rowcount} primary positions to service_positions mapping", "maintenance")

        conn.commit()
        log_info("🏆 Data maintenance completed successfully!", "maintenance")
        return True

    except Exception as e:
        log_error(f"❌ Maintenance failed: {e}", "maintenance")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    run_fix()
