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

# ===== СТАТИСТИКА =====

@router.get("/marketplace/stats")
async def get_marketplace_stats(current_user: dict = Depends(get_current_user)):
    """Получить статистику по маркетплейсам"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Статистика по записям
        cursor.execute("""
            SELECT provider, COUNT(*) as count
            FROM marketplace_bookings
            GROUP BY provider
        """)
        bookings_by_provider = {row[0]: row[1] for row in cursor.fetchall()}

        # Статистика по отзывам
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
        elif provider == "wildberries":
            await handle_wildberries_webhook(data, cursor, conn)
        elif provider == "ozon":
            await handle_ozon_webhook(data, cursor, conn)
        elif provider == "amazon":
            await handle_amazon_webhook(data, cursor, conn)
        
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
        elif event_type == "booking.updated":
            booking_data = data.get("data", {})
            await update_booking_from_marketplace(
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
        elif event == "appointment.updated":
            appointment = data.get("appointment", {})
            await update_booking_from_marketplace(
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
        elif event_type == "record" and data.get("action") == "update":
            record = data.get("data", {})
            await update_booking_from_marketplace(
                "yclients",
                record,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling YCLIENTS webhook: {e}", "marketplace")

async def handle_wildberries_webhook(data: dict, cursor, conn):
    """Обработать webhook от Wildberries"""
    try:
        event_type = data.get("type")
        
        if event_type == "order.created":
            order_data = data.get("order", {})
            # WB - это маркетплейс товаров, создаем заказ
            await create_order_from_marketplace(
                "wildberries",
                order_data,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Wildberries webhook: {e}", "marketplace")

async def handle_ozon_webhook(data: dict, cursor, conn):
    """Обработать webhook от Ozon"""
    try:
        event_type = data.get("message_type")
        
        if event_type == "TYPE_NEW_POSTING":
            posting_data = data.get("posting", {})
            await create_order_from_marketplace(
                "ozon",
                posting_data,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Ozon webhook: {e}", "marketplace")

async def handle_amazon_webhook(data: dict, cursor, conn):
    """Обработать webhook от Amazon"""
    try:
        notification_type = data.get("NotificationType")
        
        if notification_type == "AnyOfferChanged":
            # Amazon MWS/SP-API формат
            payload = data.get("Payload", {})
            await create_order_from_marketplace(
                "amazon",
                payload,
                cursor,
                conn
            )
            
    except Exception as e:
        log_error(f"Error handling Amazon webhook: {e}", "marketplace")

async def create_order_from_marketplace(provider: str, order_data: dict, cursor, conn):
    """Создать заказ из маркетплейса товаров (WB, Ozon, Amazon)"""
    try:
        # Нормализуем данные заказа
        normalized = normalize_order_data(provider, order_data)
        
        # Создаем клиента если нужно
        cursor.execute("""
            SELECT instagram_id FROM clients WHERE phone = %s
        """, (normalized.get("client_phone", "unknown"),))
        
        client = cursor.fetchone()
        
        if not client:
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO clients
                (instagram_id, name, phone, email, source, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING instagram_id
            """, (
                f"marketplace_{provider}_{normalized.get('order_id')}",
                normalized.get("client_name", "Клиент из маркетплейса"),
                normalized.get("client_phone", ""),
                normalized.get("client_email"),
                provider,
                now
            ))
            client_id = cursor.fetchone()[0]
        else:
            client_id = client[0]
        
        # Сохраняем информацию о заказе в notes клиента
        now = datetime.now().isoformat()
        order_note = f"Заказ #{normalized.get('order_id')} из {provider}: {normalized.get('items_summary', 'товары')}, сумма: {normalized.get('total_amount', 0)}"
        
        cursor.execute("""
            UPDATE clients
            SET notes = COALESCE(notes, '') || %s
            WHERE instagram_id = %s
        """, (f"\n{order_note}", client_id))
        
        conn.commit()
        log_info(f"Created order from {provider}: {normalized.get('order_id')}", "marketplace")
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error creating order from marketplace: {e}", "marketplace")

