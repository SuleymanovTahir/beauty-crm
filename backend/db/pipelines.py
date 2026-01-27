
from typing import List, Dict, Optional
from db.connection import get_db_connection
from utils.logger import log_error, log_info

def get_pipeline_stages() -> List[Dict]:
    """Get all pipeline stages from unified workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, name_ru, sort_order, color 
            FROM workflow_stages 
            WHERE entity_type = 'pipeline' 
            ORDER BY sort_order ASC
        """)
        rows = c.fetchall()
        return [
            {
                "id": row[0],
                "name": row[2] or row[1], # Use Russian if available
                "key": row[1].lower().replace(" ", "_"),
                "order_index": row[3],
                "color": row[4]
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting pipeline stages: {e}", "db.pipelines")
        return []
    finally:
        conn.close()

def get_clients_by_stage(stage_id: int, limit: int = 50, offset: int = 0, search: str = None, user_id: int = None) -> List[Dict]:
    """Get clients in a specific stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT instagram_id, name, username, phone, total_spend, last_contact, temperature, profile_pic, assigned_employee_id, reminder_date, pipeline_stage_id
            FROM clients
            WHERE pipeline_stage_id = %s
        """
        params = [stage_id]
        if user_id is not None:
            query += " AND (assigned_employee_id = %s OR assigned_employee_id IS NULL)"
            params.append(user_id)
        if search:
            query += " AND (name ILIKE %s OR username ILIKE %s OR phone ILIKE %s)"
            params.extend([f"%{search}%"] * 3)
        query += " ORDER BY last_contact DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        c.execute(query, params)
        rows = c.fetchall()
        return [
            {
                "id": row[0], "name": row[1], "username": row[2], "phone": row[3],
                "total_spend": row[4], "last_contact": row[5], "temperature": row[6] or 'cold',
                "profile_pic": row[7], "assigned_employee_id": row[8],
                "reminder_date": row[9], "pipeline_stage_id": row[10]
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting clients by stage: {e}", "db.pipelines")
        return []
    finally:
        conn.close()

def update_client_stage(client_id: str, stage_id: int) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE clients SET pipeline_stage_id = %s WHERE instagram_id = %s", (stage_id, client_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating client stage: {e}", "db.pipelines")
        return False
    finally:
        conn.close()

def get_funnel_stats(user_id: int = None) -> List[Dict]:
    """Get stats from workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = """
            SELECT ws.id, ws.name, ws.name_ru, COUNT(c.instagram_id), SUM(NULLIF(c.total_spend, 0))
            FROM workflow_stages ws
            LEFT JOIN clients c ON c.pipeline_stage_id = ws.id
                {user_filter}
            WHERE ws.entity_type = 'pipeline'
            GROUP BY ws.id, ws.name, ws.name_ru, ws.sort_order
            ORDER BY ws.sort_order ASC
        """
        user_filter = "AND (c.assigned_employee_id = %s OR c.assigned_employee_id IS NULL)" if user_id else ""
        c.execute(sql.format(user_filter=user_filter), (user_id,) if user_id else ())
        rows = c.fetchall()
        return [
            {
                "stage_id": row[0], "stage_name": row[2] or row[1],
                "count": row[3], "total_value": row[4] or 0, "key": row[1].lower().replace(" ", "_")
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error funnel stats: {e}", "db.pipelines")
        return []
    finally:
        conn.close()

def create_pipeline_stage(name: str, color: str, order_index: int) -> Optional[int]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO workflow_stages (entity_type, name, color, sort_order)
            VALUES ('pipeline', %s, %s, %s) RETURNING id
        """, (name, color, order_index))
        sid = c.fetchone()[0]
        conn.commit()
        return sid
    except Exception as e:
        log_error(f"Error create stage: {e}", "db.pipelines")
        return None
    finally:
        conn.close()

def update_pipeline_stage(stage_id: int, name: str, color: str) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE workflow_stages SET name = %s, color = %s WHERE id = %s", (name, color, stage_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error update stage: {e}", "db.pipelines")
        return False
    finally:
        conn.close()

def delete_pipeline_stage(stage_id: int, fallback_id: int = None) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if fallback_id:
            c.execute("UPDATE clients SET pipeline_stage_id = %s WHERE pipeline_stage_id = %s", (fallback_id, stage_id))
        c.execute("DELETE FROM workflow_stages WHERE id = %s", (stage_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error delete stage: {e}", "db.pipelines")
        return False
    finally:
        conn.close()

def reorder_pipeline_stages(ordered_ids: List[int]) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        for idx, sid in enumerate(ordered_ids):
            c.execute("UPDATE workflow_stages SET sort_order = %s WHERE id = %s", (idx, sid))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error reorder: {e}", "db.pipelines")
        return False
    finally:
        conn.close()

def remove_client_from_funnel(client_id: str) -> bool:
    """Убрать клиента из воронки (обнулить stage_id)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE clients SET pipeline_stage_id = NULL WHERE instagram_id = %s", (client_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error removing client from funnel: {e}", "db.pipelines")
        return False
    finally:
        conn.close()
