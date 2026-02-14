"""
Управление контекстом разговоров

Сохраняет состояние многоступенчатых диалогов между клиентом и ботом
"""

import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error

class ConversationContext:
    """Управление контекстом диалога с клиентом"""

    def __init__(self, client_id: str):
        self.client_id = client_id

    def save_context(
        self,
        context_type: str,
        context_data: Dict[str, Any],
        expires_in_minutes: int = 30
    ) -> bool:
        """
        Сохранить контекст разговора

        Args:
            context_type: Тип контекста ('booking_in_progress', 'awaiting_confirmation', etc.)
            context_data: Данные контекста (будут сериализованы в JSON)
            expires_in_minutes: Через сколько минут контекст истекает

        Returns:
            bool: Успешность сохранения
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now()
            expires_at = now + timedelta(minutes=expires_in_minutes)

            # Удаляем старый контекст этого типа
            c.execute("""
                DELETE FROM conversation_context
                WHERE client_id = %s AND context_type = %s
            """, (self.client_id, context_type))

            # Сохраняем новый контекст
            c.execute("""
                INSERT INTO conversation_context
                (client_id, context_type, context_data, created_at, expires_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                self.client_id,
                context_type,
                json.dumps(context_data, ensure_ascii=False),
                now.isoformat(),
                expires_at.isoformat()
            ))

            conn.commit()
            log_info(f"Context saved for {self.client_id}: {context_type}", "conversation_context")
            return True

        except Exception as e:
            log_error(f"Error saving context: {e}", "conversation_context")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_context(self, context_type: str) -> Optional[Dict[str, Any]]:
        """
        Получить контекст разговора

        Args:
            context_type: Тип контекста

        Returns:
            Dict или None если контекст не найден или истек
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            c.execute("""
                SELECT context_data, expires_at, created_at
                FROM conversation_context
                WHERE client_id = %s AND context_type = %s
                AND expires_at > %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (self.client_id, context_type, now))

            result = c.fetchone()

            if result:
                context_data = json.loads(result[0])
                return {
                    "data": context_data,
                    "expires_at": result[1],
                    "created_at": result[2]
                }

            return None

        except Exception as e:
            log_error(f"Error getting context: {e}", "conversation_context")
            return None
        finally:
            conn.close()

    def get_all_active_contexts(self) -> Dict[str, Any]:
        """
        Получить все активные контексты клиента

        Returns:
            Dict с контекстами по типам
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            c.execute("""
                SELECT context_type, context_data, expires_at, created_at
                FROM conversation_context
                WHERE client_id = %s AND expires_at > %s
                ORDER BY created_at DESC
            """, (self.client_id, now))

            contexts = {}
            for row in c.fetchall():
                context_type = row[0]
                context_data = json.loads(row[1])
                contexts[context_type] = {
                    "data": context_data,
                    "expires_at": row[2],
                    "created_at": row[3]
                }

            return contexts

        except Exception as e:
            log_error(f"Error getting all contexts: {e}", "conversation_context")
            return {}
        finally:
            conn.close()

    def clear_context(self, context_type: Optional[str] = None) -> bool:
        """
        Удалить контекст

        Args:
            context_type: Тип контекста (если None - удаляет все контексты клиента)

        Returns:
            bool: Успешность удаления
        """
        conn = get_db_connection()
        c = conn.cursor()

        try:
            if context_type:
                c.execute("""
                    DELETE FROM conversation_context
                    WHERE client_id = %s AND context_type = %s
                """, (self.client_id, context_type))
            else:
                c.execute("""
                    DELETE FROM conversation_context
                    WHERE client_id = %s
                """, (self.client_id,))

            conn.commit()
            log_info(f"Context cleared for {self.client_id}: {context_type or 'all'}", "conversation_context")
            return True

        except Exception as e:
            log_error(f"Error clearing context: {e}", "conversation_context")
            conn.rollback()
            return False
        finally:
            conn.close()

    def update_context(
        self,
        context_type: str,
        update_data: Dict[str, Any],
        extend_expiry: bool = False,
        expires_in_minutes: int = 30
    ) -> bool:
        """
        Обновить существующий контекст

        Args:
            context_type: Тип контекста
            update_data: Данные для обновления (будут объединены с существующими)
            extend_expiry: Продлить срок действия
            expires_in_minutes: На сколько минут продлить

        Returns:
            bool: Успешность обновления
        """
        # Получаем текущий контекст
        current = self.get_context(context_type)

        if not current:
            # Если контекста нет, создаем новый
            return self.save_context(context_type, update_data, expires_in_minutes)

        # Объединяем данные
        merged_data = {**current["data"], **update_data}

        # Сохраняем обновленный контекст
        if extend_expiry:
            return self.save_context(context_type, merged_data, expires_in_minutes)
        else:
            # Вычисляем оставшееся время жизни
            expires_at = datetime.fromisoformat(current["expires_at"])
            now = datetime.now()
            remaining_minutes = int((expires_at - now).total_seconds() / 60)

            if remaining_minutes > 0:
                return self.save_context(context_type, merged_data, remaining_minutes)
            else:
                return self.save_context(context_type, merged_data, expires_in_minutes)

    def has_context(self, context_type: str) -> bool:
        """
        Проверить наличие активного контекста

        Args:
            context_type: Тип контекста

        Returns:
            bool: True если контекст существует и не истек
        """
        return self.get_context(context_type) is not None

def cleanup_expired_contexts() -> int:
    """
    Удалить истекшие контексты (вызывать периодически через cron)

    Returns:
        int: Количество удаленных контекстов
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        now = datetime.now().isoformat()

        c.execute("""
            DELETE FROM conversation_context
            WHERE expires_at <= %s
        """, (now,))

        deleted_count = c.rowcount
        conn.commit()

        if deleted_count > 0:
            log_info(f"Cleaned up {deleted_count} expired contexts", "conversation_context")

        return deleted_count

    except Exception as e:
        log_error(f"Error cleaning up contexts: {e}", "conversation_context")
        conn.rollback()
        return 0
    finally:
        conn.close()

