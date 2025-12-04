"""
Исправление абсолютных URL с localhost на относительные пути
Проблема: В базе данных сохранены URL вида http://localhost:8000/static/...
Решение: Заменить на относительные пути /static/...
"""
from db.connection import get_db_connection
import re
import psycopg2

DATABASE_NAME = "salon_bot.db"

def fix_localhost_urls():
    """Исправить все localhost URL на относительные пути"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Паттерн для поиска localhost URL
    localhost_pattern = r'http://localhost:\d+(/.*)'
    
    tables_and_columns = [
        ('public_banners', 'image_url'),
        ('public_reviews', 'avatar_url'),
        ('public_gallery', 'image_url'),
        ('users', 'photo'),  # employees table is deprecated, use users instead
    ]
    
    total_fixed = 0
    
    for table, column in tables_and_columns:
        try:
            # Получить все записи с localhost URL
            c.execute(f"SELECT id, {column} FROM {table} WHERE {column} LIKE '%localhost%'")
            rows = c.fetchall()
            
            if not rows:
                print(f"✅ {table}.{column}: нет localhost URL")
                continue
            
            print(f"⚠️  {table}.{column}: найдено {len(rows)} записей с localhost URL")
            
            for row_id, url in rows:
                if url:
                    # Извлечь относительный путь
                    match = re.search(localhost_pattern, url)
                    if match:
                        relative_path = match.group(1)
                        
                        # Обновить запись
                        c.execute(f"UPDATE {table} SET {column} = %s WHERE id = %s", (relative_path, row_id))
                        print(f"   Исправлено: {url} → {relative_path}")
                        total_fixed += 1
            
        except psycopg2.OperationalError as e:
            print(f"⚠️  Таблица {table} или колонка {column} не существует: {e}")
            continue
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Всего исправлено: {total_fixed} URL")
    return total_fixed

if __name__ == "__main__":
    print("🔧 Исправление localhost URL в базе данных...")
    fixed = fix_localhost_urls()
    print(f"✅ Готово! Исправлено {fixed} URL")
