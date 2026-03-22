"""
API: Склад / Инвентаризация
Учет расходных материалов и товаров
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Inventory"])


class InventoryItemModel(BaseModel):
    name: str
    sku: Optional[str] = None
    category: str = "general"
    unit: str = "шт"
    quantity: float = 0
    min_quantity: float = 0
    cost_price: float = 0
    sale_price: float = 0
    supplier: Optional[str] = None
    notes: Optional[str] = None


class TransactionModel(BaseModel):
    item_id: int
    type: str  # income | expense | adjustment | write_off
    quantity: float
    price: float = 0
    reason: Optional[str] = None
    booking_id: Optional[int] = None


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.get("/inventory")
async def list_inventory(
    category: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = "SELECT * FROM inventory_items WHERE company_id=%s AND is_active=TRUE"
        params = [company_id]
        if category:
            sql += " AND category=%s"; params.append(category)
        if low_stock:
            sql += " AND quantity <= min_quantity"
        sql += " ORDER BY name"
        c.execute(sql, params)
        items = [_s(r) for r in _rows(c)]

        # Категории
        c.execute("SELECT DISTINCT category FROM inventory_items WHERE company_id=%s AND is_active=TRUE", (company_id,))
        categories = [r[0] for r in c.fetchall()]

        return JSONResponse({"items": items, "categories": categories, "total": len(items)})
    finally:
        conn.close()


@router.post("/inventory")
async def create_item(
    body: InventoryItemModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO inventory_items (company_id,name,sku,category,unit,quantity,
              min_quantity,cost_price,sale_price,supplier,notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.name, body.sku, body.category, body.unit, body.quantity,
              body.min_quantity, body.cost_price, body.sale_price, body.supplier, body.notes))
        item_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": item_id})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/inventory/{item_id}")
async def update_item(
    item_id: int,
    body: InventoryItemModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE inventory_items SET name=%s,sku=%s,category=%s,unit=%s,
              min_quantity=%s,cost_price=%s,sale_price=%s,supplier=%s,notes=%s
            WHERE id=%s AND company_id=%s
        """, (body.name, body.sku, body.category, body.unit,
              body.min_quantity, body.cost_price, body.sale_price, body.supplier, body.notes,
              item_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.delete("/inventory/{item_id}")
async def delete_item(
    item_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE inventory_items SET is_active=FALSE WHERE id=%s AND company_id=%s",
                  (item_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.post("/inventory/transaction")
async def add_transaction(
    body: TransactionModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Записываем транзакцию
        c.execute("""
            INSERT INTO inventory_transactions (company_id,item_id,type,quantity,price,reason,booking_id,user_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (company_id, body.item_id, body.type, body.quantity, body.price,
              body.reason, body.booking_id, user.get("id")))

        # Обновляем остаток
        delta = body.quantity if body.type in ("income",) else -body.quantity
        c.execute("UPDATE inventory_items SET quantity = quantity + %s WHERE id=%s AND company_id=%s",
                  (delta, body.item_id, company_id))
        conn.commit()
        return JSONResponse({"success": True})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.get("/inventory/{item_id}/history")
async def item_history(
    item_id: int,
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT t.*, u.full_name AS user_name
            FROM inventory_transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE t.item_id=%s AND t.company_id=%s
            ORDER BY t.created_at DESC LIMIT %s
        """, (item_id, company_id, limit))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"history": rows})
    finally:
        conn.close()


@router.get("/inventory/report/summary")
async def inventory_summary(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT
                COUNT(*) AS total_items,
                COUNT(CASE WHEN quantity <= min_quantity AND min_quantity > 0 THEN 1 END) AS low_stock,
                COALESCE(SUM(quantity * cost_price), 0) AS total_cost_value,
                COALESCE(SUM(quantity * sale_price), 0) AS total_sale_value
            FROM inventory_items WHERE company_id=%s AND is_active=TRUE
        """, (company_id,))
        row = c.fetchone()
        cols = [d[0] for d in c.description]
        return JSONResponse(dict(zip(cols, row)))
    finally:
        conn.close()
