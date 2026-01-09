"""
API для интеграции с маркетплейсами и платформами бронирования
Поддерживаемые платформы: Yandex Maps, 2GIS, Google Business, Booksy, Yclients
"""
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import httpx

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning
from utils.utils import get_current_user

router = APIRouter()

# ===== МОДЕЛИ =====

class MarketplaceProvider(BaseModel):
    name: str  # yandex_maps, 2gis, google_business, booksy, yclients
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    is_active: bool = True
    settings: Optional[Dict[str, Any]] = None

class MarketplaceBooking(BaseModel):
    provider: str
    external_id: str
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    service_name: str
    booking_date: str
    booking_time: str
    duration: int
    price: Optional[float] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ===== НАСТРОЙКИ ПРОВАЙДЕРОВ =====

@router.get("/marketplace-providers")
async def get_marketplace_providers(current_user: dict = Depends(get_current_user)):
    """Получить список настроенных маркетплейсов"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, is_active, settings, sync_enabled, last_sync_at, created_at
            FROM marketplace_providers
            ORDER BY name
        """)
        
        providers = []
        for row in cursor.fetchall():
            providers.append({
                "id": row[0],
                "name": row[1],
                "is_active": row[2],
                "settings": json.loads(row[3]) if row[3] else {},
                "sync_enabled": row[4],
                "last_sync_at": row[5],
                "created_at": row[6]
            })
        
        conn.close()
        return {"providers": providers}
        
    except Exception as e:
        log_error(f"Error getting marketplace providers: {e}", "marketplace")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/marketplace-providers")
