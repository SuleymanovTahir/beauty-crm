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
        # Get tasks due today or tomorrow that are not done
        # key != 'done' depends on implementation of statuses.
        # Assuming 'done' key exists.
        
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        
        c.execute("""
            SELECT t.id, t.title, t.due_date, t.assignee_id, u.full_name
            FROM tasks t
            JOIN task_stages s ON t.stage_id = s.id
            JOIN users u ON t.assignee_id = u.id
            WHERE s.key != 'done' 
              AND t.due_date IS NOT NULL
              AND t.due_date <= %s
              AND t.due_date >= %s
        """, (tomorrow, now - timedelta(hours=24))) 
        # Check last 24h to future 24h. Adjust as needed.
        
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
            today_str = now.strftime('%Y-%m-%d')
            
            # Simple check: have we sent a notification for this task ID today?
            # We can use filtering by title or action_url.
            c.execute("""
                SELECT id FROM notifications 
                WHERE user_id = %s 
                  AND action_url = %s
                  AND created_at::date = CURRENT_DATE
            """, (str(assignee_id), action_url))
            
            if c.fetchone():
                continue
                
            # Create notification
            message = f"Задача '{title}' должна быть выполнена до {due_date.strftime('%d.%m %H:%M')}"
            create_notification(
                user_id=str(assignee_id),
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
        now = datetime.now()
        # Look for reminders due in the next hour or passed recently
        # We want to notify exactly when due or slightly before.
        
        c.execute("""
            SELECT instagram_id, name, reminder_date 
            FROM clients 
            WHERE reminder_date IS NOT NULL 
              AND reminder_date <= %s
              AND reminder_date > %s
        """, (now + timedelta(minutes=15), now - timedelta(hours=24)))
        
        clients = c.fetchall()
        
        # Get all admins/managers to notify
        c.execute("SELECT id FROM users WHERE role IN ('admin', 'manager')")
        managers = c.fetchall()
        
        for client in clients:
            client_id, name, reminder_date = client
            
            if isinstance(reminder_date, str):
                try:
                    reminder_date = datetime.fromisoformat(reminder_date)
                except ValueError:
                    log_error(f"Invalid date format for client {client_id}: {reminder_date}", "task_checker")
                    continue
            
            action_url = f"/crm/funnel?client_id={client_id}"
            
            # Check if notified check via a generic way involves checking notifications for any manager
            notified = False
            for manager in managers:
                manager_id = manager[0]
                c.execute("""
                    SELECT id FROM notifications 
                    WHERE user_id = %s 
                      AND action_url = %s
                      AND created_at::date = CURRENT_DATE
                """, (str(manager_id), action_url))
                if c.fetchone():
                    notified = True
                    break
            
            if notified:
                continue
                
            # Notify all managers
            for manager in managers:
                manager_id = manager[0]
                create_notification(
                    user_id=str(manager_id),
                    title="🔔 Напоминание о клиенте",
                    message=f"Клиент {name or client_id} требует внимания (Дата: {reminder_date.strftime('%d.%m %H:%M')})",
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
