"""
Universal translator using Google Translate HTTP API (free, no library needed)
Falls back to simple copy if translation fails
Uses LibreTranslate for short phrases (≤10 chars) to avoid context issues
"""

import json
import urllib.request
import urllib.parse
import time
from typing import List, Dict, Optional
from pathlib import Path
import sys
import os

# Add scripts/translations to path for local config
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from config import CACHE_DIR, LANGUAGES

# Import LibreTranslate for short phrases
try:
    from beauty_translator import get_translator as get_libre_translator
    LIBRE_AVAILABLE = True
except ImportError:
    LIBRE_AVAILABLE = False
    print("⚠️  LibreTranslate not available, using Google Translate for all text")

# Salon-specific terminology dictionary for better context
# This helps correct common mistranslations
SALON_TERMINOLOGY = {
    # Corrections for Russian (when RU is the target language)
    'ru': {
        # Mistranslations from English
        'пост': 'запись',        # 'post' -> 'запись' (booking)
        'записи': 'записи',      # Plural consistency
        'вход': 'запись',        # 'entry' -> 'запись'
        'рекорд': 'запись',      # 'record' -> 'запись'
        'вощение': 'ваксинг',    # 'waxing' -> 'ваксинг'
        'массажи': 'массаж',     # 'massages' -> 'массаж'
        'бровист': 'мастер по бровям',
        'ноготь': 'ногти',       # 'nail' -> 'ногти'
        'ногтя': 'ногтей',
        'починка': 'ремонт',     # 'fix' -> 'ремонт'
        'услуга': 'услуга',
    },
    # Corrections for English (when EN is the target language)
    'en': {
        'post': 'booking',
        'posts': 'bookings',
        'record': 'booking',
        'records': 'bookings',
        'recording': 'booking',
        'entry': 'booking',
        'entries': 'bookings',
        'vaksing': 'waxing',
        'voring': 'waxing',
        'voxing': 'waxing',
        'master of eyebrows': 'brow master',
        'repair of nails': 'nail repair',
        'nail fixing': 'nail repair',
        'vaxing': 'waxing',
        'fix': 'repair',
    },
    # Corrections for Spanish
    'es': {
        'publicaciones': 'reservas',
        'publicación': 'reserva',
        'entrada': 'reserva',
        'entradas': 'reservas',
        'registro': 'reserva',
        'registros': 'reservas',
        'asistentes': 'especialistas',
        'asistente': 'especialista',
        'cerca': 'cerrar',
        'sobresalir': 'Excel',
        'a mí': 'desde',
        'por': 'hasta',
        'charlar': 'chat',
        'comportamiento': 'acciones',
        'de acuerdo': 'cuenta',
    },
    # Corrections for Portuguese
    'pt': {
        'postagens': 'reservas',
        'postagem': 'reserva',
        'entrada': 'reserva',
        'entradas': 'reservas',
        'registro': 'reserva',
        'registros': 'reservas',
        'assistentes': 'especialistas',
        'assistente': 'especialista',
        'para mim': 'de',
        'por': 'até',
        'bater papo': 'chat',
        'renda': 'receita',
        'ok': 'conta',
    },
    # Corrections for French
    'fr': {
        'publications': 'réservations',
        'enregistrement': 'réservation',
        'entrée': 'réservation',
        'entrées': 'réservations',
        'enregistrements': 'réservations',
        'assistants': 'spécialistes',
        'assistant': 'spécialiste',
        'pour moi': 'de',
        'par': 'à',
        'exceller': 'Excel',
        'd\'accord': 'compte',
    },
    # Corrections for German
    'de': {
        'beiträge': 'buchungen',
        'beitrag': 'buchung',
        'eintrag': 'buchung',
        'einträge': 'buchungen',
        'datensätze': 'buchungen',
        'datensatz': 'buchung',
        'assistenten': 'spezialisten',
        'assistent': 'spezialist',
        'mir': 'von',
        'von': 'bis',
        'chatten': 'chat',
        'einkommen': 'umsatz',
        'ok': 'konto',
    },
    # Corrections for Arabic
    'ar': {
        'منشورات': 'حجوزات',     # 'posts' -> 'bookings'
        'سجل': 'حجز',            # 'record' -> 'booking'
    }
}


