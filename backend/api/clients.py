"""
API Endpoints для работы с клиентами
"""
from fastapi import APIRouter, Request, Cookie, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import time

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from db import (
    get_all_clients, get_client_by_id, get_or_create_client,
    update_client_info, update_client_status, pin_client,
    delete_client, get_chat_history, get_all_bookings,
    log_activity,update_client_bot_mode
)
from utils.utils import require_auth, get_total_unread, get_client_display_name, hash_password
from utils.logger import log_error,log_info
from services.smart_assistant import SmartAssistant, get_smart_greeting, get_smart_suggestion

router = APIRouter(tags=["Clients"])

def get_client_messengers(client_id: str):
    """Получить список мессенджеров, которыми пользуется клиент"""
    conn = get_db_connection()
    c = conn.cursor()

    messengers = []

    # Проверяем Instagram (из старой таблицы)
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

def get_clients_by_messenger(messenger_type: str = 'instagram'):
    """Получить клиентов по типу мессенджера"""
    conn = get_db_connection()
    c = conn.cursor()

    if messenger_type == 'instagram':
        # Для Instagram - оптимизированный запрос с JOIN вместо подзапросов (N+1 fix)
        c.execute("""
            SELECT DISTINCT
                c.instagram_id, c.username, c.phone, c.name, c.first_contact,
                c.last_contact, c.total_messages, c.labels, c.status, c.lifetime_value,
                c.profile_pic, c.notes, c.is_pinned, c.gender, 1 as has_messages,
                c.created_at,
                COALESCE(b.total_spend, 0) as total_spend,
                COALESCE(b.total_bookings, 0) as total_bookings,
                c.temperature
            FROM clients c
            LEFT JOIN (
                SELECT instagram_id,
                       SUM(revenue) as total_spend,
                       COUNT(*) as total_bookings
                FROM bookings
                WHERE status = 'completed'
                GROUP BY instagram_id
            ) b ON c.instagram_id = b.instagram_id
            WHERE EXISTS (
                SELECT 1 FROM chat_history ch WHERE ch.instagram_id = c.instagram_id
            ) OR EXISTS (
                SELECT 1 FROM messenger_messages mm WHERE mm.client_id = c.instagram_id AND mm.messenger_type = 'instagram'
            )
            ORDER BY c.is_pinned DESC, c.last_contact DESC
        """)
    else:
        # Для других мессенджеров - оптимизированный запрос с JOIN (N+1 fix)
        c.execute("""
            SELECT DISTINCT
                c.instagram_id, c.username, c.phone, c.name, c.first_contact,
                c.last_contact, c.total_messages, c.labels, c.status, c.lifetime_value,
                c.profile_pic, c.notes, c.is_pinned, c.gender, 1 as has_messages,
                c.created_at,
                COALESCE(b.total_spend, 0) as total_spend,
                COALESCE(b.total_bookings, 0) as total_bookings,
                c.temperature
            FROM clients c
            LEFT JOIN (
                SELECT instagram_id,
                       SUM(revenue) as total_spend,
                       COUNT(*) as total_bookings
                FROM bookings
                WHERE status = 'completed'
                GROUP BY instagram_id
            ) b ON c.instagram_id = b.instagram_id
            JOIN messenger_messages mm ON c.instagram_id = mm.client_id
            WHERE mm.messenger_type = %s
            ORDER BY c.is_pinned DESC, c.last_contact DESC
        """, (messenger_type,))

    clients = c.fetchall()
    conn.close()
    return clients

