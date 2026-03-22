"""
API: RFM-скоринг клиентов
Recency / Frequency / Monetary анализ + сегментация
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, date, timedelta

from db.connection import get_db_connection
from utils.utils import require_auth

router = APIRouter(tags=["Client Scoring"])

SEGMENTS = {
    "champion":     {"label": "Чемпионы",          "color": "#22c55e", "r": (4,5), "f": (4,5), "m": (4,5)},
    "loyal":        {"label": "Лояльные",           "color": "#3b82f6", "r": (3,5), "f": (3,5), "m": (3,5)},
    "potential":    {"label": "Потенциальные",      "color": "#8b5cf6", "r": (3,5), "f": (1,3), "m": (1,3)},
    "at_risk":      {"label": "Под угрозой",        "color": "#f59e0b", "r": (2,3), "f": (3,5), "m": (3,5)},
    "hibernating":  {"label": "Спящие",             "color": "#94a3b8", "r": (1,2), "f": (1,3), "m": (1,3)},
    "lost":         {"label": "Потерянные",         "color": "#ef4444", "r": (1,2), "f": (1,2), "m": (1,2)},
    "new":          {"label": "Новые",              "color": "#06b6d4", "r": (4,5), "f": (1,1), "m": (1,3)},
    "promising":    {"label": "Перспективные",      "color": "#10b981", "r": (3,4), "f": (1,1), "m": (1,3)},
}


def _assign_segment(r: int, f: int, m: int) -> str:
    if r >= 4 and f >= 4 and m >= 4:
        return "champion"
    if r >= 4 and f == 1:
        return "new"
    if r >= 3 and f == 1:
        return "promising"
    if r >= 3 and f >= 3 and m >= 3:
        return "loyal"
    if r >= 3 and f <= 2 and m <= 2:
        return "potential"
    if r <= 2 and f >= 3 and m >= 3:
        return "at_risk"
    if r <= 2 and f <= 2 and m <= 2:
        return "lost"
    return "hibernating"


def _score_to_quintile(values: list, val) -> int:
    if not values or val is None:
        return 1
    sorted_v = sorted(set(values))
    n = len(sorted_v)
    if n == 1:
        return 3
    idx = sorted_v.index(min(sorted_v, key=lambda x: abs(x - val)))
    return max(1, min(5, int(idx / n * 4) + 1))


@router.post("/client-scoring/calculate")
async def calculate_scores(session_token: Optional[str] = Cookie(None)):
    """Пересчитать RFM-скоры для всех клиентов компании"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        today = date.today()
        # Собираем данные
        c.execute("""
            SELECT instagram_id,
                   MAX(DATE(datetime)) AS last_visit,
                   COUNT(*) AS freq,
                   COALESCE(SUM(revenue),0) AS monetary
            FROM bookings
            WHERE company_id=%s AND status='completed' AND instagram_id IS NOT NULL
            GROUP BY instagram_id
        """, (company_id,))
        raw = c.fetchall()
        if not raw:
            return JSONResponse({"success": True, "scored": 0})

        recencies = [(today - r[1]).days if r[1] else 999 for r in raw]
        freqs = [r[2] for r in raw]
        moneys = [float(r[3]) for r in raw]

        # Чем меньше recency — тем лучше, инвертируем
        max_r = max(recencies) or 1
        recency_inv = [max_r - r for r in recencies]

        updated = 0
        for i, row in enumerate(raw):
            iid = row[0]
            r_score = _score_to_quintile(recency_inv, recency_inv[i])
            f_score = _score_to_quintile(freqs, freqs[i])
            m_score = _score_to_quintile(moneys, moneys[i])
            rfm = r_score + f_score + m_score
            segment = _assign_segment(r_score, f_score, m_score)
            churn = max(0.0, min(1.0, recencies[i] / 180))
            ltv = moneys[i] / max(1, (today - row[1]).days / 30) * 12 if row[1] else 0

            c.execute("""
                INSERT INTO client_scores
                  (company_id,client_instagram_id,rfm_recency,rfm_frequency,rfm_monetary,
                   rfm_score,segment,churn_risk,ltv_predicted,last_calculated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                ON CONFLICT (company_id, client_instagram_id) DO UPDATE SET
                  rfm_recency=%s,rfm_frequency=%s,rfm_monetary=%s,rfm_score=%s,
                  segment=%s,churn_risk=%s,ltv_predicted=%s,last_calculated_at=NOW()
            """, (company_id, iid, r_score, f_score, m_score, rfm, segment, churn, ltv,
                  r_score, f_score, m_score, rfm, segment, churn, ltv))
            updated += 1

        conn.commit()
        return JSONResponse({"success": True, "scored": updated})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.get("/client-scoring")
async def get_scores(
    segment: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
    limit: int = Query(200),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = """
            SELECT cs.*, cl.name AS client_name, cl.phone, cl.profile_pic
            FROM client_scores cs
            LEFT JOIN clients cl ON cl.instagram_id=cs.client_instagram_id
            WHERE cs.company_id=%s
        """
        params = [company_id]
        if segment:
            sql += " AND cs.segment=%s"; params.append(segment)
        if min_score:
            sql += " AND cs.rfm_score>=%s"; params.append(min_score)
        sql += " ORDER BY cs.rfm_score DESC LIMIT %s"
        params.append(limit)
        c.execute(sql, params)
        cols = [d[0] for d in c.description]
        rows = []
        for row in c.fetchall():
            d = dict(zip(cols, row))
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
            d["churn_risk"] = round(float(d.get("churn_risk") or 0), 3)
            d["ltv_predicted"] = round(float(d.get("ltv_predicted") or 0), 2)
            rows.append(d)

        # Сводка по сегментам
        c.execute("""
            SELECT segment, COUNT(*), AVG(rfm_score), AVG(churn_risk), SUM(ltv_predicted)
            FROM client_scores WHERE company_id=%s
            GROUP BY segment ORDER BY COUNT(*) DESC
        """, (company_id,))
        seg_rows = [{"segment": r[0], "count": r[1], "avg_score": round(float(r[2]),1),
                     "avg_churn": round(float(r[3]),3), "total_ltv": round(float(r[4] or 0),2)}
                    for r in c.fetchall()]

        return JSONResponse({
            "clients": rows,
            "segments_summary": seg_rows,
            "segments_meta": SEGMENTS,
        })
    finally:
        conn.close()


@router.get("/client-scoring/{client_id}")
async def get_client_score(
    client_id: str,
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
            SELECT * FROM client_scores
            WHERE company_id=%s AND client_instagram_id=%s
        """, (company_id, client_id))
        row = c.fetchone()
        if not row:
            return JSONResponse({"score": None, "message": "Нет данных. Запустите расчёт."})
        cols = [d[0] for d in c.description]
        d = dict(zip(cols, row))
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        d["segment_meta"] = SEGMENTS.get(d.get("segment"), {})
        return JSONResponse({"score": d})
    finally:
        conn.close()
