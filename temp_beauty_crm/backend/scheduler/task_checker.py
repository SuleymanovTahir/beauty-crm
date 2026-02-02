import asyncio
from datetime import datetime, timedelta
from db.connection import get_db_connection
from api.notifications import create_notification
from utils.logger import log_info, log_error

async def check_tasks_due():
    """Check for tasks due today or tomorrow"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Check if required tables exist
        c.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'workflow_stages'
            )
        """)
        has_workflow_stages = c.fetchone()[0]

        c.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'unified_communication_log'
            )
        """)
        has_unified_log = c.fetchone()[0]

        now = datetime.now()
        tomorrow = now + timedelta(days=1)

        # Get tasks due today or tomorrow that are not done
        if has_workflow_stages:
            c.execute("""
                SELECT t.id, t.title, t.due_date, t.assignee_id, u.full_name
                FROM tasks t
                JOIN workflow_stages s ON t.stage_id = s.id
                JOIN users u ON t.assignee_id = u.id
                WHERE s.name != 'done'
                  AND s.entity_type = 'task'
                  AND t.due_date IS NOT NULL
                  AND t.due_date <= %s
                  AND t.due_date >= %s
            """, (tomorrow, now - timedelta(hours=24)))
        else:
            # Fallback: get tasks without stage filtering
            c.execute("""
                SELECT t.id, t.title, t.due_date, t.assignee_id, u.full_name
                FROM tasks t
                JOIN users u ON t.assignee_id = u.id
                WHERE t.due_date IS NOT NULL
                  AND t.due_date <= %s
                  AND t.due_date >= %s
            """, (tomorrow, now - timedelta(hours=24)))

        tasks = c.fetchall()

        for task in tasks:
            task_id, title, due_date, assignee_id, assignee_name = task

            # Ensure due_date is datetime
            if isinstance(due_date, str):
                try:
                    due_date = datetime.fromisoformat(due_date)
                except ValueError:
                    log_error(f"Invalid date format for task {task_id}: {due_date}", "task_checker")
                    continue

            # Check if notification already sent recently (e.g. today)
            action_url = f"/crm/tasks?task_id={task_id}"

            # Simple check: have we sent a notification for this task ID today?
            already_notified = False
            if has_unified_log:
                c.execute("""
                    SELECT id FROM unified_communication_log
                    WHERE user_id = %s
                      AND action_url = %s
                      AND medium = 'in_app'
                      AND created_at::date = CURRENT_DATE
                """, (assignee_id, action_url))
                already_notified = c.fetchone() is not None

            if already_notified:
                continue

            # Create notification
            message = f"Задача '{title}' должна быть выполнена до {due_date.strftime('%d.%m %H:%M')}"
            create_notification(
                user_id=assignee_id,
                title="⏰ Напоминание о задаче",
                message=message,
                notification_type="task",
                action_url=action_url
            )
            log_info(f"Task reminder sent for task {task_id} to user {assignee_id}", "task_checker")

    except Exception as e:
        log_error(f"Error checking tasks: {e}", "task_checker")
    finally:
        conn.close()

async def check_client_reminders():
    """Check for client reminders due soon"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Check if unified_communication_log table exists
        c.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'unified_communication_log'
            )
        """)
        has_unified_log = c.fetchone()[0]

        now = datetime.now()

        c.execute("""
            SELECT instagram_id, name, reminder_date
            FROM clients
            WHERE reminder_date IS NOT NULL
              AND reminder_date <= %s
              AND reminder_date > %s
        """, (now + timedelta(minutes=15), now - timedelta(hours=24)))

        clients = c.fetchall()

        c.execute("SELECT id FROM users WHERE role IN ('admin', 'manager')")
        managers = [m[0] for m in c.fetchall()]

        for client in clients:
            client_id, name, reminder_date = client
            if isinstance(reminder_date, str):
                try: reminder_date = datetime.fromisoformat(reminder_date)
                except: continue

            action_url = f"/crm/funnel?client_id={client_id}"

            # Check if any manager was notified today for this client
            already_notified = False
            if has_unified_log:
                c.execute("""
                    SELECT id FROM unified_communication_log
                    WHERE action_url = %s
                      AND medium = 'in_app'
                      AND created_at::date = CURRENT_DATE
                    LIMIT 1
                """, (action_url,))
                already_notified = c.fetchone() is not None

            if already_notified:
                continue

            # Notify all managers
            for manager_id in managers:
                create_notification(
                    user_id=manager_id,
                    title="🔔 Напоминание о клиенте",
                    message=f"Клиент {name or client_id} требует внимания ({reminder_date.strftime('%d.%m %H:%M')})",
                    notification_type="reminder",
                    action_url=action_url
                )

            log_info(f"Client reminder sent for {client_id}", "task_checker")

    except Exception as e:
        log_error(f"Error checking client reminders: {e}", "task_checker")
    finally:
        conn.close()

async def task_checker_loop():
    """Main loop for task/reminder checks"""
    log_info("⏰ Task & Reminder checker started", "task_checker")
    while True:
        try:
            await check_tasks_due()
            await check_client_reminders()
            await asyncio.sleep(300) # Check every 5 minutes
        except Exception as e:
            log_error(f"Error in task_checker_loop: {e}", "task_checker")
            await asyncio.sleep(60)

def start_task_checker():
    asyncio.create_task(task_checker_loop())
