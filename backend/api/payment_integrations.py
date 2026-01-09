"""
API для интеграции с платежными системами
Поддерживаемые системы: Stripe, PayPal, Yookassa, Tinkoff
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import hmac
import hashlib

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
    invoice_id: int
    amount: float
    currency: str = "AED"
    provider: str  # stripe, paypal, yookassa, tinkoff
    return_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentWebhook(BaseModel):
    provider: str
    event_type: str
    data: Dict[str, Any]

# ===== НАСТРОЙКИ ПРОВАЙДЕРОВ =====

@router.get("/payment-providers")
async def get_payment_providers(current_user: dict = Depends(get_current_user)):
    """Получить список настроенных платежных провайдеров"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, is_active, settings, created_at, updated_at
            FROM payment_providers
            ORDER BY name
        """)
        
        providers = []
        for row in cursor.fetchall():
            providers.append({
                "id": row[0],
                "name": row[1],
                "is_active": row[2],
                "settings": json.loads(row[3]) if row[3] else {},
                "created_at": row[4],
                "updated_at": row[5]
            })
        
        conn.close()
        return {"providers": providers}
        
    except Exception as e:
        log_error(f"Error getting payment providers: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment-providers")
async def create_payment_provider(
    provider: PaymentProvider,
    current_user: dict = Depends(get_current_user)
):
    """Создать/обновить настройки платежного провайдера"""
    try:
        if current_user["role"] not in ["admin", "director"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем существование
        cursor.execute(
            "SELECT id FROM payment_providers WHERE name = %s",
            (provider.name,)
        )
        existing = cursor.fetchone()
        
        now = datetime.now().isoformat()
        settings_json = json.dumps(provider.settings) if provider.settings else None
        
        if existing:
            # Обновляем
            cursor.execute("""
                UPDATE payment_providers
                SET api_key = %s, secret_key = %s, webhook_secret = %s,
                    is_active = %s, settings = %s, updated_at = %s
                WHERE name = %s
            """, (
                provider.api_key, provider.secret_key, provider.webhook_secret,
                provider.is_active, settings_json, now, provider.name
            ))
            provider_id = existing[0]
        else:
            # Создаем
            cursor.execute("""
                INSERT INTO payment_providers
                (name, api_key, secret_key, webhook_secret, is_active, settings, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                provider.name, provider.api_key, provider.secret_key,
                provider.webhook_secret, provider.is_active, settings_json, now, now
            ))
            provider_id = cursor.fetchone()[0]
        
        conn.commit()
        conn.close()
        
        log_info(f"Payment provider {provider.name} configured by {current_user['username']}", "payment")
        return {"success": True, "provider_id": provider_id}
        
    except Exception as e:
        log_error(f"Error configuring payment provider: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))

# ===== СОЗДАНИЕ ПЛАТЕЖА =====

@router.post("/create-payment")
async def create_payment(
    payment_request: PaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Создать платежную ссылку"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
        settings = json.loads(settings) if settings else {}
        
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
                payment_request.currency, api_key, payment_request.return_url
            )
        elif payment_request.provider == "yookassa":
            payment_url = await create_yookassa_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, secret_key, payment_request.return_url
            )
        elif payment_request.provider == "tinkoff":
            payment_url = await create_tinkoff_payment(
                transaction_id, payment_request.amount,
                payment_request.currency, api_key, payment_request.return_url
            )
        
        conn.close()
        
        log_info(f"Payment created: {transaction_id} via {payment_request.provider}", "payment")
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "payment_url": payment_url,
            "provider": payment_request.provider
        }
        
    except Exception as e:
        log_error(f"Error creating payment: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ВЕБХУКИ =====

@router.post("/webhook/{provider}")
async def payment_webhook(provider: str, request: Request):
    """Обработка вебхуков от платежных систем"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Получаем webhook_secret
        cursor.execute(
            "SELECT webhook_secret FROM payment_providers WHERE name = %s",
            (provider,)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=400, detail="Provider not found")
        
        webhook_secret = result[0]
        
        # Проверяем подпись
        if provider == "stripe":
            signature = headers.get("stripe-signature")
            if not verify_stripe_signature(body, signature, webhook_secret):
                raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Парсим данные
        data = json.loads(body)
        
        # Обрабатываем событие
        if provider == "stripe":
            await handle_stripe_webhook(data, cursor, conn)
        elif provider == "yookassa":
            await handle_yookassa_webhook(data, cursor, conn)
        elif provider == "tinkoff":
            await handle_tinkoff_webhook(data, cursor, conn)
        
        conn.close()
        
        return {"success": True}
        
    except Exception as e:
        log_error(f"Error processing webhook from {provider}: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))

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

async def create_tinkoff_payment(transaction_id: int, amount: float, currency: str, terminal_key: str, return_url: str):
    """Создать платеж через Tinkoff"""
    # TODO: Реализовать интеграцию с Tinkoff API
    log_warning("Tinkoff integration not implemented yet", "payment")
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
            
            # Обновляем счет
            cursor.execute("""
                SELECT invoice_id, amount FROM payment_transactions WHERE id = %s
            """, (transaction_id,))
            result = cursor.fetchone()
            
            if result:
                invoice_id, amount = result
                cursor.execute("""
                    INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_at)
                    VALUES (%s, %s, 'online', 'Stripe payment', %s)
                """, (invoice_id, amount, datetime.now().isoformat()))
            
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
                SELECT invoice_id, amount FROM payment_transactions WHERE id = %s
            """, (transaction_id,))
            result = cursor.fetchone()
            
            if result:
                invoice_id, amount = result
                cursor.execute("""
                    INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_at)
                    VALUES (%s, %s, 'online', 'Yookassa payment', %s)
                """, (invoice_id, amount, datetime.now().isoformat()))
            
            conn.commit()
            log_info(f"Yookassa payment completed for transaction {transaction_id}", "payment")

async def handle_tinkoff_webhook(data: dict, cursor, conn):
    """Обработать webhook от Tinkoff"""
    # TODO: Реализовать обработку Tinkoff webhook
    log_warning("Tinkoff webhook handler not implemented yet", "payment")

# ===== ИСТОРИЯ ТРАНЗАКЦИЙ =====

@router.get("/transactions")
async def get_transactions(
    invoice_id: Optional[int] = None,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю платежных транзакций"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
            transactions.append({
                "id": row[0],
                "invoice_id": row[1],
                "amount": row[2],
                "currency": row[3],
                "provider": row[4],
                "status": row[5],
                "provider_transaction_id": row[6],
                "metadata": json.loads(row[7]) if row[7] else {},
                "created_at": row[8],
                "completed_at": row[9]
            })
        
        conn.close()
        return {"transactions": transactions}
        
    except Exception as e:
        log_error(f"Error getting transactions: {e}", "payment")
        raise HTTPException(status_code=500, detail=str(e))
