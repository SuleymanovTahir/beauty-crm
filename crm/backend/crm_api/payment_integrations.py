"""
API для интеграции с платежными системами
Поддерживаемые системы: Stripe, PayPal, Yookassa, Tinkoff
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Set
from datetime import datetime
import json
import base64

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning
from utils.utils import get_current_user

router = APIRouter()

# ===== МОДЕЛИ =====

class PaymentProvider(BaseModel):
    name: str  # stripe, paypal, yookassa, tinkoff
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    is_active: bool = True
    settings: Optional[Dict[str, Any]] = None

class PaymentRequest(BaseModel):
    invoice_id: Optional[int] = None
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    currency: str = "AED"
    provider: str  # stripe, paypal, yookassa, tinkoff
    return_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

def _has_access_for_integrations(current_user: dict) -> bool:
    return current_user.get("role") in ["director", "admin", "sales"]


def _can_manage_providers(current_user: dict) -> bool:
    return current_user.get("role") in ["director", "admin"]


def _get_table_columns(cursor, table_name: str) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row[0] for row in cursor.fetchall()}


# ===== ПРОВАЙДЕРЫ ПЛАТЕЖЕЙ =====

@router.get("/payment-providers")
async def get_payment_providers(current_user: dict = Depends(get_current_user)):
    """Получить список платежных провайдеров"""
    if not _has_access_for_integrations(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        provider_columns = _get_table_columns(cursor, "payment_providers")
        has_webhook_secret = "webhook_secret" in provider_columns
        has_created_at = "created_at" in provider_columns
        has_updated_at = "updated_at" in provider_columns

        cursor.execute(f"""
            SELECT
                id,
                name,
                is_active,
                settings,
                {"webhook_secret" if has_webhook_secret else "NULL"} as webhook_secret,
                {"created_at" if has_created_at else "NULL"} as created_at,
                {"updated_at" if has_updated_at else "NULL"} as updated_at
            FROM payment_providers
            ORDER BY name
        """)

        providers = []
        for row in cursor.fetchall():
            raw_settings = row[3]
            parsed_settings = raw_settings if isinstance(raw_settings, dict) else (json.loads(raw_settings) if raw_settings else {})
            providers.append({
                "id": row[0],
                "name": row[1],
                "is_active": bool(row[2]),
                "settings": parsed_settings,
                "webhook_secret": row[4],
                "created_at": row[5],
                "updated_at": row[6],
            })
        return {"providers": providers}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error loading payment providers: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/payment-providers")
async def create_payment_provider(
    provider: PaymentProvider,
    current_user: dict = Depends(get_current_user)
):
    """Создать/обновить настройки платежного провайдера"""
    if not _can_manage_providers(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    normalized_name = provider.name.strip().lower()
    if normalized_name == "":
        raise HTTPException(status_code=400, detail="Provider name is required")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        provider_columns = _get_table_columns(cursor, "payment_providers")
        has_webhook_secret = "webhook_secret" in provider_columns
        has_created_at = "created_at" in provider_columns
        has_updated_at = "updated_at" in provider_columns
        now = datetime.now().isoformat()
        settings_json = json.dumps(provider.settings) if provider.settings is not None else json.dumps({})

        cursor.execute("SELECT id FROM payment_providers WHERE name = %s", (normalized_name,))
        existing = cursor.fetchone()

        if existing:
            current_columns = ["api_key", "secret_key"]
            if has_webhook_secret:
                current_columns.append("webhook_secret")

            cursor.execute(f"""
                SELECT {", ".join(current_columns)}
                FROM payment_providers
                WHERE name = %s
            """, (normalized_name,))
            current_provider_row = cursor.fetchone() or (None, None, None)
            current_api_key = current_provider_row[0] if len(current_provider_row) > 0 else None
            current_secret_key = current_provider_row[1] if len(current_provider_row) > 1 else None
            current_webhook_secret = current_provider_row[2] if len(current_provider_row) > 2 else None

            resolved_api_key = provider.api_key if provider.api_key not in [None, ""] else current_api_key
            resolved_secret_key = provider.secret_key if provider.secret_key not in [None, ""] else current_secret_key
            resolved_webhook_secret = provider.webhook_secret if provider.webhook_secret not in [None, ""] else current_webhook_secret

            set_parts = [
                "api_key = %s",
                "secret_key = %s",
                "is_active = %s",
                "settings = %s",
            ]
            params = [resolved_api_key, resolved_secret_key, provider.is_active, settings_json]

            if has_webhook_secret:
                set_parts.append("webhook_secret = %s")
                params.append(resolved_webhook_secret)
            if has_updated_at:
                set_parts.append("updated_at = %s")
                params.append(now)

            params.append(normalized_name)
            cursor.execute(f"""
                UPDATE payment_providers
                SET {", ".join(set_parts)}
                WHERE name = %s
            """, params)
            provider_id = existing[0]
        else:
            fields = ["name", "api_key", "secret_key", "is_active", "settings"]
            values = [normalized_name, provider.api_key, provider.secret_key, provider.is_active, settings_json]
            placeholders = ["%s", "%s", "%s", "%s", "%s"]

            if has_webhook_secret:
                fields.append("webhook_secret")
                values.append(provider.webhook_secret)
                placeholders.append("%s")
            if has_created_at:
                fields.append("created_at")
                values.append(now)
                placeholders.append("%s")
            if has_updated_at:
                fields.append("updated_at")
                values.append(now)
                placeholders.append("%s")

            cursor.execute(f"""
                INSERT INTO payment_providers ({", ".join(fields)})
                VALUES ({", ".join(placeholders)})
                RETURNING id
            """, values)
            provider_id = cursor.fetchone()[0]

        conn.commit()
        log_info(f"Payment provider {normalized_name} saved by {current_user.get('username')}", "payment")
        return {"success": True, "provider_id": provider_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        log_error(f"Error saving payment provider: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ===== СОЗДАНИЕ ПЛАТЕЖА =====

@router.post("/create-payment")
async def create_payment(
    payment_request: PaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Создать платежную ссылку"""
    if not _has_access_for_integrations(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Получаем настройки провайдера
        cursor.execute("""
            SELECT api_key, secret_key, settings
            FROM payment_providers
            WHERE name = %s AND is_active = TRUE
        """, (payment_request.provider,))
        
        provider_data = cursor.fetchone()
        if not provider_data:
            raise HTTPException(status_code=400, detail=f"Provider {payment_request.provider} not configured")
        
        api_key, secret_key, settings = provider_data
        _ = settings if isinstance(settings, dict) else (json.loads(settings) if settings else {})
        
        # Создаем запись о платеже
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO payment_transactions
            (invoice_id, amount, currency, provider, status, metadata, created_at)
            VALUES (%s, %s, %s, %s, 'pending', %s, %s)
            RETURNING id
        """, (
            payment_request.invoice_id, payment_request.amount,
            payment_request.currency, payment_request.provider,
            json.dumps(payment_request.metadata) if payment_request.metadata else None,
            now
        ))
        
        transaction_id = cursor.fetchone()[0]
        conn.commit()
        
        # Генерируем платежную ссылку в зависимости от провайдера
        payment_url = None
        
        if payment_request.provider == "stripe":
            payment_url = await create_stripe_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, payment_request.return_url or ""
            )
        elif payment_request.provider == "yookassa":
            payment_url = await create_yookassa_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, secret_key, payment_request.return_url or ""
            )
        elif payment_request.provider == "tinkoff":
            payment_url = await create_tinkoff_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, payment_request.return_url or ""
            )
        elif payment_request.provider == "paypal":
             payment_url = await create_paypal_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, secret_key, payment_request.return_url or ""
            )

        log_info(f"Payment created: {transaction_id} via {payment_request.provider}", "payment")
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "payment_url": payment_url,
            "provider": payment_request.provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error creating payment: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ===== ВЕБХУКИ =====

@router.post("/webhook/{provider}")
async def payment_webhook(provider: str, request: Request):
    """Обработка вебхуков от платежных систем"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        body = await request.body()
        headers = dict(request.headers)

        provider_columns = _get_table_columns(cursor, "payment_providers")
        has_webhook_secret = "webhook_secret" in provider_columns

        if has_webhook_secret:
            cursor.execute(
                "SELECT webhook_secret FROM payment_providers WHERE name = %s",
                (provider,)
            )
            result = cursor.fetchone()
        else:
            cursor.execute(
                "SELECT id FROM payment_providers WHERE name = %s",
                (provider,)
            )
            provider_row = cursor.fetchone()
            result = (None,) if provider_row else None

        if not result:
            raise HTTPException(status_code=400, detail="Provider not found")

        webhook_secret = result[0]

        # Проверяем подпись
        if provider == "stripe" and webhook_secret:
            signature = headers.get("stripe-signature")
            if not verify_stripe_signature(body, signature, webhook_secret):
                raise HTTPException(status_code=400, detail="Invalid signature")
        elif provider == "stripe":
            log_warning("Stripe webhook_secret is not configured. Signature check skipped.", "payment")
        
        # Парсим данные
        data = json.loads(body)
        
        # Обрабатываем событие
        if provider == "stripe":
            await handle_stripe_webhook(data, cursor, conn)
        elif provider == "yookassa":
            await handle_yookassa_webhook(data, cursor, conn)
        elif provider == "tinkoff":
            await handle_tinkoff_webhook(data, cursor, conn)
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error processing webhook from {provider}: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

async def create_stripe_payment(transaction_id: int, amount: float, currency: str, api_key: str, return_url: str):
    """Создать платеж через Stripe"""
    try:
        import stripe
        stripe.api_key = api_key
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {'name': f'Invoice Payment #{transaction_id}'},
                    'unit_amount': int(amount * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{return_url}?success=true&transaction_id={transaction_id}",
            cancel_url=f"{return_url}?canceled=true&transaction_id={transaction_id}",
            metadata={'transaction_id': transaction_id}
        )
        
        return session.url
    except Exception as e:
        log_error(f"Stripe payment creation error: {e}", "payment")
        return None

async def create_yookassa_payment(transaction_id: int, amount: float, currency: str, shop_id: str, secret_key: str, return_url: str):
    """Создать платеж через Yookassa"""
    try:
        from yookassa import Configuration, Payment
        
        Configuration.account_id = shop_id
        Configuration.secret_key = secret_key
        
        payment = Payment.create({
            "amount": {
                "value": str(amount),
                "currency": currency
            },
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "capture": True,
            "description": f"Payment for transaction #{transaction_id}",
            "metadata": {"transaction_id": transaction_id}
        })
        
        return payment.confirmation.confirmation_url
    except Exception as e:
        log_error(f"Yookassa payment creation error: {e}", "payment")
        return None

async def create_paypal_payment(transaction_id: int, amount: float, currency: str, client_id: str, client_secret: str, return_url: str):
    import httpx
    import os
    
    # Determine PayPal environment
    paypal_mode = os.getenv("PAYPAL_MODE", "sandbox").lower()
    base_url = "https://api-m.paypal.com" if paypal_mode == "live" else "https://api-m.sandbox.paypal.com" 
    
    # 1. Get Access Token
    token_url = f"{base_url}/v1/oauth2/token"
    creds = f"{client_id}:{client_secret}"
    b64_creds = base64.b64encode(creds.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {b64_creds}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=data, headers=headers)
        if token_resp.status_code != 200:
             log_error(f"PayPal Token Error: {token_resp.text}", "payment")
             raise HTTPException(status_code=500, detail="PayPal Auth Failed")
        
        access_token = token_resp.json()["access_token"]
        
        # 2. Create Order
        order_url = f"{base_url}/v2/checkout/orders"
        order_headers = {
             "Content-Type": "application/json",
             "Authorization": f"Bearer {access_token}"
        }
        order_payload = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": str(transaction_id),
                "amount": {
                    "currency_code": currency,
                    "value": f"{amount:.2f}"
                }
            }],
             "application_context": {
                "return_url": return_url,
                "cancel_url": return_url # Simplified
            }
        }
        
        order_resp = await client.post(order_url, json=order_payload, headers=order_headers)
        if order_resp.status_code not in [200, 201]:
             log_error(f"PayPal Order Error: {order_resp.text}", "payment")
             raise HTTPException(status_code=500, detail="PayPal Order Failed")
             
        order_data = order_resp.json()
        for link in order_data.get("links", []):
            if link["rel"] == "approve":
                return link["href"]
        
        return None

