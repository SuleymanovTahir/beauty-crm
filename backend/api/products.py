"""
API для управления товарами (Products)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.utils import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    name: str
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    category: Optional[str] = None
    price: float = 0
    cost_price: Optional[float] = 0
    weight: Optional[float] = None
    weight_unit: str = "g"
    volume: Optional[float] = None
    volume_unit: str = "ml"
    expiry_date: Optional[str] = None
    stock_quantity: int = 0
    min_stock_level: int = 0
    sku: Optional[str] = None
    barcode: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    volume: Optional[float] = None
    volume_unit: Optional[str] = None
    expiry_date: Optional[str] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ProductMovement(BaseModel):
    product_id: int
    movement_type: str  # in, out, adjustment
    quantity: int
    price: Optional[float] = None
    reason: Optional[str] = None
    booking_id: Optional[int] = None


@router.get("/products")
async def get_products(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список товаров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """
            SELECT id, name, name_ru, name_en, name_ar, category, price, cost_price,
                   weight, weight_unit, volume, volume_unit, expiry_date,
                   stock_quantity, min_stock_level, sku, barcode, supplier,
                   notes, is_active, created_at, updated_at
            FROM products
            WHERE 1=1
        """
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
        
        if is_active is not None:
            query += " AND is_active = %s"
            params.append(is_active)
        
        if search:
            query += " AND (name ILIKE %s OR name_ru ILIKE %s OR sku ILIKE %s OR barcode ILIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        query += " ORDER BY name"
        
        c.execute(query, params)
        products = []
        for row in c.fetchall():
            products.append({
                "id": row[0],
                "name": row[1],
                "name_ru": row[2],
                "name_en": row[3],
                "name_ar": row[4],
                "category": row[5],
                "price": row[6],
                "cost_price": row[7],
                "weight": row[8],
                "weight_unit": row[9],
                "volume": row[10],
                "volume_unit": row[11],
                "expiry_date": str(row[12]) if row[12] else None,
                "stock_quantity": row[13],
                "min_stock_level": row[14],
                "sku": row[15],
                "barcode": row[16],
                "supplier": row[17],
                "notes": row[18],
                "is_active": row[19],
                "created_at": row[20],
                "updated_at": row[21]
            })
        
        return {"products": products}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения товаров: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить товар по ID"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT id, name, name_ru, name_en, name_ar, category, price, cost_price,
                   weight, weight_unit, volume, volume_unit, expiry_date,
                   stock_quantity, min_stock_level, sku, barcode, supplier,
                   notes, is_active, created_at, updated_at
            FROM products
            WHERE id = %s
        """, (product_id,))
        
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        return {
            "id": row[0],
            "name": row[1],
            "name_ru": row[2],
            "name_en": row[3],
            "name_ar": row[4],
            "category": row[5],
            "price": row[6],
            "cost_price": row[7],
            "weight": row[8],
            "weight_unit": row[9],
            "volume": row[10],
            "volume_unit": row[11],
            "expiry_date": str(row[12]) if row[12] else None,
            "stock_quantity": row[13],
            "min_stock_level": row[14],
            "sku": row[15],
            "barcode": row[16],
            "supplier": row[17],
            "notes": row[18],
            "is_active": row[19],
            "created_at": row[20],
            "updated_at": row[21]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_warning(f"❌ Ошибка получения товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/products")
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый товар"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO products 
            (name, name_ru, name_en, name_ar, category, price, cost_price,
             weight, weight_unit, volume, volume_unit, expiry_date,
             stock_quantity, min_stock_level, sku, barcode, supplier,
             notes, is_active, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            product.name,
            product.name_ru,
            product.name_en,
            product.name_ar,
            product.category,
            product.price,
            product.cost_price,
            product.weight,
            product.weight_unit,
            product.volume,
            product.volume_unit,
            product.expiry_date,
            product.stock_quantity,
            product.min_stock_level,
            product.sku,
            product.barcode,
            product.supplier,
            product.notes,
            product.is_active,
            current_user["id"]
        ))
        
        product_id = c.fetchone()[0]
        conn.commit()
        
        log_info(f"✅ Товар {product.name} создан (ID: {product_id})", "api")
        
        return {"id": product_id, "message": "Товар создан"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка создания товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    product: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить товар"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        for field, value in product.dict(exclude_unset=True).items():
            updates.append(f"{field} = %s")
            params.append(value)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет данных для обновления")
        
        updates.append("updated_at = NOW()")
        params.append(product_id)
        
        query = f"UPDATE products SET {', '.join(updates)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        
        log_info(f"✅ Товар {product_id} обновлен", "api")
        
        return {"message": "Товар обновлен"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка обновления товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Удалить товар"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        
        log_info(f"✅ Товар {product_id} удален", "api")
        
        return {"message": "Товар удален"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка удаления товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/products/movements")
async def create_movement(
    movement: ProductMovement,
    current_user: dict = Depends(get_current_user)
):
    """Создать движение товара (приход/расход)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Создание записи движения
        c.execute("""
            INSERT INTO product_movements
            (product_id, movement_type, quantity, price, reason, booking_id, created_by, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            movement.product_id,
            movement.movement_type,
            movement.quantity,
            movement.price,
            movement.reason,
            movement.booking_id,
            current_user["id"]
        ))
        
        movement_id = c.fetchone()[0]
        
        # Обновление остатка товара
        if movement.movement_type == "in":
            c.execute("""
                UPDATE products
                SET stock_quantity = stock_quantity + %s, updated_at = NOW()
                WHERE id = %s
            """, (movement.quantity, movement.product_id))
        elif movement.movement_type == "out":
            c.execute("""
                UPDATE products
                SET stock_quantity = stock_quantity - %s, updated_at = NOW()
                WHERE id = %s
            """, (movement.quantity, movement.product_id))
        elif movement.movement_type == "adjustment":
            c.execute("""
                UPDATE products
                SET stock_quantity = %s, updated_at = NOW()
                WHERE id = %s
            """, (movement.quantity, movement.product_id))
        
        conn.commit()
        
        log_info(f"✅ Движение товара {movement.product_id} создано (ID: {movement_id})", "api")
        
        return {"id": movement_id, "message": "Движение товара создано"}
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка создания движения товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/products/{product_id}/movements")
async def get_product_movements(
    product_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю движения товара"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT pm.id, pm.movement_type, pm.quantity, pm.price, pm.reason,
                   pm.booking_id, pm.created_at, u.full_name as created_by_name
            FROM product_movements pm
            LEFT JOIN users u ON pm.created_by = u.id
            WHERE pm.product_id = %s
            ORDER BY pm.created_at DESC
        """, (product_id,))
        
        movements = []
        for row in c.fetchall():
            movements.append({
                "id": row[0],
                "movement_type": row[1],
                "quantity": row[2],
                "price": row[3],
                "reason": row[4],
                "booking_id": row[5],
                "created_at": row[6],
                "created_by_name": row[7]
            })
        
        return {"movements": movements}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения движений товара: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/products/categories")
async def get_product_categories(
    current_user: dict = Depends(get_current_user)
):
    """Получить список категорий товаров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT DISTINCT category
            FROM products
            WHERE category IS NOT NULL
            ORDER BY category
        """)
        
        categories = [row[0] for row in c.fetchall()]
        
        return {"categories": categories}
        
    except Exception as e:
        log_warning(f"❌ Ошибка получения категорий: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
