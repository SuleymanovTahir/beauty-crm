"""
Утилита для очистки тестовых данных
Автоматически удаляет все тестовые записи после выполнения тестов
"""
import sqlite3
from core.config import DATABASE_NAME
from typing import List, Optional


class TestDataCleaner:
    """Класс для очистки тестовых данных"""
    
    def __init__(self):
        self.test_identifiers = [
            'test_',
            'тест',
            '@test',
            '_test',
            'Test ',
            'Тест ',
        ]
    
    def is_test_data(self, value: str) -> bool:
        """Проверяет, является ли значение тестовым"""
        if not value:
            return False
        
        value_lower = value.lower()
        return any(identifier.lower() in value_lower for identifier in self.test_identifiers)
    
    def cleanup_test_users(self, specific_usernames: Optional[List[str]] = None) -> int:
        """
        Удаляет тестовых пользователей
        
        Args:
            specific_usernames: Список конкретных username для удаления
            
        Returns:
            Количество удаленных записей
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        deleted = 0
        
        try:
            if specific_usernames:
                # Удаляем конкретных пользователей
                placeholders = ','.join(['?' for _ in specific_usernames])
                c.execute(f"DELETE FROM users WHERE username IN ({placeholders})", specific_usernames)
                deleted = c.rowcount
            else:
                # Удаляем всех пользователей с тестовыми именами
                c.execute("SELECT id, username, full_name FROM users")
                users = c.fetchall()
                
                test_user_ids = []
                for user_id, username, full_name in users:
                    if self.is_test_data(username) or self.is_test_data(full_name or ''):
                        test_user_ids.append(user_id)
                
                if test_user_ids:
                    placeholders = ','.join(['?' for _ in test_user_ids])
                    c.execute(f"DELETE FROM users WHERE id IN ({placeholders})", test_user_ids)
                    deleted = c.rowcount
            
            conn.commit()
        finally:
            conn.close()
        
        return deleted
    
    def cleanup_test_clients(self, specific_ids: Optional[List[str]] = None) -> int:
        """
        Удаляет тестовых клиентов и их данные
        
        Args:
            specific_ids: Список конкретных instagram_id для удаления
            
        Returns:
            Количество удаленных записей
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        deleted = 0
        
        try:
            if specific_ids:
                # Удаляем конкретных клиентов
                for client_id in specific_ids:
                    # Удаляем связанные данные
                    c.execute("DELETE FROM conversations WHERE client_id = ?", (client_id,))
                    c.execute("DELETE FROM bookings WHERE client_instagram_id = ?", (client_id,))
                    c.execute("DELETE FROM client_loyalty_points WHERE client_id = ?", (client_id,))
                    c.execute("DELETE FROM clients WHERE instagram_id = ?", (client_id,))
                    deleted += c.rowcount
            else:
                # Удаляем всех клиентов с тестовыми именами
                c.execute("SELECT instagram_id, username, name FROM clients")
                clients = c.fetchall()
                
                test_client_ids = []
                for instagram_id, username, name in clients:
                    if (self.is_test_data(instagram_id or '') or 
                        self.is_test_data(username or '') or 
                        self.is_test_data(name or '')):
                        test_client_ids.append(instagram_id)
                
                if test_client_ids:
                    for client_id in test_client_ids:
                        c.execute("DELETE FROM conversations WHERE client_id = ?", (client_id,))
                        c.execute("DELETE FROM bookings WHERE client_instagram_id = ?", (client_id,))
                        c.execute("DELETE FROM client_loyalty_points WHERE client_id = ?", (client_id,))
                        c.execute("DELETE FROM clients WHERE instagram_id = ?", (client_id,))
                        deleted += c.rowcount
            
            conn.commit()
        finally:
            conn.close()
        
        return deleted
    
    def cleanup_test_bookings(self) -> int:
        """Удаляет тестовые записи"""
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        deleted = 0
        
        try:
            # Удаляем записи с тестовыми клиентами
            c.execute("""
                DELETE FROM bookings 
                WHERE client_instagram_id IN (
                    SELECT instagram_id FROM clients 
                    WHERE instagram_id LIKE '%test%' 
                    OR username LIKE '%test%'
                    OR name LIKE '%тест%'
                )
            """)
            deleted = c.rowcount
            
            conn.commit()
        finally:
            conn.close()
        
        return deleted
    
    def cleanup_test_conversations(self) -> int:
        """Удаляет тестовые сообщения"""
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        deleted = 0
        
        try:
            # Удаляем сообщения с тестовыми клиентами
            c.execute("""
                DELETE FROM conversations 
                WHERE client_id IN (
                    SELECT instagram_id FROM clients 
                    WHERE instagram_id LIKE '%test%' 
                    OR username LIKE '%test%'
                    OR name LIKE '%тест%'
                )
            """)
            deleted = c.rowcount
            
            conn.commit()
        finally:
            conn.close()
        
        return deleted
    
    def cleanup_all(self, 
                   specific_users: Optional[List[str]] = None,
                   specific_clients: Optional[List[str]] = None) -> dict:
        """
        Полная очистка всех тестовых данных
        
        Args:
            specific_users: Список конкретных username для удаления
            specific_clients: Список конкретных instagram_id для удаления
            
        Returns:
            Словарь с количеством удаленных записей по категориям
        """
        results = {
            'users': self.cleanup_test_users(specific_users),
            'clients': self.cleanup_test_clients(specific_clients),
            'bookings': self.cleanup_test_bookings(),
            'conversations': self.cleanup_test_conversations(),
        }
        
        return results


def cleanup_after_test(test_users: Optional[List[str]] = None,
                      test_clients: Optional[List[str]] = None,
                      verbose: bool = True) -> bool:
    """
    Удобная функция для очистки после тестов
    
    Args:
        test_users: Список username тестовых пользователей
        test_clients: Список instagram_id тестовых клиентов
        verbose: Выводить ли информацию о очистке
        
    Returns:
        True если очистка прошла успешно
    """
    try:
        cleaner = TestDataCleaner()
        results = cleaner.cleanup_all(test_users, test_clients)
        
        if verbose:
            print("\n   🧹 Очистка тестовых данных:")
            if results['users'] > 0:
                print(f"      ✅ Удалено пользователей: {results['users']}")
            if results['clients'] > 0:
                print(f"      ✅ Удалено клиентов: {results['clients']}")
            if results['bookings'] > 0:
                print(f"      ✅ Удалено записей: {results['bookings']}")
            if results['conversations'] > 0:
                print(f"      ✅ Удалено сообщений: {results['conversations']}")
            
            total = sum(results.values())
            if total == 0:
                print("      ℹ️  Тестовых данных не найдено")
            else:
                print(f"      ✅ Всего удалено: {total} записей")
        
        return True
    except Exception as e:
        if verbose:
            print(f"      ⚠️  Ошибка очистки: {e}")
        return False


# Для обратной совместимости
def cleanup_test_data(test_client_id: str = None, verbose: bool = True):
    """Старая функция для совместимости"""
    if test_client_id:
        return cleanup_after_test(test_clients=[test_client_id], verbose=verbose)
    else:
        return cleanup_after_test(verbose=verbose)
