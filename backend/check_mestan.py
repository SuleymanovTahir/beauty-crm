import psycopg2
from core.config import POSTGRES_CONFIG

def check_mestan():
    try:
        conn = psycopg2.connect(**POSTGRES_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT id, full_name, experience, years_of_experience FROM users WHERE id = 3")
        row = cur.fetchone()
        if row:
            print(f"📊 User 3: ID={row[0]}, Name='{row[1]}', Exp='{row[2]}', Years={row[3]}")
        else:
            print("❌ User 3 not found")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_mestan()
