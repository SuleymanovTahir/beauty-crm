import sqlite3
import os
from config import DATABASE_NAME

print(f"База данных: {DATABASE_NAME}")
print(f"Существует: {os.path.exists(DATABASE_NAME)}")
print(f"Полный путь: {os.path.abspath(DATABASE_NAME)}")
print()

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

# Все таблицы
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Таблицы в БД:")
for t in tables:
    print(f"  - {t[0]}")
print()

# Проверяем структуру salon_settings
c.execute("PRAGMA table_info(salon_settings)")
columns = c.fetchall()

print("Структура salon_settings:")
for col in columns:
    print(f"  {col[0]}: {col[1]} ({col[2]})")
print()

# Смотрим данные
c.execute("SELECT * FROM salon_settings LIMIT 1")
result = c.fetchone()

if result:
    print("Данные в БД:")
    for i, col in enumerate(columns):
        value = result[i] if i < len(result) else "NULL"
        print(f"  [{i}] {col[1]}: {value}")
else:
    print("⚠️ Таблица пустая!")

conn.close()