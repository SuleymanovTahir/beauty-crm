#!/usr/bin/env python3
"""
🧪 Тестирование таблицы conversation_context
Проверяет создание, чтение и удаление контекста разговора.
"""
import sys
import os
import unittest
from datetime import datetime, timedelta

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection

class TestConversationContext(unittest.TestCase):
    def setUp(self):
        self.conn = get_db_connection()
        self.c = self.conn.cursor()
        self.test_client_id = "test_ctx_user_1"
        
        # Создаем тестового клиента, так как есть FOREIGN KEY
        self.c.execute("""
            INSERT INTO clients (instagram_id, name, created_at) 
            VALUES (%s, 'Context Test User', %s)
            ON CONFLICT (instagram_id) DO NOTHING
        """, (self.test_client_id, datetime.now().isoformat()))
        self.conn.commit()

    def tearDown(self):
        # Удаляем контекст
        self.c.execute("DELETE FROM conversation_context WHERE client_id = %s", (self.test_client_id,))
        # Удаляем тестового клиента
        self.c.execute("DELETE FROM clients WHERE instagram_id = %s", (self.test_client_id,))
        self.conn.commit()
        self.conn.close()

    def test_create_and_get_context(self):
        """Тест создания и получения контекста"""
        context_type = "booking_flow"
        context_data = '{"step": "service_selection", "last_msg": "hi"}'
        
        # 1. Создание
        self.c.execute("""
            INSERT INTO conversation_context (client_id, context_type, context_data, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (self.test_client_id, context_type, context_data, datetime.now().isoformat()))
        ctx_id = self.c.fetchone()[0]
        self.conn.commit()
        
        self.assertIsNotNone(ctx_id)

        # 2. Получение
        self.c.execute("""
            SELECT context_data FROM conversation_context 
            WHERE client_id = %s AND context_type = %s
        """, (self.test_client_id, context_type))
        row = self.c.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], context_data)
        print(f"✅ Context create/read test passed (ID: {ctx_id})")

    def test_update_context_data(self):
        """Тест обновления данных контекста"""
        # Сначала создаем
        self.c.execute("""
            INSERT INTO conversation_context (client_id, context_type, context_data, created_at)
            VALUES (%s, 'update_test', 'initial', %s)
        """, (self.test_client_id, datetime.now().isoformat()))
        self.conn.commit()

        # Обновляем
        new_data = 'updated_value'
        self.c.execute("""
            UPDATE conversation_context 
            SET context_data = %s 
            WHERE client_id = %s AND context_type = 'update_test'
        """, (new_data, self.test_client_id))
        self.conn.commit()

        # Проверяем
        self.c.execute("""
            SELECT context_data FROM conversation_context 
            WHERE client_id = %s AND context_type = 'update_test'
        """, (self.test_client_id,))
        val = self.c.fetchone()[0]
        
        self.assertEqual(val, new_data)
        print("✅ Context update test passed")

def main():
    unittest.main()

if __name__ == '__main__':
    main()
