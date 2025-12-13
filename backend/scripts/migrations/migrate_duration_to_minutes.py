#!/usr/bin/env python3
"""
Миграция длительности услуг: текстовый формат → минуты
Конвертирует все значения duration из текстового формата (1h, 1h 30min, 1ч 30) 
в числовой формат (минуты: 60, 90)
"""
import sys
sys.path.insert(0, '.')

from db.connection import get_db_connection
from utils.duration_utils import parse_duration_to_minutes, format_duration_display


def migrate_service_durations():
    """Мигрирует длительность услуг в формат минут"""
    print("🔧 Начинаем миграцию длительности услуг...")
    print("-" * 60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Получаем все услуги с длительностью
        c.execute("""
            SELECT id, name_ru, duration 
            FROM services 
            WHERE duration IS NOT NULL AND duration != ''
        """)
        services = c.fetchall()
        
        print(f"📋 Найдено услуг с длительностью: {len(services)}")
        print()
        
        updated_count = 0
        already_correct = 0
        errors = 0
        
        for service_id, name_ru, current_duration in services:
            # Обработка None в названии
            name_display = name_ru if name_ru else "(No name)"
            
            # Проверяем, не является ли уже числом
            if str(current_duration).strip().isdigit():
                already_correct += 1
                minutes = int(current_duration)
                display = format_duration_display(minutes, 'ru')
                print(f"✅ ID {service_id:3d} | {name_display:40s} | {minutes:3d} мин → {display} (уже в нужном формате)")
                continue
            
            # Конвертируем в минуты
            minutes = parse_duration_to_minutes(current_duration)
            
            if minutes is None:
                print(f"⚠️  ID {service_id:3d} | {name_display:40s} | '{current_duration}' → НЕ УДАЛОСЬ РАСПАРСИТЬ")
                errors += 1
                continue
            
            # Обновляем в БД
            c.execute("""
                UPDATE services 
                SET duration = %s
                WHERE id = %s
            """, (str(minutes), service_id))
            
            display = format_duration_display(minutes, 'ru')
            print(f"➕ ID {service_id:3d} | {name_display:40s} | '{current_duration}' → {minutes} мин ({display})")
            updated_count += 1
        
        # Также обновляем user_services если там есть кастомная длительность
        print()
        print("🔧 Миграция длительности в user_services...")
        c.execute("""
            SELECT id, user_id, service_id, duration 
            FROM user_services 
            WHERE duration IS NOT NULL AND duration != ''
        """)
        user_services = c.fetchall()
        
        if user_services:
            print(f"📋 Найдено записей в user_services: {len(user_services)}")
            us_updated = 0
            
            for us_id, user_id, service_id, current_duration in user_services:
                if str(current_duration).strip().isdigit():
                    continue
                
                minutes = parse_duration_to_minutes(current_duration)
                if minutes:
                    c.execute("""
                        UPDATE user_services 
                        SET duration = %s
                        WHERE id = %s
                    """, (str(minutes), us_id))
                    us_updated += 1
                    print(f"➕ user_services ID {us_id} | '{current_duration}' → {minutes} мин")
            
            print(f"✅ Обновлено записей в user_services: {us_updated}")
        
        # Коммитим изменения
        conn.commit()
        
        print()
        print("=" * 60)
        print("✅ Миграция завершена успешно!")
        print(f"   Обновлено: {updated_count}")
        print(f"   Уже корректные: {already_correct}")
        print(f"   Ошибки: {errors}")
        print("=" * 60)
        
        # Показываем примеры
        print()
        print("📝 Примеры отображения для разных языков:")
        c.execute("SELECT duration FROM services WHERE duration IS NOT NULL LIMIT 5")
        for row in c.fetchall():
            minutes = int(row[0]) if row[0] else None
            if minutes:
                print(f"   {minutes} мин:")
                print(f"      RU: {format_duration_display(minutes, 'ru')}")
                print(f"      EN: {format_duration_display(minutes, 'en')}")
                print(f"      AR: {format_duration_display(minutes, 'ar')}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка при миграции: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_service_durations()
