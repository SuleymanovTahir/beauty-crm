import logging
from db.connection import get_db_connection

def run_migration():
    """
    Create call_logs table for telephony integration.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        logging.info("Creating call_logs table...")
        
            CREATE TABLE IF NOT EXISTS call_logs (
                id SERIAL PRIMARY KEY,
                client_id VARCHAR(255) REFERENCES clients(instagram_id) ON DELETE SET NULL,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
                phone VARCHAR(50),
                recording_url TEXT,
                recording_file VARCHAR(255),
                duration INTEGER, -- seconds
                status VARCHAR(50) DEFAULT 'completed', -- completed, missed, rejected, ongoing
                direction VARCHAR(20) DEFAULT 'inbound', -- inbound, outbound
                transcription TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                external_id VARCHAR(255) -- id from external telephony provider
            );
        """)
        
        # Ensure new columns exist (migration)
        try:
            c.execute("ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;")
            c.execute("ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_file VARCHAR(255);")
        except Exception as e:
            logging.warning(f"Columns might already exist: {e}")

        # Add index on client_id and phone for faster lookups
        
        # Add index on client_id and phone for faster lookups
        c.execute("CREATE INDEX IF NOT EXISTS idx_call_logs_client ON call_logs(client_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone);")
        
        conn.commit()
        logging.info("✅ call_logs table created successfully.")
        return True
        
    except Exception as e:
        logging.error(f"❌ Error creating call_logs table: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
