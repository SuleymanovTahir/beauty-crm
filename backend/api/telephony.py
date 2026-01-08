
from fastapi import APIRouter, Depends, Query, HTTPException, Request, BackgroundTasks, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
from datetime import datetime, timedelta
import json
import logging
import os
import shutil
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

# Директория для хранения записей звонков
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

class CallLogCreate(BaseModel):
    phone: str
    client_id: Optional[str] = None
    booking_id: Optional[int] = None
    direction: str = 'outbound' # inbound, outbound
    status: str = 'completed' # completed, missed, rejected, ongoing
    duration: int = 0
    recording_url: Optional[str] = None
    created_at: Optional[str] = None
    transcription: Optional[str] = None
    notes: Optional[str] = None
    external_id: Optional[str] = None
    manual_client_name: Optional[str] = None
    manual_manager_name: Optional[str] = None
    manual_service_name: Optional[str] = None

class CallLogUpdate(BaseModel):
    client_id: Optional[str] = None
    booking_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    direction: Optional[str] = None
    duration: Optional[int] = None
    manual_client_name: Optional[str] = None
    manual_manager_name: Optional[str] = None
    manual_service_name: Optional[str] = None
    recording_url: Optional[str] = None

class CallLogResponse(BaseModel):
    id: int
    client_name: Optional[str]
    client_id: Optional[str]
    booking_id: Optional[int]
    phone: str
    type: str
    status: str
    duration: int
    recording_url: Optional[str]
    recording_file: Optional[str]
    created_at: Optional[str]
    manager_name: Optional[str]
    transcription: Optional[str]
    notes: Optional[str]
    manual_client_name: Optional[str]
    manual_manager_name: Optional[str]
    manual_service_name: Optional[str]

class TelephonySettings(BaseModel):
    provider: str = 'generic' # binotel, onlinepbx, generic
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_token: Optional[str] = None
    is_active: bool = True

