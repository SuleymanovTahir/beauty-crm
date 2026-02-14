
from typing import List, Dict, Optional
from db.connection import get_db_connection
from utils.logger import log_error

PIPELINE_STAGE_ALIASES = {
    'новое': 'new',
    'новый_лид': 'new',
    'new_lead': 'new',
    'переговоры': 'negotiation',
    'отправленное_предложение': 'sent_offer',
    'предложение_отправлено': 'sent_offer',
    'закрыто_выиграно': 'closed_won',
    'успешно_реализовано': 'closed_won',
    'закрыто_проиграно': 'closed_lost',
    'закрыто_не_реализовано': 'closed_lost',
}


def normalize_pipeline_stage_key(stage_name: str) -> str:
    normalized = str(stage_name or '').strip().lower().replace(' ', '_')
    return PIPELINE_STAGE_ALIASES.get(normalized, normalized)


def get_pipeline_stages() -> List[Dict]:
    """Get all pipeline stages from unified workflow_stages"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, name, sort_order, color 
            FROM workflow_stages 
            WHERE entity_type = 'pipeline' 
            ORDER BY sort_order ASC
        """)
        rows = c.fetchall()
        stages_by_key: Dict[str, Dict] = {}
        for row in rows:
            stage_key = normalize_pipeline_stage_key(row[1])
            current = stages_by_key.get(stage_key)
            should_replace = (
                current is None
                or str(row[1]).strip().lower().replace(' ', '_') == stage_key
            )
            if should_replace:
                stages_by_key[stage_key] = {
                    "id": row[0],
                    "name": row[1],
                    "key": stage_key,
                    "order_index": row[2],
                    "color": row[3]
                }

        return sorted(stages_by_key.values(), key=lambda stage: stage["order_index"])
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
        c.execute(
            """
            SELECT id, name
            FROM workflow_stages
            WHERE entity_type = 'pipeline'
            ORDER BY sort_order ASC, id ASC
            """
        )
        stage_rows = c.fetchall()
        stage_name_by_id = {int(row[0]): str(row[1] or '') for row in stage_rows}
        target_stage_name = stage_name_by_id.get(int(stage_id), '')
        target_stage_key = normalize_pipeline_stage_key(target_stage_name)
        stage_ids = [
            int(row[0])
            for row in stage_rows
            if normalize_pipeline_stage_key(str(row[1] or '')) == target_stage_key
        ]
        if not stage_ids:
            stage_ids = [int(stage_id)]

        include_booked_without_stage = False
        lowered_stage_name = target_stage_name.strip().lower()
        if (
            'book' in lowered_stage_name
            or 'запис' in lowered_stage_name
            or 'appoint' in lowered_stage_name
        ):
            include_booked_without_stage = True

        query = """
            SELECT instagram_id, name, username, phone, total_spend, last_contact, temperature, profile_pic, assigned_employee_id, reminder_date, pipeline_stage_id
            FROM clients
            WHERE (
                pipeline_stage_id = ANY(%s)
                OR (
                    %s = TRUE
                    AND pipeline_stage_id IS NULL
                    AND EXISTS (
                        SELECT 1
                        FROM bookings b
                        WHERE b.instagram_id = clients.instagram_id
                          AND b.deleted_at IS NULL
                          AND COALESCE(b.status, '') <> 'cancelled'
                    )
                )
            )
        """
        params = [stage_ids, include_booked_without_stage]
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
        c.execute(
            """
            SELECT id, name, sort_order
            FROM workflow_stages
            WHERE entity_type = 'pipeline'
            ORDER BY sort_order ASC, id ASC
            """
        )
        stage_rows = c.fetchall()
        if not stage_rows:
            return []

        stage_groups: Dict[str, Dict] = {}
        for row in stage_rows:
            stage_id = int(row[0])
            stage_name = str(row[1] or '')
            sort_order = int(row[2] or 0)
            stage_key = normalize_pipeline_stage_key(stage_name)

            if stage_key not in stage_groups:
                stage_groups[stage_key] = {
                    "stage_id": stage_id,
                    "stage_name": stage_name,
                    "stage_ids": [stage_id],
                    "sort_order": sort_order,
                    "key": stage_key,
                }
                continue

            stage_groups[stage_key]["stage_ids"].append(stage_id)

        aggregated_stats = []
        for stage in stage_groups.values():
            stage_ids = stage["stage_ids"]
            lowered_stage_name = stage["stage_name"].strip().lower()
            include_booked_without_stage = (
                'book' in lowered_stage_name
                or 'запис' in lowered_stage_name
                or 'appoint' in lowered_stage_name
            )

            query = """
                SELECT COUNT(c.instagram_id), COALESCE(SUM(NULLIF(c.total_spend, 0)), 0)
                FROM clients c
                WHERE (
                    c.pipeline_stage_id = ANY(%s)
                    OR (
                        %s = TRUE
                        AND c.pipeline_stage_id IS NULL
                        AND EXISTS (
                            SELECT 1
                            FROM bookings b
                            WHERE b.instagram_id = c.instagram_id
                              AND b.deleted_at IS NULL
                              AND COALESCE(b.status, '') <> 'cancelled'
                        )
                    )
                )
            """
            params: List[object] = [stage_ids, include_booked_without_stage]

            if user_id is not None:
                query += " AND (c.assigned_employee_id = %s OR c.assigned_employee_id IS NULL)"
                params.append(user_id)

            c.execute(query, params)
            count, total_value = c.fetchone() or (0, 0)

            aggregated_stats.append(
                {
                    "stage_id": stage["stage_id"],
                    "stage_name": stage["stage_name"],
                    "count": int(count or 0),
                    "total_value": float(total_value or 0),
                    "key": stage["key"],
                    "sort_order": stage["sort_order"],
                }
            )

        aggregated_stats.sort(key=lambda row: row["sort_order"])
        return [
            {
                "stage_id": row["stage_id"],
                "stage_name": row["stage_name"],
                "count": row["count"],
                "total_value": row["total_value"],
                "key": row["key"],
            }
            for row in aggregated_stats
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
