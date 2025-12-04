"""
Программа лояльности

Начисление баллов, уровни, скидки
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error

class LoyaltyService:
    """Сервис программы лояльности"""

    def __init__(self):
        pass

    def get_client_loyalty(self, client_id: str) -> Optional[Dict]:
        """Получить данные лояльности клиента"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            c.execute("""
                SELECT total_points, available_points, spent_points, loyalty_level
                FROM client_loyalty_points
                WHERE client_id = %s
            """, (client_id,))

            result = c.fetchone()

            if not result:
                # Создаем запись для нового клиента
                self._create_loyalty_account(client_id)
                return {
                    "total_points": 0,
                    "available_points": 0,
                    "spent_points": 0,
                    "loyalty_level": "bronze"
                }

            return {
                "total_points": result[0],
                "available_points": result[1],
                "spent_points": result[2],
                "loyalty_level": result[3]
            }

        except Exception as e:
            log_error(f"Error getting client loyalty: {e}", "loyalty")
            return None
        finally:
            conn.close()

    def _create_loyalty_account(self, client_id: str) -> bool:
        """Создать аккаунт лояльности для нового клиента"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            c.execute("""
                INSERT INTO client_loyalty_points
                (client_id, total_points, available_points, spent_points, loyalty_level, created_at, updated_at)
                VALUES (%s, 0, 0, 0, 'bronze', %s, %s)
                ON CONFLICT (client_id) DO NOTHING
            """, (client_id, now, now))

            conn.commit()
            return True

        except Exception as e:
            log_error(f"Error creating loyalty account: {e}", "loyalty")
            conn.rollback()
            return False
        finally:
            conn.close()

    def earn_points(
        self,
        client_id: str,
        points: int,
        reason: str,
        booking_id: Optional[int] = None,
        expires_days: int = 365
    ) -> bool:
        """
        Начислить баллы клиенту

        Args:
            client_id: ID клиента
            points: Количество баллов
            reason: Причина начисления
            booking_id: ID записи (если применимо)
            expires_days: Через сколько дней истекают баллы

        Returns:
            bool: Успешность операции
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now()
            expires_at = (now + timedelta(days=expires_days)).isoformat()

            # Получаем текущий уровень для множителя
            loyalty = self.get_client_loyalty(client_id)
            if not loyalty:
                loyalty = {"loyalty_level": "bronze"}

            # Получаем множитель уровня
            c.execute("""
                SELECT points_multiplier
                FROM loyalty_levels
                WHERE level_name = %s
            """, (loyalty["loyalty_level"],))

            multiplier_row = c.fetchone()
            multiplier = multiplier_row[0] if multiplier_row else 1.0

            # Применяем множитель
            actual_points = int(points * multiplier)

            # Добавляем транзакцию
            c.execute("""
                INSERT INTO loyalty_transactions
                (client_id, transaction_type, points, reason, booking_id, created_at, expires_at)
                VALUES (%s, 'earn', %s, %s, %s, %s, %s)
            """, (client_id, actual_points, reason, booking_id, now.isoformat(), expires_at))

            # Обновляем баланс
            c.execute("""
                UPDATE client_loyalty_points
                SET total_points = total_points + %s,
                    available_points = available_points + %s,
                    updated_at = %s
                WHERE client_id = %s
            """, (actual_points, actual_points, now.isoformat(), client_id))

            # Проверяем, не достиг ли клиент нового уровня
            self._check_and_upgrade_level(client_id, c)

            conn.commit()
            log_info(f"Earned {actual_points} points for {client_id}: {reason}", "loyalty")
            return True

        except Exception as e:
            log_error(f"Error earning points: {e}", "loyalty")
            conn.rollback()
            return False
        finally:
            conn.close()

    def spend_points(
        self,
        client_id: str,
        points: int,
        reason: str,
        booking_id: Optional[int] = None
    ) -> bool:
        """
        Списать баллы

        Args:
            client_id: ID клиента
            points: Количество баллов
            reason: Причина списания
            booking_id: ID записи (если применимо)

        Returns:
            bool: Успешность операции
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Проверяем доступный баланс
            c.execute("""
                SELECT available_points
                FROM client_loyalty_points
                WHERE client_id = %s
            """, (client_id,))

            result = c.fetchone()
            if not result or result[0] < points:
                log_error(f"Insufficient points for {client_id}", "loyalty")
                return False

            now = datetime.now().isoformat()

            # Добавляем транзакцию
            c.execute("""
                INSERT INTO loyalty_transactions
                (client_id, transaction_type, points, reason, booking_id, created_at)
                VALUES (%s, 'spend', %s, %s, %s, %s)
            """, (client_id, -points, reason, booking_id, now))

            # Обновляем баланс
            c.execute("""
                UPDATE client_loyalty_points
                SET available_points = available_points - %s,
                    spent_points = spent_points + %s,
                    updated_at = %s
                WHERE client_id = %s
            """, (points, points, now, client_id))

            conn.commit()
            log_info(f"Spent {points} points for {client_id}: {reason}", "loyalty")
            return True

        except Exception as e:
            log_error(f"Error spending points: {e}", "loyalty")
            conn.rollback()
            return False
        finally:
            conn.close()

    def _check_and_upgrade_level(self, client_id: str, cursor) -> None:
        """Проверить и повысить уровень лояльности если нужно"""
        # Получаем текущий баланс
        cursor.execute("""
            SELECT total_points, loyalty_level
            FROM client_loyalty_points
            WHERE client_id = %s
        """, (client_id,))

        result = cursor.fetchone()
        if not result:
            return

        total_points, current_level = result

        # Получаем подходящий уровень
        cursor.execute("""
            SELECT level_name
            FROM loyalty_levels
            WHERE min_points <= %s
            ORDER BY min_points DESC
            LIMIT 1
        """, (total_points,))

        new_level_row = cursor.fetchone()
        if not new_level_row:
            return

        new_level = new_level_row[0]

        # Если уровень изменился
        if new_level != current_level:
            now = datetime.now().isoformat()
            cursor.execute("""
                UPDATE client_loyalty_points
                SET loyalty_level = %s, updated_at = %s
                WHERE client_id = %s
            """, (new_level, now, client_id))

            log_info(f"Level upgraded for {client_id}: {current_level} -> {new_level}", "loyalty")

    def get_transaction_history(
        self,
        client_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Получить историю транзакций баллов"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            c.execute("""
                SELECT transaction_type, points, reason, created_at, expires_at
                FROM loyalty_transactions
                WHERE client_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (client_id, limit))

            transactions = []
            for row in c.fetchall():
                transactions.append({
                    "type": row[0],
                    "points": row[1],
                    "reason": row[2],
                    "created_at": row[3],
                    "expires_at": row[4]
                })

            return transactions

        except Exception as e:
            log_error(f"Error getting transaction history: {e}", "loyalty")
            return []
        finally:
            conn.close()

    def get_all_levels(self) -> List[Dict]:
        """Получить все уровни лояльности"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            c.execute("""
                SELECT level_name, min_points, discount_percent, points_multiplier, benefits
                FROM loyalty_levels
                ORDER BY min_points
            """)

            levels = []
            for row in c.fetchall():
                # benefits is text, not json in init.py, but let's handle it safely
                benefits = row[4]
                levels.append({
                    "level_name": row[0],
                    "min_points": row[1],
                    "discount_percent": row[2],
                    "points_multiplier": row[3],
                    "benefits": benefits
                })

            return levels

        except Exception as e:
            log_error(f"Error getting loyalty levels: {e}", "loyalty")
            return []
        finally:
            conn.close()

    def calculate_discount(self, client_id: str, original_price: float) -> Dict:
        """
        Вычислить скидку для клиента

        Returns:
            Dict с original_price, discount_percent, discount_amount, final_price
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Получаем уровень клиента
            c.execute("""
                SELECT loyalty_level
                FROM client_loyalty_points
                WHERE client_id = %s
            """, (client_id,))

            result = c.fetchone()
            if not result:
                return {
                    "original_price": original_price,
                    "discount_percent": 0,
                    "discount_amount": 0,
                    "final_price": original_price
                }

            loyalty_level = result[0]

            # Получаем процент скидки для уровня
            c.execute("""
                SELECT discount_percent
                FROM loyalty_levels
                WHERE level_name = %s
            """, (loyalty_level,))

            discount_row = c.fetchone()
            discount_percent = discount_row[0] if discount_row else 0

            discount_amount = round(original_price * discount_percent / 100, 2)
            final_price = round(original_price - discount_amount, 2)

            return {
                "original_price": original_price,
                "discount_percent": discount_percent,
                "discount_amount": discount_amount,
                "final_price": final_price,
                "loyalty_level": loyalty_level
            }

        except Exception as e:
            log_error(f"Error calculating discount: {e}", "loyalty")
            return {
                "original_price": original_price,
                "discount_percent": 0,
                "discount_amount": 0,
                "final_price": original_price
            }
        finally:
            conn.close()

    def points_for_booking(self, revenue: float) -> int:
        """Вычислить баллы за запись (1 балл за каждые 10 AED)"""
        return int(revenue / 10)
