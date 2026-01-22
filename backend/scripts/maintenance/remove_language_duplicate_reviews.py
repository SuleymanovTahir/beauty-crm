#!/usr/bin/env python3
"""
Удаление дубликатов отзывов по разным языкам
Оставляет только русскую версию каждого отзыва
"""
import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from utils.logger import log_info

def remove_language_duplicates():
    """Удалить дубликаты отзывов на разных языках"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Группы дубликатов (одинаковый avatar_url = один человек)
        duplicates_map = {
            'fatima_a.jpg': ['Fatima Al-Sayed', 'Фатима Аль-Сайед'],
            'maria_g.jpg': ['Maria Gonzalez', 'Мария Гонсалес'],
            'sarah_j.jpg': ['Sarah Jenkins', 'Сара Дженкинс']
        }
        
        total_deleted = 0
        
        for avatar, names in duplicates_map.items():
            print(f"\n🔍 Обработка {avatar}:")
            print(f"   Имена: {names}")
            
            # Находим все отзывы с этим avatar
            cursor.execute("""
                SELECT id, author_name_ru, author_name_en, text_ru, text_en
                FROM public_reviews
                WHERE avatar_url = %s AND is_active = TRUE
                ORDER BY id ASC
            """, (avatar,))
            
            reviews = cursor.fetchall()
            
            if len(reviews) <= 1:
                print(f"   ✅ Дубликатов нет ({len(reviews)} отзыв)")
                continue
            
            # Оставляем первый (самый старый), удаляем остальные
            keep_id = reviews[0][0]
            delete_ids = [r[0] for r in reviews[1:]]
            
            print(f"   📌 Оставляем ID: {keep_id}")
            print(f"   🗑️  Удаляем IDs: {delete_ids}")
            
            if delete_ids:
                cursor.execute(
                    "DELETE FROM public_reviews WHERE id = ANY(%s)",
                    (delete_ids,)
                )
                deleted = cursor.rowcount
                total_deleted += deleted
                print(f"   ✅ Удалено: {deleted}")
        
        conn.commit()
        print(f"\n✅ Всего удалено дубликатов: {total_deleted}")
        log_info(f"Удалено {total_deleted} языковых дубликатов отзывов", "cleanup")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🧹 Удаление языковых дубликатов отзывов...")
    print("=" * 60)
    remove_language_duplicates()
    print("=" * 60)
    print("✅ Готово!")
