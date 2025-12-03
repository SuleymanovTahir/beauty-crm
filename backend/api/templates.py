"""
API для шаблонов сообщений
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Templates"])


def replace_placeholders(content: str, client_id: str) -> str:
    """Заменить плейсхолдеры на реальные данные"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Получить последнюю активную запись клиента
        c.execute("""
            SELECT date, time, service_name 
            FROM bookings 
            WHERE instagram_id = ? AND status IN ('pending', 'confirmed')
            ORDER BY date DESC, time DESC 
            LIMIT 1
        """, (client_id,))
        
        booking = c.fetchone()
        conn.close()
        
        if booking:
            date_str = booking[0]
            time_str = booking[1]
            
            # Форматировать дату в читаемый вид
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d.%m.%Y')
            except:
                formatted_date = date_str
            
            content = content.replace('{{date}}', formatted_date)
            content = content.replace('{{time}}', time_str)
            content = content.replace('{{service}}', booking[2] or '')
        
        return content
    except Exception as e:
        log_error(f"Error replacing placeholders: {e}", "templates")
        return content


@router.get("/chat/templates")
async def get_message_templates(
    session_token: Optional[str] = Cookie(None)
):
    """Получить все шаблоны сообщений"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT id, name, content, category
            FROM message_templates
            WHERE user_id IS NULL OR user_id = ?
            ORDER BY category, name
            """, (user["id"],))

        templates = [
            {
                "id": str(row[0]),
                "title": row[1],
                "content": row[2],
                "category": row[3]
            }
            for row in c.fetchall()
        ]

        conn.close()
        return {"templates": templates}

    except Exception as e:
        log_error(f"Error getting templates: {e}", "templates")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/chat/templates")
async def create_template(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новый шаблон"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        name = data.get('name')
        content = data.get('content')
        category = data.get('category', 'general')
        
        if not name or not content:
            return JSONResponse({"error": "Missing data"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO message_templates (name, content, category, user_id)
            VALUES (?, ?, ?, ?)
        """, (name, content, category, user["id"]))
        
        conn.commit()
        template_id = c.lastrowid
        conn.close()
        
        log_info(f"Created template: {name} (ID: {template_id})", "templates")
        return {"success": True, "template_id": template_id}
        
    except Exception as e:
        log_error(f"Error creating template: {e}", "templates")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/chat/templates/{template_id}")
async def update_template(
    template_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить шаблон"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        name = data.get('name')
        content = data.get('content')
        category = data.get('category')
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что шаблон принадлежит пользователю
        c.execute("""
            SELECT user_id FROM message_templates WHERE id = ?
        """, (template_id,))
        
        result = c.fetchone()
        if not result or (result[0] is not None and result[0] != user["id"]):
            conn.close()
            return JSONResponse({"error": "Access denied"}, status_code=403)
        
        # Обновляем
        updates = []
        params = []
        
        if name:
            updates.append("name = ?")
            params.append(name)
        if content:
            updates.append("content = ?")
            params.append(content)
        if category:
            updates.append("category = ?")
            params.append(category)
        
        if updates:
            params.append(template_id)
            c.execute(f"""
                UPDATE message_templates 
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            
            conn.commit()
        
        conn.close()
        log_info(f"Updated template {template_id}", "templates")
        return {"success": True}
        
    except Exception as e:
        log_error(f"Error updating template: {e}", "templates")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/chat/templates/{template_id}")
async def delete_template(
    template_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить шаблон"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что шаблон принадлежит пользователю
        c.execute("""
            SELECT user_id FROM message_templates WHERE id = ?
        """, (template_id,))
        
        result = c.fetchone()
        if not result or (result[0] is not None and result[0] != user["id"]):
            conn.close()
            return JSONResponse({"error": "Access denied"}, status_code=403)
        
        c.execute("DELETE FROM message_templates WHERE id = ?", (template_id,))
        conn.commit()
        conn.close()
        
        log_info(f"Deleted template {template_id}", "templates")
        return {"success": True}
        
    except Exception as e:
        log_error(f"Error deleting template: {e}", "templates")
        return JSONResponse({"error": str(e)}, status_code=500)