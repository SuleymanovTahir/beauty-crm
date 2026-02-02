"""
Миграция: Удаление дубликатов сотрудников

Находит и удаляет дубликаты сотрудников, оставляя только записи с услугами.
"""

from db.connection import get_db_connection
from utils.logger import log_info, log_warning, log_error

def remove_duplicate_employees():
    """
    Удалить дубликаты сотрудников.
    Оставляет только те записи, у которых есть закреплённые услуги.
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        log_info("🔍 Начало миграции: поиск дубликатов сотрудников", "migration")
        
        # Находим потенциальные дубликаты по похожим именам
        c.execute("""
            SELECT e1.id, e1.full_name, e1.position,
                   COUNT(es.service_id) as services_count
            FROM employees e1
            LEFT JOIN employee_services es ON e1.id = es.employee_id
            GROUP BY e1.id
        """)
        
        all_employees = c.fetchall()
        removed_count = 0
        
        # Группируем по похожим именам (игнорируя регистр и транслитерацию)
        name_groups = {}
        
        for emp_id, full_name, position, services_count in all_employees:
            # Нормализуем имя (убираем пробелы, приводим к нижнему регистру)
            normalized_name = full_name.lower().strip() if full_name else ""
            
            if normalized_name not in name_groups:
                name_groups[normalized_name] = []
            
            name_groups[normalized_name].append({
                'id': emp_id,
                'full_name': full_name,
                'position': position,
                'services_count': services_count
            })
        
        # Обрабатываем группы с дубликатами
        for normalized_name, employees in name_groups.items():
            if len(employees) <= 1:
                continue  # Нет дубликатов
            
            log_warning(f"   ⚠️  Найдены дубликаты для '{employees[0]['full_name']}': {len(employees)} записей", "migration")
            
            # Сортируем: сначала те, у кого есть услуги, потом по ID (старые первыми)
            employees.sort(key=lambda x: (-x['services_count'], x['id']))
            
            # Оставляем первого (с услугами или самого старого)
            keep_employee = employees[0]
            log_info(f"   ✓ Оставляем: {keep_employee['full_name']} (ID: {keep_employee['id']}, услуг: {keep_employee['services_count']})", "migration")
            
            # Удаляем остальных
            for emp in employees[1:]:
                # Проверяем, не связан ли с пользователями
                c.execute("SELECT COUNT(*) FROM users WHERE employee_id = %s", (emp['id'],))
                user_count = c.fetchone()[0]
                
                if user_count > 0:
                    # Переносим связи на оставшегося сотрудника
                    log_info(f"   🔄 Переношу {user_count} пользователей с ID {emp['id']} на ID {keep_employee['id']}", "migration")
                    c.execute("""
                        UPDATE users 
                        SET employee_id = %s 
                        WHERE employee_id = %s
                    """, (keep_employee['id'], emp['id']))
                
                # Удаляем дубликат
                c.execute("DELETE FROM employees WHERE id = %s", (emp['id'],))
                log_info(f"   ❌ Удалён дубликат: {emp['full_name']} (ID: {emp['id']}, услуг: {emp['services_count']})", "migration")
                removed_count += 1
        
        conn.commit()
        conn.close()
        
        if removed_count > 0:
            log_info(f"✅ Миграция завершена: удалено {removed_count} дубликатов", "migration")
        else:
            log_info("✅ Миграция завершена: дубликаты не найдены", "migration")
        
        return {
            "success": True,
            "removed": removed_count,
            "message": f"Removed {removed_count} duplicate employees"
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции remove_duplicate_employees: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = remove_duplicate_employees()
    print(result)
