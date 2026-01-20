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
import ssl
import re
import threading
import random

# Bypass SSL verification for local requests if needed
if not os.environ.get('PYTHONHTTPSVERIFY', '') and getattr(ssl, '_create_unverified_context', None):
    ssl._create_default_https_context = ssl._create_unverified_context

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
        'пост': 'запись',        # 'post' -> 'запись' (booking)
        'записи': 'записи',      # Plural consistency
        'вход': 'запись',        # 'entry' -> 'запись'
        'рекорд': 'запись',      # 'record' -> 'запись'
        'букинг': 'запись',
        'booking': 'запись',
        'изготовление': 'создание',
        'персонажа': 'символа',
        'персонажей': 'символов',
        'требуется запись': 'логин обязателен',
        'неправильный': 'ошибка',
        'создать пользователя и назначить услуги': 'создать пользователя и назначить услуги',
        'поиск позиции': 'поиск должности',
        'позиция не найдена': 'должность не найдена',
        'выберите одну или несколько позиций': 'выберите одну или несколько должностей',
        'доступ запрещен': 'доступ запрещен',
        'назад к пользователям': 'вернуться к списку пользователей',
        'толкать': 'Push-уведомление',
        'push': 'Push-уведомление',
        'email': 'Электронная почта',
        'sms': 'SMS',
        'вощение': 'ваксинг',    # 'waxing' -> 'ваксинг'
        'массажи': 'массаж',     # 'massages' -> 'массаж'
        'бровист': 'мастер по бровям',
        'ноготь': 'ногти',       # 'nail' -> 'ногти'
        'ногтя': 'ногтей',
        'починка': 'ремонт',     # 'fix' -> 'ремонт'
        'услуга': 'услуга',
        'заголовок': 'Заголовок',
        'подзаголовок': 'Описание',
        'титул': 'Заголовок',
        'главный титул': 'Выберите мастера',
        'оценка красоты': 'Индекс красоты',
        'полоса сообщений': 'Серия посещений',
        'количество ошибок импорта': 'Ошибок импорта',
        'тело категории': 'Тело',
        'лицо категории': 'Лицо',
        'категория волосы': 'Волосы',
        'категория ногти': 'Ногти',
        'тело': 'Тело',
        'лицо': 'Лицо',
        'волосы': 'Волосы',
        'ногти': 'Ногти',
        'мастер': 'Мастер',
        'любой мастер': 'Любой мастер',
        'часы пик': 'Пиковые часы',
        'за каждый запись': 'За каждую запись',
        'удалить пакет, подтвердить несколько': 'Подтвердите удаление нескольких элементов',
        'удалить пакет, подтвердить много': 'Подтвердите удаление многих элементов',
        'удалить пакет, подтвердить один': 'Подтвердите удаление элемента',
        'удалить пакет, подтвердить другое': 'Подтвердите удаление',
        'задержка (дни)': 'Задержка (дн.)',
        'задержка (часы)': 'Задержка (ч.)',
        'задержка (минуты)': 'Задержка (мин.)',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        'ламинирование ресниц': 'ламинирование ресниц',
        'ламинирование бровей': 'ламинирование бровей',
        'наращивание ногтей': 'наращивание ногтей',
        'коррекция ногтей': 'коррекция ногтей',
        'укрепление ногтей': 'укрепление ногтей',
        'гель-лак': 'гель-лак',
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
        'create user & assign services': 'create user & assign services',
        'no position found': 'no position found',
        'search position': 'search position',
        'vaksing': 'waxing',
        'voring': 'waxing',
        'voxing': 'waxing',
        'master of eyebrows': 'brow master',
        'repair of nails': 'nail repair',
        'nail fixing': 'nail repair',
        'lash lift': 'lash lift',
        'lash lamination': 'lash lift',
        'brow lift': 'brow lamination',
        'nail infill': 'nail refill',
        'nail overlay': 'nail overlay',
        'vaxing': 'waxing',
        'fix': 'repair',
        'иванов иван иванович': 'John Doe',
        'ivanov ivan ivanovich': 'John Doe',
        'иван_иванов': 'john_doe',
        'ivan_ivanov': 'john_doe',
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
        'a mí': 'desde fecha',
        'por': 'hasta fecha',
        'charlar': 'chat',
        'comportamiento': 'acciones',
        'de acuerdo': 'cuenta',
        'cualquier máster': 'cualquier профессионал',
        'rechazado': 'cancelado',
        'él se lo perdió': 'omitido',
        'pendiente': 'en espera',
        'push': 'notificación push',
        'puntos': 'puntos',
        'lealtad': 'fidelidad',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
        'agujas': 'puntos',
        'иванов иван иванович': 'Juan García',
        'ivanov ivan ivanovich': 'Juan García',
        'иван_иванов': 'juan_garcia',
        'ivan_ivanov': 'juan_garcia',
    },
    # Corrections for Portuguese
    'pt': {
        'иванов иван иванович': 'João Silva',
        'ivanov ivan ivanovich': 'João Silva',
        'иван_иванов': 'joao_silva',
        'ivan_ivanov': 'joao_silva',
        'postagens': 'reservas',
        'postagem': 'reserva',
        'entrada': 'reserva',
        'entradas': 'reservas',
        'registro': 'reserva',
        'registros': 'reservas',
        'assistentes': 'especialistas',
        'assistente': 'especialista',
        'para mim': 'de data',
        'por': 'até data',
        'bater papo': 'chat',
        'renda': 'receita',
        'ok': 'conta',
        'qualquer mestre': 'qualquer profissional',
        'recusado': 'cancelado',
        'ele perdeu': 'pulado',
        'push': 'notificação push',
        'pontos': 'pontos',
        'lealdade': 'fidelidade',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
    },
    # Corrections for French
    'fr': {
        'иванов иван иванович': 'Jean Dupont',
        'ivanov ivan ivanovich': 'Jean Dupont',
        'иван_иванов': 'jean_dupont',
        'ivan_ivanov': 'jean_dupont',
        'publications': 'réservations',
        'enregistrement': 'réservation',
        'entrée': 'réservation',
        'entrées': 'réservations',
        'enregistrements': 'réservations',
        'assistants': 'spécialistes',
        'assistant': 'spécialiste',
        'pour moi': 'de la date',
        'par': 'à la date',
        'exceller': 'Excel',
        'd\'accord': 'compte',
        'n\'importe quel maître': 'n\'importe quel professionnel',
        'refusé': 'annulé',
        'il a raté': 'ignoré',
        'push': 'notification push',
        'points': 'points',
        'loyauté': 'fidélité',
        'wallet': 'Wallet',
        'nfc apple/google wallet': 'NFC Apple/Google Wallet',
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
        'mir': 'datum von',
        'von': 'datum bis',
        'push': 'Push-Benachrichtigung',
        'chatten': 'chat',
        'einkommen': 'umsatz',
        'ok': 'konto',
        'beliebiger meister': 'beliebiger mitarbeiter',
        'abгелехнт': 'storniert',
        'er hat es verpasst': 'übersprungen',
        'иванов иван иванович': 'Hans Müller',
        'ivanov ivan ivanovich': 'Hans Müller',
        'иван_иванов': 'hans_mueller',
        'ivan_ivanov': 'hans_mueller',
    },
    # Corrections for Arabic
    'ar': {
        'منشورات': 'حجوزات',
        'سجل': 'حجز',
        'مع': 'من تاريخ',
        'بواسطة': 'إلى تاريخ',
        'لي': 'من تاريخ',
        'المؤلف': 'إلى تاريخ',
        'أي سيد': 'أي خبير',
        'رفض': 'تم الإلغاء',
        'غاب عنه': 'تم التجاوز',
        'دعامات': 'إدارة السجلات',
        'المعالج': 'الخبير',
        'booking': 'حجز',
        'bookings': 'حجوزات',
        'record': 'حجز',
        'recording': 'تسجيل',
        'push': 'إشعار دفع',
        'push notifications': 'إشعارات دفع',
        'lash lift': 'رفع الرموش',
        'lash lamination': 'رفع الرموش',
        'manicure': 'مانيكير',
        'pedicure': 'باديكير',
        'waxing': 'واكس',
        'иванов иван иванович': 'محمد أحمد',
        'ivanov ivan ivanovich': 'محمد أحمد',
        'иван_иванов': 'mohamed_ahmed',
        'ivan_ivanov': 'mohamed_ahmed',
    },
    # Corrections for Hindi
    'hi': {
        'मेरे लिए': 'दिनांक से',
        'लेखक': 'दिनांक तक',
        'се': 'दिनांक से',
        'так': 'दिनांक तक',
        'कोई भी गुरु': 'कोई भी मास्टर',
        'मना कर दिया': 'रद्द किया गया',
        'वह चूक गया': 'छোड़ा गया',
        'booking': 'बुकिंग',
        'bookings': 'बुकिंग',
        'record': 'रिकॉर्ड',
        'recording': 'रिकॉर्डिंग',
        'push': 'पुश नोटिफिकेशन',
        'иванов иван иванович': 'राहुल कुमार',
        'ivanov ivan ivanovich': 'राहुल कुमार',
        'иван_иванов': 'rahul_kumar',
        'ivan_ivanov': 'rahul_kumar',
    },
    # Corrections for Kazakh
    'kk': {
        'маған': 'күннен бастап',
        'автор': 'күнге дейін',
        'бас тартты': 'жойылды',
        'ол оны сағынды': 'өткізілді',
        'кез келген шебер': 'кез келген маман',
        'пост': 'жазба',
        'сәт': 'уақыт',
        'booking': 'жазба',
        'record': 'жазба',
        'push': 'Push хабарлама',
        'иванов иван иванович': 'Ахметов Алихан',
        'ivanov ivan ivanovich': 'Ахметов Алихан',
        'иван_иванов': 'alikhan_akhmetov',
        'ivan_ivanov': 'alikhan_akhmetov',
    }
}

