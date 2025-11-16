"""
API Endpoints для работы с записями
"""
from fastapi import APIRouter, Request, Cookie, File, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

from db import (
    get_all_bookings, save_booking, update_booking_status,
    get_or_create_client, update_client_info, log_activity
)
from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_error, log_warning

router = APIRouter(tags=["Bookings"])


def get_client_messengers_for_bookings(client_id: str):
    """Получить список мессенджеров клиента для bookings"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    messengers = []

    # Проверяем Instagram
    c.execute("SELECT COUNT(*) FROM chat_history WHERE instagram_id = ?", (client_id,))
    if c.fetchone()[0] > 0:
        messengers.append('instagram')

    # Проверяем другие мессенджеры
    c.execute("""
        SELECT DISTINCT messenger_type
        FROM messenger_messages
        WHERE client_id = ?
    """, (client_id,))

    for row in c.fetchall():
        if row[0] not in messengers:
            messengers.append(row[0])

    conn.close()
    return messengers


@router.get("/bookings")
async def list_bookings(session_token: Optional[str] = Cookie(None)):
    """Получить все записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    bookings = get_all_bookings()

    # Добавляем информацию о мессенджерах для каждой записи
    bookings_with_messengers = []
    for b in bookings:
        client_id = b[1]
        messengers = get_client_messengers_for_bookings(client_id)

        bookings_with_messengers.append({
            "id": b[0],
            "client_id": client_id,
            "service": b[2],
            "datetime": b[3],
            "phone": b[4],
            "name": b[5],
            "status": b[6],
            "created_at": b[7],
            "revenue": b[8] if len(b) > 8 else 0,
            "messengers": messengers
        })

    return {
        "bookings": bookings_with_messengers,
        "count": len(bookings)
    }


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Получить одну запись по ID"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    bookings = get_all_bookings()
    booking = next((b for b in bookings if b[0] == booking_id), None)
    
    if not booking:
        return JSONResponse({"error": "Booking not found"}, status_code=404)
    
    return {
        "id": booking[0],
        "client_id": booking[1],
        "service": booking[2],
        "datetime": booking[3],
        "phone": booking[4],
        "name": booking[5],
        "status": booking[6],
        "created_at": booking[7],
        "revenue": booking[8] if len(booking) > 8 else 0
    }


@router.post("/bookings")
async def create_booking_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать запись"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    data = await request.json()

    try:
        instagram_id = data.get('instagram_id')
        service = data.get('service')
        datetime_str = f"{data.get('date')} {data.get('time')}"
        phone = data.get('phone', '')
        name = data.get('name')
        master = data.get('master', '')

        get_or_create_client(instagram_id, username=name)
        save_booking(instagram_id, service, datetime_str, phone, name, master=master)

        # Получаем ID созданной записи
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("SELECT id FROM bookings WHERE instagram_id = ? ORDER BY id DESC LIMIT 1",
                  (instagram_id,))
        booking_result = c.fetchone()
        booking_id = booking_result[0] if booking_result else None
        conn.close()

        log_activity(user["id"], "create_booking", "booking", instagram_id,
                    f"Service: {service}")

        # Отправляем уведомление мастеру
        if master and booking_id:
            try:
                from notifications import notify_master_about_booking, get_master_info, save_notification_log

                # Отправляем уведомления асинхронно
                notification_results = await notify_master_about_booking(
                    master_name=master,
                    client_name=name,
                    service=service,
                    datetime_str=datetime_str,
                    phone=phone,
                    booking_id=booking_id
                )

                # Сохраняем логи уведомлений
                master_info = get_master_info(master)
                if master_info:
                    for notif_type, success in notification_results.items():
                        if success:
                            save_notification_log(
                                master_id=master_info["id"],
                                booking_id=booking_id,
                                notification_type=notif_type,
                                status="sent"
                            )
                        elif master_info.get(notif_type) or master_info.get(f"{notif_type}_username"):
                            # Пытались отправить, но не получилось
                            save_notification_log(
                                master_id=master_info["id"],
                                booking_id=booking_id,
                                notification_type=notif_type,
                                status="failed"
                            )
            except Exception as e:
                # Не блокируем создание записи, если уведомление не отправилось
                log_error(f"Error sending master notification: {e}", "api")

        return {"success": True, "message": "Booking created", "booking_id": booking_id}
    except Exception as e:
        log_error(f"Booking creation error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/bookings/{booking_id}/status")
