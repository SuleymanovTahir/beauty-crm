"""
Orchestrator for Invoices (Architecture v2.0)
"""
from typing import List, Dict, Optional
from datetime import datetime
import json
from db.connection import get_db_connection
from utils.logger import log_error, log_info
from utils.currency import get_salon_currency

def get_invoices(client_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT i.*, cl.name as client_name, cl.phone as client_phone
            FROM invoices i
            LEFT JOIN clients cl ON i.client_id = cl.instagram_id
            WHERE 1=1
        """
        params = []
        if client_id:
            query += " AND i.client_id = %s"; params.append(client_id)
        if status:
            query += " AND i.status = %s"; params.append(status)
        
        query += " ORDER BY i.created_at DESC"
        c.execute(query, params)
        columns = [desc[0] for desc in c.description]
        return [dict(zip(columns, row)) for row in c.fetchall()]
    finally:
        conn.close()

def create_invoice(data: Dict) -> Optional[int]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Generate number
        c.execute("SELECT COUNT(*) FROM invoices")
        count = c.fetchone()[0]
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"
        
        # Get defaults
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        currency = (c.fetchone() or [get_salon_currency()])[0]
        
        c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'invoice' AND name = 'draft' LIMIT 1")
        stage_id = (c.fetchone() or [None])[0]

        total_amount = sum(item.get('amount', 0) for item in data.get('items', []))

        c.execute("""
            INSERT INTO invoices 
            (invoice_number, client_id, booking_id, status, stage_id, total_amount, paid_amount,
             currency, items, notes, due_date, created_by)
            VALUES (%s, %s, %s, 'draft', %s, %s, 0, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            invoice_number, data['client_id'], data.get('booking_id'), stage_id,
            total_amount, currency, json.dumps(data.get('items', [])),
            data.get('notes'), data.get('due_date'), data.get('created_by')
        ))
        iid = c.fetchone()[0]
        conn.commit()
        return iid
    except Exception as e:
        log_error(f"Error create_invoice: {e}", "db.invoices")
        conn.rollback()
        return None
    finally:
        conn.close()

def update_invoice(invoice_id: int, data: Dict) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        updates = []
        params = []
        
        for key in ['status', 'stage_id', 'notes', 'due_date', 'pdf_path', 'paid_at', 'sent_at']:
            if key in data:
                updates.append(f"{key} = %s")
                params.append(data[key])
        
        if 'items' in data:
            total_amount = sum(item.get('amount', 0) for item in data['items'])
            updates.append("items = %s"); params.append(json.dumps(data['items']))
            updates.append("total_amount = %s"); params.append(total_amount)

        if not updates: return False

        updates.append("updated_at = NOW()")
        params.append(invoice_id)
        
        c.execute(f"UPDATE invoices SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error update_invoice: {e}", "db.invoices")
        conn.rollback()
        return False
    finally:
        conn.close()

def add_invoice_payment(invoice_id: int, amount: float, method: str, notes: str, user_id: int) -> Optional[int]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_by)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (invoice_id, amount, method, notes, user_id))
        pid = c.fetchone()[0]
        
        # Update invoice totals and status
        c.execute("""
            UPDATE invoices
            SET paid_amount = paid_amount + %s,
                status = CASE 
                    WHEN (paid_amount + %s) >= total_amount THEN 'paid'
                    WHEN (paid_amount + %s) > 0 THEN 'partial'
                    ELSE status
                END,
                paid_at = CASE 
                    WHEN (paid_amount + %s) >= total_amount THEN NOW()
                    ELSE paid_at
                END,
                updated_at = NOW()
            WHERE id = %s
        """, (amount, amount, amount, amount, invoice_id))
        
        conn.commit()
        return pid
    except Exception as e:
        log_error(f"Error add_invoice_payment: {e}", "db.invoices")
        conn.rollback()
        return None
    finally:
        conn.close()