def get_clients_by_master(master_name: str):
    """
    Получить клиентов конкретного мастера (для employee)
    Возвращает только тех клиентов, у которых есть записи к данному мастеру
    БЕЗ контактных данных и финансовой аналитики
    """
    from utils.logger import log_info
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT
            c.instagram_id, 
            c.username, 
            NULL as phone,  -- ❌ Скрываем телефон
            c.name, 
            c.first_contact,
            c.last_contact, 
            c.total_messages, 
            c.labels, 
            c.status, 
            0 as lifetime_value,  -- ❌ Скрываем финансы
            c.profile_pic, 
            c.notes, 
            c.is_pinned, 
            c.gender, 
            1 as has_messages,
            c.created_at,
            0 as total_spend,  -- ❌ Скрываем выручку
            COALESCE((SELECT COUNT(*) FROM bookings WHERE instagram_id = c.instagram_id AND status = 'completed' AND master = %s), 0) as total_bookings,
            c.temperature
        FROM clients c
        INNER JOIN bookings b ON c.instagram_id = b.instagram_id
        WHERE b.master = %s
        ORDER BY c.is_pinned DESC, c.last_contact DESC
    """, (master_name, master_name))
    
    clients = c.fetchall()
    conn.close()
    
    log_info(f"📋 Получено {len(clients)} клиентов для мастера {master_name} (без контактов)", "clients")
    
    return clients

def get_clients_limited():
    """
    Получить всех клиентов БЕЗ контактных данных и финансов (для sales)
    """
    from utils.logger import log_info
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT
            c.instagram_id, 
            c.username, 
            NULL as phone,  -- ❌ Скрываем телефон
            c.name, 
            c.first_contact,
            c.last_contact, 
            c.total_messages, 
            c.labels, 
            c.status, 
            0 as lifetime_value,  -- ❌ Скрываем финансы
            c.profile_pic, 
            c.notes, 
            c.is_pinned, 
            c.gender, 
            1 as has_messages,
            c.created_at,
            0 as total_spend,  -- ❌ Скрываем выручку
            COALESCE((SELECT COUNT(*) FROM bookings WHERE instagram_id = c.instagram_id AND status = 'completed'), 0) as total_bookings,
            c.temperature
        FROM clients c
        WHERE EXISTS (
            SELECT 1 FROM chat_history ch WHERE ch.instagram_id = c.instagram_id
        ) OR EXISTS (
            SELECT 1 FROM messenger_messages mm WHERE mm.client_id = c.instagram_id
        )
        ORDER BY c.is_pinned DESC, c.last_contact DESC
    """)
    
    clients = c.fetchall()
    conn.close()
    
    log_info(f"📋 Получено {len(clients)} клиентов (ограниченный доступ для sales)", "clients")
    
    return clients