async def create_tinkoff_payment(transaction_id: int, amount: float, currency: str, terminal_key: str, return_url: str):
    """Создать платеж через Tinkoff"""
    try:
        import httpx
        import hashlib
        import os

        # Получаем пароль терминала
        password = os.getenv("TINKOFF_PASSWORD")
        if not password:
             # Попытка получить из конфига или БД (если есть)
             # Пока считаем критической ошибкой
             log_error("TINKOFF_PASSWORD not set in environment", "payment")
             return None

        # Сумма в копейках
        amount_cents = int(amount * 100)
        
        # Данные для инициализации
        payload = {
            "TerminalKey": terminal_key,
            "Amount": amount_cents,
            "OrderId": str(transaction_id),
            "Description": f"Order #{transaction_id}",
            "SuccessURL": return_url,
            # "FailURL": return_url  # Можно добавить при необходимости
        }
        
        # Генерация токена (подписи)
        # 1. Добавляем пароль к параметрам
        token_params = payload.copy()
        token_params["Password"] = password
        
        # 2. Сортируем по ключам
        sorted_params = sorted(token_params.items())
        
        # 3. Конкатенируем значения
        values = "".join(str(v) for k, v in sorted_params)
        
        # 4. SHA-256 хеширование
        token = hashlib.sha256(values.encode("utf-8")).hexdigest()
        
        # Добавляем токен в запрос
        payload["Token"] = token
        
        # Отправляем запрос инициализации
        url = "https://securepay.tinkoff.ru/v2/Init"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            data = response.json()
            
            if data.get("Success"):
                payment_url = data.get("PaymentURL")
                log_info(f"Tinkoff payment created: {data.get('PaymentId')}", "payment")
                return payment_url
            else:
                error_msg = data.get("Message", "Unknown error")
                details = data.get("Details", "")
                log_error(f"Tinkoff Init failed: {error_msg} ({details})", "payment")
                return None
                
    except Exception as e:
        log_error(f"Tinkoff integration error: {e}", "payment")
        return None

