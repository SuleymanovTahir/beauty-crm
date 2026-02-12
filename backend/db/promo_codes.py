"""
Утилиты для работы с промокодами
"""
from db.connection import get_db_connection
from datetime import datetime, timedelta
from utils.logger import log_info, log_error
import random
import string
from typing import Optional


def _split_csv(value: Optional[str]) -> list[str]:
    if value is None:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _get_promo_columns(cursor) -> set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'promo_codes'
    """)
    return {row[0] for row in cursor.fetchall()}

def create_promo_code(
    code: str, 
    discount_type: str, 
    value: float, 
    valid_days: int = 30,
    category: str = 'general',
    description: str = None,
    max_uses: int = None
) -> bool:
    """Создать новый промокод"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        valid_from = datetime.now()
        valid_until = valid_from + timedelta(days=valid_days)
        
        c.execute("""
            INSERT INTO promo_codes 
            (code, discount_type, value, valid_from, valid_until, category, description, max_uses)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (code) DO UPDATE SET
                discount_type = EXCLUDED.discount_type,
                value = EXCLUDED.value,
                valid_until = EXCLUDED.valid_until,
                is_active = TRUE
        """, (code.upper(), discount_type, value, valid_from, valid_until, category, description, max_uses))
        conn.commit()
        return True
    except Exception as e:
        log_error(f"Error creating promo code {code}: {e}", "db.promo_codes")
        return False
    finally:
        conn.close()

def generate_birthday_promo(client_name: str, client_id: str) -> str:
    """Генерирует уникальный промокод для дня рождения"""
    # Очищаем имя от спецсимволов
    clean_name = "".join(filter(str.isalnum, client_name))[:5].upper()
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    code = f"BDAY-{clean_name}-{random_str}"
    
    # 15% скидка на 14 дней (7 до и 7 после)
    success = create_promo_code(
        code=code,
        discount_type='percent',
        value=15.0,
        valid_days=14,
        category='birthday',
        description=f"День рождения {client_name}",
        max_uses=1
    )
    
    return code if success else "BDAY15"

def validate_promo_code(
    code: str,
    booking_amount: float = 0,
    service_ids: Optional[list[int]] = None,
    service_categories: Optional[list[str]] = None,
    client_id: Optional[str] = None
) -> dict:
    """Проверить промокод и вернуть данные о скидке"""
    normalized_code = code.upper().strip()
    if len(normalized_code) == 0:
        return {"valid": False, "error": "Промокод не указан"}

    conn = get_db_connection()
    c = conn.cursor()
    try:
        promo_columns = _get_promo_columns(c)
        scope_sql = "COALESCE(target_scope, 'all')" if "target_scope" in promo_columns else "'all'"
        category_sql = "target_category_names" if "target_category_names" in promo_columns else "NULL"
        service_sql = "target_service_ids" if "target_service_ids" in promo_columns else "NULL"
        client_sql = "target_client_ids" if "target_client_ids" in promo_columns else "NULL"

        c.execute("""
            SELECT
                id,
                discount_type,
                value,
                min_amount,
                valid_from,
                valid_until,
                max_uses,
                current_uses,
                is_active,
                {scope_sql},
                {category_sql},
                {service_sql},
                {client_sql}
            FROM promo_codes
            WHERE code = %s AND is_active = TRUE
        """.format(
            scope_sql=scope_sql,
            category_sql=category_sql,
            service_sql=service_sql,
            client_sql=client_sql,
        ), (normalized_code,))
        
        res = c.fetchone()
        if not res:
            return {"valid": False, "error": "Промокод не найден или неактивен"}
        
        (
            p_id,
            d_type,
            value,
            min_amt,
            valid_from,
            until,
            max_u,
            curr_u,
            _,
            target_scope,
            target_categories_raw,
            target_services_raw,
            target_clients_raw,
        ) = res

        now = datetime.now()
        if valid_from and now < valid_from:
            return {"valid": False, "error": "Промокод еще не активен"}
        
        # Проверка срока действия
        if until and now > until:
            return {"valid": False, "error": "Срок действия промокода истек"}
        
        # Проверка количества использований
        if max_u and curr_u >= max_u:
            return {"valid": False, "error": "Лимит использований промокода исчерпан"}
        
        # Проверка минимальной суммы
        if booking_amount < (min_amt or 0):
            return {"valid": False, "error": f"Минимальная сумма для этого промокода: {min_amt}"}

        normalized_scope = (target_scope or "all").strip().lower()
        promo_categories = [category.lower() for category in _split_csv(target_categories_raw)]
        promo_service_ids = [int(value) for value in _split_csv(target_services_raw) if value.isdigit()]
        promo_client_ids = _split_csv(target_clients_raw)

        request_categories: list[str] = []
        if service_categories:
            request_categories = [str(category).strip().lower() for category in service_categories if str(category).strip()]

        request_service_ids: list[int] = []
        if service_ids:
            request_service_ids = [int(service_id) for service_id in service_ids if isinstance(service_id, int) and service_id > 0]

        if normalized_scope == "categories":
            if len(promo_categories) == 0:
                return {"valid": False, "error": "Промокод настроен с ошибкой"}
            if len(request_categories) == 0:
                return {"valid": False, "error": "Промокод доступен не для всех категорий услуг"}
            if not any(category in promo_categories for category in request_categories):
                return {"valid": False, "error": "Промокод не действует для выбранной категории услуг"}

        if normalized_scope == "services":
            if len(promo_service_ids) == 0:
                return {"valid": False, "error": "Промокод настроен с ошибкой"}
            if len(request_service_ids) == 0:
                return {"valid": False, "error": "Промокод доступен только для отдельных услуг"}
            if not any(service_id in promo_service_ids for service_id in request_service_ids):
                return {"valid": False, "error": "Промокод не действует для выбранной услуги"}

        if normalized_scope == "clients":
            if len(promo_client_ids) == 0:
                return {"valid": False, "error": "Промокод настроен с ошибкой"}
            if not client_id:
                return {"valid": False, "error": "Промокод персональный и недоступен для текущего клиента"}
            if str(client_id).strip() not in promo_client_ids:
                return {"valid": False, "error": "Промокод не назначен этому клиенту"}
            
        return {
            "valid": True,
            "id": p_id,
            "discount_type": d_type,
            "value": value
        }
    finally:
        conn.close()

def log_promo_usage(promo_id: int, client_id: str = None, user_id: int = None, booking_id: int = None):
    """Записать использование промокода"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO promo_code_usage (promo_id, client_id, user_id, booking_id)
            VALUES (%s, %s, %s, %s)
        """, (promo_id, client_id, user_id, booking_id))
        
        c.execute("UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = %s", (promo_id,))
        conn.commit()
    finally:
        conn.close()
