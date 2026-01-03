"""
API Endpoints для работы с записями
"""
from fastapi import APIRouter, Request, Cookie, File, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional

from datetime import datetime

from db import (
    get_all_bookings, save_booking,
    update_booking_status,
    get_or_create_client, update_client_info, log_activity,
    get_bookings_by_phone,
    get_bookings_by_client,
    get_bookings_by_master,
    get_booking_progress,
    update_booking_progress,
)
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_warning, log_info
from services.smart_assistant import SmartAssistant
from notifications.master_notifications import notify_master_about_booking, get_master_info, save_notification_log

router = APIRouter(tags=["Bookings"])

def get_client_messengers_for_bookings(client_id: str):
    """Получить список мессенджеров клиента для bookings"""
    conn = get_db_connection()
    c = conn.cursor()

    messengers = []

    # Проверяем Instagram
    c.execute("SELECT COUNT(*) FROM chat_history WHERE instagram_id = %s", (client_id,))
    if c.fetchone()[0] > 0:
        messengers.append('instagram')

    # Проверяем другие мессенджеры
    c.execute("""
        SELECT DISTINCT messenger_type
        FROM messenger_messages
        WHERE client_id = %s
    """, (client_id,))

    for row in c.fetchall():
        if row[0] not in messengers:
            messengers.append(row[0])

    conn.close()
    return messengers

