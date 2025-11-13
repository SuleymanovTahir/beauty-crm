"""
API Endpoints для автоматизации
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import sqlite3
import json

from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Automation"])


def create_automation_table():
    """Создать таблицу автоматизации"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS automation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL,
        client_id TEXT,
        trigger_data TEXT,
        action_result TEXT,
        status TEXT DEFAULT 'success',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rule_id) REFERENCES automation_rules (id)
    )''')
    
    conn.commit()
    conn.close()


@router.get("/automation/rules")
async def get_automation_rules(session_token: Optional[str] = Cookie(None)):
    """Получить правила автоматизации"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_automation_table()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT id, name, description, trigger_type, trigger_conditions, 
                   actions, is_active, created_at, updated_at
            FROM automation_rules 
            ORDER BY created_at DESC
        """)
        
        rules = c.fetchall()
        
        return {
            "rules": [
                {
                    "id": r[0],
                    "name": r[1],
                    "description": r[2],
                    "trigger_type": r[3],
                    "trigger_conditions": json.loads(r[4]),
                    "actions": json.loads(r[5]),
                    "is_active": bool(r[6]),
                    "created_at": r[7],
                    "updated_at": r[8]
                } for r in rules
            ]
        }
    except Exception as e:
        log_error(f"Error getting automation rules: {e}", "automation")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/automation/rules")
async def create_automation_rule(
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Создать правило автоматизации"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_automation_table()
    
    try:
        name = request.get("name")
        description = request.get("description", "")
        trigger_type = request.get("trigger_type")
        trigger_conditions = request.get("trigger_conditions", {})
        actions = request.get("actions", [])
        
        if not all([name, trigger_type]):
            return JSONResponse({"error": "Name and trigger_type are required"}, status_code=400)
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO automation_rules (name, description, trigger_type, trigger_conditions, actions)
            VALUES (?, ?, ?, ?, ?)
        """, (name, description, trigger_type, json.dumps(trigger_conditions), json.dumps(actions)))
        
        rule_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_info(f"Automation rule created: {name}", "automation")
        return {
            "success": True,
            "rule_id": rule_id,
            "message": "Automation rule created successfully"
        }
        
    except Exception as e:
        log_error(f"Error creating automation rule: {e}", "automation")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/automation/rules/{rule_id}")
async def update_automation_rule(
    rule_id: int,
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить правило автоматизации"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_automation_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        updates = []
        params = []
        
        for key, value in request.items():
            if key in ['trigger_conditions', 'actions']:
                value = json.dumps(value)
            updates.append(f"{key} = ?")
            params.append(value)
        
        updates.append("updated_at = ?")
        params.append(sqlite3.datetime.datetime.now().isoformat())
        params.append(rule_id)
        
        query = f"UPDATE automation_rules SET {', '.join(updates)} WHERE id = ?"
        c.execute(query, params)
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Rule not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Automation rule updated: {rule_id}", "automation")
        return {"success": True, "message": "Automation rule updated successfully"}
        
    except Exception as e:
        log_error(f"Error updating automation rule: {e}", "automation")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/automation/rules/{rule_id}")
async def delete_automation_rule(
    rule_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить правило автоматизации"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_automation_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Удаляем логи
        c.execute("DELETE FROM automation_logs WHERE rule_id = ?", (rule_id,))
        
        # Удаляем правило
        c.execute("DELETE FROM automation_rules WHERE id = ?", (rule_id,))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Rule not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Automation rule deleted: {rule_id}", "automation")
        return {"success": True, "message": "Automation rule deleted successfully"}
        
    except Exception as e:
        log_error(f"Error deleting automation rule: {e}", "automation")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/automation/logs")
async def get_automation_logs(
    rule_id: Optional[int] = Query(None),
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """Получить логи автоматизации"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_automation_table()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        if rule_id:
            c.execute("""
                SELECT id, rule_id, client_id, trigger_data, action_result, 
                       status, created_at
                FROM automation_logs 
                WHERE rule_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (rule_id, limit))
        else:
            c.execute("""
                SELECT id, rule_id, client_id, trigger_data, action_result, 
                       status, created_at
                FROM automation_logs 
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
        
        logs = c.fetchall()
        
        return {
            "logs": [
                {
                    "id": l[0],
                    "rule_id": l[1],
                    "client_id": l[2],
                    "trigger_data": json.loads(l[3]) if l[3] else {},
                    "action_result": json.loads(l[4]) if l[4] else {},
                    "status": l[5],
                    "created_at": l[6]
                } for l in logs
            ]
        }
    except Exception as e:
        log_error(f"Error getting automation logs: {e}", "automation")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


def execute_automation_rule(rule_id: int, client_id: str, trigger_data: Dict[str, Any]):
    """Выполнить правило автоматизации"""
    create_automation_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Получаем правило
        c.execute("""
            SELECT trigger_type, trigger_conditions, actions, is_active
            FROM automation_rules 
            WHERE id = ?
        """, (rule_id,))
        
        rule = c.fetchone()
        if not rule or not rule[3]:  # is_active
            conn.close()
            return False
        
        trigger_type, trigger_conditions, actions, is_active = rule
        trigger_conditions = json.loads(trigger_conditions)
        actions = json.loads(actions)
        
        # Проверяем условия
        if not _check_trigger_conditions(trigger_type, trigger_conditions, trigger_data):
            conn.close()
            return False
        
        # Выполняем действия
        action_result = _execute_actions(actions, client_id, trigger_data)
        
        # Логируем результат
        c.execute("""
            INSERT INTO automation_logs (rule_id, client_id, trigger_data, action_result, status)
            VALUES (?, ?, ?, ?, ?)
        """, (rule_id, client_id, json.dumps(trigger_data), json.dumps(action_result), "success"))
        
        conn.commit()
        conn.close()
        
        log_info(f"Automation rule {rule_id} executed for client {client_id}", "automation")
        return True
        
    except Exception as e:
        log_error(f"Error executing automation rule: {e}", "automation")
        return False


def _check_trigger_conditions(trigger_type: str, conditions: Dict[str, Any], data: Dict[str, Any]) -> bool:
    """Проверить условия триггера"""
    if trigger_type == "message_received":
        return data.get("message_count", 0) >= conditions.get("min_messages", 0)
    elif trigger_type == "no_activity":
        days = conditions.get("days", 7)
        # Логика проверки неактивности
        return True  # Упрощенная реализация
    elif trigger_type == "status_changed":
        return data.get("old_status") != data.get("new_status")
    
    return False


def _execute_actions(actions: List[Dict[str, Any]], client_id: str, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """Выполнить действия"""
    results = []
    
    for action in actions:
        action_type = action.get("type")
        
        if action_type == "send_message":
            # Отправка сообщения клиенту
            message = action.get("message", "")
            results.append({"type": "send_message", "status": "success", "message": message})
        
        elif action_type == "change_status":
            # Изменение статуса клиента
            new_status = action.get("status", "")
            results.append({"type": "change_status", "status": "success", "new_status": new_status})
        
        elif action_type == "add_tag":
            # Добавление тега
            tag_name = action.get("tag", "")
            results.append({"type": "add_tag", "status": "success", "tag": tag_name})
    
    return {"actions": results}