MONTHS_FULL = {
    'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
    'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
    'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December',
    'янв': 'Январь', 'фев': 'Февраль', 'мар': 'Март', 'апр': 'Апрель',
    'май': 'Май', 'июн': 'Июнь', 'июл': 'Июль', 'авг': 'Август',
    'сен': 'Сентябрь', 'окт': 'Октябрь', 'ноя': 'Ноябрь', 'дек': 'Декабрь'
}

ABBREVIATIONS_MAP = {
    'дн': 'days',
    'ч': 'hours',
    'мин': 'minutes',
    'сек': 'seconds',
    'мес': 'months',
    'лет': 'years',
    'г': 'years'
}

TARGET_ABBREVIATIONS = {
    'en': {'days': 'd.', 'hours': 'h.', 'minutes': 'min.', 'seconds': 'sec.', 'months': 'mo.', 'years': 'y.'},
    'ru': {'days': 'дн.', 'hours': 'ч.', 'minutes': 'мин.', 'seconds': 'сек.', 'months': 'мес.', 'years': 'г.'},
    'es': {'days': 'días', 'hours': 'h', 'minutes': 'min', 'seconds': 'seg', 'months': 'meses', 'years': 'años'},
    'fr': {'days': 'j.', 'hours': 'h', 'minutes': 'min', 'seconds': 'sec', 'months': 'mois', 'years': 'ans'},
    'ar': {'days': 'يوم', 'hours': 'ساعة', 'minutes': 'دقيقة', 'seconds': 'ثانية', 'months': 'شهر', 'years': 'سنة'},
    'kk': {'days': 'күн', 'hours': 'сағ', 'minutes': 'мин', 'seconds': 'сек', 'months': 'ай', 'years': 'ж.'}
}

