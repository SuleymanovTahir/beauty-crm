"""
Утилиты для Audit Log
"""
import json
from datetime import datetime
from typing import Optional, Dict, Any
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.tenant_context import get_current_company_id

def log_audit(
    user: Dict[str, Any],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_value: Optional[Dict] = None,
    new_value: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """
    Записать действие в audit log
    
    Args:
        user: Словарь с данными пользователя (id, role, username)
        action: Тип действия ('create', 'update', 'delete', 'restore', 'login', 'logout')
        entity_type: Тип сущности ('client', 'booking', 'user', 'settings')
        entity_id: ID сущности
        old_value: Старое значение (dict)
        new_value: Новое значение (dict)
        ip_address: IP адрес
        user_agent: User Agent
        success: Успешно ли выполнено действие
        error_message: Сообщение об ошибке (если есть)
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        resolved_company_id = user.get("company_id")
        if resolved_company_id in {None, ""}:
            resolved_company_id = get_current_company_id()
        
        c.execute("""
            INSERT INTO audit_log 
            (company_id, user_id, user_role, username, action, entity_type, entity_id, 
             old_value, new_value, ip_address, user_agent, success, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            resolved_company_id,
            user.get("id"),
            user.get("role"),
            user.get("username"),
            action,
            entity_type,
            entity_id,
            json.dumps(old_value, ensure_ascii=False) if old_value else None,
            json.dumps(new_value, ensure_ascii=False) if new_value else None,
            ip_address,
            user_agent,
            success,
            error_message
        ))
        
        audit_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        
        # Проверяем, является ли действие критичным
        if is_critical_action(action, entity_type):
            mark_as_critical(audit_id)
        
        return audit_id
        
    except Exception as e:
        log_error(f"Error logging audit: {e}", "audit")
        return None

def is_critical_action(action: str, entity_type: Optional[str]) -> bool:
    """Определить, является ли действие критичным"""
    
    # Критичные действия
    critical_actions = {
        'delete': ['booking', 'client', 'user'],
        'update': ['user'],  # Изменение пользователей
        'create': ['user'],  # Создание пользователей
    }
    
    if action in critical_actions:
        if entity_type in critical_actions[action]:
            return True
    
    return False

def mark_as_critical(audit_id: int):
    """Отметить действие как критичное (требует уведомления)"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO critical_actions (audit_log_id, notified)
            VALUES (%s, FALSE)
        """, (audit_id,))
        
        conn.commit()
        conn.close()
        
        log_info(f"🚨 Critical action logged: audit_id={audit_id}", "audit")
        
    except Exception as e:
        log_error(f"Error marking as critical: {e}", "audit")

def get_audit_history(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100
):
    """
    Получить историю изменений
    
    Args:
        entity_type: Фильтр по типу сущности
        entity_id: Фильтр по ID сущности
        user_id: Фильтр по пользователю
        action: Фильтр по действию
        limit: Максимальное количество записей
    
    Returns:
        List[Dict]: Список записей audit log
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []
        
        if entity_type:
            query += " AND entity_type = %s"
            params.append(entity_type)
        
        if entity_id:
            query += " AND entity_id = %s"
            params.append(entity_id)
        
        if user_id:
            query += " AND user_id = %s"
            params.append(user_id)
        
        if action:
            query += " AND action = %s"
            params.append(action)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        c.execute(query, params)
        
        columns = [desc[0] for desc in c.description]
        results = []
        
        for row in c.fetchall():
            item = dict(zip(columns, row))
            
            # Парсим JSON поля
            if item.get('old_value'):
                try:
                    item['old_value'] = json.loads(item['old_value'])
                except:
                    pass
            elif item.get('old_data'):
                try:
                    item['old_value'] = json.loads(item['old_data'])
                except:
                    item['old_value'] = item.get('old_data')
            
            if item.get('new_value'):
                try:
                    item['new_value'] = json.loads(item['new_value'])
                except:
                    pass
            elif item.get('new_data'):
                try:
                    item['new_value'] = json.loads(item['new_data'])
                except:
                    item['new_value'] = item.get('new_data')
            
            results.append(item)
        
        conn.close()
        return results
        
    except Exception as e:
        log_error(f"Error getting audit history: {e}", "audit")
        return []

def get_pending_critical_actions():
    """Получить критичные действия, требующие уведомления"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT 
                ca.id as critical_id,
                al.*
            FROM critical_actions ca
            JOIN audit_log al ON ca.audit_log_id = al.id
            WHERE ca.notified = FALSE
            ORDER BY ca.created_at DESC
        """)
        
        columns = [desc[0] for desc in c.description]
        results = []
        
        for row in c.fetchall():
            results.append(dict(zip(columns, row)))
        
        conn.close()
        return results
        
    except Exception as e:
        log_error(f"Error getting pending critical actions: {e}", "audit")
        return []

def mark_critical_as_notified(critical_id: int):
    """Отметить критичное действие как уведомленное"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            UPDATE critical_actions
            SET notified = TRUE, notification_sent_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (critical_id,))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        log_error(f"Error marking as notified: {e}", "audit")
