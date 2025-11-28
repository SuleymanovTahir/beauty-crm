#!/usr/bin/env python3
"""
Скрипт для автоматического перевода контента в базе данных (Отзывы, FAQ).
Использует бесплатный Google Translate API.
"""

import sqlite3
import json
import urllib.parse
import urllib.request
import time
import random
import os
import sys

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../salon_bot.db'))
SOURCE_LANG = 'ru'
TARGET_LANGS = ['en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
RETRY_COUNT = 3
DELAY_MIN = 0.5
DELAY_MAX = 1.5

# Маппинг языковых кодов для Google Translate
LANG_MAP = {
    'ru': 'ru',
    'en': 'en',
    'ar': 'ar',
    'es': 'es',
    'de': 'de',
    'fr': 'fr',
    'hi': 'hi',
    'kk': 'kk',
    'pt': 'pt'
}

def translate_google_free_custom(text: str, source_lang: str, target_lang: str) -> str:
    """
    Перевод текста через бесплатный Google Translate
    """
    if not text or not isinstance(text, str):
        return text

    # Если текст - это URL или путь, не переводим
    if text.startswith('http') or text.startswith('/') or text.startswith('@'):
        return text

    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        'client': 'gtx',
        'sl': LANG_MAP.get(source_lang, source_lang),
        'tl': LANG_MAP.get(target_lang, target_lang),
        'dt': 't',
        'q': text
    }
    
    query_string = urllib.parse.urlencode(params)
    full_url = f"{url}?{query_string}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    for attempt in range(RETRY_COUNT):
        try:
            req = urllib.request.Request(full_url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                result = response.read().decode('utf-8')
                data = json.loads(result)
                
                if data and len(data) > 0 and data[0]:
                    translated = ''.join([part[0] for part in data[0] if part[0]])
                    return translated
            break
        except Exception as e:
            if attempt < RETRY_COUNT - 1:
                time.sleep(1 * (attempt + 1))
            else:
                print(f"   ⚠️ Ошибка перевода '{text[:20]}...': {e}")
                return None
    return None

def translate_reviews(conn):
    """Перевод отзывов"""
    print("\n📝 Перевод отзывов...")
    cursor = conn.cursor()
    
    # Получаем все отзывы
    cursor.execute("SELECT id, text_ru FROM public_reviews")
    reviews = cursor.fetchall()
    
    total = len(reviews)
    print(f"Найдено {total} отзывов")
    
    for i, (review_id, text_ru) in enumerate(reviews):
        if not text_ru:
            continue
            
        print(f"[{i+1}/{total}] Обработка отзыва ID {review_id}...")
        
        updates = []
        params = []
        
        for lang in TARGET_LANGS:
            col_name = f"text_{lang}"
            
            # Проверяем, есть ли уже перевод
            cursor.execute(f"SELECT {col_name} FROM public_reviews WHERE id = ?", (review_id,))
            current_val = cursor.fetchone()[0]
            
            if not current_val:
                translated = translate_google_free_custom(text_ru, SOURCE_LANG, lang)
                if translated:
                    updates.append(f"{col_name} = ?")
                    params.append(translated)
                    print(f"  ✅ {lang}: Переведено")
                    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
                else:
                    print(f"  ❌ {lang}: Ошибка")
            else:
                print(f"  ⏭️ {lang}: Уже есть")
                
        if updates:
            params.append(review_id)
            sql = f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()

def translate_faq(conn):
    """Перевод FAQ"""
    print("\n❓ Перевод FAQ...")
    cursor = conn.cursor()
    
    # Получаем все FAQ
    cursor.execute("SELECT id, question_ru, answer_ru FROM public_faq")
    faqs = cursor.fetchall()
    
    total = len(faqs)
    print(f"Найдено {total} FAQ")
    
    for i, (faq_id, question_ru, answer_ru) in enumerate(faqs):
        print(f"[{i+1}/{total}] Обработка FAQ ID {faq_id}...")
        
        updates = []
        params = []
        
        for lang in TARGET_LANGS:
            # Вопрос
            q_col = f"question_{lang}"
            cursor.execute(f"SELECT {q_col} FROM public_faq WHERE id = ?", (faq_id,))
            curr_q = cursor.fetchone()[0]
            
            if not curr_q and question_ru:
                trans_q = translate_google_free_custom(question_ru, SOURCE_LANG, lang)
                if trans_q:
                    updates.append(f"{q_col} = ?")
                    params.append(trans_q)
                    print(f"  ✅ {lang} (Вопрос): Переведено")
                    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            
            # Ответ
            a_col = f"answer_{lang}"
            cursor.execute(f"SELECT {a_col} FROM public_faq WHERE id = ?", (faq_id,))
            curr_a = cursor.fetchone()[0]
            
            if not curr_a and answer_ru:
                trans_a = translate_google_free_custom(answer_ru, SOURCE_LANG, lang)
                if trans_a:
                    updates.append(f"{a_col} = ?")
                    params.append(trans_a)
                    print(f"  ✅ {lang} (Ответ): Переведено")
                    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
                    
        if updates:
            params.append(faq_id)
            sql = f"UPDATE public_faq SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()

def main():
    if not os.path.exists(DB_PATH):
        print(f"❌ База данных не найдена: {DB_PATH}")
        return
        
    print(f"🔌 Подключение к БД: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    try:
        translate_reviews(conn)
        translate_faq(conn)
        print("\n✨ Готово! Все переводы обновлены.")
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
