"""
🔧 Миграция: Система Товаров (Products)
Создает таблицу для управления товарами салона
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning

def migrate():
    """Создать таблицу products"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица товаров
        c.execute('''CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            name_ru TEXT,
            name_en TEXT,
            name_ar TEXT,
            category TEXT,
            price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            weight REAL,
            weight_unit TEXT DEFAULT 'g',
            volume REAL,
            volume_unit TEXT DEFAULT 'ml',
            expiry_date DATE,
            stock_quantity INTEGER DEFAULT 0,
            min_stock_level INTEGER DEFAULT 0,
            sku TEXT UNIQUE,
            barcode TEXT,
            supplier TEXT,
            notes TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )''')
        
        # ✅ Добавляем колонку photos, если её нет
        c.execute('''
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photos') THEN
                    ALTER TABLE products ADD COLUMN photos TEXT;
                END IF;
            END $$;
        ''')
        
        # Индексы
        c.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)')
        
        # Таблица движения товаров (приход/расход)
        c.execute('''CREATE TABLE IF NOT EXISTS product_movements (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL,
            movement_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL,
            reason TEXT,
            booking_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )''')
        
        c.execute('CREATE INDEX IF NOT EXISTS idx_product_movements_product ON product_movements(product_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_product_movements_type ON product_movements(movement_type)')
        
        conn.commit()
        log_info("✅ Таблица products создана/обновлена успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка при создании таблицы products: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