class Translator:
    def __init__(self, use_cache=True):
        self.use_cache = use_cache
        self.cache_dir = Path(CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Use single consolidated cache file instead of thousands of small files
        self.cache_file = self.cache_dir / "translations_cache.json"
        self.cache_data = {}
        
        # Load existing cache
        if self.use_cache and self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self.cache_data = json.load(f)
                print(f"✅ Google Translate HTTP API ready (loaded {len(self.cache_data)} cached translations)")
            except Exception as e:
                print(f"⚠️  Could not load cache: {e}")
                self.cache_data = {}
        else:
            print("✅ Google Translate HTTP API ready")
    
    def _get_cache_key(self, text: str, source: str, target: str) -> str:
        """Generate cache key for translation"""
        import hashlib
        content = f"{text}|{source}|{target}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_cached_translation(self, text: str, source: str, target: str) -> Optional[str]:
        """Get translation from cache if available"""
        if not self.use_cache:
            return None
        
        cache_key = self._get_cache_key(text, source, target)
        return self.cache_data.get(cache_key)
    
    def _save_to_cache(self, text: str, source: str, target: str, translation: str):
        """Save translation to cache"""
        if not self.use_cache:
            return
        
        cache_key = self._get_cache_key(text, source, target)
        self.cache_data[cache_key] = translation
    
    def save_cache_to_disk(self):
        """Save all cached translations to disk"""
        if not self.use_cache:
            return
        
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_data, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved {len(self.cache_data)} translations to cache")
        except Exception as e:
            print(f"⚠️  Could not save cache: {e}")
    
    def _translate_via_http(self, text: str, source: str, target: str, use_context: bool = False) -> str:
        """
        Translate text using Google Translate HTTP API with context
        
        Args:
            text: Text to translate
            source: Source language code
            target: Target language code
            use_context: Whether to inject context (e.g. for services)
            
        Returns:
            Translated text
        """
        try:
            # Add context for beauty salon services to improve translation accuracy
            # This helps Google Translate understand the domain
            context_prefix = ""
            
            if use_context:
                # Detect if this is likely a beauty salon term (short phrases, service names)
                # Exclude proper nouns (e.g., "Samsung Innovation Campus")
                words = text.split()
                capital_words_count = sum(1 for word in words if len(word) > 0 and word[0].isupper())
                # If more than 1 word starts with capital, it's likely a proper noun/brand name
                is_proper_noun = capital_words_count > 1
                is_service_term = len(words) <= 3 and not text.endswith('.') and not is_proper_noun
                
                if is_service_term:
                    if source == 'en':
                        context_prefix = "[Beauty salon service] "
                    elif source == 'ru':
                        context_prefix = "[Услуга салона красоты] "
            
            text_with_context = context_prefix + text
            
            # URL encode
            encoded_text = urllib.parse.quote(text_with_context)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source}&tl={target}&dt=t&q={encoded_text}"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read().decode('utf-8')
                parsed = json.loads(data)
                
                # Google Translate returns array of translations
                if parsed and parsed[0] and parsed[0][0] and parsed[0][0][0]:
                    translated = parsed[0][0][0]
                    
                    # Remove context prefix from translation if it was added
                    if context_prefix:
                        # Try to remove the translated context prefix
                        # This is a bit tricky as the prefix itself gets translated
                        # So we'll just clean up common patterns
                        translated = translated.replace("[Beauty salon service]", "").strip()
                        translated = translated.replace("[Услуга салона красоты]", "").strip()
                        translated = translated.replace("[خدمة صالون التجميل]", "").strip()
                        translated = translated.replace("[Servicio de salón de belleza]", "").strip()
                        translated = translated.replace("[Service de salon de beauté]", "").strip()
                        translated = translated.replace("[Schönheitssalon-Service]", "").strip()
                        translated = translated.replace("[सौंदर्य सैलून सेवा]", "").strip()
                        translated = translated.replace("[Сұлулық салоны қызметі]", "").strip()
                        translated = translated.replace("[Serviço de salão de beleza]", "").strip()
                        # Remove any remaining brackets
                        translated = translated.replace("[", "").replace("]", "").strip()
                    
                    return translated
                else:
                    return text  # Fallback
        except Exception as e:
            print(f"  ⚠️  Translation HTTP error: {e}")
            return text  # Fallback
    
    def detect_language(self, text: str) -> str:
        """
        Detect language of text using Google Translate API
        
        Args:
            text: Text to detect language for
            
        Returns:
            Language code (e.g., 'en', 'ru', 'ar')
        """
        try:
            # Encode text for URL
            encoded_text = urllib.parse.quote(text[:200])  # Use first 200 chars for detection
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={encoded_text}"
            
            # Make request
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read().decode('utf-8')
                parsed = json.loads(data)
                
                # Language is in parsed[2] or parsed[8][0][0]
                if parsed and len(parsed) > 2 and parsed[2]:
                    detected_lang = parsed[2]
                    return detected_lang
                elif parsed and len(parsed) > 8 and parsed[8] and parsed[8][0]:
                    detected_lang = parsed[8][0][0]
                    return detected_lang
                else:
                    return 'ru'  # Default fallback
        except Exception as e:
            print(f"  ⚠️  Language detection error: {e}")
            return 'ru'  # Default fallback
    
    def translate(self, text: str, source: str, target: str, use_context: bool = False) -> str:
        """
        Translate text from source language to target language
        Uses LibreTranslate for short phrases (≤10 chars) to avoid Google's context issues
        Uses Google Translate for longer text

        Args:
            text: Text to translate
            source: Source language code (e.g., 'ru')
            target: Target language code (e.g., 'en')
            use_context: Whether to inject context (only for Google Translate)

        Returns:
            Translated text, or original text if translation fails
        """
        # Return original if same language
        if source == target:
            return text

        # Return empty if input is empty
        if not text or not text.strip():
            return text

        # Protect interpolation variables {{variable}} from translation
        import re
        variable_pattern = r'\{\{([^}]+)\}\}'
        variables = re.findall(variable_pattern, text)

        # Replace variables with placeholders before translation
        text_to_translate = text
        variable_placeholders = {}
        for i, var in enumerate(variables):
            placeholder = f"___VAR{i}___"
            variable_placeholders[placeholder] = f"{{{{{var}}}}}"
            text_to_translate = text_to_translate.replace(f"{{{{{var}}}}}", placeholder)

        # Store original text for variable restoration
        original_text = text
        text = text_to_translate
        
        # Exclusions - never translate these
        EXCLUSIONS = {
            # Currencies
            'AED', 'USD', 'EUR', 'GBP', 'RUB', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR',
            # Technical terms
            'min', 'h', 'kg', 'cm', 'ml', 'ID', 'VIP', 'SPA', 'SMS', 'API',
            # Codes
            'UV', 'LED', '2D', '3D', '4D', '5D', 'ML',
        }
        
        if text.strip().upper() in EXCLUSIONS:
            return text
        
        # Check if this is a known terminology term (exact match)
        text_lower = text.lower().strip()
        if source in SALON_TERMINOLOGY:
            source_terms = SALON_TERMINOLOGY[source]
            if text_lower in source_terms:
                # This is a known term, add context hint
                use_context = True
        
        # Check cache first
        # We append context flag to key to differentiate
        cache_key_suffix = "|ctx" if use_context else ""
        cached = self._get_cached_translation(text + cache_key_suffix, source, target)
        if cached:
            # Still apply terminology corrections to cached results, 
            # as terminology may have been updated
            return self._apply_terminology_corrections(cached, target)
        
        # Determine which translator to use based on text length
        text_length = len(text.strip())
        use_libre = LIBRE_AVAILABLE and text_length <= 10
        
        if use_libre:
            # Use LibreTranslate for short phrases to avoid context issues
            try:
                libre = get_libre_translator()
                translated = libre.translate(text, source, target)
                if translated and translated != text:
                    # Check if translation needs correction based on terminology
                    translated = self._apply_terminology_corrections(translated, target)
                    # Restore interpolation variables
                    for placeholder, original_var in variable_placeholders.items():
                        translated = translated.replace(placeholder, original_var)
                    self._save_to_cache(text + cache_key_suffix, source, target, translated)
                    time.sleep(0.01)  # Minimal delay
                    return translated
                # If LibreTranslate fails, fall through to Google Translate
            except Exception as e:
                print(f"  ⚠️  LibreTranslate error, falling back to Google: {e}")
        
        # Use Google Translate for longer text or if LibreTranslate failed
        max_retries = 3
        retry_delay = 0.5
        
        for attempt in range(max_retries):
            translated = self._translate_via_http(text, source, target, use_context=use_context)
            
            # Check if translation failed due to rate limiting
            if translated == text and attempt < max_retries - 1:
                # Retry with exponential backoff
                time.sleep(retry_delay * (2 ** attempt))
                continue
            break
        
        # Apply terminology corrections to the translation
        translated = self._apply_terminology_corrections(translated, target)

        # Restore interpolation variables
        for placeholder, original_var in variable_placeholders.items():
            translated = translated.replace(placeholder, original_var)

        self._save_to_cache(text + cache_key_suffix, source, target, translated)

        # Minimal delay to avoid rate limiting
        time.sleep(0.01)

        return translated
    
    def _apply_terminology_corrections(self, text: str, target_lang: str) -> str:
        """
        Apply salon terminology corrections to translated text
        
        Args:
            text: Translated text
            target_lang: Target language code
            
        Returns:
            Corrected text
        """
        if target_lang not in SALON_TERMINOLOGY:
            return text
        
        corrections = SALON_TERMINOLOGY[target_lang]
        text_lower = text.lower().strip()
        
        # Check for exact matches (case-insensitive)
        for wrong_term, correct_term in corrections.items():
            if text_lower == wrong_term.lower():
                # Preserve original capitalization pattern
                if text[0].isupper():
                    return correct_term.capitalize()
                return correct_term
        
        # Check for word replacements within text
        for wrong_term, correct_term in corrections.items():
            # Replace whole words only
            import re
            pattern = r'\b' + re.escape(wrong_term) + r'\b'
            text = re.sub(pattern, correct_term, text, flags=re.IGNORECASE)
        
        return text
    
    def translate_batch(self, texts: List[str], source: str, target: str) -> List[str]:
        """
        Translate multiple texts
        
        Args:
            texts: List of texts to translate
            source: Source language code
            target: Target language code
            
        Returns:
            List of translated texts
        """
        return [self.translate(text, source, target) for text in texts]
    
    def translate_dict(self, data: Dict[str, str], source: str, target: str) -> Dict[str, str]:
        """
        Translate all values in a dictionary
        
        Args:
            data: Dictionary with string values
            source: Source language code
            target: Target language code
            
        Returns:
            Dictionary with translated values
        """
        return {
            key: self.translate(value, source, target) if isinstance(value, str) else value
            for key, value in data.items()
        }

    def transliterate(self, text: str, source: str, target: str) -> str:
        """
        Transliterate text between languages (useful for names)
        """
        if not text:
            return text
            
        # 1. RU -> Latin (en, es, fr, etc)
        if source == 'ru' and target in ['en', 'es', 'fr', 'pt', 'de']:
            mapping = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
                'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
                'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
                'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
                'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
                'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
                'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
                'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
                'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
                'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
            }
            result = "".join(mapping.get(c, c) for c in text)
            return result
            
        # 2. Latin -> RU
        if source in ['en', 'es', 'fr', 'pt', 'de'] and target == 'ru':
            # Improved mapping for names
            mapping = {
                'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 
                'i': 'и', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 
                'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'y': 'ы',
                'x': 'кс', 'w': 'в', 'j': 'дж', 'q': 'к', 'c': 'к',
                'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д', 'E': 'Е', 'Z': 'З', 
                'I': 'И', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 
                'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф', 'H': 'Х', 'Y': 'Ы',
                'X': 'Кс', 'W': 'В', 'J': 'Дж', 'Q': 'К', 'C': 'К'
            }
            # Multi-char replacements (descending length)
            text = text.replace('shch', 'щ').replace('Shch', 'Щ')
            text = text.replace('sh', 'ш').replace('Sh', 'Ш')
            text = text.replace('ch', 'ч').replace('Ch', 'Ч')
            text = text.replace('zh', 'ж').replace('Zh', 'Ж')
            text = text.replace('kh', 'х').replace('Kh', 'Х')
            text = text.replace('ts', 'ц').replace('Ts', 'Ц')
            text = text.replace('yu', 'ю').replace('Yu', 'Ю')
            text = text.replace('ya', 'я').replace('Ya', 'Я')
            text = text.replace('yo', 'ё').replace('Yo', 'Ё')
            text = text.replace('ph', 'ф').replace('Ph', 'Ф')
            
            result = "".join(mapping.get(c, c) for c in text)
            return result

        # 3. Fallback to Google Translate (phonetic mode is implicit for names)
        # We use a special hint to the translator if possible
        return self.translate(text, source, target, use_context=False)

if __name__ == "__main__":
    # Test translation
    translator = Translator()
    
    test_text = "Мастер маникюра"
    print(f"\nТест перевода: '{test_text}'")
    
    for lang in ["en", "ar", "es"]:
        translated = translator.translate(test_text, "ru", lang)
        print(f"  {lang}: {translated}")

