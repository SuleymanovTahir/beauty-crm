#!/usr/bin/env python3
"""
Миграция: Удаление устаревших таблиц employees и employee_salary_settings
"""
from db.connection import get_db_connection
import sys
import os

# Добавляем путь к backend
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
sys.path.insert(0, backend_dir)

def remove_deprecated_employee_tables():
    """Удалить устаревшие таблицы employees и employee_salary_settings"""
    print("🔧 Удаление устаревших таблиц employees...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем существование таблиц
        c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' AND tablename='employees'")
        employees_exists = c.fetchone() is not None
        
        c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' AND tablename='employee_salary_settings'")
        salary_exists = c.fetchone() is not None
        
        c.execute("SELECT tabletablename FROM pg_tables WHERE schematablename='public' AND tablename='employee_unavailability'")
        unavailability_exists = c.fetchone() is not None
        
        if employees_exists:
            # Проверяем, что данные перенесены в users
            c.execute("SELECT COUNT(*) FROM employees")
            emp_count = c.fetchone()[0]
            
            c.execute("SELECT COUNT(*) FROM users")
            user_count = c.fetchone()[0]
            
            if user_count >= emp_count:
                print(f"   ✅ Данные перенесены ({emp_count} employees -> {user_count} users)")
                c.execute("DROP TABLE employees")
                print("   ✅ Таблица employees удалена")
            else:
                print(f"   ⚠️  Не все данные перенесены ({emp_count} employees, {user_count} users)")
                print("   ⚠️  Пропускаем удаление employees")
        else:
            print("   ℹ️  Таблица employees уже удалена")
        
        if salary_exists:
            c.execute("SELECT COUNT(*) FROM employee_salary_settings")
            count = c.fetchone()[0]
            
            if count == 0:
                c.execute("DROP TABLE employee_salary_settings")
                print("   ✅ Таблица employee_salary_settings удалена (была пустая)")
            else:
                print(f"   ⚠️  Таблица employee_salary_settings содержит {count} записей")
                print("   ⚠️  Пропускаем удаление")
        else:
            print("   ℹ️  Таблица employee_salary_settings уже удалена")
        
        if unavailability_exists:
            c.execute("SELECT COUNT(*) FROM employee_unavailability")
            count = c.fetchone()[0]
            
            if count == 0:
                c.execute("DROP TABLE employee_unavailability")
                print("   ✅ Таблица employee_unavailability удалена (была пустая)")
            else:
                print(f"   ⚠️  Таблица employee_unavailability содержит {count} записей")
                print("   ⚠️  Нужно мигрировать в user_time_off")
        else:
            print("   ℹ️  Таблица employee_unavailability уже удалена")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = remove_deprecated_employee_tables()
    sys.exit(0 if success else 1)
