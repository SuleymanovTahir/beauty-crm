import json
from db.connection import get_db_connection
from bot.constants import SERVICE_SYNONYMS, OBJECTION_KEYWORDS, PROMPT_HEADERS

def run_migration():
    """Add universal constants columns to bot_settings"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Add columns if not exist
    columns = [
        ('service_synonyms', 'TEXT'),
        ('objection_keywords', 'TEXT'),
        ('prompt_headers', 'TEXT')
    ]
    
    for col_name, col_type in columns:
        c.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                             WHERE table_name='bot_settings' AND column_name='{col_name}') THEN
                    ALTER TABLE bot_settings ADD COLUMN {col_name} {col_type};
                END IF;
            END
            $$;
        """)

    # 2. Populate with defaults
    # JSON serializing defaults
    defaults = {
        'service_synonyms': json.dumps(SERVICE_SYNONYMS, ensure_ascii=False),
        'objection_keywords': json.dumps(OBJECTION_KEYWORDS, ensure_ascii=False),
        'prompt_headers': json.dumps(PROMPT_HEADERS, ensure_ascii=False)
    }

    # Update ONLY if NULL (don't overwrite if already set)
    for col, val in defaults.items():
        c.execute(f"UPDATE bot_settings SET {col} = %s WHERE {col} IS NULL", (val,))

    conn.commit()
    print("✅ Schema updated: Added universal constants to bot_settings")
    conn.close()

if __name__ == "__main__":
    run_migration()
