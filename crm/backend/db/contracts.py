"""
Orchestrator for Contracts (Architecture v2.0)
"""
from typing import List, Dict, Optional
from datetime import datetime
import json
from db.connection import get_db_connection
from utils.logger import log_error, log_info

def get_contracts(client_id: Optional[str] = None, status: Optional[str] = None, role: str = None) -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT c.*, cl.name as client_name, cl.phone as client_phone,
                   u.full_name as created_by_name
            FROM contracts c
            LEFT JOIN clients cl ON c.client_id = cl.instagram_id
            LEFT JOIN users u ON c.created_by = u.id
            WHERE 1=1
        """
        params = []
        if client_id:
            query += " AND c.client_id = %s"; params.append(client_id)
        if status:
            query += " AND c.status = %s"; params.append(status)
        
        if role in ["sales", "manager"]:
            query += " AND (c.contract_type NOT IN ('employment', 'rental') OR c.contract_type IS NULL)"
            
        query += " ORDER BY c.created_at DESC"
        c.execute(query, params)
        columns = [desc[0] for desc in c.description]
        return [dict(zip(columns, row)) for row in c.fetchall()]
    finally:
        conn.close()

def create_contract(data: Dict) -> Optional[int]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Generate number
        c.execute("SELECT COUNT(*) FROM contracts")
        count = c.fetchone()[0]
        contract_number = f"DOG-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"
        
        # Get defaults
        c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'contract' AND name = 'draft' LIMIT 1")
        stage_id = (c.fetchone() or [None])[0]

        c.execute("""
            INSERT INTO contracts 
            (contract_number, client_id, booking_id, contract_type, template_name, 
             status, stage_id, data, created_by)
            VALUES (%s, %s, %s, %s, %s, 'draft', %s, %s, %s)
            RETURNING id
        """, (
            contract_number, data['client_id'], data.get('booking_id'),
            data.get('contract_type', 'service'), data.get('template_name'),
            stage_id, json.dumps(data.get('data', {})), data.get('created_by')
        ))
        cid = c.fetchone()[0]
        conn.commit()
        return cid
    except Exception as e:
        log_error(f"Error create_contract: {e}", "db.contracts")
        conn.rollback()
        return None
    finally:
        conn.close()

def update_contract(contract_id: int, data: Dict) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        updates = []
        params = []
        
        fields = ['status', 'stage_id', 'contract_type', 'pdf_path', 'signed_at', 'sent_at']
        for key in fields:
            if key in data:
                updates.append(f"{key} = %s")
                params.append(data[key])
        
        if 'data' in data:
            updates.append("data = %s"); params.append(json.dumps(data['data']))

        if not updates: return False

        updates.append("updated_at = NOW()")
        params.append(contract_id)
        
        c.execute(f"UPDATE contracts SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error update_contract: {e}", "db.contracts")
        conn.rollback()
        return False
    finally:
        conn.close()