async def update_booking_status_api(
    booking_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить статус записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    status = data.get('status')
    
    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)
    
    success = update_booking_status(booking_id, status)
    if success:
        log_activity(user["id"], "update_booking_status", "booking", 
                    str(booking_id), f"Status: {status}")
        return {"success": True, "message": "Booking status updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)


@router.post("/bookings/import")
async def import_bookings(
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Импортировать записи из CSV или Excel файла"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        if not file.filename:
            return JSONResponse({"error": "No file provided"}, status_code=400)
        
        file_ext = file.filename.split('.')[-1].lower()
        
        if file_ext not in ['csv', 'xlsx', 'xls']:
            return JSONResponse({"error": "Invalid file format. Use CSV or Excel"}, 
                              status_code=400)
        
        content = await file.read()
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        if file_ext == 'csv':
            import csv
            import io
            import time
            
            csv_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            for row in csv_reader:
                try:
                    instagram_id = row.get('instagram_id') or row.get('ID') or \
                                  f"import_{int(time.time())}_{imported_count}"
                    name = row.get('name') or row.get('Имя') or 'Импортированный клиент'
                    phone = row.get('phone') or row.get('Телефон') or ''
                    service = row.get('service') or row.get('Услуга') or 'Неизвестно'
                    datetime_str = row.get('datetime') or row.get('Дата/Время') or \
                                  datetime.now().isoformat()
                    status = row.get('status') or row.get('Статус') or 'pending'
                    revenue = float(row.get('revenue') or row.get('Доход') or 0)
                    
                    get_or_create_client(instagram_id, username=name)
                    
                    if phone or name:
                        update_client_info(instagram_id, name=name, phone=phone)
                    
                    conn = sqlite3.connect(DATABASE_NAME)
                    c = conn.cursor()
                    
                    c.execute("""INSERT INTO bookings 
                                 (instagram_id, service_name, datetime, phone, name, 
                                  status, created_at, revenue)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                              (instagram_id, service, datetime_str, phone, name, status, 
                               datetime.now().isoformat(), revenue))
                    
                    conn.commit()
                    conn.close()
                    
                    imported_count += 1
                    
                except Exception as e:
                    skipped_count += 1
                    errors.append(f"Строка {imported_count + skipped_count}: {str(e)}")
        
        elif file_ext in ['xlsx', 'xls']:
            try:
                from openpyxl import load_workbook
            except ImportError:
                return JSONResponse({"error": "Excel support not available"}, 
                                  status_code=500)
            
            import io
            import time
            
            wb = load_workbook(io.BytesIO(content))
            ws = wb.active
            
            headers = [cell.value for cell in ws[1]]
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                try:
                    row_dict = dict(zip(headers, row))
                    
                    instagram_id = row_dict.get('instagram_id') or row_dict.get('ID') or \
                                  f"import_{int(time.time())}_{imported_count}"
                    name = row_dict.get('name') or row_dict.get('Имя') or \
                          'Импортированный клиент'
                    phone = str(row_dict.get('phone') or row_dict.get('Телефон') or '')
                    service = row_dict.get('service') or row_dict.get('Услуга') or 'Неизвестно'
                    datetime_str = str(row_dict.get('datetime') or 
                                     row_dict.get('Дата/Время') or 
                                     datetime.now().isoformat())
                    status = row_dict.get('status') or row_dict.get('Статус') or 'pending'
                    revenue = float(row_dict.get('revenue') or row_dict.get('Доход') or 0)
                    
                    get_or_create_client(instagram_id, username=name)
                    
                    if phone or name:
                        update_client_info(instagram_id, name=name, phone=phone)
                    
                    conn = sqlite3.connect(DATABASE_NAME)
                    c = conn.cursor()
                    
                    c.execute("""INSERT INTO bookings 
                                 (instagram_id, service_name, datetime, phone, name, 
                                  status, created_at, revenue)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                              (instagram_id, service, datetime_str, phone, name, status, 
                               datetime.now().isoformat(), revenue))
                    
                    conn.commit()
                    conn.close()
                    
                    imported_count += 1
                    
                except Exception as e:
                    skipped_count += 1
                    errors.append(f"Строка {imported_count + skipped_count + 1}: {str(e)}")
        
        log_activity(user["id"], "import_bookings", "bookings", str(imported_count), 
                     f"Imported {imported_count} bookings")
        
        return {
            "success": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10] if errors else []
        }
        
    except Exception as e:
        log_error(f"Import error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/bookings/{booking_id}/waitlist")
async def add_to_booking_waitlist(
    booking_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить клиента в лист ожидания (#17)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        instagram_id = data.get('instagram_id')
        service = data.get('service')
        preferred_date = data.get('date')
        preferred_time = data.get('time')
        
        if not all([instagram_id, service, preferred_date, preferred_time]):
            return JSONResponse({"error": "Missing required fields"}, status_code=400)
        
        from db.bookings import add_to_waitlist
        add_to_waitlist(instagram_id, service, preferred_date, preferred_time)
        
        log_activity(user["id"], "add_to_waitlist", "booking", 
                    str(booking_id), f"Added to waitlist")
        
        return {"success": True, "message": "Added to waitlist"}
        
    except Exception as e:
        log_error(f"Waitlist error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/bookings/pattern/{client_id}")
async def get_client_booking_pattern(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить обычный паттерн записи клиента (#7)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        from db.bookings import get_client_usual_booking_pattern
        pattern = get_client_usual_booking_pattern(client_id)
        
        return {
            "has_pattern": pattern is not None,
            "pattern": pattern
        }
        
    except Exception as e:
        log_error(f"Pattern error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/bookings/incomplete/{client_id}")
async def get_incomplete_client_booking(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить незавершённую запись (#4)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        from db.bookings import get_incomplete_booking
        incomplete = get_incomplete_booking(client_id)
        
        return {
            "has_incomplete": incomplete is not None,
            "booking": incomplete
        }
        
    except Exception as e:
        log_error(f"Incomplete booking error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/bookings/course-progress/{client_id}")
async def get_course_progress(
    client_id: str,
    service: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить прогресс по курсу (#11)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        from db.bookings import get_client_course_progress
        progress = get_client_course_progress(client_id, service)
        
        return {
            "has_course": progress is not None,
            "progress": progress
        }
        
    except Exception as e:
        log_error(f"Course progress error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/bookings/no-show-risk/{client_id}")
async def get_no_show_risk(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить риск no-show клиента (#19)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        from db.clients import calculate_no_show_risk
        risk = calculate_no_show_risk(client_id)
        
        risk_level = "low"
        if risk > 0.5:
            risk_level = "high"
        elif risk > 0.3:
            risk_level = "medium"
        
        return {
            "risk_score": risk,
            "risk_level": risk_level,
            "requires_deposit": risk > 0.4
        }
        
    except Exception as e:
        log_error(f"No-show risk error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)