from backend.db.connection import get_db_connection
import json

def dump_stages():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, key FROM pipeline_stages")
    rows = c.fetchall()
    stages = [{"id": r[0], "name": r[1], "key": r[2]} for r in rows]
    print(json.dumps(stages, indent=2, ensure_ascii=False))
    conn.close()

if __name__ == "__main__":
    dump_stages()
