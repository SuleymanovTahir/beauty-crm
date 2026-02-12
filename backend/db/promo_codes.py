"""
Утилиты для работы с промокодами
"""
from db.connection import get_db_connection
from datetime import datetime, timedelta
from utils.logger import log_info, log_error
import random
import string

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

def validate_promo_code(code: str, booking_amount: float = 0) -> dict:
    """Проверить промокод и вернуть данные о скидке"""
    normalized_code = code.upper().strip()
    if len(normalized_code) == 0:
        return {"valid": False, "error": "Промокод не указан"}

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, discount_type, value, min_amount, valid_from, valid_until, max_uses, current_uses, is_active
            FROM promo_codes
            WHERE code = %s AND is_active = TRUE
        """, (normalized_code,))
        
        res = c.fetchone()
        if not res:
            return {"valid": False, "error": "Промокод не найден или неактивен"}
        
        p_id, d_type, value, min_amt, valid_from, until, max_u, curr_u, _ = res

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
