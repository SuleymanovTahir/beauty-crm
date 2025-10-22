# migrate_bot_settings.py
import sqlite3
from datetime import datetime

DATABASE_NAME = 'salon_bot.db'

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

# Выполнить SQL из create_bot_settings_table.sql
with open('create_bot_settings_table.sql', 'r', encoding='utf-8') as f:
    sql = f.read()
    c.executescript(sql)

conn.commit()
conn.close()

print("✅ Таблица bot_settings создана!")