def normalize_order_data(provider: str, data: dict) -> dict:
    """Нормализовать данные заказа из маркетплейса"""
    normalized = {}
    
    if provider == "wildberries":
        normalized = {
            "order_id": data.get("id"),
            "client_name": data.get("user", {}).get("name"),
            "client_phone": data.get("user", {}).get("phone"),
            "total_amount": data.get("total_price"),
            "items_summary": ", ".join([item.get("name", "") for item in data.get("items", [])])
        }
    elif provider == "ozon":
        normalized = {
            "order_id": data.get("posting_number"),
            "client_name": data.get("customer", {}).get("name"),
            "client_phone": data.get("customer", {}).get("phone"),
            "total_amount": sum([p.get("price", 0) for p in data.get("products", [])]),
            "items_summary": ", ".join([p.get("name", "") for p in data.get("products", [])])
        }
    elif provider == "amazon":
        normalized = {
            "order_id": data.get("AmazonOrderId"),
            "client_name": data.get("BuyerName"),
            "client_email": data.get("BuyerEmail"),
            "total_amount": data.get("OrderTotal", {}).get("Amount", 0),
            "items_summary": "Amazon order items"
        }
    
    return normalized

# ===== СОЗДАНИЕ ЗАПИСИ ИЗ МАРКЕТПЛЕЙСА =====

