"""
Universal translator using Google Translate HTTP API (free, no library needed)
Falls back to simple copy if translation fails
"""

import json
import urllib.request
import urllib.parse
import time
from typing import List, Dict, Optional
from pathlib import Path

from config import CACHE_DIR, LANGUAGES


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
    
    def _translate_via_http(self, text: str, source: str, target: str) -> str:
        """Translate using Google Translate HTTP API"""
        try:
            # Encode text for URL
            encoded_text = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source}&tl={target}&dt=t&q={encoded_text}"
            
            # Make request
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read().decode('utf-8')
                parsed = json.loads(data)
                
                # Google Translate returns array of translations
                if parsed and parsed[0] and parsed[0][0] and parsed[0][0][0]:
                    return parsed[0][0][0]
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
    
    def translate(self, text: str, source: str, target: str) -> str:
        """
        Translate text from source language to target language
        
        Args:
            text: Text to translate
            source: Source language code (e.g., 'ru')
            target: Target language code (e.g., 'en')
            
        Returns:
            Translated text, or original text if translation fails
        """
        # Return original if same language
        if source == target:
            return text
        
        # Return empty if input is empty
        if not text or not text.strip():
            return text
        
        # Check cache first
        cached = self._get_cached_translation(text, source, target)
        if cached:
            return cached
        
        # Translate using Google Translate HTTP API
        translated = self._translate_via_http(text, source, target)
        self._save_to_cache(text, source, target, translated)
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
        
        return translated
    
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


if __name__ == "__main__":
    # Test translation
    translator = Translator()
    
    test_text = "Мастер маникюра"
    print(f"\nТест перевода: '{test_text}'")
    
    for lang in ["en", "ar", "es"]:
        translated = translator.translate(test_text, "ru", lang)
        print(f"  {lang}: {translated}")


