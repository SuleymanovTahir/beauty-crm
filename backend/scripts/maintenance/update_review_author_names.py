"""
Script to translate/transliterate author names in public_reviews table
"""
from db.connection import get_db_connection
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error
from scripts.translations.translator import Translator

def update_review_author_names():
    """Translate author names from Russian to all supported languages"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Initialize translator
    translator = Translator(use_cache=True)
    
    try:
        # Get all reviews with Russian author names
        cursor.execute("""
            SELECT id, author_name 
            FROM public_reviews 
            WHERE author_name IS NOT NULL
        """)
        
        reviews = cursor.fetchall()
        log_info(f"Found {len(reviews)} reviews to translate", "migration")
        
        # Languages to translate to
        languages = ['en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']
        
        for review_id, author_name in reviews:
            log_info(f"Translating author name: {author_name} (ID: {review_id})", "migration")
            
            # Translate to each language
            translations = {}
            for lang in languages:
                try:
                    # For names, we want transliteration, not translation
                    # The translator will handle this
                    translated = translator.translate(author_name, source='ru', target=lang)
                    translations[f'author_name_{lang}'] = translated
                    log_info(f"  {lang}: {translated}", "migration")
                except Exception as e:
                    log_error(f"Error translating to {lang}: {e}", "migration")
                    # Keep original name as fallback
                    translations[f'author_name_{lang}'] = author_name
            
            # Update database
            update_fields = ', '.join([f"{field} = %s" for field in translations.keys()])
            update_values = list(translations.values()) + [review_id]
            
            cursor.execute(f"""
                UPDATE public_reviews 
                SET {update_fields}
                WHERE id = %s
            """, update_values)
        
        # Save translator cache
        translator.save_cache_to_disk()
        
        conn.commit()
        log_info(f"✅ Successfully updated {len(reviews)} review author names", "migration")
        
    except Exception as e:
        log_error(f"Error updating review author names: {e}", "migration")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    log_info("🔄 Starting review author name translation...", "migration")
    update_review_author_names()
    log_info("✅ Review author name translation completed!", "migration")