async def resolve_service_name(provider: str, external_service_id: str, default_name: str, cursor) -> str:
    """Разрешить имя услуги используя маппинг"""
    try:
        if not external_service_id:
            return default_name

        cursor.execute("SELECT settings FROM marketplace_providers WHERE name = %s", (provider,))
        provider_row = cursor.fetchone()
        
        if provider_row and provider_row[0]:
            settings = json.loads(provider_row[0])
            service_mapping = settings.get("service_mapping", {}) # {internal_id: external_id}
            
            # Инвертируем маппинг: {external_id: internal_id}
            ext_to_int = {str(v): str(k) for k, v in service_mapping.items() if v}
            
            ext_svc_id = str(external_service_id)
            
            if ext_svc_id in ext_to_int:
                internal_id = ext_to_int[ext_svc_id]
                
                # Получаем имя внутренней услуги
                cursor.execute("SELECT name FROM services WHERE id = %s", (internal_id,))
                svc_row = cursor.fetchone()
                if svc_row:
                    log_info(f"Mapped external service {ext_svc_id} to internal {svc_row[0]}", "marketplace")
                    return svc_row[0]
                    
        return default_name
    except Exception as e:
        log_error(f"Error resolving service name: {e}", "marketplace")
        return default_name

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
        
        # Разрешаем имя услуги через маппинг
        final_service_name = await resolve_service_name(
            provider, 
            normalized.get("external_service_id"), 
            normalized["service_name"], 
            cursor
        )
        
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
        
        # Комбинируем date и time в datetime
        booking_datetime = f"{normalized['booking_date']} {normalized['booking_time']}"
        
        cursor.execute("""
            INSERT INTO bookings
            (instagram_id, service_name, datetime,
             revenue, status, source, notes, created_at)
            VALUES (%s, %s, %s, %s, 'pending', %s, %s, %s)
            RETURNING id
        """, (
            client_id,
            final_service_name, # Используем смапленное имя
            booking_datetime,
            normalized.get("price", 0),
            provider,
            normalized.get("notes", f"Booking from {provider}"),
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

async def update_booking_from_marketplace(
    provider: str,
    booking_data: dict,
    cursor,
    conn
):
    """Обновить запись из данных маркетплейса"""
    try:
        # Нормализуем данные
        normalized = normalize_booking_data(provider, booking_data)
        external_id = normalized.get("external_id")
        
        if not external_id:
            log_warning(f"Cannot update booking from {provider}: no external_id", "marketplace")
            return

        # Ищем существующую запись
        cursor.execute("""
            SELECT booking_id FROM marketplace_bookings 
            WHERE provider = %s AND external_id = %s
        """, (provider, str(external_id)))
        
        row = cursor.fetchone()
        if not row:
            log_warning(f"Booking not found for update: {provider} {external_id}", "marketplace")
            # Можно попробовать создать, если нужно
            return
            
        booking_id = row[0]
        
        # Разрешаем имя услуги через маппинг
        final_service_name = await resolve_service_name(
            provider, 
            normalized.get("external_service_id"), 
            normalized["service_name"], 
            cursor
        )
        
        now = datetime.now().isoformat()
        
        # Комбинируем date и time в datetime
        booking_datetime = f"{normalized['booking_date']} {normalized['booking_time']}"
        
        # Обновляем запись
        cursor.execute("""
            UPDATE bookings
            SET service_name = %s,
                datetime = %s,
                revenue = %s,
                notes = %s
            WHERE id = %s
        """, (
            final_service_name,
            booking_datetime,
            normalized.get("price", 0),
            normalized.get("notes", f"Updated from {provider}"),
            booking_id
        ))
        
        # Обновляем сырые данные
        cursor.execute("""
            UPDATE marketplace_bookings
            SET raw_data = %s
            WHERE booking_id = %s
        """, (json.dumps(booking_data), booking_id))
        
        conn.commit()
        log_info(f"Updated booking {booking_id} from {provider}", "marketplace")
        
    except Exception as e:
        conn.rollback()
        log_error(f"Error updating booking from marketplace: {e}", "marketplace")

def normalize_booking_data(provider: str, data: dict) -> dict:
    """Нормализовать данные записи в зависимости от провайдера"""
    normalized = {}
    
    if provider == "yandex_maps":
        normalized = {
            "external_id": data.get("id"),
            "external_service_id": data.get("service", {}).get("id"),
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
            "external_service_id": data.get("service_id"),
            "client_name": data.get("customer_name"),
            "client_phone": data.get("customer_phone"),
            "service_name": data.get("service_name"),
            "booking_date": data.get("date"),
            "booking_time": data.get("time"),
            "duration": data.get("duration", 60)
        }
    elif provider == "booksy":
        svc = data.get("services", [{}])[0] if data.get("services") else {}
        normalized = {
            "external_id": data.get("id"),
            "external_service_id": svc.get("id"),
            "client_name": f"{data.get('client', {}).get('first_name')} {data.get('client', {}).get('last_name')}",
            "client_phone": data.get("client", {}).get("phone"),
            "client_email": data.get("client", {}).get("email"),
            "service_name": svc.get("name", "Unknown"),
            "booking_date": data.get("start_date"),
            "booking_time": data.get("start_time"),
            "duration": data.get("duration", 60),
            "price": data.get("price")
        }
    elif provider == "yclients":
        svc = data.get("services", [{}])[0] if data.get("services") else {}
        normalized = {
            "external_id": data.get("id"),
            "external_service_id": svc.get("id"),
            "client_name": data.get("client", {}).get("name"),
            "client_phone": data.get("client", {}).get("phone"),
            "service_name": svc.get("title", "Unknown"),
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
        if provider == "yclients":
            await sync_yclients(api_key, settings, cursor, conn)
        elif provider == "booksy":
            await sync_booksy(api_key, api_secret, settings, cursor, conn)
        # Add other providers here
        
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

async def sync_yclients(api_key: str, settings: dict, cursor, conn):
    """Синхронизация с YCLIENTS"""
    try:
        # В реальной реализации здесь был бы запрос к API YCLIENTS
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(f"https://api.yclients.com/api/v1/records/...", headers=...)
        #     data = response.json()
        
        # Для демонстрации используем заглушку, если это тестовый режим
        if settings.get("test_mode"):
            bookings_data = [
                {
                    "id": "mock_yc_1",
                    "services": [{"id": "1", "title": "Мужская стрижка"}],
                    "client": {"name": "Test YClient", "phone": "79990000001", "email": "test@example.com"},
                    "date": "2024-03-20 10:00:00",
                    "datetime": "2024-03-20 10:00:00",
                    "seance_length": 3600
                }
            ]
            
            for record in bookings_data:
                # Проверяем существование
                cursor.execute("SELECT booking_id FROM marketplace_bookings WHERE provider = 'yclients' AND external_id = %s", (str(record["id"]),))
                if cursor.fetchone():
                    await update_booking_from_marketplace("yclients", record, cursor, conn)
                else:
                    await create_booking_from_marketplace("yclients", record, cursor, conn)
                    
            log_info(f"Sync yclients: processed {len(bookings_data)} records (mock)", "marketplace")

    except Exception as e:
        log_error(f"Error syncing YCLIENTS: {e}", "marketplace")
        raise e

async def sync_booksy(api_key: str, api_secret: str, settings: dict, cursor, conn):
    """Синхронизация с Booksy"""
    try:
        # Аналогично, здесь был бы реальный запрос к API
        pass
    except Exception as e:
        log_error(f"Error syncing Booksy: {e}", "marketplace")
        raise e

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
