"""
API: Касса / Финансовые операции
Доходы, расходы, кассовые операции
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
import csv, io

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Cashbox"])

INCOME_CATEGORIES = ["booking_payment", "gift_card_sale", "bundle_sale", "promo_sale", "other_income"]
EXPENSE_CATEGORIES = ["rent", "salary", "supplies", "marketing", "utilities", "equipment", "taxes", "other_expense"]


class OperationModel(BaseModel):
    type: str  # income | expense
    category: str
    amount: float
    description: Optional[str] = None
    payment_method: str = "cash"
    booking_id: Optional[int] = None
    employee_id: Optional[int] = None
    document_number: Optional[str] = None
    operation_date: Optional[str] = None


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


@router.get("/cashbox")
async def list_operations(
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    limit: int = Query(200),
    offset: int = Query(0),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "accountant", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = """
            SELECT o.*, u.full_name AS employee_name
            FROM cashbox_operations o
            LEFT JOIN users u ON u.id = o.employee_id
            WHERE o.company_id=%s
        """
        params = [company_id]
        if type:
            sql += " AND o.type=%s"; params.append(type)
        if category:
            sql += " AND o.category=%s"; params.append(category)
        if date_from:
            sql += " AND o.operation_date >= %s"; params.append(date_from)
        if date_to:
            sql += " AND o.operation_date <= %s"; params.append(date_to)
        if payment_method:
            sql += " AND o.payment_method=%s"; params.append(payment_method)

        sql += " ORDER BY o.operation_date DESC, o.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        c.execute(sql, params)
        rows = [_s(r) for r in _rows(c)]

        # Итоги
        c.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense
            FROM cashbox_operations WHERE company_id=%s
            {date_filter}
        """.format(date_filter=("AND operation_date >= %s AND operation_date <= %s" if date_from and date_to else "")),
            [company_id] + ([date_from, date_to] if date_from and date_to else []))
        totals_row = c.fetchone()
        totals = {
            "income": float(totals_row[0] or 0),
            "expense": float(totals_row[1] or 0),
            "profit": float((totals_row[0] or 0) - (totals_row[1] or 0)),
        }

        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Дата", "Тип", "Категория", "Сумма", "Способ оплаты", "Описание", "Сотрудник", "Документ"])
            for r in rows:
                writer.writerow([r.get("operation_date"), r.get("type"), r.get("category"),
                                  r.get("amount"), r.get("payment_method"), r.get("description"),
                                  r.get("employee_name"), r.get("document_number")])
            writer.writerow([])
            writer.writerow(["ИТОГО ДОХОДЫ", totals["income"]])
            writer.writerow(["ИТОГО РАСХОДЫ", totals["expense"]])
            writer.writerow(["ПРИБЫЛЬ", totals["profit"]])
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]), media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=cashbox.csv"}
            )

        return JSONResponse({"operations": rows, "totals": totals, "count": len(rows)})
    finally:
        conn.close()


@router.post("/cashbox")
async def create_operation(
    body: OperationModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "accountant", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    op_date = body.operation_date or date.today().isoformat()
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO cashbox_operations
              (company_id,type,category,amount,description,payment_method,
               booking_id,employee_id,document_number,operation_date,created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.type, body.category, body.amount, body.description,
              body.payment_method, body.booking_id, body.employee_id,
              body.document_number, op_date, user.get("id")))
        op_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": op_id})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.delete("/cashbox/{op_id}")
async def delete_operation(
    op_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM cashbox_operations WHERE id=%s AND company_id=%s", (op_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.get("/cashbox/report/daily")
async def daily_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    if not date_from:
        date_from = (date.today() - timedelta(days=30)).isoformat()
    if not date_to:
        date_to = date.today().isoformat()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT
                operation_date,
                COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense,
                COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS profit
            FROM cashbox_operations
            WHERE company_id=%s AND operation_date BETWEEN %s AND %s
            GROUP BY operation_date ORDER BY operation_date
        """, (company_id, date_from, date_to))
        cols = [d[0] for d in c.description]
        rows = [dict(zip(cols, r)) for r in c.fetchall()]
        for r in rows:
            if isinstance(r.get("operation_date"), date):
                r["operation_date"] = r["operation_date"].isoformat()

        # По категориям
        c.execute("""
            SELECT category, type,
                   COALESCE(SUM(amount),0) AS total
            FROM cashbox_operations
            WHERE company_id=%s AND operation_date BETWEEN %s AND %s
            GROUP BY category, type ORDER BY total DESC
        """, (company_id, date_from, date_to))
        by_cat = [{"category": r[0], "type": r[1], "total": float(r[2])} for r in c.fetchall()]

        return JSONResponse({"daily": rows, "by_category": by_cat})
    finally:
        conn.close()


@router.get("/cashbox/categories")
async def get_categories(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return JSONResponse({"income": INCOME_CATEGORIES, "expense": EXPENSE_CATEGORIES})