@router.get("/client/bookings")
async def get_client_bookings(session_token: Optional[str] = Cookie(None)):
    """Получить записи текущего клиента (API)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    user_id = user.get("id")
    instagram_id = user.get("username")
    phone = user.get("phone")
    full_name = user.get("full_name")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Primary: Search by user_id (most reliable)
        c.execute("""
            SELECT id, instagram_id, service_name, datetime, phone,
                   name, status, created_at, revenue, master
            FROM bookings
            WHERE user_id = %s
            ORDER BY datetime DESC
        """, (user_id,))
        bookings = c.fetchall()

        # Fallback: If no bookings found by user_id, try other methods
        if len(bookings) == 0:
            # Try by username/phone/name
            c.execute("""
                SELECT id, instagram_id, service_name, datetime, phone,
                       name, status, created_at, revenue, master
                FROM bookings
                WHERE instagram_id = %s
                   OR (phone IS NOT NULL AND phone = %s)
                   OR (name IS NOT NULL AND LOWER(name) = LOWER(%s))
                ORDER BY datetime DESC
            """, (instagram_id, phone or '', full_name or ''))
            bookings = c.fetchall()

    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error fetching client bookings: {e}", "bookings")
        bookings = []
    finally:
        conn.close()
    
    # Format dates
    formatted_bookings = []
    for b in bookings:
        formatted_bookings.append({
            "id": b[0],
            "instagram_id": b[1],
            "service_name": b[2],
            "start_time": b[3], # Keep ISO format for JS
            "phone": b[4],
            "name": b[5],
            "status": b[6],
            "created_at": b[7],
            "revenue": b[8],
            "master_name": b[9] if len(b) > 9 else None
        })
        
    return {
        "bookings": formatted_bookings,
        "count": len(formatted_bookings)
    }

@router.get("/bookings")
async def list_bookings(session_token: Optional[str] = Cookie(None)):
    """Получить все записи (или записи конкретного мастера для employees)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # RBAC: Clients cannot see all bookings
    if user["role"] == "client":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    # Если сотрудник - показываем только его записи
    if user["role"] == "employee":
        full_name = user.get("full_name", "")
        bookings = get_bookings_by_master(full_name)
    else:
        # Админ/менеджер видят все записи
        bookings = get_all_bookings()

    # Добавляем информацию о мессенджерах для каждой записи
    bookings_with_messengers = []
    
    # Cache for client phones to avoid multiple DB lookups for same client
    client_phones = {}

    for b in bookings:
        client_id = b[1]
        messengers = get_client_messengers_for_bookings(client_id)
        
        # Get phone from booking row
        phone = b[4] if len(b) > 4 else ''
        
        # Fallback to clients table if phone is missing in booking
        if not phone and client_id:
            if client_id in client_phones:
                phone = client_phones[client_id]
            else:
                conn = get_db_connection()
                c = conn.cursor()
                c.execute("SELECT phone FROM clients WHERE instagram_id = %s", (client_id,))
                client_row = c.fetchone()
                conn.close()
                if client_row and client_row[0]:
                    phone = client_row[0]
                    client_phones[client_id] = phone
                else:
                    client_phones[client_id] = ''

        bookings_with_messengers.append({
            "id": b[0],
            "client_id": client_id,
            "service": b[2] if len(b) > 2 else None,
            "service_name": b[2] if len(b) > 2 else None,  # ✅ Дублируем для совместимости
            "datetime": b[3] if len(b) > 3 else None,
            "phone": phone,
            "name": b[5] if len(b) > 5 else '',
            "status": b[6] if len(b) > 6 else 'pending',
            "created_at": b[7] if len(b) > 7 else None,
            "revenue": b[8] if len(b) > 8 else 0,
            "master": b[9] if len(b) > 9 else None,
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
        
    # RBAC: Clients can only see their own bookings
    if user["role"] == "client":
        booking_client_id = booking[1]
        booking_phone = booking[4]
        
        user_client_id = user.get("username")
        user_phone = user.get("phone")
        
        # Check fuzzy match
        is_owner = (user_client_id and str(user_client_id) == str(booking_client_id))
        if not is_owner and user_phone and booking_phone:
             # Basic phone normalization for comparison if needed, currently exact match
             is_owner = (str(user_phone) == str(booking_phone))
             
        if not is_owner:
            return JSONResponse({"error": "Forbidden"}, status_code=403)
    
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

from fastapi import BackgroundTasks

async def process_booking_background_tasks(
    booking_id: int,
    data: dict,
    user_id: str
):
    """Background task handler for new bookings with timeouts"""
    import asyncio
    
    try:
        instagram_id = data.get('instagram_id')
        service = data.get('service')
        datetime_str = f"{data.get('date')} {data.get('time')}"
        phone = data.get('phone', '')
        name = data.get('name')
        master = data.get('master', '')

        # 1. 🧠 Smart Assistant Learning (with timeout)
        try:
            async def learn_task():
                assistant = SmartAssistant(instagram_id)
                assistant.learn_from_booking({
                    'service': service,
                    'master': master,
                    'datetime': datetime_str,
                    'phone': phone,
                    'name': name
                })
                log_info(f"🧠 SmartAssistant learned from booking for {instagram_id}", "bookings")
            
            await asyncio.wait_for(learn_task(), timeout=5.0)
        except asyncio.TimeoutError:
            log_warning(f"⏱️ SmartAssistant learning timed out for {instagram_id}", "bookings")
        except Exception as e:
            log_error(f"❌ SmartAssistant learning failed: {e}", "bookings")

        # 2. Notify Master (with timeout)
        if master and booking_id:
            try:
                async def notify_master_task():
                    notification_results = await notify_master_about_booking(
                        master_name=master,
                        client_name=name,
                        service=service,
                        datetime_str=datetime_str,
                        phone=phone,
                        booking_id=booking_id
                    )

                    # Log notifications
                    master_info = get_master_info(master)
                    if master_info:
                        for notif_type, success in notification_results.items():
                            if success:
                                save_notification_log(master_info["id"], booking_id, notif_type, "sent")
                            elif master_info.get(notif_type) or master_info.get(f"{notif_type}_username"):
                                save_notification_log(master_info["id"], booking_id, notif_type, "failed")
                
                await asyncio.wait_for(notify_master_task(), timeout=5.0)
            except asyncio.TimeoutError:
                log_warning(f"⏱️ Master notification timed out for booking {booking_id}", "bookings")
            except Exception as e:
                log_error(f"❌ Error sending master notification: {e}", "api")

        # 3. Notify Admin (with timeout)
        try:
            await asyncio.wait_for(notify_admin_about_booking(data), timeout=5.0)
        except asyncio.TimeoutError:
            log_warning(f"⏱️ Admin notification timed out for booking {booking_id}", "bookings")
        except Exception as e:
            log_error(f"❌ Error sending admin notification: {e}", "api")
        
    except Exception as e:
        log_error(f"❌ Background task error: {e}", "background_tasks")

@router.post("/bookings")
async def create_booking_api(
    request: Request,
    background_tasks: BackgroundTasks,
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
        revenue = data.get('revenue', 0)
        user_id = user["id"]

        # Synchronous DB Save (Required for ID)
        get_or_create_client(instagram_id, username=name, phone=phone)
        save_booking(instagram_id, service, datetime_str, phone, name, master=master, user_id=user_id, revenue=revenue)

        # ✅ SYNC: Update phone and name in both tables if they are new or different
        if phone or name:
            # 1. Update in clients table
            update_client_info(instagram_id, phone=phone, name=name)
            
            # 2. Update in users table if user is authenticated
            from db.users import update_user_info as db_update_user
            user_updates = {}
            if phone: user_updates['phone'] = phone
            if name: user_updates['full_name'] = name
            
            if user_updates and user_id:
                db_update_user(user_id, user_updates)

        # Get ID
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id FROM bookings WHERE instagram_id = %s ORDER BY id DESC LIMIT 1", (instagram_id,))
        booking_result = c.fetchone()
        booking_id = booking_result[0] if booking_result else None
        conn.close()

        log_activity(user_id, "create_booking", "booking", instagram_id, f"Service: {service}")

        # Offload slow tasks
        if booking_id:
            background_tasks.add_task(process_booking_background_tasks, booking_id, data, user_id)

        return {"success": True, "message": "Booking created", "booking_id": booking_id}
    except Exception as e:
        log_error(f"Booking creation error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

async def notify_admin_booking_status_change(booking_id: int, old_status: str, new_status: str):
    """Уведомить админа об изменении статуса записи"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio

    try:
        # Get booking details
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT b.instagram_id, b.service_name, b.datetime, b.master, c.name, c.phone
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE b.id = %s
        """, (booking_id,))
        row = c.fetchone()
        conn.close()

        if not row:
            return

        instagram_id, service, datetime_str, master, client_name, phone = row
        client_display = client_name or instagram_id

        # Status translations
        status_emoji = {
            'pending': '⏳',
            'confirmed': '✅',
            'cancelled': '❌',
            'completed': '✔️',
            'no_show': '👻'
        }

        status_text = {
            'pending': 'Ожидает подтверждения',
            'confirmed': 'Подтверждена',
            'cancelled': 'Отменена',
            'completed': 'Завершена',
            'no_show': 'Не пришел'
        }

        admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')

        subject = f"{status_emoji.get(new_status, '📝')} Изменение статуса записи: {client_display}"
        message = (
            f"Клиент: {client_display}\n"
            f"Телефон: {phone or 'Не указан'}\n"
            f"Услуга: {service}\n"
            f"Мастер: {master or 'Любой'}\n"
            f"Дата/Время: {datetime_str}\n"
            f"Старый статус: {status_text.get(old_status, old_status)}\n"
            f"Новый статус: {status_text.get(new_status, new_status)}"
        )

        # Email
        if admin_email:
            try:
                send_email_sync([admin_email], subject, message)
            except Exception as e:
                print(f"Error sending email: {e}")

        # Telegram
        try:
            tg_msg = (
                f"{status_emoji.get(new_status, '📝')} <b>Изменение статуса записи</b>\n\n"
                f"👤 <b>Клиент:</b> {client_display}\n"
                f"📞 <b>Телефон:</b> {phone or 'Не указан'}\n"
                f"💅 <b>Услуга:</b> {service}\n"
                f"👨‍💼 <b>Мастер:</b> {master or 'Любой'}\n"
                f"🕒 <b>Время:</b> {datetime_str}\n"
                f"📊 <b>Статус:</b> {status_text.get(old_status, old_status)} → {status_text.get(new_status, new_status)}"
            )
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_telegram_alert(tg_msg))
            loop.close()
        except Exception as e:
            print(f"Error sending telegram: {e}")
    except Exception as e:
        print(f"Error notifying admin about status change: {e}")

async def notify_admin_about_booking(data: dict):
    """Notify admin about new booking with timeouts"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    name = data.get('name')
    phone = data.get('phone')
    service = data.get('service')
    datetime_str = f"{data.get('date')} {data.get('time')}"
    master = data.get('master', 'Любой специалист')
    
    # 1. Email Admin (with timeout)
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    if admin_email:
        subject = f"📅 Новая запись: {name}"
        message_text = (
            f"Имя: {name}\n"
            f"Телефон: {phone}\n"
            f"Услуга: {service}\n"
            f"Мастер: {master}\n"
            f"Время: {datetime_str}"
        )
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(
                loop.run_in_executor(None, lambda: send_email_sync([admin_email], subject, message_text)),
                timeout=3.0
            )
        except asyncio.TimeoutError:
            log_warning(f"⏱️ Admin email timed out for booking: {name}", "notifications")
        except Exception as e:
            log_error(f"❌ Error sending admin email: {e}", "notifications")

    # 2. Telegram Admin (with timeout)
    try:
        telegram_message = (
            f"📅 <b>Новая запись!</b>\n\n"
            f"👤 <b>Имя:</b> {name}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💇‍♀️ <b>Услуга:</b> {service}\n"
            f"👤 <b>Мастер:</b> {master}\n"
            f"🕒 <b>Время:</b> {datetime_str}"
        )
        await asyncio.wait_for(send_telegram_alert(telegram_message), timeout=3.0)
    except asyncio.TimeoutError:
        log_warning(f"⏱️ Admin telegram timed out for booking: {name}", "notifications")
    except Exception as e:
        log_error(f"❌ Error sending admin telegram: {e}", "notifications")

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

    # RBAC: Clients can only cancel their own bookings
    if user["role"] == "client":
        if status != "cancelled":
            return JSONResponse({"error": "Forbidden: Clients can only cancel bookings"}, status_code=403)
            
        # Verify ownership
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT instagram_id, phone FROM bookings WHERE id = %s", (booking_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
             return JSONResponse({"error": "Booking not found"}, status_code=404)
        
        # Check ownership (username=instagram_id)
        is_owner = (user.get("username") and str(user.get("username")) == str(row[0]))
        if not is_owner and user.get("phone") and row[1]:
             is_owner = (str(user.get("phone")) == str(row[1]))
             
        if not is_owner:
            return JSONResponse({"error": "Forbidden"}, status_code=403)


    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)

    # Get old status before updating
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT status FROM bookings WHERE id = %s", (booking_id,))
    old_status_row = c.fetchone()
    conn.close()

    old_status = old_status_row[0] if old_status_row else None

    success = update_booking_status(booking_id, status)
    if success:
        log_activity(user["id"], "update_booking_status", "booking",
                    str(booking_id), f"Status: {status}")

        # Notify admin about status change
        if old_status and old_status != status:
            import asyncio
            try:
                asyncio.create_task(notify_admin_booking_status_change(booking_id, old_status, status))
            except:
                # If event loop is not running, run in new loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(notify_admin_booking_status_change(booking_id, old_status, status))
                loop.close()
        
        # ✅ Автоматическое начисление баллов (только при переходе в completed)
        if status == 'completed':
            try:
                # Получаем данные записи для начисления
                conn = get_db_connection()
                c = conn.cursor()
                # Join with services to get category
                c.execute("""
                    SELECT b.instagram_id, b.revenue, b.service_name, s.category 
                    FROM bookings b
                    LEFT JOIN services s ON b.service_name = s.name
                    WHERE b.id = %s
                """, (booking_id,))
                b_row = c.fetchone()
                conn.close()

                if b_row:
                    client_id, revenue, service_name, category = b_row
                    revenue = revenue or 0
                    
                    from services.loyalty import LoyaltyService
                    loyalty = LoyaltyService()
                    
                    # Проверяем, не начислены ли уже баллы
                    if not loyalty.has_earned_for_booking(booking_id):
                        # Pass category to calculation
                        points = loyalty.points_for_booking(revenue, service_category=category)
                        if points > 0:
                            loyalty.earn_points(
                                client_id=client_id,
                                points=points,
                                reason=f"Посещение: {service_name}",
                                booking_id=booking_id
                            )
            except Exception as e:
                log_error(f"Error earning loyalty points: {e}", "api")

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
                    
                    conn = get_db_connection()
                    c = conn.cursor()
                    
                    c.execute("""INSERT INTO bookings 
                                 (instagram_id, service_name, datetime, phone, name, 
                                  status, created_at, revenue)
                                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
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
            
            if ws is None:
                return JSONResponse({"error": "No active worksheet found"}, status_code=400)
            
            headers = [cell.value for cell in ws[1]]
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                try:
                    row_dict = dict(zip(headers, row))
                    
                    # Извлекаем данные из row_dict с fallback значениями
                    instagram_id = str(row_dict.get('instagram_id') or row_dict.get('ID') or f"import_{int(time.time())}_{imported_count}")
                    name = str(row_dict.get('name') or row_dict.get('Имя') or 'Импортированный клиент')
                    phone = str(row_dict.get('phone') or row_dict.get('Телефон') or '')
                    service = str(row_dict.get('service') or row_dict.get('Услуга') or 'Неизвестно')
                    datetime_str = str(
                        row_dict.get('datetime') or
                        row_dict.get('Дата/Время') or
                        datetime.now().isoformat()
                    )
                    status = str(row_dict.get('status') or row_dict.get('Статус') or 'pending')
                    revenue = row_dict.get('revenue') or row_dict.get('Доход') or 0

                    
                    get_or_create_client(instagram_id, username=name)
                    
                    if phone or name:
                        update_client_info(instagram_id, name=name, phone=phone)
                    
                    conn = get_db_connection()
                    c = conn.cursor()
                    
                    c.execute("""INSERT INTO bookings 
                                 (instagram_id, service_name, datetime, phone, name, 
                                  status, created_at, revenue)
                                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
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

@router.put("/bookings/{booking_id}")
async def update_booking_api(
    booking_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить запись (полное обновление)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    # RBAC: Clients cannot direct update bookings (must use cancellation)
    if user["role"] == "client":
        return JSONResponse({"error": "Forbidden: Clients cannot edit bookings directly"}, status_code=403)

    data = await request.json()

    try:
        # Получаем старую запись для сравнения
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT instagram_id, service_name, datetime, master, name, phone FROM bookings WHERE id = %s",
                  (booking_id,))
        old_booking = c.fetchone()

        if not old_booking:
            conn.close()
            return JSONResponse({"error": "Booking not found"}, status_code=404)

        current_instagram_id, old_service, old_datetime, old_master, old_name, old_phone = old_booking

        # Обновляем запись
        new_service = data.get('service', old_service)
        new_datetime = f"{data.get('date')} {data.get('time')}" if data.get('date') and data.get('time') else old_datetime
        new_master = data.get('master', old_master)
        new_name = data.get('name', old_name)
        new_phone = data.get('phone', old_phone)
        new_revenue = data.get('revenue', 0)

        # Sync client info if phone/name changed
        if new_phone != old_phone or new_name != old_name:
            from db.clients import update_client_info
            update_client_info(current_instagram_id, phone=new_phone, name=new_name)

        c.execute("""
            UPDATE bookings
            SET service_name = %s, datetime = %s, master = %s, name = %s, phone = %s, revenue = %s
            WHERE id = %s
        """, (new_service, new_datetime, new_master, new_name, new_phone, new_revenue, booking_id))

        conn.commit()
        conn.close()

        log_activity(user["id"], "update_booking", "booking", str(booking_id),
                    f"Updated booking: {new_service}")

        # Отправляем уведомление мастеру об изменении
        if new_master:
            try:
                notification_results = await notify_master_about_booking(
                    master_name=new_master,
                    client_name=new_name,
                    service=new_service,
                    datetime_str=new_datetime,
                    phone=new_phone,
                    booking_id=booking_id,
                    notification_type="booking_change"
                )

                # Сохраняем логи
                master_info = get_master_info(new_master)
                if master_info:
                    for notif_type, success in notification_results.items():
                        if success or master_info.get(notif_type) or master_info.get(f"{notif_type}_username"):
                            save_notification_log(
                                master_id=master_info["id"],
                                booking_id=booking_id,
                                notification_type=notif_type,
                                status="sent" if success else "failed"
                            )

            except Exception as e:
                log_error(f"Error sending booking change notification: {e}", "api")

        return {"success": True, "message": "Booking updated", "booking_id": booking_id}

    except Exception as e:
        log_error(f"Booking update error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.delete("/bookings/{booking_id}")
async def delete_booking_api(
    booking_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить запись (с уведомлением мастеру)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    # RBAC: Clients cannot delete bookings (must use cancellation)
    if user["role"] == "client":
        return JSONResponse({"error": "Forbidden: Clients cannot delete bookings directly"}, status_code=403)

    try:
        # Получаем информацию о записи для уведомления
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT service_name, datetime, master, name, phone FROM bookings WHERE id = %s",
                  (booking_id,))
        booking = c.fetchone()

        if not booking:
            conn.close()
            return JSONResponse({"error": "Booking not found"}, status_code=404)

        service, datetime_str, master, name, phone = booking

        # Отправляем уведомление мастеру об отмене ПЕРЕД удалением
        # (чтобы можно было сохранить лог уведомления)
        if master:
            try:
                notification_results = await notify_master_about_booking(
                    master_name=master,
                    client_name=name,
                    service=service,
                    datetime_str=datetime_str,
                    phone=phone,
                    booking_id=booking_id,
                    notification_type="booking_cancel"
                )

                # Сохраняем логи
                master_info = get_master_info(master)
                if master_info:
                    for notif_type, success in notification_results.items():
                        if success or master_info.get(notif_type) or master_info.get(f"{notif_type}_username"):
                            save_notification_log(
                                master_id=master_info["id"],
                                booking_id=booking_id,
                                notification_type=notif_type,
                                status="sent" if success else "failed"
                            )

            except Exception as e:
                log_error(f"Error sending booking cancel notification: {e}", "api")

        # ✅ Удаляем зависимые записи из таблиц с FOREIGN KEY на bookings
        c.execute("DELETE FROM booking_reminders_sent WHERE booking_id = %s", (booking_id,))
        c.execute("DELETE FROM loyalty_transactions WHERE booking_id = %s", (booking_id,))
        c.execute("DELETE FROM ratings WHERE booking_id = %s", (booking_id,))
        c.execute("DELETE FROM reminder_logs WHERE booking_id = %s", (booking_id,))
        c.execute("DELETE FROM notification_logs WHERE booking_id = %s", (booking_id,))

        # Удаляем запись
        c.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
        conn.commit()
        conn.close()

        try:
            log_activity(user["id"], "delete_booking", "booking", str(booking_id),
                        f"Deleted booking: {service}")
        except Exception as log_err:
            log_error(f"Error logging activity for booking deletion: {log_err}", "api")

        return {"success": True, "message": "Booking deleted"}

    except Exception as e:
        log_error(f"Booking deletion error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)