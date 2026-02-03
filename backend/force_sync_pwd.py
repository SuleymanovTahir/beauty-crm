
import sys, os
from db.connection import get_db_connection
from utils.utils import hash_password

USERS = {
    'admin': '8&&cY*xY#T',
    'sabri': '1d5Fx$Ud8$',
    'mestan': 'z2tkD5^gJh',
    'jennifer': 'dff&aW&q2@',
    'gulcehre': 'Hj#GH9ieZx',
    'lyazat': 'nJOn!2Fgmd',
    'tursunay': 'hZ&!Ci1P6K'
}

def sync():
    conn = get_db_connection()
    c = conn.cursor()
    print('--- Force Syncing Passwords ---')
    for user, pwd in USERS.items():
        hp = hash_password(pwd)
        c.execute('UPDATE users SET password_hash = %s WHERE username = %s', (hp, user))
        if c.rowcount > 0:
            print(f'✅ Updated password for: {user}')
        else:
            print(f'❌ User not found: {user}')
    conn.commit()
    conn.close()
    print('--- Done ---')

if __name__ == "__main__":
    sync()
