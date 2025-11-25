"""
Миграция: Связывание пользователей с записями сотрудников

Эта миграция автоматически создает записи сотрудников для пользователей,
у которых нет employee_id, и связывает их.
"""

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning, log_error


def link_users_to_employees():
    """
    Связать всех пользователей с записями сотрудников.
    Создает записи сотрудников для пользователей без employee_id
    или с несуществующим employee_id.
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("🔗 Начало миграции: связывание пользователей с сотрудниками", "migration")
        
        # Получаем всех пользователей
        c.execute("""
            SELECT id, username, full_name, role, employee_id
            FROM users 
        """)
        
        all_users = c.fetchall()
        linked_count = 0
        
        for user_id, username, full_name, role, employee_id in all_users:
            needs_linking = False
            
            # Проверяем, нужна ли привязка
            if not employee_id or employee_id == '':
                needs_linking = True
                log_info(f"   📋 Пользователь {username} не имеет employee_id", "migration")
            else:
                # Проверяем, существует ли запись сотрудника
                c.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
                if not c.fetchone():
                    needs_linking = True
                    log_warning(f"   ⚠️  Пользователь {username} ссылается на несуществующего сотрудника ID={employee_id}", "migration")
            
            if not needs_linking:
                continue
                
            try:
                # Определяем должность на основе роли
                position_map = {
                    'director': 'Director',
                    'admin': 'Administrator',
                    'manager': 'Manager',
                    'sales': 'Sales',
                    'marketer': 'Marketer',
                    'employee': 'Employee'
                }
                
                position = position_map.get(role, 'Employee')
                
                # Проверяем, нет ли уже сотрудника с таким именем
                c.execute("""
                    SELECT id FROM employees 
                    WHERE full_name = ? OR LOWER(full_name) = LOWER(?)
                """, (full_name, full_name))
                
                existing_employee = c.fetchone()
                
                if existing_employee:
                    # Используем существующую запись
                    new_employee_id = existing_employee[0]
                    log_info(f"   ✓ Найден существующий сотрудник для {full_name} (ID: {new_employee_id})", "migration")
                else:
                    # Создаем новую запись сотрудника
                    c.execute("""
                        INSERT INTO employees (full_name, position, is_active, created_at)
                        VALUES (?, ?, 1, datetime('now'))
                    """, (full_name, position))
                    
                    new_employee_id = c.lastrowid
                    log_info(f"   ✓ Создан новый сотрудник для {full_name} (ID: {new_employee_id}, должность: {position})", "migration")
                
                # Связываем пользователя с сотрудником
                c.execute("""
                    UPDATE users 
                    SET employee_id = ? 
                    WHERE id = ?
                """, (new_employee_id, user_id))
                
                linked_count += 1
                log_info(f"   ✅ Пользователь {username} ({full_name}) связан с сотрудником ID {new_employee_id}", "migration")
                
            except Exception as e:
                log_error(f"   ❌ Ошибка при обработке пользователя {username}: {e}", "migration")
                continue
        
        conn.commit()
        conn.close()
        
        if linked_count > 0:
            log_info(f"✅ Миграция завершена: связано {linked_count} пользователей", "migration")
        else:
            log_info("✅ Миграция завершена: все пользователи уже корректно связаны", "migration")
        
        return {
            "success": True,
            "linked": linked_count,
            "message": f"Successfully linked {linked_count} users to employees"
        }
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции link_users_to_employees: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Для тестирования миграции
    result = link_users_to_employees()
    print(result)
