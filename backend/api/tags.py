"""
API Endpoints для тегов клиентов
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
import sqlite3

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Tags"])


def create_tags_table():
    """Создать таблицу тегов"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS client_tags (
        client_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (client_id, tag_id),
        FOREIGN KEY (client_id) REFERENCES clients (instagram_id),
        FOREIGN KEY (tag_id) REFERENCES tags (id)
    )''')
    
    conn.commit()
    conn.close()


@router.get("/tags")
async def get_tags(session_token: Optional[str] = Cookie(None)):
    """Получить все теги"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_tags_table()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT id, name, color, description FROM tags ORDER BY name")
        tags = c.fetchall()
        
        return {
            "tags": [
                {
                    "id": t[0],
                    "name": t[1],
                    "color": t[2],
                    "description": t[3]
                } for t in tags
            ]
        }
    except Exception as e:
        log_error(f"Error getting tags: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/tags")
async def create_tag(
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новый тег"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_tags_table()
    
    try:
        name = request.get("name")
        color = request.get("color", "#3B82F6")
        description = request.get("description", "")
        
        if not name:
            return JSONResponse({"error": "Tag name is required"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO tags (name, color, description)
            VALUES (?, ?, ?)
        """, (name, color, description))
        
        tag_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_info(f"Tag created: {name}", "tags")
        return {
            "success": True,
            "tag_id": tag_id,
            "message": "Tag created successfully"
        }
        
    except sqlite3.IntegrityError:
        return JSONResponse({"error": "Tag with this name already exists"}, status_code=400)
    except Exception as e:
        log_error(f"Error creating tag: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить тег"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_tags_table()
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Удаляем связи с клиентами
        c.execute("DELETE FROM client_tags WHERE tag_id = ?", (tag_id,))
        
        # Удаляем тег
        c.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Tag not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Tag deleted: {tag_id}", "tags")
        return {"success": True, "message": "Tag deleted successfully"}
        
    except Exception as e:
        log_error(f"Error deleting tag: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/clients/{client_id}/tags")
async def add_client_tag(
    client_id: str,
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Добавить тег клиенту"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_tags_table()
    
    try:
        tag_id = request.get("tag_id")
        
        if not tag_id:
            return JSONResponse({"error": "Tag ID is required"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO client_tags (client_id, tag_id)
            VALUES (?, ?)
        """, (client_id, tag_id))
        
        conn.commit()
        conn.close()
        
        log_info(f"Tag {tag_id} added to client {client_id}", "tags")
        return {"success": True, "message": "Tag added to client"}
        
    except sqlite3.IntegrityError:
        return JSONResponse({"error": "Client already has this tag"}, status_code=400)
    except Exception as e:
        log_error(f"Error adding tag to client: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/clients/{client_id}/tags/{tag_id}")
async def remove_client_tag(
    client_id: str,
    tag_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить тег у клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    create_tags_table()
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            DELETE FROM client_tags 
            WHERE client_id = ? AND tag_id = ?
        """, (client_id, tag_id))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Client doesn't have this tag"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Tag {tag_id} removed from client {client_id}", "tags")
        return {"success": True, "message": "Tag removed from client"}
        
    except Exception as e:
        log_error(f"Error removing tag from client: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/clients/{client_id}/tags")
async def get_client_tags(
    client_id: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить теги клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_tags_table()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT t.id, t.name, t.color, t.description
            FROM tags t
            JOIN client_tags ct ON t.id = ct.tag_id
            WHERE ct.client_id = ?
            ORDER BY t.name
        """, (client_id,))
        
        tags = c.fetchall()
        
        return {
            "tags": [
                {
                    "id": t[0],
                    "name": t[1],
                    "color": t[2],
                    "description": t[3]
                } for t in tags
            ]
        }
    except Exception as e:
        log_error(f"Error getting client tags: {e}", "tags")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()