@router.get("/telephony/settings")
async def get_telephony_settings(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT telephony_settings FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        if row and row[0]:
            return json.loads(row[0])
        return {}
    except Exception as e:
        logger.warning(f"Could not fetch telephony settings (maybe column missing?): {e}")
        return {}
    finally:
        conn.close()

@router.post("/telephony/settings")
async def save_telephony_settings(settings: TelephonySettings, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE salon_settings 
            SET telephony_settings = %s 
            WHERE id = 1
        """, (settings.model_dump_json(),))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/telephony/test-integration")
async def test_telephony_integration(settings: TelephonySettings, current_user: dict = Depends(get_current_user)):
    # Simple validation logic for now
    if settings.provider == 'binotel':
        if not settings.api_key or not settings.api_secret:
            return {"success": False, "error": "API Key и Secret обязательны для Binotel"}
    elif settings.provider == 'onlinepbx':
        if not settings.api_key:
            return {"success": False, "error": "API Key обязателен для OnlinePBX"}
    elif settings.provider == 'twilio':
        if not settings.api_key or not settings.api_secret:
            return {"success": False, "error": "Account SID и Auth Token обязательны для Twilio"}
    
    # In real world, we would call the provider's API here
    # Mocking a successful validation for non-empty keys
    await asyncio.sleep(1) # Simulate network delay
    
    return {"success": True, "message": f"Соединение с {settings.provider} успешно проверено"}

@router.get("/telephony/calls", response_model=List[CallLogResponse])
async def get_calls(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    booking_id: Optional[int] = None,
    sort_by: Optional[str] = 'created_at',
    order: Optional[str] = 'desc',
    status: Optional[str] = None,
    direction: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                cl.id,
                COALESCE(cl.manual_client_name, c.name, c.username, 'Неизвестный') as client_name,
                cl.client_id,
                cl.booking_id,
                cl.phone,
                cl.direction as type,
                cl.status,
                COALESCE(cl.duration, 0) as duration,
                cl.recording_url,
                cl.recording_file,
                cl.created_at,
                cl.transcription,
                cl.notes,
                COALESCE(cl.manual_manager_name, b.master) as manager_name,
                cl.manual_client_name,
                cl.manual_manager_name,
                cl.manual_service_name
            FROM call_logs cl
            LEFT JOIN clients c ON c.instagram_id = cl.client_id
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        params = []
        
        if search:
            query += " AND (cl.phone ILIKE %s OR c.name ILIKE %s OR c.username ILIKE %s)"
            params.extend([f"%{search}%"] * 3)

        if start_date:
            query += " AND cl.created_at >= %s"
            params.append(start_date)
            
        if end_date:
             query += " AND cl.created_at <= %s"
             if len(end_date) == 10: 
                 end_date += " 23:59:59"
             params.append(end_date)

        if booking_id:
            query += " AND cl.booking_id = %s"
            params.append(booking_id)

        if status and status != 'all':
            query += " AND cl.status = %s"
            params.append(status)

        if direction and direction != 'all':
            query += " AND cl.direction = %s"
            params.append(direction)
            
        # Sorting
        allowed_sort_fields = {
            'created_at': 'cl.created_at',
            'duration': 'cl.duration',
            'client_name': 'client_name',
            'status': 'cl.status',
            'type': 'cl.direction',
            'manager_name': 'b.master'
        }
        sort_column = allowed_sort_fields.get(sort_by, 'cl.created_at')
        sort_direction = 'DESC' if order == 'desc' else 'ASC'
        
        query += f" ORDER BY {sort_column} {sort_direction} LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "id": row[0],
                "client_name": row[1],
                "client_id": row[2],
                "booking_id": row[3],
                "phone": row[4],
                "type": row[5],
                "status": row[6],
                "duration": row[7] or 0,
                "recording_url": row[8],
                "recording_file": row[9],
                "created_at": row[10].isoformat() if row[10] else None,
                "transcription": row[11],
                "notes": row[12],
                "manager_name": row[13],
                "manual_client_name": row[14],
                "manual_manager_name": row[15],
                "manual_service_name": row[16]
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"Error fetching calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/telephony/stats")
async def get_telephony_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
            FROM call_logs
            WHERE 1=1
        """
        params = []
        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND created_at <= %s"
            if len(end_date) == 10:
                 end_date += " 23:59:59"
            params.append(end_date)

        c.execute(query, params)
        row = c.fetchone()
        return {
            "total_calls": row[0] or 0,
            "inbound": row[1] or 0,
            "outbound": row[2] or 0,
            "missed": row[3] or 0
        }
    except Exception as e:
        logger.error(f"Error fetching telephony stats: {e}")
        return {"total_calls": 0, "inbound": 0, "outbound": 0, "missed": 0}
    finally:
        conn.close()

@router.get("/telephony/analytics")
async def get_telephony_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    manager_name: Optional[str] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                DATE(cl.created_at) as date,
                SUM(CASE WHEN cl.direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN cl.direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
                SUM(CASE WHEN cl.status = 'missed' THEN 1 ELSE 0 END) as missed,
                AVG(cl.duration) as avg_duration
            FROM call_logs cl
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        params = []
        if start_date:
            query += " AND cl.created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND cl.created_at <= %s"
            if len(end_date) == 10:
                end_date += " 23:59:59"
            params.append(end_date)
            
        if manager_name:
            query += " AND b.master = %s"
            params.append(manager_name)

        if status and status != 'all':
            query += " AND cl.status = %s"
            params.append(status)

        if direction and direction != 'all':
            query += " AND cl.direction = %s"
            params.append(direction)
            
        if min_duration is not None:
            query += " AND cl.duration >= %s"
            params.append(min_duration)

        if max_duration is not None:
            query += " AND cl.duration <= %s"
            params.append(max_duration)

        query += " GROUP BY DATE(cl.created_at) ORDER BY date"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "date": row[0].isoformat() if row[0] else None,
                "inbound": row[1],
                "outbound": row[2],
                "missed": row[3],
                "avg_duration": round(row[4] or 0, 2)
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        return []
    finally:
        conn.close()

@router.post("/telephony/calls")
async def create_call(call: CallLogCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Auto-link client if not provided
        if not call.client_id and call.phone:
            clean_phone = ''.join(filter(str.isdigit, call.phone))
            if len(clean_phone) > 6:
                c.execute("SELECT instagram_id FROM clients WHERE phone LIKE %s LIMIT 1", (f"%{clean_phone}%",))
                row = c.fetchone()
                if row:
                    call.client_id = row[0]

        # Auto-link booking if not provided but client_id is available
        if not call.booking_id and call.client_id:
            created_at = call.created_at if call.created_at else datetime.now().isoformat()
            call_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Search for bookings within ±2 hours of call time
            time_window_start = (call_time - timedelta(hours=2)).isoformat()
            time_window_end = (call_time + timedelta(hours=2)).isoformat()
            
            c.execute("""
                SELECT id FROM bookings 
                WHERE client_id = %s 
                AND start_time::timestamp BETWEEN %s AND %s
                ORDER BY ABS(EXTRACT(EPOCH FROM (start_time::timestamp - %s::timestamp)))
                LIMIT 1
            """, (call.client_id, time_window_start, time_window_end, created_at))
            
            booking_row = c.fetchone()
            if booking_row:
                call.booking_id = booking_row[0]

        created_at = call.created_at if call.created_at else datetime.now().isoformat()
        c.execute("""
            INSERT INTO call_logs (
                phone, client_id, booking_id, direction, status, duration, recording_url, 
                created_at, transcription, notes, external_id, 
                manual_client_name, manual_manager_name, manual_service_name
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            call.phone, call.client_id, call.booking_id, call.direction, call.status, call.duration,
            call.recording_url, created_at, call.transcription, call.notes, call.external_id,
            call.manual_client_name, call.manual_manager_name, call.manual_service_name
        ))
        call_id = c.fetchone()[0]
        conn.commit()
        return {"id": call_id, "success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/telephony/upload-recording/{call_id}")
async def upload_recording(
    call_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload audio recording file for a call"""
    try:
        # Validate file type
        allowed_extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.webm']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"call_{call_id}_{timestamp}{file_ext}"
        file_path = os.path.join(RECORDINGS_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update database
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("""
                UPDATE call_logs 
                SET recording_file = %s 
                WHERE id = %s
            """, (filename, call_id))
            conn.commit()
        finally:
            conn.close()
        
        return {
            "success": True,
            "filename": filename,
            "url": f"/static/recordings/{filename}"
        }
    except Exception as e:
        logger.error(f"Error uploading recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/telephony/calls/{call_id}")
async def update_call(call_id: int, update: CallLogUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        fields = []
        params = []
        if update.notes is not None:
            fields.append("notes = %s")
            params.append(update.notes)
        if update.client_id is not None:
            fields.append("client_id = %s")
            params.append(update.client_id)
        if update.booking_id is not None:
            fields.append("booking_id = %s")
            params.append(update.booking_id)
        if update.status is not None:
             fields.append("status = %s")
             params.append(update.status)
        if update.phone is not None:
             fields.append("phone = %s")
             params.append(update.phone)
        if update.direction is not None:
             fields.append("direction = %s")
             params.append(update.direction)
        if update.duration is not None:
             fields.append("duration = %s")
             params.append(update.duration)
        if update.manual_client_name is not None:
             fields.append("manual_client_name = %s")
             params.append(update.manual_client_name)
        if update.manual_manager_name is not None:
             fields.append("manual_manager_name = %s")
             params.append(update.manual_manager_name)
        if update.manual_service_name is not None:
             fields.append("manual_service_name = %s")
             params.append(update.manual_service_name)
        if update.recording_url is not None:
             fields.append("recording_url = %s")
             params.append(update.recording_url)
        
        if not fields:
             return {"success": True}

        params.append(call_id)
        query = f"UPDATE call_logs SET {', '.join(fields)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/telephony/calls/{call_id}")
async def delete_call(call_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM call_logs WHERE id = %s", (call_id,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- WEBHOOKS FOR PROVIDERS ---

@router.post("/telephony/webhook/{provider}")
async def telephony_webhook(provider: str, request: Request, background_tasks: BackgroundTasks):
    """
    Universal webhook for telephony providers.
    Supports: binotel, onlinepbx, twilio, generic (json)
    """
    try:
        data = {}
        if request.headers.get('content-type') == 'application/json':
            data = await request.json()
        else:
            form = await request.form()
            data = dict(form)
            
        logger.info(f"Received webhook from {provider}: {data}")

        # Normalize data based on provider
        call_data = normalize_webhook_data(provider, data)
        if not call_data:
            return {"status": "ignored", "reason": "unknown format or event"}

        # Save to DB asynchronously
        background_tasks.add_task(save_webhook_call, call_data)

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        # Return 200 OK anyway to prevent provider from retrying endlessly
        return {"status": "error", "message": str(e)}

def normalize_webhook_data(provider: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # 1. Binotel
    if provider == 'binotel':
        # Binotel sends specific fields
        # Example: requestType, callID, generalCallID, externalNumber, internalNumber, duration, recording, disposition
        if data.get('requestType') == 'completed':
            return {
                'external_id': data.get('generalCallID'),
                'phone': data.get('externalNumber'),
                'direction': 'inbound' if data.get('direction') == 'incoming' else 'outbound',
                'status': data.get('disposition') if data.get('disposition') in ['answered', 'busy', 'noanswer'] else 'completed',
                'duration': int(data.get('duration', 0)),
                'recording_url': data.get('recording'),
                'created_at': datetime.fromtimestamp(int(data.get('startTime'))).isoformat() if data.get('startTime') else datetime.now().isoformat()
            }
    
    # 2. OnlinePBX
    elif provider == 'onlinepbx':
         # Example: event=call_end, uuid, caller, callee, duration, recording_url
         if data.get('event') == 'call_end':
             return {
                 'external_id': data.get('uuid'),
                 'phone': data.get('from') if len(data.get('from', '')) > 5 else data.get('to'), # Heuristic
                 'direction': 'inbound', # Simplification, need logic
                 'status': 'completed',
                 'duration': int(data.get('duration', 0)),
                 'recording_url': data.get('recording_url'),
                 'created_at': datetime.now().isoformat()
             }
    
    # 3. Twilio
    elif provider == 'twilio':
        # Twilio sends Form Data: CallSid, From, To, CallStatus, CallDuration, RecordingUrl
        return {
            'external_id': data.get('CallSid'),
            'phone': data.get('From'),
            'direction': 'inbound' if data.get('Direction', '').startswith('inbound') else 'outbound',
            'status': 'completed' if data.get('CallStatus') == 'completed' else data.get('CallStatus'),
            'duration': int(data.get('CallDuration', 0)),
            'recording_url': data.get('RecordingUrl'),
            'created_at': datetime.now().isoformat()
        }

    # 3. Generic (our own format)
    elif provider == 'generic':
        return {
            'external_id': data.get('id'),
            'phone': data.get('phone'),
            'direction': data.get('direction', 'inbound'),
            'status': data.get('status', 'completed'),
            'duration': int(data.get('duration', 0)),
            'recording_url': data.get('recording_url'),
            'created_at': data.get('created_at', datetime.now().isoformat()),
            'notes': data.get('notes')
        }

    return None

def save_webhook_call(call_data: Dict[str, Any]):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        external_id = call_data.get('external_id')
        
        # Check if client exists by phone
        client_id = None
        if call_data.get('phone'):
             clean_phone = ''.join(filter(str.isdigit, call_data['phone']))
             if len(clean_phone) > 6:
                 c.execute("SELECT instagram_id FROM clients WHERE phone LIKE %s LIMIT 1", (f"%{clean_phone}%",))
                 row = c.fetchone()
                 if row:
                     client_id = row[0]

        # Check if call already exists by external_id
        if external_id:
            c.execute("SELECT id FROM call_logs WHERE external_id = %s", (external_id,))
            id_row = c.fetchone()
            if id_row:
                call_id = id_row[0]
                # Update existing call
                fields = []
                params = []
                # Fields we allow to update from webhook
                updateable = ['status', 'duration', 'recording_url', 'transcription', 'notes', 'recording_file']
                for field in updateable:
                    if field in call_data and call_data[field] is not None:
                        fields.append(f"{field} = %s")
                        params.append(call_data[field])
                
                if fields:
                    params.append(call_id)
                    query = f"UPDATE call_logs SET {', '.join(fields)} WHERE id = %s"
                    c.execute(query, params)
                    conn.commit()
                    logger.info(f"Updated existing call {call_id} (external_id: {external_id})")
                    return

        # Insert new call if not found or no external_id
        c.execute("""
            INSERT INTO call_logs (
                phone, client_id, direction, status, duration, recording_url, 
                created_at, external_id, notes, transcription
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            call_data.get('phone'), client_id, call_data.get('direction'), 
            call_data.get('status'), call_data.get('duration'), call_data.get('recording_url'),
            call_data.get('created_at'), call_data.get('external_id'), 
            call_data.get('notes'), call_data.get('transcription')
        ))
        conn.commit()
        logger.info(f"Inserted new call from webhook")
    except Exception as e:
        logger.error(f"Error saving webhook call: {e}")
    finally:
        conn.close()
