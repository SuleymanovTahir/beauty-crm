"""
Миграция: Добавление системы расчета зарплаты
Универсальная система для любого бизнеса
"""
import sqlite3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from core.config import DATABASE_NAME


def add_salary_system():
    """Добавить таблицы для системы зарплат"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Таблица настроек зарплаты для сотрудников
    c.execute("""
        CREATE TABLE IF NOT EXISTS employee_salary_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            salary_type TEXT DEFAULT 'hourly',  -- hourly, monthly, commission, mixed
            hourly_rate REAL DEFAULT 0,         -- Почасовая ставка
            monthly_rate REAL DEFAULT 0,        -- Месячный оклад
            commission_rate REAL DEFAULT 0,     -- Процент комиссии от услуг
            bonus_rate REAL DEFAULT 0,          -- Бонусы
            currency TEXT DEFAULT 'AED',        -- Валюта
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    """)

    # Таблица расчетов зарплаты
    c.execute("""
        CREATE TABLE IF NOT EXISTS salary_calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            period_start TEXT NOT NULL,         -- Начало периода
            period_end TEXT NOT NULL,           -- Конец периода
            hours_worked REAL DEFAULT 0,        -- Отработанные часы
            services_completed INTEGER DEFAULT 0, -- Выполненных услуг
            services_revenue REAL DEFAULT 0,    -- Выручка от услуг
            base_salary REAL DEFAULT 0,         -- Базовая зарплата
            commission_amount REAL DEFAULT 0,   -- Комиссия
            bonus_amount REAL DEFAULT 0,        -- Бонусы
            deductions REAL DEFAULT 0,          -- Вычеты
            total_salary REAL DEFAULT 0,        -- Итого к выплате
            status TEXT DEFAULT 'pending',      -- pending, approved, paid
            notes TEXT,
            calculated_at TEXT,
            calculated_by INTEGER,
            approved_at TEXT,
            approved_by INTEGER,
            paid_at TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (calculated_by) REFERENCES users(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        )
    """)

    # Таблица бонусов/штрафов
    c.execute("""
        CREATE TABLE IF NOT EXISTS salary_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            calculation_id INTEGER,
            adjustment_type TEXT NOT NULL,      -- bonus, deduction
            amount REAL NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT,
            created_by INTEGER,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (calculation_id) REFERENCES salary_calculations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)

    # Индексы для производительности
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_salary_settings_employee
        ON employee_salary_settings(employee_id)
    """)

    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_salary_calculations_employee_period
        ON salary_calculations(employee_id, period_start, period_end)
    """)

    conn.commit()
    conn.close()

    print("✅ Миграция: Система расчета зарплаты создана")


if __name__ == "__main__":
    add_salary_system()
