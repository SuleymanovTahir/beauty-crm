# ВАЖНО: Скопировать этот код В ФАЙЛ client_auth.py

# 1. Добавить после строки 216 (после register_client endpoint, ПЕРЕД login):

@router.post("/verify-email")
async def verify_client_email(data: VerifyClientEmailRequest):
    """Подтверждение email клиента по коду"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем есть ли колонка verification_code в таблице clients
        c.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='clients' AND column_name='verification_code'
        """)
        has_verification_column = c.fetchone() is not None
        
        if has_verification_column:
            # Используем колонку в таблице clients
            c.execute("""
                SELECT instagram_id, verification_code, verification_code_expires, name
                FROM clients
                WHERE LOWER(email) = LOWER(%s)
            """, (data.email,))
            
            result = c.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Клиент не найден")
            
            client_id, stored_code, expires_at, name = result
            
            # Проверяем код
            if stored_code != data.code:
                raise HTTPException(status_code=400, detail="Неверный код верификации")
            
            # Проверяем срок действия
            if datetime.fromisoformat(expires_at) < datetime.now():
                raise HTTPException(status_code=400, detail="Код верификации истек. Запросите новый.")
            
            # Активируем клиента
            c.execute("""
                UPDATE clients 
                SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL
                WHERE instagram_id = %s
            """, (client_id,))
            
        else:
            # Используем отдельную таблицу client_email_verifications
            c.execute("""
                SELECT code, expires_at
                FROM client_email_verifications
                WHERE LOWER(email) = LOWER(%s) AND verified_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            """, (data.email,))
            
            result = c.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Код верификации не найден")
            
            stored_code, expires_at = result
            
            # Проверяем код
            if stored_code != data.code:
                c.execute("""
                    UPDATE client_email_verifications 
                    SET attempts = attempts + 1
                    WHERE LOWER(email) = LOWER(%s) AND code = %s
                """, (data.email, stored_code))
                raise HTTPException(status_code=400, detail="Неверный код верификации")
            
            # Проверяем срок действия
            if datetime.fromisoformat(expires_at) < datetime.now():
                raise HTTPException(status_code=400, detail="Код верификации истек. Запросите новый.")
            
            # Отмечаем код как использованный
            c.execute("""
                UPDATE client_email_verifications 
                SET verified_at = %s
                WHERE LOWER(email) = LOWER(%s) AND code = %s
            """, (datetime.now().isoformat(), data.email, data.code))
            
            # Получаем ID клиента
            c.execute("SELECT instagram_id, name FROM clients WHERE LOWER(email) = LOWER(%s)", (data.email,))
            client_result = c.fetchone()
            if not client_result:
                raise HTTPException(status_code=404, detail="Клиент не найден")
            
            client_id, name = client_result
        
        # Добавляем приветственные бонусы (100 points)
        c.execute("""
            INSERT INTO loyalty_transactions (client_id, points, reason, transaction_type, created_at)
            VALUES (%s, 100, 'Приветственный бонус за регистрацию', 'system', %s)
        """, (client_id, datetime.now().isoformat()))
        
        c.execute("""
            UPDATE clients 
            SET loyalty_points = loyalty_points + 100
            WHERE instagram_id = %s
        """, (client_id,))
        
        # Добавляем приветственное уведомление
        c.execute("""
            INSERT INTO client_notifications (client_instagram_id, notification_type, title, message, sent_at)
            VALUES (%s, 'welcome', 'Добро пожаловать!', 'Мы рады видеть вас! Вам начислено 100 приветственных бонусов.', %s)
        """, (client_id, datetime.now().isoformat()))
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Email подтвержден! Добро пожаловать!"
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка верификации: {str(e)}")
    finally:
        conn.close()


@router.post("/resend-verification")
async def resend_client_verification(data: ResendCodeRequest):
    """Повторная отправка кода верификации клиенту"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем существование клиента
        c.execute("SELECT instagram_id, name, email FROM clients WHERE LOWER(email) = LOWER(%s)", (data.email,))
        client = c.fetchone()
        
        if not client:
            raise HTTPException(status_code=404, detail="Клиент с таким email не найден")
        
        client_id, name, client_email = client
        
        # Генерируем новый код
        from utils.email_service import generate_verification_code, get_code_expiry
        verification_code = generate_verification_code()
        code_expires = get_code_expiry()
        
        # Проверяем есть ли колонка verification_code
        c.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='clients' AND column_name='verification_code'
        """)
        has_verification_column = c.fetchone() is not None
        
        if has_verification_column:
            # Обновляем в таблице clients
            c.execute("""
                UPDATE clients 
                SET verification_code = %s, verification_code_expires = %s
                WHERE instagram_id = %s
            """, (verification_code, code_expires, client_id))
        else:
            # Добавляем в таблицу client_email_verifications
            c.execute("""
                INSERT INTO client_email_verifications (email, code, expires_at)
                VALUES (%s, %s, %s)
            """, (client_email, verification_code, code_expires))
        
        conn.commit()
        
        # Отправляем email
        from utils.email_service import send_verification_code_email
        email_sent = send_verification_code_email(client_email, verification_code, name or 'Клиент', 'client')
        
        import os
        if not email_sent and os.getenv('ENVIRONMENT') != 'production':
            return {
                "success": True,
                "message": f"Новый код: {verification_code}",
                "verification_code": verification_code,
                "email_sent": False
            }
        
        return {
            "success": True,
            "message": "Новый код верификации отправлен на вашу почту",
            "email_sent": email_sent
        }
        
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка отправки кода: {str(e)}")
    finally:
        conn.close()
