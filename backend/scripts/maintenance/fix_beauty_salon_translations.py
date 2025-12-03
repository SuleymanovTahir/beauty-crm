"""
Fix incorrect beauty salon service translations
Corrects literal translations that don't make sense in beauty salon context
"""
from db.connection import get_db_connection
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


# Glossary of beauty salon terms with correct translations
# This ensures context-aware translations for beauty salon services
BEAUTY_SALON_GLOSSARY = {
    # English -> {language: correct_translation}
    
    # Waxing services
    "Full Arms": {
        "ru": "Руки полностью",
        "ar": "الذراعين بالكامل",
        "es": "Brazos completos",
        "de": "Volle Arme",
        "fr": "Bras complets",
        "hi": "पूरी बाहें",
        "kk": "Толық қолдар",
        "pt": "Braços completos"
    },
    "Half Arms": {
        "ru": "Руки до локтя",
        "ar": "نصف الذراعين",
        "es": "Medio brazos",
        "de": "Halbe Arme",
        "fr": "Demi-bras",
        "hi": "आधी बाहें",
        "kk": "Жарты қолдар",
        "pt": "Meio braços"
    },
    "Full Legs": {
        "ru": "Ноги полностью",
        "ar": "الساقين بالكامل",
        "es": "Piernas completas",
        "de": "Volle Beine",
        "fr": "Jambes complètes",
        "hi": "पूरी टांगें",
        "kk": "Толық аяқтар",
        "pt": "Pernas completas"
    },
    "Half Legs": {
        "ru": "Ноги до колена",
        "ar": "نصف الساقين",
        "es": "Medio piernas",
        "de": "Halbe Beine",
        "fr": "Demi-jambes",
        "hi": "आधी टांगें",
        "kk": "Жарты аяқтар",
        "pt": "Meio pernas"
    },
    "Underarms": {
        "ru": "Подмышки",
        "ar": "الإبطين",
        "es": "Axilas",
        "de": "Achselhöhlen",
        "fr": "Aisselles",
        "hi": "बगल",
        "kk": "Қолтырықтар",
        "pt": "Axilas"
    },
    "Upper Lips": {
        "ru": "Верхняя губа",
        "ar": "الشفة العليا",
        "es": "Labio superior",
        "de": "Oberlippe",
        "fr": "Lèvre supérieure",
        "hi": "ऊपरी होंठ",
        "kk": "Жоғарғы ерін",
        "pt": "Lábio superior"
    },
    "Full Face": {
        "ru": "Лицо полностью",
        "ar": "الوجه بالكامل",
        "es": "Cara completa",
        "de": "Volles Gesicht",
        "fr": "Visage complet",
        "hi": "पूरा चेहरा",
        "kk": "Толық бет",
        "pt": "Rosto completo"
    },
    "Bikini Line": {
        "ru": "Линия бикини",
        "ar": "خط البيكيني",
        "es": "Línea de bikini",
        "de": "Bikinizone",
        "fr": "Ligne de bikini",
        "hi": "बिकनी लाइन",
        "kk": "Бикини сызығы",
        "pt": "Linha de biquíni"
    },
    "Brazilian Bikini": {
        "ru": "Бразильское бикини",
        "ar": "بيكيني برازيلي",
        "es": "Bikini brasileño",
        "de": "Brasilianisches Bikini",
        "fr": "Bikini brésilien",
        "hi": "ब्राज़ीलियाई बिकनी",
        "kk": "Бразилиялық бикини",
        "pt": "Biquíni brasileiro"
    },
    "Full Bikini": {
        "ru": "Полное бикини",
        "ar": "بيكيني كامل",
        "es": "Bikini completo",
        "de": "Volles Bikini",
        "fr": "Bikini complet",
        "hi": "पूर्ण बिकनी",
        "kk": "Толық бикини",
        "pt": "Biquíni completo"
    },
    
    # Hair services
    "Blow Dry": {
        "ru": "Укладка феном",
        "ar": "تجفيف بالمجفف",
        "es": "Secado con secador",
        "de": "Föhnen",
        "fr": "Brushing",
        "hi": "ब्लो ड्राई",
        "kk": "Фенмен кептіру",
        "pt": "Secagem"
    },
    "Hair Cut": {
        "ru": "Стрижка",
        "ar": "قص الشعر",
        "es": "Corte de pelo",
        "de": "Haarschnitt",
        "fr": "Coupe de cheveux",
        "hi": "बाल कटवाना",
        "kk": "Шаш қию",
        "pt": "Corte de cabelo"
    },
    
    # Nail services  
    "Manicure": {
        "ru": "Маникюр",
        "ar": "مانيكير",
        "es": "Manicura",
        "de": "Maniküre",
        "fr": "Manucure",
        "hi": "मैनीक्योर",
        "kk": "Маникюр",
        "pt": "Manicure"
    },
    "Pedicure": {
        "ru": "Педикюр",
        "ar": "باديكير",
        "es": "Pedicura",
        "de": "Pediküre",
        "fr": "Pédicure",
        "hi": "पेडीक्योर",
        "kk": "Педикюр",
        "pt": "Pedicure"
    }
}


def fix_service_translations():
    """Fix incorrect service translations using beauty salon glossary"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        total_fixed = 0
        
        for english_name, translations in BEAUTY_SALON_GLOSSARY.items():
            # Find service by English name
            cursor.execute("SELECT id FROM services WHERE name = %s", (english_name,))
            result = cursor.fetchone()
            
            if not result:
                log_info(f"Service '{english_name}' not found, skipping", "fix")
                continue
            
            service_id = result[0]
            log_info(f"Fixing translations for '{english_name}' (ID: {service_id})", "fix")
            
            # Update each language
            for lang, correct_translation in translations.items():
                column_name = f"name_{lang}"
                cursor.execute(
                    f"UPDATE services SET {column_name} = %s WHERE id = %s",
                    (correct_translation, service_id)
                )
                log_info(f"  ✅ Updated {column_name}: {correct_translation}", "fix")
                total_fixed += 1
        
        conn.commit()
        log_info(f"✅ Successfully fixed {total_fixed} translations!", "fix")
        
    except Exception as e:
        log_error(f"Error fixing translations: {e}", "fix")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    log_info("🔧 Starting beauty salon translation fixes...", "fix")
    fix_service_translations()
    log_info("✅ Translation fixes completed!", "fix")
