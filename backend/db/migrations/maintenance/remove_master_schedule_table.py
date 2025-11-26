"""
Миграция: Удаление устаревшей таблицы master_schedule

Таблица master_schedule была заменена на employee_schedule.
Эта миграция удаляет старую таблицу.
"""

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning, log_error


def remove_master_schedule_table():
    """
    Удалить устаревшую таблицу master_schedule.
    Все данные теперь хранятся в employee_schedule.
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("🗑️  Начало миграции: удаление устаревшей таблицы master_schedule", "migration")
        
        # Проверяем, существует ли таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='master_schedule'")
        
        if c.fetchone():
            # Проверяем, есть ли данные
            c.execute("SELECT COUNT(*) FROM master_schedule")
            count = c.fetchone()[0]
            
            if count > 0:
                log_warning(f"   ⚠️  В таблице master_schedule найдено {count} записей (будут удалены)", "migration")
            
            # Удаляем таблицу
            c.execute("DROP TABLE master_schedule")
            conn.commit()
            
            log_info("   ✅ Таблица master_schedule удалена", "migration")
            log_info("   ℹ️  Все данные расписания теперь в employee_schedule", "migration")
        else:
            log_info("   ⏭️  Таблица master_schedule уже удалена", "migration")
        
        conn.close()
        
        log_info("✅ Миграция завершена: master_schedule удалена", "migration")
        
        return {
            "success": True,
            "message": "master_schedule table removed successfully"
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции remove_master_schedule_table: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    result = remove_master_schedule_table()
    print(result)