def get_clients_stats_only():
    """
    Получить только статистику клиентов БЕЗ персональных данных (для marketer)
    """
    from utils.logger import log_info
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT 
            COUNT(*) as total_clients,
            COUNT(CASE WHEN status = 'new' THEN 1 END) as new_clients,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
            COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
            COUNT(CASE WHEN temperature = 'hot' THEN 1 END) as hot_clients,
            COUNT(CASE WHEN temperature = 'warm' THEN 1 END) as warm_clients,
            COUNT(CASE WHEN temperature = 'cold' THEN 1 END) as cold_clients
        FROM clients
    """)
    
    stats = c.fetchone()
    conn.close()
    
    log_info(f"📊 Получена статистика клиентов для marketer", "clients")
    
    return {
        "total_clients": stats[0] if stats else 0,
        "new_clients": stats[1] if stats else 0,
        "active_clients": stats[2] if stats else 0,
        "inactive_clients": stats[3] if stats else 0,
        "hot_clients": stats[4] if stats else 0,
        "warm_clients": stats[5] if stats else 0,
        "cold_clients": stats[6] if stats else 0
    }



def get_clients_all():
    """Получить ВСЕХ клиентов (независимо от мессенджера)"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT DISTINCT
            c.instagram_id, c.username, c.phone, c.name, c.first_contact,
            c.last_contact, c.total_messages, c.labels, c.status, c.lifetime_value,
            c.profile_pic, c.notes, c.is_pinned, c.gender, 
            CASE WHEN EXISTS (SELECT 1 FROM chat_history ch WHERE ch.instagram_id = c.instagram_id) THEN 1 ELSE 0 END as has_messages,
            c.created_at,
            COALESCE(b.total_spend, 0) as total_spend,
            COALESCE(b.total_bookings, 0) as total_bookings,
            c.temperature
        FROM clients c
        LEFT JOIN (
            SELECT instagram_id,
                   SUM(revenue) as total_spend,
                   COUNT(*) as total_bookings
            FROM bookings
            WHERE status = 'completed'
            GROUP BY instagram_id
        ) b ON c.instagram_id = b.instagram_id
        ORDER BY c.is_pinned DESC, c.last_contact DESC
    """)

    clients = c.fetchall()
    conn.close()
    return clients

@router.get("/clients")
async def list_clients(
    session_token: Optional[str] = Cookie(None),
    messenger: Optional[str] = Query('all'), # Default to 'all' here too, or keep as is and let frontend drive
    master_id: Optional[int] = Query(None)
):
    """Получить всех клиентов с фильтрацией по мессенджеру и/или мастеру"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # If filtering by master_id, get clients who have bookings with this master
    if master_id:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT DISTINCT c.instagram_id, c.name 
            FROM clients c
            JOIN bookings b ON c.instagram_id = b.instagram_id
            JOIN users u ON b.master = u.full_name
            WHERE u.id = %s
        """, (master_id,))
        clients = [{"id": row[0], "name": row[1] or row[0]} for row in c.fetchall()]
        conn.close()
        return {"clients": clients}

    # Валидируем тип мессенджера
    valid_messengers = ['instagram', 'telegram', 'whatsapp', 'tiktok', 'all']
    if messenger not in valid_messengers:
        messenger = 'all'

    # RBAC: Разные уровни доступа в зависимости от роли
    if user["role"] == "employee":
        # Employee видит только своих клиентов (без контактов)
        from utils.logger import log_info
        full_name = user.get("full_name", "")
        log_info(f"🔒 Employee {user['username']} запрашивает своих клиентов", "clients")
        clients = get_clients_by_master(full_name)
    elif user["role"] == "sales":
        # Sales видит всех клиентов БЕЗ контактов и финансов
        from utils.logger import log_info
        log_info(f"🔒 Sales {user['username']} запрашивает клиентов (ограниченный доступ)", "clients")
        clients = get_clients_limited()
    elif user["role"] == "marketer":
        # Marketer видит только статистику
        from utils.logger import log_info
        log_info(f"📊 Marketer {user['username']} запрашивает статистику клиентов", "clients")
        stats = get_clients_stats_only()
        return {"clients_stats": stats, "access_level": "stats_only"}
    else:
        # Admin/Manager/Director видят всех клиентов с полными данными
        if messenger == 'all':
            clients = get_clients_all()
        else:
            clients = get_clients_by_messenger(messenger)
    return {
        "clients": [
            {
                "id": c[0],
                "instagram_id": c[0],
                "username": c[1],
                "phone": c[2],
                "name": c[3],
                "display_name": get_client_display_name(c),
                "first_contact": c[4],
                "last_contact": c[5],
                "total_messages": c[6],
                "status": c[8] if len(c) > 8 else "new",
                "lifetime_value": c[16] if len(c) > 16 else (c[9] if len(c) > 9 else 0),
                "profile_pic": c[10] if len(c) > 10 else None,
                "notes": c[11] if len(c) > 11 else "",
                "is_pinned": c[12] if len(c) > 12 else 0,
                "gender": c[13] if len(c) > 13 else "female",
                "created_at": c[15] if len(c) > 15 else None,
                "total_spend": c[16] if len(c) > 16 else (c[9] if len(c) > 9 else 0),
                "total_bookings": c[17] if len(c) > 17 else 0,
                "temperature": c[18] if len(c) > 18 else "cold",
                "messenger": messenger
            }
            for c in clients
        ],
        "count": len(clients),
        "unread_count": get_total_unread(),
        "messenger": messenger
    }

@router.get("/clients/{client_id}/messengers")
async def get_client_messengers_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить список мессенджеров клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    messengers = get_client_messengers(client_id)
    return {"messengers": messengers}

@router.get("/clients/{client_id:path}")
async def get_client_detail(client_id: str, session_token: Optional[str] = Cookie(None)):
    """Получить детальную информацию о клиенте"""
    from urllib.parse import unquote
    from fastapi import HTTPException
    
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    # Decode URL-encoded client_id (e.g., www.instagram.com%2Fmlediamant%2F -> www.instagram.com/mlediamant/)
    decoded_client_id = unquote(client_id)
    
    client = get_client_by_id(decoded_client_id)
    if not client:
        return JSONResponse({"error": "Client not found"}, status_code=404)
    
    # Use real instagram_id from the database for lookups, 
    # as decoded_client_id might be a username from the URL
    real_id = client[0]
    
    # RBAC: Employee может видеть только своих клиентов
    if user["role"] == "employee":
        from utils.logger import log_warning
        full_name = user.get("full_name", "")
        
        # Проверяем, есть ли у этого клиента записи к данному мастеру
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE instagram_id = %s AND master = %s
        """, (real_id, full_name))
        
        has_access = c.fetchone()[0] > 0
        conn.close()
        
        if not has_access:
            log_warning(f"🔒 Employee {user['username']} ({full_name}) attempted to access client {real_id}", "security")
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only view clients with bookings to you"
            )
    
    history = get_chat_history(real_id, limit=50)
    
    # Оптимизация: получаем только записи этого конкретного клиента напрямую из БД
    from db.bookings import get_bookings_by_client
    bookings = get_bookings_by_client(instagram_id=real_id)
    
    from collections import Counter
    from datetime import datetime
    
    # Calculate stats directly from fetched bookings for accuracy
    # Filter only completed bookings for LTV and visit count
    # Note: b[6] is the status field in get_all_bookings() result
    completed_bookings = [b for b in bookings if b[6] == 'completed']
    calculated_total_spend = sum(float(b[8] or 0) for b in completed_bookings)
    calculated_total_visits = len(completed_bookings)
    
    booking_services = [b[2] for b in bookings if b[2]]
    booking_masters = [b[9] for b in bookings if len(b) > 9 and b[9]]
    
    # Connect to DB to get translations
    conn = get_db_connection()
    c = conn.cursor()
    
    top_procedures = []
    for name, count in Counter(booking_services).most_common(3):
        # Look up name in services
        c.execute("SELECT name FROM services WHERE name = %s LIMIT 1", (name,))
        row = c.fetchone()
        top_procedures.append({"name": row[0] if row and row[0] else name, "count": count})
        
    top_masters = []
    for name, count in Counter(booking_masters).most_common(3):
        # Look up translated name in users
        c.execute("SELECT full_name_ru FROM users WHERE full_name = %s OR full_name_ru = %s OR username = %s LIMIT 1", (name, name, name))
        row = c.fetchone()
        top_masters.append({"name": row[0] if row and row[0] else name, "count": count})
    
    # visits by month logic...
    visits_by_month = {}
    for b in bookings:
        try:
            # datetime is b[3]
            dt = datetime.fromisoformat(b[3])
            month_key = dt.strftime("%Y-%m")
            visits_by_month[month_key] = visits_by_month.get(month_key, 0) + 1
        except:
            continue
            
    # Sort by key (YYYY-MM) then format for display
    visits_chart = []
    for m in sorted(visits_by_month.keys()):
        # Convert YYYY-MM to more readable format
        display_date = datetime.strptime(m, "%Y-%m").strftime("%b %Y")
        visits_chart.append({"date": display_date, "count": visits_by_month[m]})
    
    # RBAC: Marketer cannot view client details
    if user["role"] == "marketer":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn.close()

    # Определяем, нужно ли скрывать конфиденциальные данные
    # Sales и Employee не видят телефон и финансы
    hide_sensitive_data = user["role"] in ["employee", "sales"]
    
    return {
        "success": True,
        "client": {
            "id": client[0],
            "instagram_id": client[0],
            "username": client[1],
            "phone": None if hide_sensitive_data else client[2],  # ❌ Скрываем для employee
            "name": client[3],
            "first_contact": client[4],
            "last_contact": client[5],
            "total_messages": client[6],
            "status": client[8],
            "lifetime_value": 0 if hide_sensitive_data else calculated_total_spend,  # ❌ Скрываем для employee
            "profile_pic": client[10] if len(client) > 10 else None,
            "notes": client[11] if len(client) > 11 else "",
            "total_spend": 0 if hide_sensitive_data else calculated_total_spend,  # ❌ Скрываем для employee
            "total_visits": calculated_total_visits,
            "discount": 0 if hide_sensitive_data else (client[16] if len(client) > 16 else 0),  # ❌ Скрываем для employee
            "card_number": "" if hide_sensitive_data else (client[15] if len(client) > 15 else ""),
            "temperature": client[21] if len(client) > 21 else "cold",
            "gender": client[14] if len(client) > 14 else None,
            "age": client[22] if len(client) > 22 else None,
            "birth_date": client[23] if len(client) > 23 else None,
            "email": None if hide_sensitive_data else (client[20] if len(client) > 20 else None),  # ❌ Скрываем для employee
            "referral_code": client[24] if len(client) > 24 else None,
            "source": client[25] if len(client) > 25 else "manual",
            "telegram_id": None if hide_sensitive_data else (client[26] if len(client) > 26 else None)  # ❌ Скрываем для employee
        },
        "stats": {
            "top_procedures": top_procedures,
            "top_masters": top_masters,
            "visits_chart": visits_chart
        },
        "bookings": [
            {
                "id": b[0],
                "datetime": b[3],
                "service": b[2],
                "master": b[9],
                "status": b[6],
                "revenue": 0 if hide_sensitive_data else b[8]  # ❌ Скрываем для employee
            }
            for b in bookings
        ],
        "chat_history": [
            {
                "id": m[0],
                "message": m[3],
                "timestamp": m[4],
                "sender": m[2]
            }
            for m in history
        ]
    }

