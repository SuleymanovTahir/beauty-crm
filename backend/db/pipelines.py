
from typing import List, Dict, Optional
from db.connection import get_db_connection
from utils.logger import log_error, log_info

def get_pipeline_stages() -> List[Dict]:
    """Get all pipeline stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, key, order_index, color 
            FROM pipeline_stages 
            WHERE is_active = TRUE 
            ORDER BY order_index ASC
        """)
        rows = c.fetchall()
        return [
            {
                "id": row[0],
                "name": row[1],
                "key": row[2],
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

def get_clients_by_stage(stage_id: int, limit: int = 50, offset: int = 0, search: str = None) -> List[Dict]:
    """Get clients in a specific stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT instagram_id, name, username, phone, total_spend, last_contact, temperature, profile_pic
            FROM clients 
            WHERE pipeline_stage_id = %s
        """
        params = [stage_id]
        
        if search:
            query += " AND (name ILIKE %s OR username ILIKE %s OR phone ILIKE %s)"
            params.extend([f"%{search}%"] * 3)
            
        query += " ORDER BY last_contact DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        c.execute(query, params)
        rows = c.fetchall()
        return [
            {
                "id": row[0],
                "name": row[1],
                "username": row[2],
                "phone": row[3],
                "total_spend": row[4],
                "last_contact": row[5],
                "temperature": row[6],
                "profile_pic": row[7]
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting clients by stage: {e}", "db.pipelines")
        return []
    finally:
        conn.close()


def update_client_stage(client_id: str, stage_id: int) -> bool:
    """Move client to a new stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE clients 
            SET pipeline_stage_id = %s 
            WHERE instagram_id = %s
        """, (stage_id, client_id))
        conn.commit()
        log_info(f" moved client {client_id} to stage {stage_id}", "db.pipelines")
        return True
    except Exception as e:
        log_error(f"Error updating client stage: {e}", "db.pipelines")
        conn.rollback()
        return False
    finally:
        conn.close()

def remove_client_from_funnel(client_id: str) -> bool:
    """Remove client from funnel (set stage to NULL)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE clients 
            SET pipeline_stage_id = NULL
            WHERE instagram_id = %s
        """, (client_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error removing client from funnel: {e}", "db.pipelines")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_funnel_stats(start_date: str = None, end_date: str = None) -> Dict:
    """Get stats for the funnel (count per stage, etc)"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Simplest stat: count per stage
        c.execute("""
            SELECT ps.id, ps.name, COUNT(c.instagram_id), SUM(NULLIF(c.total_spend, 0))
            FROM pipeline_stages ps
            LEFT JOIN clients c ON c.pipeline_stage_id = ps.id
            WHERE ps.is_active = TRUE
            GROUP BY ps.id, ps.name, ps.order_index
            ORDER BY ps.order_index
        """)
        rows = c.fetchall()
        
        return [
            {
                "stage_id": row[0],
                "stage_name": row[1],
                "count": row[2],
                "total_value": row[3] or 0
            }
            for row in rows
        ]
    except Exception as e:
        log_error(f"Error getting funnel stats: {e}", "db.pipelines")

def create_pipeline_stage(name: str, color: str, order_index: int) -> Optional[int]:
    """Create a new pipeline stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Generate a key from name (simple slug)
        key = name.lower().replace(" ", "_")[:50]
        
        c.execute("""
            INSERT INTO pipeline_stages (name, key, color, order_index)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (name, key, color, order_index))
        stage_id = c.fetchone()[0]
        conn.commit()
        return stage_id
    except Exception as e:
        log_error(f"Error creating pipeline stage: {e}", "db.pipelines")
        conn.rollback()
        return None
    finally:
        conn.close()

def update_pipeline_stage(stage_id: int, name: str, color: str) -> bool:
    """Update a pipeline stage"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE pipeline_stages 
            SET name = %s, color = %s
            WHERE id = %s
        """, (name, color, stage_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error updating pipeline stage: {e}", "db.pipelines")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_pipeline_stage(stage_id: int, fallback_stage_id: int = None) -> bool:
    """Delete a pipeline stage and move clients to fallback if provided"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # If fallback provided, move clients first
        if fallback_stage_id:
            c.execute("""
                UPDATE clients 
                SET pipeline_stage_id = %s 
                WHERE pipeline_stage_id = %s
            """, (fallback_stage_id, stage_id))
            
        c.execute("DELETE FROM pipeline_stages WHERE id = %s", (stage_id,))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error deleting pipeline stage: {e}", "db.pipelines")
        conn.rollback()
        return False
    finally:
        conn.close()

def reorder_pipeline_stages(ordered_ids: List[int]) -> bool:
    """Update order_index for a list of stage IDs"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        for idx, stage_id in enumerate(ordered_ids):
            c.execute("""
                UPDATE pipeline_stages 
                SET order_index = %s 
                WHERE id = %s
            """, (idx, stage_id))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error reordering pipeline stages: {e}", "db.pipelines")
        conn.rollback()
        return False
    finally:
        conn.close()
