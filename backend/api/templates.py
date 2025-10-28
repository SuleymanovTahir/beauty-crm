"""
API для шаблонов сообщений
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3

from config import DATABASE_NAME
from utils import require_auth
from logger import log_info, log_error

router = APIRouter(tags=["Templates"])


@router.get("/chat/templates")
async def get_message_templates(
    session_token: Optional[str] = Cookie(None)
):
    """Получить все шаблоны сообщений"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Получаем общие шаблоны и шаблоны пользователя
        c.execute("""
            SELECT id, name, content, category 
            FROM message_templates 
            WHERE user_id IS NULL OR user_id = ?
            ORDER BY category, name
        """, (user["id"],))
        
        templates = [
            {
                "id": row[0],
                "name": row[1],
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
        
        conn = sqlite3.connect(DATABASE_NAME)
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
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Проверяем что шаблон принадлежит пользователю
        c.execute("""
            SELECT user_id FROM message_templates WHERE id = ?
        """, (template_id,))
        
        result = c.fetchone()
        if not result or result[0] != user["id"]:
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
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Проверяем что шаблон принадлежит пользователю
        c.execute("""
            SELECT user_id FROM message_templates WHERE id = ?
        """, (template_id,))
        
        result = c.fetchone()
        if not result or result[0] != user["id"]:
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