async def create_marketplace_provider(
    provider: MarketplaceProvider,
    current_user: dict = Depends(get_current_user)
):
    """Создать/обновить настройки маркетплейса"""
    try:
        if current_user["role"] not in ["admin", "director"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем существование
        cursor.execute(
            "SELECT id FROM marketplace_providers WHERE name = %s",
            (provider.name,)
        )
        existing = cursor.fetchone()
        
        now = datetime.now().isoformat()
        settings_json = json.dumps(provider.settings) if provider.settings else None
        
        if existing:
            # Обновляем
            cursor.execute("""
                UPDATE marketplace_providers
                SET api_key = %s, api_secret = %s, webhook_url = %s,
                    is_active = %s, settings = %s, updated_at = %s
                WHERE name = %s
            """, (
                provider.api_key, provider.api_secret, provider.webhook_url,
                provider.is_active, settings_json, now, provider.name
            ))
            provider_id = existing[0]
        else:
            # Создаем
            cursor.execute("""
                INSERT INTO marketplace_providers
                (name, api_key, api_secret, webhook_url, is_active, settings, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                provider.name, provider.api_key, provider.api_secret,
                provider.webhook_url, provider.is_active, settings_json, now, now
            ))
            provider_id = cursor.fetchone()[0]
        
        conn.commit()
        conn.close()
        
        log_info(f"Marketplace provider {provider.name} configured by {current_user['username']}", "marketplace")
        return {"success": True, "provider_id": provider_id}
        
    except Exception as e:
        log_error(f"Error configuring marketplace provider: {e}", "marketplace")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ВЕБХУКИ ОТ МАРКЕТПЛЕЙСОВ =====

@router.post("/webhook/{provider}")
async def marketplace_webhook(
    provider: str,
    request: Request,
    background_tasks: BackgroundTasks
):
    """Обработка вебхуков от маркетплейсов"""
    try:
        body = await request.body()
        data = json.loads(body) if body else {}
        
        log_info(f"Received webhook from {provider}: {data}", "marketplace")
        
        # Обрабатываем в фоне
        background_tasks.add_task(process_marketplace_webhook, provider, data)
        
        return {"success": True, "message": "Webhook received"}
        
    except Exception as e:
        log_error(f"Error processing webhook from {provider}: {e}", "marketplace")
        raise HTTPException(status_code=500, detail=str(e))

async def process_marketplace_webhook(provider: str, data: dict):
    """Обработать webhook от маркетплейса"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Определяем тип события
        if provider == "yandex_maps":
            await handle_yandex_maps_webhook(data, cursor, conn)
        elif provider == "2gis":
            await handle_2gis_webhook(data, cursor, conn)
        elif provider == "google_business":
            await handle_google_business_webhook(data, cursor, conn)
        elif provider == "booksy":
            await handle_booksy_webhook(data, cursor, conn)
        elif provider == "yclients":
            await handle_yclients_webhook(data, cursor, conn)
        
        conn.close()
        
    except Exception as e:
        log_error(f"Error in process_marketplace_webhook: {e}", "marketplace")

# ===== ОБРАБОТЧИКИ ВЕБХУКОВ =====

async def handle_yandex_maps_webhook(data: dict, cursor, conn):
    """Обработать webhook от Яндекс.Карт"""
    try:
        event_type = data.get("event_type")
        
        if event_type == "new_booking":
            booking_data = data.get("booking", {})
            await create_booking_from_marketplace(
                "yandex_maps",
                booking_data,
                cursor,
                conn
            )
        elif event_type == "new_review":
            review_data = data.get("review", {})
            await save_marketplace_review(
                "yandex_maps",
                review_data,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Yandex Maps webhook: {e}", "marketplace")

async def handle_2gis_webhook(data: dict, cursor, conn):
    """Обработать webhook от 2GIS"""
    try:
        event_type = data.get("type")
        
        if event_type == "booking.created":
            booking_data = data.get("data", {})
            await create_booking_from_marketplace(
                "2gis",
                booking_data,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling 2GIS webhook: {e}", "marketplace")

async def handle_google_business_webhook(data: dict, cursor, conn):
    """Обработать webhook от Google Business"""
    try:
        # Google использует Pub/Sub, формат может отличаться
        message = data.get("message", {})
        event_data = json.loads(message.get("data", "{}"))
        
        event_type = event_data.get("eventType")
        
        if event_type == "BOOKING_CREATED":
            await create_booking_from_marketplace(
                "google_business",
                event_data.get("booking", {}),
                cursor,
                conn
            )
        elif event_type == "REVIEW_CREATED":
            await save_marketplace_review(
                "google_business",
                event_data.get("review", {}),
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Google Business webhook: {e}", "marketplace")

async def handle_booksy_webhook(data: dict, cursor, conn):
    """Обработать webhook от Booksy"""
    try:
        event = data.get("event")
        
        if event == "appointment.created":
            appointment = data.get("appointment", {})
            await create_booking_from_marketplace(
                "booksy",
                appointment,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Booksy webhook: {e}", "marketplace")

async def handle_yclients_webhook(data: dict, cursor, conn):
    """Обработать webhook от YCLIENTS"""
    try:
        event_type = data.get("resource")
        
        if event_type == "record" and data.get("action") == "create":
            record = data.get("data", {})
            await create_booking_from_marketplace(
                "yclients",
                record,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling YCLIENTS webhook: {e}", "marketplace")

# ===== СОЗДАНИЕ ЗАПИСИ ИЗ МАРКЕТПЛЕЙСА =====

async def create_booking_from_marketplace(
    provider: str,
    booking_data: dict,
    cursor,
    conn
):
    """Создать запись из данных маркетплейса"""
    try:
        # Нормализуем данные в зависимости от провайдера
        normalized = normalize_booking_data(provider, booking_data)
        
        # Ищем или создаем клиента
        cursor.execute("""
            SELECT instagram_id FROM clients WHERE phone = %s
        """, (normalized["client_phone"],))
        
        client = cursor.fetchone()
        
        if not client:
            # Создаем нового клиента
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO clients
                (instagram_id, name, phone, email, source, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING instagram_id
            """, (
                f"marketplace_{provider}_{normalized['client_phone']}",
                normalized["client_name"],
                normalized["client_phone"],
                normalized.get("client_email"),
                provider,
                now
            ))
            client_id = cursor.fetchone()[0]
        else:
            client_id = client[0]
        
        # Создаем запись
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO bookings
            (client_id, service_name, booking_date, booking_time, duration,
             price, status, source, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s)
            RETURNING id
        """, (
            client_id,
            normalized["service_name"],
            normalized["booking_date"],
            normalized["booking_time"],
            normalized.get("duration", 60),
            normalized.get("price", 0),
            provider,
            normalized.get("notes", f"Booking from {provider}"),
            now,
            now
        ))
        
        booking_id = cursor.fetchone()[0]
        
        # Сохраняем связь с внешней системой
        cursor.execute("""
            INSERT INTO marketplace_bookings
            (booking_id, provider, external_id, raw_data, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            booking_id,
            provider,
            normalized.get("external_id"),
            json.dumps(booking_data),
            now
        ))
        
        conn.commit()
        
        log_info(f"Created booking {booking_id} from {provider}", "marketplace")
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error creating booking from marketplace: {e}", "marketplace")

def normalize_booking_data(provider: str, data: dict) -> dict:
    """Нормализовать данные записи в зависимости от провайдера"""
    normalized = {}
    
    if provider == "yandex_maps":
        normalized = {
            "external_id": data.get("id"),
            "client_name": data.get("client", {}).get("name"),
            "client_phone": data.get("client", {}).get("phone"),
            "client_email": data.get("client", {}).get("email"),
            "service_name": data.get("service", {}).get("name"),
            "booking_date": data.get("date"),
            "booking_time": data.get("time"),
            "duration": data.get("duration", 60),
            "price": data.get("price"),
            "notes": data.get("comment")
        }
    elif provider == "2gis":
        normalized = {
            "external_id": data.get("id"),
            "client_name": data.get("customer_name"),
            "client_phone": data.get("customer_phone"),
            "service_name": data.get("service_name"),
            "booking_date": data.get("date"),
            "booking_time": data.get("time"),
            "duration": data.get("duration", 60)
        }
    elif provider == "booksy":
        normalized = {
            "external_id": data.get("id"),
            "client_name": f"{data.get('client', {}).get('first_name')} {data.get('client', {}).get('last_name')}",
            "client_phone": data.get("client", {}).get("phone"),
            "client_email": data.get("client", {}).get("email"),
            "service_name": data.get("services", [{}])[0].get("name") if data.get("services") else "Unknown",
            "booking_date": data.get("start_date"),
            "booking_time": data.get("start_time"),
            "duration": data.get("duration", 60),
            "price": data.get("price")
        }
    elif provider == "yclients":
        normalized = {
            "external_id": data.get("id"),
            "client_name": data.get("client", {}).get("name"),
            "client_phone": data.get("client", {}).get("phone"),
            "service_name": data.get("services", [{}])[0].get("title") if data.get("services") else "Unknown",
            "booking_date": data.get("date"),
            "booking_time": data.get("datetime").split(" ")[1] if data.get("datetime") else None,
            "duration": data.get("seance_length", 60)
        }
    
    return normalized

# ===== СОХРАНЕНИЕ ОТЗЫВОВ =====

async def save_marketplace_review(provider: str, review_data: dict, cursor, conn):
    """Сохранить отзыв из маркетплейса"""
    try:
        now = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO marketplace_reviews
            (provider, external_id, author_name, rating, text, created_at, raw_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            provider,
            review_data.get("id"),
            review_data.get("author", {}).get("name"),
            review_data.get("rating"),
            review_data.get("text"),
            now,
            json.dumps(review_data)
        ))
        
        conn.commit()
        log_info(f"Saved review from {provider}", "marketplace")
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error saving marketplace review: {e}", "marketplace")

# ===== СИНХРОНИЗАЦИЯ =====

@router.post("/sync/{provider}")
async def sync_marketplace(
    provider: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Запустить синхронизацию с маркетплейсом"""
    try:
        if current_user["role"] not in ["admin", "director"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        background_tasks.add_task(run_marketplace_sync, provider)
        
        return {"success": True, "message": f"Sync started for {provider}"}
        
    except Exception as e:
        log_error(f"Error starting sync: {e}", "marketplace")
        raise HTTPException(status_code=500, detail=str(e))

async def run_marketplace_sync(provider: str):
    """Выполнить синхронизацию с маркетплейсом"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Получаем настройки провайдера
        cursor.execute("""
            SELECT api_key, api_secret, settings
            FROM marketplace_providers
            WHERE name = %s AND is_active = TRUE
        """, (provider,))
        
        result = cursor.fetchone()
        if not result:
            log_warning(f"Provider {provider} not configured", "marketplace")
            return
        
        api_key, api_secret, settings = result
        settings = json.loads(settings) if settings else {}
        
        # Выполняем синхронизацию в зависимости от провайдера
        # TODO: Реализовать для каждого провайдера
        
        # Обновляем время последней синхронизации
        cursor.execute("""
            UPDATE marketplace_providers
            SET last_sync_at = %s
            WHERE name = %s
        """, (datetime.now().isoformat(), provider))
        
        conn.commit()
        conn.close()
        
        log_info(f"Sync completed for {provider}", "marketplace")
        
    except Exception as e:
        log_error(f"Error in marketplace sync: {e}", "marketplace")

# ===== СТАТИСТИКА =====

@router.get("/stats")
async def get_marketplace_stats(current_user: dict = Depends(get_current_user)):
    """Получить статистику по маркетплейсам"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Записи по провайдерам
        cursor.execute("""
            SELECT mb.provider, COUNT(*) as count
            FROM marketplace_bookings mb
            GROUP BY mb.provider
        """)
        
        bookings_by_provider = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Отзывы по провайдерам
        cursor.execute("""
            SELECT provider, COUNT(*) as count, AVG(rating) as avg_rating
            FROM marketplace_reviews
            GROUP BY provider
        """)
        
        reviews_by_provider = {}
        for row in cursor.fetchall():
            reviews_by_provider[row[0]] = {
                "count": row[1],
                "avg_rating": float(row[2]) if row[2] else 0
            }
        
        conn.close()
        
        return {
            "bookings_by_provider": bookings_by_provider,
            "reviews_by_provider": reviews_by_provider
        }
        
    except Exception as e:
        log_error(f"Error getting marketplace stats: {e}", "marketplace")
        raise HTTPException(status_code=500, detail=str(e))
