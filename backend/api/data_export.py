"""
API для экспорта/импорта данных с проверкой прав
Админ - полный доступ
Таргетолог/Sales - импорт без контактов (если разрешено)
"""
from fastapi import APIRouter, Request, Cookie, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional

import csv
import io
import json
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.permissions import can_export_data, can_import_data, can_access_resource, filter_data_by_permissions
from utils.logger import log_info, log_error

router = APIRouter(tags=["Data Export/Import"])

# ===== ЭКСПОРТ =====

@router.get("/api/export/clients")
async def export_clients(session_token: Optional[str] = Cookie(None)):
    """Экспорт клиентов в CSV (с проверкой прав)"""
    user = require_auth(session_token)
    if not user or not can_export_data(user["id"]):
        return JSONResponse({"error": "Forbidden: No export permission"}, status_code=403)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем клиентов
        c.execute("""
            SELECT instagram_id, name, phone, email, telegram_username, status, created_at
            FROM clients
            WHERE is_active = TRUE
            ORDER BY created_at DESC
        """)

        clients = []
        for row in c.fetchall():
            clients.append({
                "instagram_id": row[0],
                "name": row[1],
                "phone": row[2],
                "email": row[3],
                "telegram": row[4],
                "status": row[5],
                "created_at": row[6]
            })

        conn.close()

        # Проверяем права на просмотр контактов
        hide_contacts = not can_access_resource(user["id"], 'view_contacts', 'view')
        clients = filter_data_by_permissions(clients, user["id"], hide_contacts)

        # Создаем CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=clients[0].keys() if clients else [])
        writer.writeheader()
        writer.writerows(clients)

        # Возвращаем как файл
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=clients_export.csv"
            }
        )

        log_info(f"User {user['id']} exported {len(clients)} clients", "export")
        return response

    except Exception as e:
        log_error(f"Error exporting clients: {e}", "export")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== ИМПОРТ =====

@router.post("/api/import/clients")
async def import_clients(
    file: UploadFile = File(...),
    session_token: Optional[str] = Cookie(None)
):
    """Импорт клиентов из CSV (с проверкой прав)"""
    user = require_auth(session_token)
    if not user or not can_import_data(user["id"]):
        return JSONResponse({"error": "Forbidden: No import permission"}, status_code=403)

    try:
        # Читаем CSV
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))

        conn = get_db_connection()
        c = conn.cursor()

        imported_count = 0
        skipped_count = 0

        # Проверяем права на импорт с контактами
        can_import_contacts = can_access_resource(user["id"], 'view_contacts', 'view')

        for row in reader:
            instagram_id = row.get('instagram_id')
            name = row.get('name')

            if not instagram_id or not name:
                skipped_count += 1
                continue

            # Проверяем, существует ли клиент
            c.execute("SELECT id FROM clients WHERE instagram_id = %s", (instagram_id,))
            existing = c.fetchone()

            if existing:
                skipped_count += 1
                continue

            # Импортируем клиента
            phone = row.get('phone') if can_import_contacts else None
            email = row.get('email') if can_import_contacts else None
            telegram = row.get('telegram') if can_import_contacts else None

            c.execute("""
                INSERT INTO clients (instagram_id, name, phone, email, telegram_username, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (instagram_id, name, phone, email, telegram, row.get('status', 'cold')))

            imported_count += 1

        conn.commit()
        conn.close()

        log_info(f"User {user['id']} imported {imported_count} clients (skipped: {skipped_count})", "import")

        return {
            "success": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "message": f"Импортировано: {imported_count}, Пропущено: {skipped_count}"
        }

    except Exception as e:
        log_error(f"Error importing clients: {e}", "import")
        return JSONResponse({"error": str(e)}, status_code=500)
