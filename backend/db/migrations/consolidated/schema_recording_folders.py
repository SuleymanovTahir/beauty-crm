"""
Schema для управления папками и записями (аудио/видео)
Поддерживает:
- Иерархическую структуру папок (папки и подпапки)
- Аудио/видео записи из телефонии и внутреннего чата
- Перемещение, переименование, удаление
- Сортировку и фильтрацию
"""
import logging
from db.connection import get_db_connection

def run_migration():
    """
    Создание таблиц для управления папками записей
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        logging.info("Creating recording_folders and updating call_logs...")

        # Удаляем таблицы если существуют (для идемпотентности при пересоздании БД)
        c.execute("DROP TABLE IF EXISTS chat_recordings CASCADE;")
        c.execute("DROP TABLE IF EXISTS recording_folders CASCADE;")

        # Таблица для папок записей
        c.execute("""
            CREATE TABLE recording_folders (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                parent_id INTEGER REFERENCES recording_folders(id) ON DELETE CASCADE,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP,
                sort_order INTEGER DEFAULT 0,
                color VARCHAR(20), -- hex color for folder
                icon VARCHAR(50), -- icon name
                UNIQUE(name, parent_id)
            );
        """)

        # Индексы для быстрого поиска
        c.execute("CREATE INDEX IF NOT EXISTS idx_recording_folders_parent ON recording_folders(parent_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_recording_folders_created_by ON recording_folders(created_by);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_recording_folders_deleted ON recording_folders(is_deleted);")

        # Обновляем таблицу call_logs - добавляем поля для управления записями
        columns_to_add = {
            'folder_id': 'INTEGER REFERENCES recording_folders(id) ON DELETE SET NULL',
            'custom_name': 'VARCHAR(500)', # Пользовательское название записи
            'is_archived': 'BOOLEAN DEFAULT FALSE',
            'archived_at': 'TIMESTAMP',
            'tags': 'TEXT[]', # Массив тегов для фильтрации
            'file_size': 'BIGINT', # Размер файла в байтах
            'file_format': 'VARCHAR(20)', # mp3, wav, ogg, m4a, webm
        }

        # Проверяем существование call_logs
        c.execute("SELECT to_regclass('public.call_logs');")
        if not c.fetchone()[0]:
             # Если таблицы нет, создаем её (минимальная версия, schema_telephony должна дополнить)
             # Но лучше просто пропустить или создать, если это критично.
             # Предположим что schema_telephony должна быть запущена ДО этого.
             logging.warning("Table call_logs does not exist! Skipping column additions.")
        else:
            for column_name, column_type in columns_to_add.items():
                # Проверяем существование колонки безопасным способом
                c.execute("""
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='call_logs' AND column_name=%s;
                """, (column_name,))
                
                if not c.fetchone():
                    # Колонка не существует, добавляем
                    logging.info(f"Adding column {column_name} to call_logs...")
                    c.execute(f"ALTER TABLE call_logs ADD COLUMN {column_name} {column_type};")
                else:
                    logging.info(f"Column {column_name} already exists in call_logs.")

        # Индексы для call_logs
        c.execute("CREATE INDEX IF NOT EXISTS idx_call_logs_folder ON call_logs(folder_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_call_logs_archived ON call_logs(is_archived);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_call_logs_tags ON call_logs USING GIN(tags);")

        # Таблица для записей внутреннего чата
        c.execute("""
            CREATE TABLE chat_recordings (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                folder_id INTEGER REFERENCES recording_folders(id) ON DELETE SET NULL,
                recording_url TEXT,
                recording_file VARCHAR(255),
                duration INTEGER, -- seconds
                recording_type VARCHAR(20) DEFAULT 'audio', -- audio, video
                custom_name VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_archived BOOLEAN DEFAULT FALSE,
                archived_at TIMESTAMP,
                tags TEXT[],
                file_size BIGINT,
                file_format VARCHAR(20),
                notes TEXT
            );
        """)

        # Индексы для chat_recordings
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_recordings_sender ON chat_recordings(sender_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_recordings_receiver ON chat_recordings(receiver_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_recordings_folder ON chat_recordings(folder_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_recordings_archived ON chat_recordings(is_archived);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_chat_recordings_tags ON chat_recordings USING GIN(tags);")

        # Создаём корневые папки по умолчанию
        c.execute("""
            INSERT INTO recording_folders (name, parent_id, sort_order, color, icon)
            VALUES
                ('Телефония', NULL, 1, '#3B82F6', 'phone'),
                ('Внутренний чат', NULL, 2, '#8B5CF6', 'message-circle'),
                ('Архив', NULL, 3, '#6B7280', 'archive')
            ON CONFLICT (name, parent_id) DO NOTHING;
        """)

        conn.commit()
        logging.info("✅ Recording folders schema created successfully.")
        return True

    except Exception as e:
        logging.error(f"❌ Error creating recording folders schema: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migration()