@router.post("/clients")
async def create_client_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать нового клиента вручную"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    data = await request.json()
    
    try:
        instagram_id = data.get('instagram_id') or f"manual_{int(time.time())}"
        get_or_create_client(instagram_id, username=data.get('name'))
        
        if data.get('phone') or data.get('notes') or data.get('name'):
            update_client_info(
                instagram_id,
                name=data.get('name'),
                phone=data.get('phone'),
                notes=data.get('notes')
            )
        
        log_activity(user["id"], "create_client", "client", instagram_id, 
                    f"Client: {data.get('name')}")
        return {"success": True, "message": "Client created", "id": instagram_id}
    except Exception as e:
        log_error(f"Error creating client: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/clients/{client_id}/update")
async def update_client_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить информацию клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    
    password = data.get('password')
    password_hash = hash_password(password) if password else None
    
    success = update_client_info(
        client_id,
        name=data.get('name'),
        phone=data.get('phone'),
        notes=data.get('notes'),
        gender=data.get('gender'),
        age=data.get('age'),
        birth_date=data.get('birth_date'),
        email=data.get('email'),
        referral_code=data.get('referral_code'),
        discount=data.get('discount'),
        password_hash=password_hash,
        reminder_date=data.get('reminder_date')
    )
    
    if success:
        log_activity(user["id"], "update_client_info", "client", 
                    client_id, "Info updated")
        return {"success": True, "message": "Client updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=400)

@router.post("/clients/{client_id}/status")
async def update_client_status_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить статус клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    status = data.get('status')
    
    if not status:
        return JSONResponse({"error": "Status required"}, status_code=400)
    
    update_client_status(client_id, status)
    log_activity(user["id"], "update_client_status", "client", 
                client_id, f"Status: {status}")
    
    return {"success": True, "message": "Client status updated"}

@router.post("/clients/{client_id}/temperature")
async def update_client_temperature_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить температуру клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    data = await request.json()
    temperature = data.get('temperature')
    
    if not temperature:
        return JSONResponse({"error": "Temperature required"}, status_code=400)
        
    if temperature not in ['hot', 'warm', 'cold']:
        return JSONResponse({"error": "Invalid temperature"}, status_code=400)
    
    from db.clients import set_client_temperature
    success = set_client_temperature(client_id, temperature)
    
    if success:
        log_activity(user["id"], "update_client_temperature", "client", 
                    client_id, f"Temperature: {temperature}")
        return {"success": True, "message": "Client temperature updated"}
    
    return JSONResponse({"error": "Update failed"}, status_code=500)

@router.post("/clients/{client_id}/preferred-messenger")
async def update_preferred_messenger_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить предпочтительный мессенджер для клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    data = await request.json()
    preferred_messenger = data.get('preferred_messenger')

    # Валидация
    valid_messengers = ['instagram', 'telegram', 'whatsapp', 'tiktok', None]
    if preferred_messenger not in valid_messengers:
        return JSONResponse({"error": "Invalid messenger type"}, status_code=400)

    # Обновляем поле
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            UPDATE clients
            SET preferred_messenger = %s
            WHERE instagram_id = %s
        """, (preferred_messenger, client_id))
        conn.commit()

        log_activity(user["id"], "update_preferred_messenger", "client",
                    client_id, f"Preferred messenger: {preferred_messenger}")

        return {"success": True, "preferred_messenger": preferred_messenger}
    except Exception as e:
        log_error(f"Error updating preferred messenger: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.post("/clients/{client_id}/pin")
async def pin_client_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Закрепить/открепить клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    client = get_client_by_id(client_id)
    if not client:
        return JSONResponse({"error": "Client not found"}, status_code=404)

    is_pinned = client[12] if len(client) > 12 else 0
    pin_client(client_id, not is_pinned)

    log_activity(user["id"], "pin_client", "client", client_id,
                f"{'Pinned' if not is_pinned else 'Unpinned'}")

    return {
        "success": True,
        "pinned": not is_pinned,
        "message": "Pinned" if not is_pinned else "Unpinned"
    }

@router.post("/clients/{client_id:path}/delete")
async def delete_client_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить клиента (Soft Delete)"""
    from urllib.parse import unquote
    from utils.soft_delete import soft_delete_client
    from utils.audit import log_audit
    
    decoded_id = unquote(client_id)
    
    user = require_auth(session_token)
    if not user or user["role"] != "director":
        return JSONResponse({"error": "Forbidden: Only Director can delete clients"}, status_code=403)
    
    try:
        # Получаем данные клиента перед удалением для аудита
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id, name, phone, instagram_id FROM clients WHERE id = %s", (decoded_id,))
        client_data = c.fetchone()
        conn.close()

        if not client_data:
             return JSONResponse({"error": "Client not found"}, status_code=404)

        success = soft_delete_client(decoded_id, user)
        
        if success:
            # Логируем в аудит
            log_audit(
                user=user,
                action='delete',
                entity_type='client',
                entity_id=decoded_id,
                old_value={
                    "name": client_data[1],
                    "phone": client_data[2],
                    "instagram_id": client_data[3]
                },
                ip_address=request.client.host
            )
            return {"success": True, "message": "Client moved to trash"}
        else:
            return JSONResponse({"error": "Client not found or already deleted"}, status_code=404)
    except Exception as e:
        log_error(f"Error deleting client: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)


@router.get("/search")
async def search_clients(
    q: str,
    type: str = "all",  # all, clients, messages, bookings
    limit: int = 50,
    session_token: Optional[str] = Cookie(None)
):
    """Расширенный поиск по клиентам, сообщениям и записям"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if not q or len(q.strip()) < 2:
        return JSONResponse({"error": "Query too short"}, status_code=400)
    
    search_query = f"%{q.strip()}%"
    results = {"clients": [], "messages": [], "bookings": []}
    
    try:
        if type in ["all", "clients"]:
            # Поиск клиентов
            clients = get_all_clients()
            for c in clients:
                if (search_query.lower() in (c[1] or "").lower() or  # username
                    search_query.lower() in (c[3] or "").lower() or  # name
                    search_query.lower() in (c[2] or "").lower() or  # phone
                    search_query.lower() in (c[0] or "").lower()):   # instagram_id
                    results["clients"].append({
                        "id": c[0],
                        "instagram_id": c[0],
                        "username": c[1],
                        "name": c[3],
                        "phone": c[2],
                        "display_name": get_client_display_name(c),
                        "status": c[8] if len(c) > 8 else "new",
                        "total_messages": c[6],
                        "lifetime_value": c[9] if len(c) > 9 else 0,
                        "profile_pic": c[10] if len(c) > 10 else None
                    })
        
        if type in ["all", "messages"]:
            # Поиск сообщений
            from db.messages import search_messages
            messages = search_messages(search_query, limit)
            results["messages"] = messages
        
        if type in ["all", "bookings"]:
            # Поиск записей
            from db.bookings import search_bookings
            bookings = search_bookings(search_query, limit)
            results["bookings"] = bookings
        
        return {
            "query": q,
            "type": type,
            "results": results,
            "total": len(results["clients"]) + len(results["messages"]) + len(results["bookings"])
        }
        
    except Exception as e:
        log_error(f"Search error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить подсказки для поиска"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if not q or len(q.strip()) < 1:
        return {"suggestions": []}
    
    search_query = f"%{q.strip()}%"
    suggestions = []
    
    try:
        # Подсказки по именам клиентов
        clients = get_all_clients()
        for c in clients[:10]:  # Ограничиваем для производительности
            name = c[3] or c[1] or ""
            if search_query.lower() in name.lower():
                suggestions.append({
                    "type": "client",
                    "text": name,
                    "id": c[0],
                    "subtitle": f"@{c[1]}" if c[1] else c[0]
                })
        
        # Подсказки по услугам
        from db.services import get_all_services
        services = get_all_services()
        for s in services[:5]:
            if search_query.lower() in s[1].lower():
                suggestions.append({
                    "type": "service",
                    "text": s[1],
                    "id": s[0],
                    "subtitle": f"{s[2]} AED"
                })
        
        return {"suggestions": suggestions[:10]}
        
    except Exception as e:
        log_error(f"Search suggestions error: {e}", "api")
        return {"suggestions": []}

@router.post("/clients/bulk")
async def bulk_actions(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Массовые операции с клиентами"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        action = data.get("action")
        client_ids = data.get("client_ids", [])
        
        if not client_ids:
            return JSONResponse({"error": "No clients selected"}, status_code=400)
        
        if action == "update_status":
            new_status = data.get("status")
            if not new_status:
                return JSONResponse({"error": "Status required"}, status_code=400)
            
            updated = 0
            for client_id in client_ids:
                if update_client_status(client_id, new_status):
                    updated += 1
                    log_activity(user["id"], "bulk_update_status", "client", 
                               client_id, f"Status changed to {new_status}")
            
            return {
                "success": True,
                "updated": updated,
                "total": len(client_ids),
                "message": f"Updated {updated} clients to {new_status}"
            }
        
        elif action == "pin":
            pinned = 0
            for client_id in client_ids:
                if pin_client(client_id, True):
                    pinned += 1
                    log_activity(user["id"], "bulk_pin", "client", client_id, "Pinned")
            
            return {
                "success": True,
                "pinned": pinned,
                "total": len(client_ids),
                "message": f"Pinned {pinned} clients"
            }
        
        elif action == "unpin":
            unpinned = 0
            for client_id in client_ids:
                if pin_client(client_id, False):
                    unpinned += 1
                    log_activity(user["id"], "bulk_unpin", "client", client_id, "Unpinned")
            
            return {
                "success": True,
                "unpinned": unpinned,
                "total": len(client_ids),
                "message": f"Unpinned {unpinned} clients"
            }
        
        elif action == "delete":
            deleted = 0
            for client_id in client_ids:
                if delete_client(client_id):
                    deleted += 1
                    log_activity(user["id"], "bulk_delete", "client", client_id, "Deleted")
            
            return {
                "success": True,
                "deleted": deleted,
                "total": len(client_ids),
                "message": f"Deleted {deleted} clients"
            }
        
        else:
            return JSONResponse({"error": "Invalid action"}, status_code=400)
            
    except Exception as e:
        log_error(f"Bulk actions error: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

# backend/db/clients.py

# Добавь в конец файла:

def update_client_bot_mode(instagram_id: str, mode: str):
    """Изменить режим бота для клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        UPDATE clients 
        SET bot_mode = %s
        WHERE instagram_id = %s
    """, (mode, instagram_id))
    
    conn.commit()
    conn.close()

def get_client_bot_mode(instagram_id: str) -> str:
    """Получить режим бота для клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT bot_mode 
        FROM clients 
        WHERE instagram_id = %s
    """, (instagram_id,))
    
    result = c.fetchone()
    conn.close()
    
    return result[0] if result and result[0] else 'assistant'

@router.post("/{client_id}/bot-mode")
async def update_client_bot_mode_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Изменить режим бота для клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        mode = data.get('mode')

        if mode not in ['manual', 'assistant', 'autopilot']:
            return JSONResponse({"error": "Invalid mode"}, status_code=400)

        update_client_bot_mode(client_id, mode)

        log_info(f"🔧 Bot mode changed for {client_id}: {mode}", "api")

        return {"success": True, "mode": mode}

    except Exception as e:
        log_error(f"Error updating bot mode: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/clients/{client_id}/preferences")
async def get_client_preferences_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить предпочтения клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        assistant = SmartAssistant(client_id)

        if not assistant.preferences:
            return {
                "preferences": None,
                "has_preferences": False
            }

        return {
            "preferences": assistant.preferences,
            "has_preferences": True,
            "history_count": len(assistant.history)
        }

    except Exception as e:
        log_error(f"Error getting client preferences: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/clients/{client_id}/preferences")
async def update_client_preferences_api(
    client_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить предпочтения клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        assistant = SmartAssistant(client_id)

        success = assistant.save_preferences(data)

        if success:
            log_activity(user["id"], "update_client_preferences", "client",
                        client_id, f"Preferences updated")
            return {
                "success": True,
                "message": "Preferences saved successfully"
            }
        else:
            return JSONResponse({"error": "Failed to save preferences"}, status_code=500)

    except Exception as e:
        log_error(f"Error updating client preferences: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/clients/{client_id}/smart-greeting")
async def get_smart_greeting_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить персонализированное приветствие"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        # Получаем имя клиента
        client = get_client_by_id(client_id)
        if not client:
            return JSONResponse({"error": "Client not found"}, status_code=404)

        client_name = client[3] or client[1] or "guest"
        greeting = await get_smart_greeting(client_id, client_name)

        return {
            "greeting": greeting,
            "client_id": client_id,
            "client_name": client_name
        }

    except Exception as e:
        log_error(f"Error getting smart greeting: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/clients/{client_id}/smart-suggestion")
async def get_smart_suggestion_api(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить умное предложение записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        # Получаем имя клиента
        client = get_client_by_id(client_id)
        if not client:
            return JSONResponse({"error": "Client not found"}, status_code=404)

        client_name = client[3] or client[1] or "друг"

        assistant = SmartAssistant(client_id)
        suggestion = assistant.suggest_next_booking()
        message = await assistant.generate_booking_suggestion_message(client_name)

        return {
            "suggestion": suggestion,
            "message": message,
            "client_id": client_id,
            "client_name": client_name
        }

    except Exception as e:
        log_error(f"Error getting smart suggestion: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/client/profile")
async def get_current_client_profile(session_token: Optional[str] = Cookie(None)):
    """Получить профиль текущего авторизованного клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем данные пользователя
        user_id = user.get("id")
        username = user.get("username")
        full_name = user.get("full_name")
        email = user.get("email")
        phone = user.get("phone")

        # Если пользователь - клиент, получаем дополнительные данные
        if user.get("role") == "client":
            # Получаем информацию о лояльности
            c.execute("""
                SELECT total_points, current_tier, total_visits, total_spent
                FROM loyalty_program
                WHERE client_email = %s OR client_instagram = %s
                LIMIT 1
            """, (email, username))

            loyalty_data = c.fetchone()

            if loyalty_data:
                return {
                    "success": True,
                    "profile": {
                        "id": user_id,
                        "name": full_name or username,
                        "email": email,
                        "phone": phone,
                        "username": username,
                        "tier": loyalty_data[1] if loyalty_data[1] else "bronze",
                        "points": loyalty_data[0] if loyalty_data[0] else 0,
                        "visits": loyalty_data[2] if loyalty_data[2] else 0,
                        "spent": loyalty_data[3] if loyalty_data[3] else 0
                    }
                }

        # Для всех остальных пользователей
        return {
            "success": True,
            "profile": {
                "id": user_id,
                "name": full_name or username,
                "email": email,
                "phone": phone,
                "username": username,
                "tier": "bronze",
                "points": 0,
                "visits": 0,
                "spent": 0
            }
        }

    except Exception as e:
        log_error(f"Error getting client profile: {e}", "api")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    finally:
        if 'conn' in locals():
            conn.close()