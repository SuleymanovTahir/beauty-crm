#!/usr/bin/env python3
"""
Миграция: Создание таблицы для email верификации клиентов
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error


def create_client_email_verifications_table():
    """Создать таблицу для хранения email verification кодов для клиентов"""
    print("🔧 Creating client_email_verifications table...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_email_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP,
                attempts INTEGER DEFAULT 0,
                INDEX idx_email (email),
                INDEX idx_code (code),
                INDEX idx_expires_at (expires_at)
            )
        """)
        
        conn.commit()
        log_info("✅ client_email_verifications table created successfully", "migration")
        print("✅ Table created successfully")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Failed to create client_email_verifications table: {e}", "migration")
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()


def create_registration_audit_table():
    """Создать таблицу для аудита регистраций"""
    print("🔧 Creating registration_audit table...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            CREATE TABLE IF NOT EXISTS registration_audit (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                action VARCHAR(50) NOT NULL,
                approved_by INTEGER,
                reason TEXT,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at)
            )
        """)
        
        conn.commit()
        log_info("✅ registration_audit table created successfully", "migration")
        print("✅ Table created successfully")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Failed to create registration_audit table: {e}", "migration")
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 70)
    print("MIGRATION: Email Verification Tables")
    print("=" * 70)
    create_client_email_verifications_table()
    create_registration_audit_table()
    print("=" * 70)
    print("✅ MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 70)