# Примеры использования:

def example_booking_flow():
    """Пример использования для процесса записи"""

    # 1. Клиент начинает процесс записи
    context = ConversationContext("client_123")

    context.save_context(
        context_type="booking_in_progress",
        context_data={
            "step": "select_service",
            "service": None,
            "master": None,
            "date": None,
            "time": None
        },
        expires_in_minutes=30
    )

    # 2. Клиент выбрал услугу
    context.update_context(
        "booking_in_progress",
        {
            "step": "select_master",
            "service": "Маникюр"
        },
        extend_expiry=True  # Продлеваем срок
    )

    # 3. Клиент выбрал мастера
    context.update_context(
        "booking_in_progress",
        {
            "step": "select_date",
            "master": "Jennifer"
        },
        extend_expiry=True
    )

    # 4. Проверяем текущий контекст
    current = context.get_context("booking_in_progress")
    if current:
        print(f"Текущий шаг: {current['data']['step']}")
        print(f"Услуга: {current['data']['service']}")
        print(f"Мастер: {current['data']['master']}")

    # 5. Запись завершена - удаляем контекст
    context.clear_context("booking_in_progress")

def example_waiting_for_confirmation():
    """Пример ожидания подтверждения от клиента"""

    context = ConversationContext("client_456")

    # Сохраняем, что ждем подтверждение
    context.save_context(
        context_type="awaiting_confirmation",
        context_data={
            "question": "Записать вас на маникюр 25 ноября в 15:00%s",
            "booking_details": {
                "service": "Маникюр",
                "master": "Jennifer",
                "date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
                "time": "15:00"
            },
            "expected_response": ["да", "yes", "подтверждаю", "записывай"]
        },
        expires_in_minutes=15  # 15 минут на ответ
    )

    # В следующем сообщении проверяем контекст
    if context.has_context("awaiting_confirmation"):
        confirmation_context = context.get_context("awaiting_confirmation")
        # Обрабатываем подтверждение
        print("Ждем подтверждения на:", confirmation_context["data"]["question"])
