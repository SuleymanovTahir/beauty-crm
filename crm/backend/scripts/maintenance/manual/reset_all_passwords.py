#!/usr/bin/env python3
"""
Reset staff usernames/passwords from the canonical repo-root staff_credentials.txt file.
Run from backend directory: python3 scripts/maintenance/manual/reset_all_passwords.py
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[3]
PROJECT_ROOT = Path(__file__).resolve().parents[5]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from db.connection import get_db_connection
from utils.utils import hash_password

CANONICAL_CREDENTIALS_PATH = PROJECT_ROOT / "staff_credentials.txt"


def _flush_credential_entry(entries, entry):
    required_keys = {"role", "name", "username", "password"}
    if required_keys.issubset(entry.keys()):
        entries.append({
            "role": entry["role"],
            "name": entry["name"],
            "username": entry["username"],
            "password": entry["password"],
        })
    return {}


def load_canonical_credentials():
    if not CANONICAL_CREDENTIALS_PATH.exists():
        raise FileNotFoundError(f"Canonical credentials file not found: {CANONICAL_CREDENTIALS_PATH}")

    entries = []
    current_entry = {}
    with open(CANONICAL_CREDENTIALS_PATH, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("==="):
                continue
            if line.startswith("Role: "):
                current_entry["role"] = line.replace("Role: ", "", 1)
            elif line.startswith("Name: "):
                current_entry["name"] = line.replace("Name: ", "", 1)
            elif line.startswith("Username: "):
                current_entry["username"] = line.replace("Username: ", "", 1)
            elif line.startswith("Password: "):
                current_entry["password"] = line.replace("Password: ", "", 1)
            elif set(line) == {"-"}:
                current_entry = _flush_credential_entry(entries, current_entry)

    _flush_credential_entry(entries, current_entry)

    if not entries:
        raise ValueError(f"No credentials found in {CANONICAL_CREDENTIALS_PATH}")

    return entries


def write_canonical_credentials(entries):
    with open(CANONICAL_CREDENTIALS_PATH, "w", encoding="utf-8") as file:
        file.write("=== USERS CREDENTIALS (Fixed & Active) ===\n\n")
        for entry in entries:
            file.write(f"Role: {entry['role']}\n")
            file.write(f"Name: {entry['name']}\n")
            file.write(f"Username: {entry['username']}\n")
            file.write(f"Password: {entry['password']}\n")
            file.write("-" * 30 + "\n")


def reset_passwords():
    credentials = load_canonical_credentials()
    conn = get_db_connection()
    cursor = conn.cursor()

    print("🔧 Resetting staff usernames and passwords from canonical credentials...")

    try:
        updated_count = 0
        for credential in credentials:
            cursor.execute(
                """
                    SELECT id
                    FROM users
                    WHERE username = %s OR full_name = %s
                    ORDER BY CASE WHEN username = %s THEN 0 ELSE 1 END, id ASC
                    LIMIT 1
                """,
                (credential["username"], credential["name"], credential["username"]),
            )
            user_row = cursor.fetchone()

            if not user_row:
                print(f"⚠️ User not found for credentials entry: {credential['username']} / {credential['name']}")
                continue

            password_hash = hash_password(credential["password"])
            cursor.execute(
                """
                    UPDATE users
                    SET username = %s,
                        full_name = %s,
                        role = %s,
                        is_active = TRUE,
                        password_hash = %s
                    WHERE id = %s
                """,
                (
                    credential["username"],
                    credential["name"],
                    credential["role"],
                    password_hash,
                    user_row[0],
                ),
            )
            updated_count += 1
            print(f"✅ Synced credentials for: {credential['username']}")

        write_canonical_credentials(credentials)
        conn.commit()
        print(f"✅ Staff credentials synchronized: {updated_count}")
        print(f"✅ Canonical credentials file refreshed: {CANONICAL_CREDENTIALS_PATH}")

    except Exception as exc:
        conn.rollback()
        print(f"❌ Failed to reset passwords: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    reset_passwords()
