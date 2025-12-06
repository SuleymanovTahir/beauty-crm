import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from db.connection import get_db_connection

def list_services():
    conn = get_db_connection()
    c = conn.cursor()
    
    masters = ['GULYA', 'JENNIFER']
    
    for master in masters:
        c.execute("SELECT id, full_name, full_name_ru FROM users WHERE full_name = %s", (master,))
        user = c.fetchone()
        if not user:
            print(f"❌ Master {master} not found")
            continue
            
        uid = user[0]
        name = user[1]
        
        print(f"\n💅 Services for {name}:")
        print("="*40)
        
        c.execute("""
            SELECT s.category, s.name, us.price, us.duration 
            FROM user_services us
            JOIN services s ON us.service_id = s.id
            WHERE us.user_id = %s
            ORDER BY s.category, s.name
        """, (uid,))
        
        services = c.fetchall()
        
        current_cat = ""
        for cat, sname, price, duration in services:
            if cat != current_cat:
                print(f"\n📂 {cat}")
                current_cat = cat
            print(f"   - {sname}")

    conn.close()

if __name__ == "__main__":
    list_services()
