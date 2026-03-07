from pathlib import Path

from db.connection import get_db_connection
from utils.utils import hash_password

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CREDENTIALS_PATH = PROJECT_ROOT / "staff_credentials.txt"


def load_credentials():
    credentials = {}
    current_username = None

    with open(CANONICAL_CREDENTIALS_PATH, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if line.startswith("Username: "):
                current_username = line.replace("Username: ", "", 1)
            elif line.startswith("Password: ") and current_username:
                credentials[current_username] = line.replace("Password: ", "", 1)
                current_username = None

    return credentials


def sync():
    users = load_credentials()
    conn = get_db_connection()
    c = conn.cursor()
    print('--- Force Syncing Passwords ---')
    for user, pwd in users.items():
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
