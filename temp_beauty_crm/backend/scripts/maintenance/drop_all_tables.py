#!/usr/bin/env python3
"""
Скрипт для полного удаления всех таблиц из PostgreSQL базы данных
ВНИМАНИЕ: Это удалит ВСЕ данные!
"""
import sys
from db.connection import get_db_connection

def drop_all_tables():
    """Удалить все таблицы из базы данных"""
    
    print("🔴 ВНИМАНИЕ: Этот скрипт удалит ВСЕ таблицы из базы данных!")
    print("=" * 60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем список всех таблиц
        c.execute("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        
        tables = c.fetchall()
        
        if not tables:
            print("✅ База данных уже пустая - таблиц нет")
            conn.close()
            return
        
        print(f"\n📋 Найдено таблиц: {len(tables)}")
        print("\nСписок таблиц для удаления:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Удаляем все таблицы с CASCADE (чтобы удалить и зависимости)
        print(f"\n🗑️ Удаление всех таблиц...")
        
        dropped_count = 0
        for table in tables:
            table_name = table[0]
            try:
                c.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
                print(f"✅ Удалена таблица: {table_name}")
                dropped_count += 1
            except Exception as e:
                print(f"❌ Ошибка при удалении таблицы {table_name}: {e}")
        
        conn.commit()
        
        print(f"\n✅ Успешно удалено таблиц: {dropped_count}/{len(tables)}")
        
        # Проверяем что всё удалено
        c.execute("""
            SELECT COUNT(*) 
            FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        remaining = c.fetchone()[0]
        
        if remaining == 0:
            print("✅ База данных полностью очищена!")
        else:
            print(f"⚠️ Осталось таблиц: {remaining}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🗑️  УДАЛЕНИЕ ВСЕХ ТАБЛИЦ ИЗ БАЗЫ ДАННЫХ")
    print("=" * 60 + "\n")
    
    response = input("Вы уверены? Это удалит ВСЕ данные! (введите 'yes' для продолжения): ")
    
    if response.lower() == 'yes':
        drop_all_tables()
        print("\n✅ Готово! Теперь можно запустить миграции заново.")
        print("\nКоманды для запуска:")
        print("  1. run_all_migrations()")
        print("  2. await run_all_fixes()")
        print("  3. run_all_tests()")
    else:
        print("❌ Отменено пользователем")
        sys.exit(1)
