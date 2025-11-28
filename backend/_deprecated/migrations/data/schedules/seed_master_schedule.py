"""
Миграция: Заполнение базового расписания для мастеров

Создаёт стандартное расписание для всех активных мастеров.
"""

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning, log_error


def seed_master_schedule():
    """
    Создать базовое расписание для всех активных мастеров.
    Понедельник-Суббота: 10:00-20:00
    Воскресенье: выходной
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("📅 Начало миграции: заполнение расписания мастеров", "migration")
        
        # Получаем время работы салона
        c.execute("SELECT hours FROM salon_settings WHERE id = 1")
        salon_hours = c.fetchone()
        
        # Парсим время работы (формат: "Daily 10:30 - 21:00")
        start_time = "10:30"
        end_time = "21:00"
        
        if salon_hours and salon_hours[0]:
            hours_str = salon_hours[0]
            if '-' in hours_str:
                parts = hours_str.split('-')
                if len(parts) == 2:
                    start_time = parts[0].strip().split()[-1]  # "Daily 10:30" -> "10:30"
                    end_time = parts[1].strip()
        
        log_info(f"   ⏰ Время работы салона: {start_time} - {end_time}", "migration")
        
        # Получаем всех активных мастеров
        c.execute("SELECT id, full_name FROM employees WHERE is_active = 1")
        employees = c.fetchall()
        
        if not employees:
            log_warning("⚠️  Нет активных сотрудников для создания расписания", "migration")
            conn.close()
            return {"success": True, "created": 0}
        
        created_count = 0
        
        # Стандартное расписание: Пн-Сб (время из настроек салона)
        standard_schedule = [
            (1, start_time, end_time),  # Понедельник
            (2, start_time, end_time),  # Вторник
            (3, start_time, end_time),  # Среда
            (4, start_time, end_time),  # Четверг
            (5, start_time, end_time),  # Пятница
            (6, start_time, end_time),  # Суббота
        ]
        
        for emp_id, full_name in employees:
            # Проверяем, есть ли уже расписание для этого мастера
            c.execute("""
                SELECT COUNT(*) FROM employee_schedule 
                WHERE employee_id = ?
            """, (emp_id,))
            
            existing_count = c.fetchone()[0]
            
            if existing_count > 0:
                log_info(f"   ⏭️  У {full_name} уже есть расписание ({existing_count} записей)", "migration")
                continue
            
            # Создаём расписание для каждого дня
            for day_of_week, start_time, end_time in standard_schedule:
                c.execute("""
                    INSERT INTO employee_schedule 
                    (employee_id, day_of_week, start_time, end_time, is_active)
                    VALUES (?, ?, ?, ?, 1)
                """, (emp_id, day_of_week, start_time, end_time))
                
                created_count += 1
            
            log_info(f"   ✅ Создано расписание для {full_name} (Пн-Сб {start_time}-{end_time})", "migration")
        
        conn.commit()
        conn.close()
        
        if created_count > 0:
            log_info(f"✅ Миграция завершена: создано {created_count} записей расписания", "migration")
        else:
            log_info("✅ Миграция завершена: расписание уже существует", "migration")
        
        return {
            "success": True,
            "created": created_count,
            "message": f"Created {created_count} schedule entries"
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции seed_master_schedule: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    result = seed_master_schedule()
    print(result)