def verify_stripe_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Проверить подпись Stripe webhook"""
    try:
        import stripe
        stripe.Webhook.construct_event(payload, signature, secret)
        return True
    except Exception:
        return False

async def handle_stripe_webhook(data: dict, cursor, conn):
    """Обработать webhook от Stripe"""
    event_type = data.get("type")
    
    if event_type == "checkout.session.completed":
        session = data.get("data", {}).get("object", {})
        transaction_id = session.get("metadata", {}).get("transaction_id")
        
        if transaction_id:
            # Обновляем статус транзакции
            cursor.execute("""
                UPDATE payment_transactions
                SET status = 'completed', completed_at = %s, provider_transaction_id = %s
                WHERE id = %s
            """, (datetime.now().isoformat(), session.get("id"), transaction_id))
            
            # Обновляем счет только если есть invoice_id
            cursor.execute("""
                SELECT invoice_id, amount, metadata FROM payment_transactions WHERE id = %s
            """, (transaction_id,))
            result = cursor.fetchone()
            
            if result:
                invoice_id, amount, metadata = result
                
                # Формируем описание для платежа
                notes = 'Stripe payment'
                meta_dict = metadata if isinstance(metadata, dict) else (json.loads(metadata) if metadata else {})
                if meta_dict and meta_dict.get('description'):
                    notes += f": {meta_dict['description']}"
                
                if invoice_id:
                    cursor.execute("""
                        INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_at)
                        VALUES (%s, %s, 'online', %s, %s)
                    """, (invoice_id, amount, notes, datetime.now().isoformat()))
            
            conn.commit()
            log_info(f"Stripe payment completed for transaction {transaction_id}", "payment")

async def handle_yookassa_webhook(data: dict, cursor, conn):
    """Обработать webhook от Yookassa"""
    event_type = data.get("event")
    
    if event_type == "payment.succeeded":
        payment = data.get("object", {})
        transaction_id = payment.get("metadata", {}).get("transaction_id")
        
        if transaction_id:
            cursor.execute("""
                UPDATE payment_transactions
                SET status = 'completed', completed_at = %s, provider_transaction_id = %s
                WHERE id = %s
            """, (datetime.now().isoformat(), payment.get("id"), transaction_id))
            
            cursor.execute("""
                SELECT invoice_id, amount, metadata FROM payment_transactions WHERE id = %s
            """, (transaction_id,))
            result = cursor.fetchone()
            
            if result:
                invoice_id, amount, metadata = result
                
                notes = 'Yookassa payment'
                meta_dict = metadata if isinstance(metadata, dict) else (json.loads(metadata) if metadata else {})
                if meta_dict and meta_dict.get('description'):
                    notes += f": {meta_dict['description']}"

                if invoice_id:
                    cursor.execute("""
                        INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_at)
                        VALUES (%s, %s, 'online', %s, %s)
                    """, (invoice_id, amount, notes, datetime.now().isoformat()))
            
            conn.commit()
            log_info(f"Yookassa payment completed for transaction {transaction_id}", "payment")

async def handle_tinkoff_webhook(data: dict, cursor, conn):
    """Обработать webhook от Tinkoff"""
    try:
        status = data.get("Status")
        order_id = data.get("OrderId")
        payment_id = data.get("PaymentId")
        token = data.get("Token")
        
        if not order_id:
            return

        # Проверка токена (безопасность)
        import os
        import hashlib
        password = os.getenv("TINKOFF_PASSWORD")
        if password and token:
            # Валидация
            token_params = data.copy()
            token_params["Password"] = password
            if "Token" in token_params:
                del token_params["Token"]
                
            sorted_params = sorted(token_params.items())
            values = "".join(str(v) for k, v in sorted_params)
            calculated_token = hashlib.sha256(values.encode("utf-8")).hexdigest()
            
            if calculated_token != token:
                log_error(f"Invalid Tinkoff token for Order {order_id}", "payment")
                # Не прерываем, возможно стоит логировать и выходить
                # Но ответим OK, чтобы повторные запросы не шли, если мы уверены что это атака/ошибка
                return

        if status == "CONFIRMED":
            # Успешный платеж
            transaction_id = int(order_id)
            
            # Проверяем текущий статус
            cursor.execute("SELECT status FROM payment_transactions WHERE id = %s", (transaction_id,))
            current_status = cursor.fetchone()
            
            # Обновляем только если еще не завершен
            if current_status and current_status[0] != 'completed':
                cursor.execute("""
                    UPDATE payment_transactions
                    SET status = 'completed', completed_at = %s, provider_transaction_id = %s
                    WHERE id = %s
                """, (datetime.now().isoformat(), str(payment_id), transaction_id))
                
                # Добавляем в инвойс
                cursor.execute("""
                    SELECT invoice_id, amount, metadata FROM payment_transactions WHERE id = %s
                """, (transaction_id,))
                result = cursor.fetchone()
                
                if result:
                    invoice_id, amount, metadata = result
                    
                    notes = 'Tinkoff payment'
                    try:
                        meta_dict = metadata if isinstance(metadata, dict) else (json.loads(metadata) if metadata else {})
                        if meta_dict and meta_dict.get('description'):
                            notes += f": {meta_dict['description']}"
                    except:
                        pass

                    if invoice_id:
                        cursor.execute("""
                            INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_at)
                            VALUES (%s, %s, 'online', %s, %s)
                        """, (invoice_id, amount, notes, datetime.now().isoformat()))
                
                conn.commit()
                log_info(f"Tinkoff payment completed for transaction {transaction_id}", "payment")
                
        elif status in ["CANCELED", "REJECTED", "REVERSED"]:
            transaction_id = int(order_id)
            cursor.execute("""
                UPDATE payment_transactions
                SET status = 'cancelled', completed_at = %s
                WHERE id = %s
            """, (datetime.now().isoformat(), transaction_id))
            conn.commit()
            log_info(f"Tinkoff payment cancelled for transaction {transaction_id}", "payment")

    except Exception as e:
        log_error(f"Error handling Tinkoff webhook: {e}", "payment")

# ===== ИСТОРИЯ ТРАНЗАКЦИЙ =====

@router.get("/transactions")
async def get_transactions(
    invoice_id: Optional[int] = None,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю платежных транзакций"""
    if not _has_access_for_integrations(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT id, invoice_id, amount, currency, provider, status,
                   provider_transaction_id, metadata, created_at, completed_at
            FROM payment_transactions
            WHERE 1=1
        """
        params = []
        
        if invoice_id:
            query += " AND invoice_id = %s"
            params.append(invoice_id)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if provider:
            query += " AND provider = %s"
            params.append(provider)
        
        query += " ORDER BY created_at DESC LIMIT 100"
        
        cursor.execute(query, params)
        
        transactions = []
        for row in cursor.fetchall():
            raw_metadata = row[7]
            parsed_metadata = raw_metadata if isinstance(raw_metadata, dict) else (json.loads(raw_metadata) if raw_metadata else {})
            transactions.append({
                "id": row[0],
                "invoice_id": row[1],
                "amount": row[2],
                "currency": row[3],
                "provider": row[4],
                "status": row[5],
                "provider_transaction_id": row[6],
                "metadata": parsed_metadata,
                "created_at": row[8],
                "completed_at": row[9]
            })
        
        return {"transactions": transactions}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error getting transactions: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
