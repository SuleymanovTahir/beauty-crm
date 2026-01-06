
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user

router = APIRouter()

class CallLogResponse(BaseModel):
    id: int
    client_name: Optional[str]
    client_id: Optional[str]
    phone: str
    type: str # inbound, outbound
    status: str # completed, missed, rejected, ongoing
    duration: int
    recording_url: Optional[str]
    created_at: str
    manager_name: Optional[str]
    transcription: Optional[str]
    notes: Optional[str]

@router.get("/telephony/calls", response_model=List[CallLogResponse])
async def get_calls(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                cl.id,
                COALESCE(c.name, c.username, 'Неизвестный') as client_name,
                cl.client_id,
                cl.phone,
                cl.direction as type,
                cl.status,
                cl.duration,
                cl.recording_url,
                cl.created_at,
                cl.transcription,
                cl.notes
            FROM call_logs cl
            LEFT JOIN clients c ON c.instagram_id = cl.client_id
            WHERE 1=1
        """
        params = []
        
        if search:
            query += " AND (cl.phone ILIKE %s OR c.name ILIKE %s OR c.username ILIKE %s)"
            params.extend([f"%{search}%"] * 3)
            
        query += " ORDER BY cl.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "id": row[0],
                "client_name": row[1],
                "client_id": row[2],
                "phone": row[3],
                "type": row[4],
                "status": row[5],
                "duration": row[6] or 0,
                "recording_url": row[7],
                "created_at": row[8].isoformat() if row[8] else None,
                "transcription": row[9],
                "notes": row[10],
                "manager_name": None # Todo: link to user if needed
            }
            for row in rows
        ]
    except Exception as e:
        print(f"Error fetching calls: {e}")
        return []
    finally:
        conn.close()

@router.get("/telephony/stats")
async def get_telephony_stats(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
            FROM call_logs
        """)
        row = c.fetchone()
        return {
            "total_calls": row[0] or 0,
            "inbound": row[1] or 0,
            "outbound": row[2] or 0,
            "missed": row[3] or 0
        }
    except Exception as e:
        print(f"Error fetching telephony stats: {e}")
        return {
            "total_calls": 0,
            "inbound": 0,
            "outbound": 0,
            "missed": 0
        }
    finally:
        conn.close()
