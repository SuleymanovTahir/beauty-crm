#!/usr/bin/env python3
"""
Скрипт для удаления дубликатов отзывов
Оставляет только один отзыв от каждого автора с одинаковым текстом
"""
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from utils.logger import log_info, log_warning

def remove_duplicate_reviews():
    """Удалить дубликаты отзывов, оставив только самый старый"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Найти дубликаты (одинаковые имя + текст)
        cursor.execute("""
            SELECT 
                author_name_ru,
                text_ru,
                COUNT(*) as count,
                MIN(id) as keep_id,
                ARRAY_AGG(id ORDER BY created_at DESC) as all_ids
            FROM public_reviews
            WHERE is_active = TRUE
            GROUP BY author_name_ru, text_ru
            HAVING COUNT(*) > 1
        """)
        
        duplicates = cursor.fetchall()
        
        if not duplicates:
            print("✅ Дубликатов не найдено!")
            return
        
        print(f"\n🔍 Найдено {len(duplicates)} групп дубликатов:\n")
        
        total_deleted = 0
        
        for author, text, count, keep_id, all_ids in duplicates:
            # Удаляем все ID кроме самого старого (keep_id)
            ids_to_delete = [id for id in all_ids if id != keep_id]
            
            print(f"📝 {author[:30]}... ({count} копий)")
            print(f"   Оставляем ID: {keep_id}")
            print(f"   Удаляем IDs: {ids_to_delete}")
            
            if ids_to_delete:
                cursor.execute(
                    "DELETE FROM public_reviews WHERE id = ANY(%s)",
                    (ids_to_delete,)
                )
                deleted_count = cursor.rowcount
                total_deleted += deleted_count
                print(f"   ✅ Удалено: {deleted_count}\n")
        
        conn.commit()
        
        print(f"\n✅ Всего удалено дубликатов: {total_deleted}")
        log_info(f"Удалено {total_deleted} дубликатов отзывов", "cleanup")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка: {e}")
        log_warning(f"Ошибка при удалении дубликатов: {e}", "cleanup")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🧹 Очистка дубликатов отзывов...")
    print("=" * 60)
    remove_duplicate_reviews()
    print("=" * 60)
    print("✅ Готово!")
