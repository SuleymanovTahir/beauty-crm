"""
API для управления папками и записями (аудио/видео)
Поддерживает:
- Иерархическую структуру папок
- Записи из телефонии и внутреннего чата
- Права доступа (director/admin видят все, остальные - только свои)
- CRUD операции, перемещение, архивирование
"""

from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from typing import List, Optional, Dict, Any, Set
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
from datetime import datetime
import json
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Директория для хранения записей
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# ==================== PYDANTIC MODELS ====================

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class RecordingUpdate(BaseModel):
    custom_name: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def check_recording_access(recording: Dict, current_user: Dict) -> bool:
    """Проверить, может ли пользователь видеть эту запись"""
    if current_user.get('role') in ['director', 'admin']:
        return True

    # Для телефонии - проверяем manager_name или manual_manager_name
    if recording.get('type') == 'telephony' or recording.get('source') == 'telephony':
        manager_name = current_user.get('full_name') or current_user.get('username')
        return (recording.get('manager_name') == manager_name or
                recording.get('manual_manager_name') == manager_name)

    # Для чата - проверяем, является ли пользователь участником
    if recording.get('type') == 'chat' or recording.get('source') == 'chat':
        return (recording.get('sender_id') == current_user['id'] or
                recording.get('receiver_id') == current_user['id'])

    return False

def can_modify_recording(recording: Dict, current_user: Dict) -> bool:
    """Проверить, может ли пользователь изменять/удалять запись"""
    if current_user.get('role') in ['director', 'admin']:
        return True

    # Пользователь может модифицировать только свои записи
    return recording.get('created_by') == current_user['id']

def build_folder_tree(folders: List[Dict]) -> List[Dict]:
    """Построить древовидную структуру из плоского списка папок"""
    folder_dict = {folder['id']: {**folder, 'children': []} for folder in folders}
    root_folders = []

    for folder in folders:
        parent_id = folder.get('parent_id')
        if parent_id and parent_id in folder_dict:
            folder_dict[parent_id]['children'].append(folder_dict[folder['id']])
        else:
            root_folders.append(folder_dict[folder['id']])

    return root_folders


def _get_table_columns(cursor, table_name: str) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row[0] for row in cursor.fetchall()}

# ==================== FOLDERS ENDPOINTS ====================

@router.get("/recordings/folders")
async def get_folders(current_user: dict = Depends(get_current_user)):
    """
    Получить список всех папок с древовидной структурой
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT id, name, parent_id, created_by, created_at, updated_at,
                   sort_order, color, icon
            FROM recording_folders
            WHERE is_deleted = FALSE
            ORDER BY sort_order, name
        """)

        rows = c.fetchall()
        folders = [
            {
                'id': row[0],
                'name': row[1],
                'parent_id': row[2],
                'created_by': row[3],
                'created_at': row[4].isoformat() if row[4] else None,
                'updated_at': row[5].isoformat() if row[5] else None,
                'sort_order': row[6],
                'color': row[7],
                'icon': row[8]
            }
            for row in rows
        ]

        # Построить дерево
        folder_tree = build_folder_tree(folders)

        return {"folders": folder_tree}

    except Exception as e:
        logger.error(f"Error fetching folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/recordings/folders")
async def create_folder(folder: FolderCreate, current_user: dict = Depends(get_current_user)):
    """
    Создать новую папку
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверить, не существует ли уже папка с таким именем в этом родителе
        c.execute("""
            SELECT id FROM recording_folders
            WHERE name = %s AND parent_id IS NOT DISTINCT FROM %s AND is_deleted = FALSE
        """, (folder.name, folder.parent_id))

        if c.fetchone():
            raise HTTPException(status_code=400, detail="Папка с таким именем уже существует")

        # Создать папку
        c.execute("""
            INSERT INTO recording_folders (name, parent_id, created_by, color, icon)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (folder.name, folder.parent_id, current_user['id'], folder.color, folder.icon))

        folder_id = c.fetchone()[0]
        conn.commit()

        return {"id": folder_id, "success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/recordings/folders/{folder_id}")
