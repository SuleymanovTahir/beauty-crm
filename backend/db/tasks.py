
from typing import List, Dict, Optional
from datetime import datetime
from db.connection import get_db_connection
from utils.logger import log_error, log_info

# ===== STAGES =====

def get_task_stages() -> List[Dict]:
    """Get all active task stages ordered by index from workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, name_ru, color, sort_order 
            FROM workflow_stages 
            WHERE entity_type = 'task' 
            ORDER BY sort_order ASC
        """)
        rows = c.fetchall()
        return [
            {
                "id": row[0],
                "name": row[2] or row[1],
                "key": row[1],
                "order_index": row[4],
                "color": row[3]
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting task stages: {e}", "db.tasks")
        return []
    finally:
        conn.close()

def create_task_stage(name: str, color: str = '#3b82f6') -> Optional[int]:
    """Create a new task stage in workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Get max order index
        c.execute("SELECT MAX(sort_order) FROM workflow_stages WHERE entity_type = 'task'")
        max_order = c.fetchone()[0]
        new_order = (max_order or 0) + 1
        
        c.execute("""
            INSERT INTO workflow_stages (entity_type, name, name_ru, color, sort_order)
            VALUES ('task', %s, %s, %s, %s)
            RETURNING id
        """, (name, name, color, new_order))
        stage_id = c.fetchone()[0]
        conn.commit()
        return stage_id
    except Exception as e:
        log_error(f"Error creating task stage: {e}", "db.tasks")
        conn.rollback()
        return None
    finally:
        conn.close()


def update_task_stage_order(orders: List[int]) -> bool:
    """Update order of stages in workflow_stages. orders = [id1, id2, ...]"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        for idx, stage_id in enumerate(orders):
            c.execute("UPDATE workflow_stages SET sort_order = %s WHERE id = %s", (idx, stage_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating stage order: {e}", "db.tasks")
        conn.rollback()
        return False
    finally:
        conn.close()

def update_stage_details(stage_id: int, name: str, color: str) -> bool:
    """Update stage name and color in workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE workflow_stages SET name = %s, name_ru = %s, color = %s WHERE id = %s", (name, name, color, stage_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating stage details: {e}", "db.tasks")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_task_stage(stage_id: int, fallback_stage_id: Optional[int] = None) -> bool:
    """Delete task stage and reassign tasks"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if fallback_stage_id:
            c.execute("UPDATE tasks SET stage_id = %s WHERE stage_id = %s", (fallback_stage_id, stage_id))
        
        c.execute("DELETE FROM workflow_stages WHERE id = %s", (stage_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error deleting task stage: {e}", "db.tasks")
        conn.rollback()
        return False
    finally:
        conn.close()

# ===== TASKS =====

def create_task(data: Dict) -> Optional[int]:
    """Create a new task with support for multiple assignees"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Resolve stage_id
        stage_id = data.get('stage_id')
        if not stage_id:
            # Default to first stage
            c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'task' ORDER BY sort_order ASC LIMIT 1")
            res = c.fetchone()
            stage_id = res[0] if res else None
        
        # Get assignee_ids (can be list or single ID)
        assignee_ids = data.get('assignee_ids', [])
        if not assignee_ids and data.get('assignee_id'):
            assignee_ids = [data.get('assignee_id')]
        
        # Primary assignee is first in list (for backward compatibility)
        primary_assignee = assignee_ids[0] if assignee_ids else None
        
        c.execute("""
            INSERT INTO tasks (
                title, description, stage_id, priority, due_date, 
                assignee_id, created_by, client_id, start_date
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data['title'],
            data.get('description'),
            stage_id,
            data.get('priority', 'medium'),
            data.get('due_date'),
            primary_assignee,
            data.get('created_by'),
            data.get('client_id'),
            data.get('start_date')
        ))
        task_id = c.fetchone()[0]
        
        # Insert all assignees into task_assignees table
        if assignee_ids:
            for assignee_id in assignee_ids:
                c.execute("""
                    INSERT INTO task_assignees (task_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT (task_id, user_id) DO NOTHING
                """, (task_id, assignee_id))
        
        conn.commit()
        return task_id
    except Exception as e:
        log_error(f"Error creating task: {e}", "db.tasks")
        conn.rollback()
        return None
    finally:
        conn.close()

def get_tasks(filters: Dict = None) -> List[Dict]:
    """Get tasks with filters and all assignees"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT t.id, t.title, t.description, t.stage_id, t.priority, 
                   t.due_date, t.assignee_id, t.created_by, t.client_id, 
                   t.created_at, u.full_name as assignee_name, c.name as client_name,
                   s.name as stage_name, s.color as stage_color, s.key as stage_key,
                   creator.full_name as created_by_name
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN clients c ON t.client_id = c.instagram_id
            LEFT JOIN workflow_stages s ON t.stage_id = s.id
            WHERE 1=1
        """
        params = []
        
        if filters:
            if filters.get('stage_id'):
                query += " AND t.stage_id = %s"
                params.append(filters['stage_id'])
            if filters.get('assignee_id'):
                # Проверяем и в tasks.assignee_id, и в task_assignees (для множественных ответственных)
                query += """ AND (t.assignee_id = %s OR t.id IN (
                    SELECT task_id FROM task_assignees WHERE user_id = %s
                ))"""
                params.append(filters['assignee_id'])
                params.append(filters['assignee_id'])
            
        query += " ORDER BY t.created_at DESC"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        tasks = []
        for row in rows:
            task_id = row[0]
            
            # Get all assignees for this task
            c.execute("""
                SELECT ta.user_id, u.full_name
                FROM task_assignees ta
                LEFT JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = %s
                ORDER BY ta.assigned_at
            """, (task_id,))
            
            assignees = c.fetchall()
            assignee_ids = [a[0] for a in assignees] if assignees else []
            assignee_names = [a[1] for a in assignees if a[1]] if assignees else []
            
            tasks.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "stage_id": row[3],
                "priority": row[4],
                "due_date": row[5],
                "assignee_id": row[6],  # Primary assignee (backward compatibility)
                "created_by": row[7],
                "client_id": row[8],
                "created_at": row[9],
                "assignee_name": row[10],  # Primary assignee name
                "client_name": row[11],
                "status": row[14], # key
                "stage_name": row[12], # name
                "stage_color": row[13],
                "created_by_name": row[15],
                "assignee_ids": assignee_ids,  # All assignees
                "assignee_names": assignee_names  # All assignee names
            })
        
        return tasks
    except Exception as e:
        log_error(f"Error getting tasks: {e}", "db.tasks")
        return []
    finally:
        conn.close()

def update_task_stage(task_id: int, stage_id: int) -> bool:
    """Update task stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE tasks SET stage_id = %s, updated_at = NOW() WHERE id = %s", (stage_id, task_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating task stage: {e}", "db.tasks")
        return False
    finally:
        conn.close()

def update_task(task_id: int, data: Dict) -> bool:
    """Update task details"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        fields = []
        params = []
        
        if 'title' in data:
            fields.append("title = %s")
            params.append(data['title'])
        if 'description' in data:
            fields.append("description = %s")
            params.append(data['description'])
        if 'priority' in data:
            fields.append("priority = %s")
            params.append(data['priority'])
        if 'due_date' in data:
            fields.append("due_date = %s")
            params.append(data['due_date'])
        if 'assignee_id' in data:
            fields.append("assignee_id = %s")
            params.append(data['assignee_id'])
            
        if not fields:
            return False
            
        query = f"UPDATE tasks SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s"
        params.append(task_id)
        
        c.execute(query, params)
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating task: {e}", "db.tasks")
        return False
    finally:
        conn.close()

def delete_task(task_id: int) -> bool:
    """Delete a task"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error deleting task: {e}", "db.tasks")
        return False
    finally:
        conn.close()

def get_task_analytics(user_id: int = None) -> Dict:
    """Get task analytics overview, optionally filtered by user (assignee)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Build user filter
        user_filter = ""
        user_filter_params = []
        if user_id:
            user_filter = """
                AND (t.assignee_id = %s OR t.id IN (
                    SELECT task_id FROM task_assignees WHERE user_id = %s
                ))
            """
            user_filter_params = [user_id, user_id]

        # Counts by status/stage key
        query = f"""
            SELECT s.name, COUNT(t.id)
            FROM workflow_stages s
            LEFT JOIN tasks t ON t.stage_id = s.id {user_filter if user_id else ''}
            WHERE s.entity_type = 'task'
            GROUP BY s.name
        """
        c.execute(query, user_filter_params if user_id else [])
        status_counts = dict(c.fetchall())

        # Overdue tasks
        query = f"""
            SELECT COUNT(t.id)
            FROM tasks t
            JOIN workflow_stages s ON t.stage_id = s.id
            WHERE s.entity_type = 'task' AND s.name != 'done' AND t.due_date < NOW() {user_filter if user_id else ''}
        """
        c.execute(query, user_filter_params if user_id else [])
        overdue_count = c.fetchone()[0]

        # Today's tasks
        query = f"""
            SELECT COUNT(t.id)
            FROM tasks t
            JOIN workflow_stages s ON t.stage_id = s.id
            WHERE s.entity_type = 'task' AND s.name != 'done' AND t.due_date::date = CURRENT_DATE {user_filter if user_id else ''}
        """
        c.execute(query, user_filter_params if user_id else [])
        today_count = c.fetchone()[0]

        return {
            "total_active": sum(v for k,v in status_counts.items() if k != 'done'),
            "completed": status_counts.get('done', 0),
            "overdue": overdue_count,
            "today": today_count
        }
    except Exception as e:
        log_error(f"Error getting task analytics: {e}", "db.tasks")
        return {}
    finally:
        conn.close()