class Translator:
    # Expose terminology within class too
    SALON_TERMINOLOGY = SALON_TERMINOLOGY
    
    def __init__(self, use_cache=True):
        self.use_cache = use_cache
        self.cache_dir = Path(CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.cache_dir / "translations_cache.json"
        self.cache_data = {}
        self.lock = threading.Lock()
        self.glossary_file = self.cache_dir.parent / "key_glossary.json"
        self.key_glossary = {}
        if self.glossary_file.exists():
            try:
                with open(self.glossary_file, 'r', encoding='utf-8') as f:
                    self.key_glossary = json.load(f)
            except Exception as e:
                print(f"⚠️  Could not load key glossary: {e}")
        self.proxies = []
        try:
            from config import PROXIES
            self.proxies = PROXIES
        except ImportError:
            pass
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
        import hashlib
        content = f"{text}|{source}|{target}"
        return hashlib.md5(content.encode()).hexdigest()

    def _get_cached_translation(self, text: str, source: str, target: str) -> Optional[str]:
        if not self.use_cache: return None
        cache_key = self._get_cache_key(text, source, target)
        with self.lock: return self.cache_data.get(cache_key)

    def _save_to_cache(self, text: str, source: str, target: str, translation: str):
        if not self.use_cache: return
        cache_key = self._get_cache_key(text, source, target)
        with self.lock: self.cache_data[cache_key] = translation

    def save_cache_to_disk(self):
        if not self.use_cache: return
        try:
            with self.lock: data_to_save = self.cache_data.copy()
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved {len(data_to_save)} translations to cache")
        except Exception as e:
            print(f"⚠️  Could not save cache: {e}")

    def detect_language(self, text: str) -> str:
        try:
            encoded_text = urllib.parse.quote(text[:200])
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={encoded_text}"
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=10) as response:
                parsed = json.loads(response.read().decode('utf-8'))
                if parsed and len(parsed) > 2 and parsed[2]: return parsed[2]
                return 'ru'
        except: return 'ru'

    def transliterate(self, text: str, source: str, target: str) -> str:
        if not text: return text
        if source == 'ru' and target in ['en', 'es', 'fr', 'pt', 'de']:
            mapping = {'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'}
            return "".join(mapping.get(c, c) for c in text)
        return self.translate(text, source, target)

    def _translate_via_http(self, text: str, source: str, target: str, use_context: bool = False) -> str:
        try:
            context_prefix = ""
            if use_context:
                words = text.split()
                capital_words_count = sum(1 for word in words if len(word) > 0 and word[0].isupper())
                is_proper_noun = capital_words_count > 1
                is_service_term = len(words) <= 3 and not text.endswith('.') and not is_proper_noun
                if is_service_term:
                    if source == 'en': context_prefix = "[Beauty salon service] "
                    elif source == 'ru': context_prefix = "[Услуга салона красоты] "
            text_with_context = context_prefix + text
            encoded_text = urllib.parse.quote(text_with_context)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source}&tl={target}&dt=t&q={encoded_text}"
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            if self.proxies:
                proxy = random.choice(self.proxies)
                req.set_proxy(proxy, 'http')
                req.set_proxy(proxy, 'https')
            context = ssl._create_unverified_context() if hasattr(ssl, '_create_unverified_context') else None
            with urllib.request.urlopen(req, timeout=10, context=context) as response:
                data = response.read().decode('utf-8')
                parsed = json.loads(data)
                if parsed and parsed[0] and parsed[0][0] and parsed[0][0][0]:
                    translated = parsed[0][0][0]
                    if context_prefix:
                        prefixes = ["[Beauty salon service]", "[Услуга салона красоты]", "[خدمة صالون التجميل]", "[Servicio de salón de belleza]", "[Service de salon de beauté]", "[Schönheitssalon-Service]", "[सौंदर्य सैलून सेवा]", "[Сұлулық салоны қызметі]", "[Serviço de salão de beleza]"]
                        for prefix in prefixes: translated = translated.replace(prefix, "").strip()
                        translated = translated.replace("[", "").replace("]", "").strip()
                    return translated
                return text
        except Exception as e:
            return text

    def translate(self, text: str, source: str, target: str, use_context: bool = False, key_path: str = None) -> str:
        if source == target or not text or not text.strip(): return text
        if key_path and target in self.key_glossary:
            if key_path in self.key_glossary[target]: return self.key_glossary[target][key_path]
        month_res = self._handle_months(text, source, target)
        if month_res: return month_res
        abbr_res = self._handle_abbreviations(text, source, target)
        if abbr_res: return abbr_res
        variable_pattern = r'\{\{([^}]+)\}\}'
        variables = re.findall(variable_pattern, text)
        text_to_translate = text
        variable_placeholders = {}
        for i, var in enumerate(variables):
            placeholder = f"[[[VAR{i}]]]"
            variable_placeholders[placeholder] = f"{{{{{var}}}}}"
            text_to_translate = text_to_translate.replace(f"{{{{{var}}}}}", placeholder)
        text = text_to_translate
        EXCLUSIONS = {'AED', 'USD', 'EUR', 'GBP', 'RUB', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'min', 'h', 'kg', 'cm', 'ml', 'ID', 'VIP', 'SPA', 'SMS', 'API', 'UV', 'LED', '2D', '3D', '4D', '5D', 'ML'}
        if text.strip().upper() in EXCLUSIONS: return text
        if target in SALON_TERMINOLOGY:
            lower_text = text.strip().lower()
            if lower_text in SALON_TERMINOLOGY[target]: return SALON_TERMINOLOGY[target][lower_text]
        cache_key_suffix = "|ctx" if use_context else ""
        cached = self._get_cached_translation(text + cache_key_suffix, source, target)
        if cached: return self._apply_terminology_corrections(cached, target)
        translated = self._translate_via_http(text, source, target, use_context=use_context)
        translated = self._apply_terminology_corrections(translated, target)
        for placeholder, original_var in variable_placeholders.items():
            translated = translated.replace(placeholder, original_var)
        self._save_to_cache(text + cache_key_suffix, source, target, translated)
        return translated

    def _apply_terminology_corrections(self, text: str, target_lang: str) -> str:
        if target_lang not in SALON_TERMINOLOGY: return text
        corrections = SALON_TERMINOLOGY[target_lang]
        text_lower = text.lower().strip()
        for wrong_term, correct_term in corrections.items():
            if text_lower == wrong_term.lower():
                if text and text[0].isupper(): 
                    # If the source was capitalized, ensure the translation is at least capitalized
                    # but don't force lowercase on the rest (to preserve names like John Doe)
                    if correct_term and not correct_term[0].isupper():
                        return correct_term[0].upper() + correct_term[1:]
                return correct_term
        for wrong_term, correct_term in corrections.items():
            pattern = r'\b' + re.escape(wrong_term) + r'\b'
            text = re.sub(pattern, correct_term, text, flags=re.IGNORECASE)
        return text

    def translate_batch(self, texts: List[str], source: str, target: str, use_context: bool = False, key_paths: List[Optional[str]] = None) -> List[str]:
        if not texts: return []
        if source == target: return texts
        results = [None] * len(texts)
        to_translate_indices = []
        to_translate_texts = []
        for i, text in enumerate(texts):
            if not text or not text.strip(): results[i] = text; continue
            kp = key_paths[i] if key_paths else None
            if kp and target in self.key_glossary and kp in self.key_glossary[target]: results[i] = self.key_glossary[target][kp]; continue
            
            # Terminology Check
            if target in SALON_TERMINOLOGY:
                lower_text = text.strip().lower()
                if lower_text in SALON_TERMINOLOGY[target]:
                    results[i] = SALON_TERMINOLOGY[target][lower_text]
                    continue
                    
            cached = self._get_cached_translation(text + ("|ctx" if use_context else ""), source, target)
            if cached: results[i] = self._apply_terminology_corrections(cached, target); continue
            to_translate_indices.append(i); to_translate_texts.append(text)
        if not to_translate_texts: return results
        batch_size = 150
        variable_pattern = r'\{\{([^}]+)\}\}'
        for i in range(0, len(to_translate_texts), batch_size):
            batch = to_translate_texts[i:i+batch_size]; batch_indices = to_translate_indices[i:i+batch_size]
            protected_batch = []; batch_variable_maps = []
            for text in batch:
                variables = re.findall(variable_pattern, text); var_map = {}; t2t = text
                for idx, var in enumerate(variables): placeholder = f"[[[V{idx}]]]"; var_map[placeholder] = f"{{{{{var}}}}}"; t2t = t2t.replace(f"{{{{{var}}}}}", placeholder)
                protected_batch.append(t2t); batch_variable_maps.append(var_map)
            batch_with_tags = "".join([f"<z{j}>{t}</z{j}> " for j, t in enumerate(protected_batch)])
            try:
                raw = self._translate_via_http(batch_with_tags, source, target, use_context=use_context)
                for j in range(len(batch)):
                    tag_start, tag_end = f"<z{j}>", f"</z{j}>"
                    s_idx = raw.find(tag_start)
                    if s_idx == -1: s_idx = raw.lower().find(tag_start.lower())
                    if s_idx != -1:
                        e_idx = raw.find(tag_end, s_idx)
                        if e_idx == -1: e_idx = raw.lower().find(tag_end.lower(), s_idx)
                        if e_idx != -1:
                            txt = raw[s_idx + len(tag_start):e_idx].strip()
                            for ph, orig in batch_variable_maps[j].items():
                                txt = txt.replace(ph, orig).replace(ph.replace("[", "[ ").replace("]", " ]"), orig)
                            txt = self._apply_terminology_corrections(txt, target)
                            results[batch_indices[j]] = txt
                            self._save_to_cache(batch[j] + ("|ctx" if use_context else ""), source, target, txt)
                        else: results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
                    else: results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
            except Exception as e:
                for j in range(len(batch)): results[batch_indices[j]] = self.translate(batch[j], source, target, use_context, key_paths[batch_indices[j]] if key_paths else None)
        return results

    def _handle_months(self, text: str, source: str, target: str) -> Optional[str]:
        low = text.lower().strip().replace('.', '')
        if low in MONTHS_FULL:
            full = MONTHS_FULL[low]
            trans = self._translate_via_http(full, 'en' if low in MONTHS_FULL and (ord(low[0]) < 128) else 'ru', target)
            if len(text) <= 4: return trans[:3].capitalize() if target != 'ar' else trans
            return trans
        return None

    def _handle_abbreviations(self, text: str, source: str, target: str) -> Optional[str]:
        clean = text.lower().strip().replace('.', '')
        if clean in ABBREVIATIONS_MAP:
            full_en = ABBREVIATIONS_MAP[clean]
            if target in TARGET_ABBREVIATIONS and full_en in TARGET_ABBREVIATIONS[target]: return TARGET_ABBREVIATIONS[target][full_en]
            return self._translate_via_http(full_en, 'en', target)
        return None

if __name__ == "__main__":
    t = Translator(); test = "Мастер маникюра"; print(f"\nТест: '{test}'")
    for l in ["en", "ar", "es"]: print(f"  {l}: {t.translate(test, 'ru', l)}")