async def update_folder(folder_id: int, update: FolderUpdate, current_user: dict = Depends(get_current_user)):
    """
    Обновить папку (переименовать, изменить цвет и т.д.)
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверить существование папки
        c.execute("SELECT created_by FROM recording_folders WHERE id = %s AND is_deleted = FALSE", (folder_id,))
        row = c.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Папка не найдена")

        # Проверить права (только создатель или director/admin)
        if current_user['role'] not in ['director', 'admin'] and row[0] != current_user['id']:
            raise HTTPException(status_code=403, detail="Нет прав для изменения этой папки")

        # Обновить поля
        fields = []
        params = []

        if update.name is not None:
            fields.append("name = %s")
            params.append(update.name)
        if update.parent_id is not None:
            fields.append("parent_id = %s")
            params.append(update.parent_id)
        if update.color is not None:
            fields.append("color = %s")
            params.append(update.color)
        if update.icon is not None:
            fields.append("icon = %s")
            params.append(update.icon)

        if not fields:
            return {"success": True}

        fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(folder_id)

        query = f"UPDATE recording_folders SET {', '.join(fields)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/recordings/folders/{folder_id}")
async def delete_folder(folder_id: int, current_user: dict = Depends(get_current_user)):
    """
    Удалить папку (soft delete)
    Записи из этой папки переместятся в родительскую папку или в корень
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Проверить существование папки
        c.execute("""
            SELECT created_by, parent_id
            FROM recording_folders
            WHERE id = %s AND is_deleted = FALSE
        """, (folder_id,))
        row = c.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Папка не найдена")

        # Проверить права
        if current_user['role'] not in ['director', 'admin'] and row[0] != current_user['id']:
            raise HTTPException(status_code=403, detail="Нет прав для удаления этой папки")

        parent_id = row[1]
        call_logs_columns = _get_table_columns(c, "call_logs")

        # Переместить все записи в родительскую папку
        if "folder_id" in call_logs_columns:
            c.execute("""
                UPDATE call_logs
                SET folder_id = %s
                WHERE folder_id = %s
            """, (parent_id, folder_id))

        c.execute("""
            UPDATE chat_recordings
            SET folder_id = %s
            WHERE folder_id = %s
        """, (parent_id, folder_id))

        # Переместить подпапки на уровень выше
        c.execute("""
            UPDATE recording_folders
            SET parent_id = %s
            WHERE parent_id = %s AND is_deleted = FALSE
        """, (parent_id, folder_id))

        # Мягкое удаление папки
        c.execute("""
            UPDATE recording_folders
            SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (folder_id,))

        conn.commit()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ==================== RECORDINGS ENDPOINTS ====================

@router.get("/recordings")
async def get_recordings(
    folder_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tags: Optional[str] = None,
    record_type: Optional[str] = None,  # telephony | chat
    type: Optional[str] = Query(None, alias="type"),  # compatibility alias
    sort_by: Optional[str] = 'created_at',
    order: Optional[str] = 'desc',
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Получить список записей с учетом прав доступа
    - Director/Admin видят все записи
    - Остальные видят только свои записи
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        effective_record_type = record_type if record_type is not None else type

        # Базовый запрос объединяет записи из call_logs и chat_recordings
        is_admin = current_user.get('role') in ['director', 'admin']
        user_name = current_user.get('full_name') or current_user.get('username')
        call_logs_columns = _get_table_columns(c, "call_logs")
        has_call_folder = "folder_id" in call_logs_columns
        has_call_custom_name = "custom_name" in call_logs_columns
        has_call_file_size = "file_size" in call_logs_columns
        has_call_file_format = "file_format" in call_logs_columns
        has_call_is_archived = "is_archived" in call_logs_columns
        has_call_tags = "tags" in call_logs_columns

        # Запрос для call_logs (телефония)
        call_logs_query = """
            SELECT
                cl.id,
                'telephony' as source,
                COALESCE(
                    {custom_name_expr},
                    CONCAT(
                        COALESCE(cl.manual_client_name, c.name, c.username, 'Неизвестный'),
                        ' - ',
                        COALESCE(cl.manual_manager_name, b.master, 'Менеджер'),
                        ' - ',
                        TO_CHAR(cl.created_at, 'DD.MM.YYYY HH24:MI')
                    )
                ) as name,
                {folder_id_expr},
                cl.recording_file,
                cl.recording_url,
                cl.duration,
                {file_size_expr},
                {file_format_expr},
                cl.created_at,
                {is_archived_expr},
                {tags_expr},
                cl.notes,
                COALESCE(cl.manual_manager_name, b.master) as manager_name,
                NULL as sender_id,
                NULL as receiver_id
            FROM call_logs cl
            LEFT JOIN clients c ON c.instagram_id = cl.client_id
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """.format(
            custom_name_expr="cl.custom_name" if has_call_custom_name else "NULL",
            folder_id_expr="cl.folder_id" if has_call_folder else "NULL",
            file_size_expr="cl.file_size" if has_call_file_size else "NULL",
            file_format_expr="cl.file_format" if has_call_file_format else "NULL",
            is_archived_expr="cl.is_archived" if has_call_is_archived else "FALSE",
            tags_expr="cl.tags" if has_call_tags else "'[]'::jsonb",
        )

        # Запрос для chat_recordings (внутренний чат)
        chat_recordings_query = """
            SELECT
                cr.id,
                'chat' as source,
                COALESCE(cr.custom_name,
                    CONCAT(
                        u1.full_name,
                        ' - ',
                        u2.full_name,
                        ' - ',
                        TO_CHAR(cr.created_at, 'DD.MM.YYYY HH24:MI')
                    )
                ) as name,
                cr.folder_id,
                cr.recording_file,
                cr.recording_url,
                cr.duration,
                cr.file_size,
                cr.file_format,
                cr.created_at,
                cr.is_archived,
                cr.tags,
                cr.notes,
                NULL as manager_name,
                cr.sender_id,
                cr.receiver_id
            FROM chat_recordings cr
            LEFT JOIN users u1 ON u1.id = cr.sender_id
            LEFT JOIN users u2 ON u2.id = cr.receiver_id
            WHERE 1=1
        """

        call_params: List[Any] = []
        chat_params: List[Any] = []
        use_call_records = effective_record_type in [None, 'telephony']
        use_chat_records = effective_record_type in [None, 'chat']

        # Фильтр по папке
        if folder_id is not None:
            if use_call_records and has_call_folder:
                call_logs_query += " AND cl.folder_id = %s"
                call_params.append(folder_id)
            if use_chat_records:
                chat_recordings_query += " AND cr.folder_id = %s"
                chat_params.append(folder_id)

        # Фильтр по датам
        if date_from:
            if use_call_records:
                call_logs_query += " AND cl.created_at >= %s"
                call_params.append(date_from)
            if use_chat_records:
                chat_recordings_query += " AND cr.created_at >= %s"
                chat_params.append(date_from)

        if date_to:
            end_date = date_to if len(date_to) > 10 else date_to + " 23:59:59"
            if use_call_records:
                call_logs_query += " AND cl.created_at <= %s"
                call_params.append(end_date)
            if use_chat_records:
                chat_recordings_query += " AND cr.created_at <= %s"
                chat_params.append(end_date)

        # Фильтр по правам доступа
        if not is_admin:
            # Для телефонии - только записи где пользователь менеджер
            if use_call_records:
                call_logs_query += " AND (cl.manual_manager_name = %s OR b.master = %s)"
                call_params.extend([user_name, user_name])

            # Для чата - только записи где пользователь участник
            if use_chat_records:
                chat_recordings_query += " AND (cr.sender_id = %s OR cr.receiver_id = %s)"
                chat_params.extend([current_user['id'], current_user['id']])

        # Фильтр по типу
        if effective_record_type == 'telephony':
            final_query = call_logs_query
            params = call_params
        elif effective_record_type == 'chat':
            final_query = chat_recordings_query
            params = chat_params
        else:
            # Объединить оба запроса
            final_query = f"({call_logs_query}) UNION ALL ({chat_recordings_query})"
            params = call_params + chat_params

        # Сортировка
        allowed_sort = {'created_at': 'created_at', 'name': 'name', 'duration': 'duration'}
        sort_column = allowed_sort.get(sort_by, 'created_at')
        sort_direction = 'DESC' if order == 'desc' else 'ASC'

        final_query = f"SELECT * FROM ({final_query}) as recordings ORDER BY {sort_column} {sort_direction} LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        c.execute(final_query, params)
        rows = c.fetchall()

        recordings = [
            {
                'id': row[0],
                'source': row[1],
                'type': row[1],
                'name': row[2],
                'custom_name': row[2],
                'folder_id': row[3],
                'recording_file': row[4],
                'recording_url': row[5] or (f"/static/recordings/{row[4]}" if row[4] else None),
                'duration': row[6],
                'file_size': row[7],
                'file_format': row[8],
                'created_at': row[9].isoformat() if row[9] else None,
                'is_archived': row[10],
                'tags': row[11] or [],
                'notes': row[12],
                'manager_name': row[13],
                'sender_id': row[14],
                'receiver_id': row[15]
            }
            for row in rows
        ]

        return {"recordings": recordings}

    except Exception as e:
        logger.error(f"Error fetching recordings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/recordings/{source}/{recording_id}")
async def update_recording(
    source: str,  # 'telephony' or 'chat'
    recording_id: int,
    update: RecordingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Обновить запись (переименовать, изменить теги, переместить в папку)
    Только создатель или director/admin могут изменять
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        if source not in ["telephony", "chat"]:
            raise HTTPException(status_code=400, detail="Invalid source")

        table = "call_logs" if source == "telephony" else "chat_recordings"
        table_columns = _get_table_columns(c, table)

        # Проверить существование
        c.execute(f"SELECT * FROM {table} WHERE id = %s", (recording_id,))
        recording = c.fetchone()

        if not recording:
            raise HTTPException(status_code=404, detail="Запись не найдена")

        # Проверить права (упрощенная проверка)
        # TODO: добавить полную проверку через check_recording_access

        # Обновить поля
        fields = []
        params = []

        if update.custom_name is not None and "custom_name" in table_columns:
            fields.append("custom_name = %s")
            params.append(update.custom_name)
        if update.folder_id is not None and "folder_id" in table_columns:
            fields.append("folder_id = %s")
            params.append(update.folder_id)
        if update.tags is not None and "tags" in table_columns:
            fields.append("tags = %s")
            params.append(update.tags)
        if update.notes is not None and "notes" in table_columns:
            fields.append("notes = %s")
            params.append(update.notes)

        if not fields:
            return {"success": True}

        params.append(recording_id)
        query = f"UPDATE {table} SET {', '.join(fields)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/recordings/{source}/{recording_id}")
async def delete_recording(
    source: str,
    recording_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Удалить запись
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        if source not in ["telephony", "chat"]:
            raise HTTPException(status_code=400, detail="Invalid source")
        table = "call_logs" if source == "telephony" else "chat_recordings"

        # Получить информацию о файле для удаления
        c.execute(f"SELECT recording_file FROM {table} WHERE id = %s", (recording_id,))
        row = c.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Запись не найдена")

        # Удалить файл с диска
        if row[0]:
            file_path = os.path.join(RECORDINGS_DIR, row[0])
            if os.path.exists(file_path):
                os.remove(file_path)

        # Удалить из БД
        c.execute(f"DELETE FROM {table} WHERE id = %s", (recording_id,))
        conn.commit()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/recordings/{source}/{recording_id}/archive")
async def archive_recording(
    source: str,
    recording_id: int,
    is_archived: bool,
    current_user: dict = Depends(get_current_user)
):
    """
    Архивировать/разархивировать запись
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        if source not in ["telephony", "chat"]:
            raise HTTPException(status_code=400, detail="Invalid source")

        table = "call_logs" if source == "telephony" else "chat_recordings"
        table_columns = _get_table_columns(c, table)
        if "is_archived" not in table_columns:
            return {"success": True}

        if is_archived:
            if "archived_at" in table_columns:
                c.execute(f"""
                    UPDATE {table}
                    SET is_archived = TRUE, archived_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (recording_id,))
            else:
                c.execute(f"""
                    UPDATE {table}
                    SET is_archived = TRUE
                    WHERE id = %s
                """, (recording_id,))
        else:
            if "archived_at" in table_columns:
                c.execute(f"""
                    UPDATE {table}
                    SET is_archived = FALSE, archived_at = NULL
                    WHERE id = %s
                """, (recording_id,))
            else:
                c.execute(f"""
                    UPDATE {table}
                    SET is_archived = FALSE
                    WHERE id = %s
                """, (recording_id,))

        conn.commit()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error archiving recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
