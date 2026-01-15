#!/bin/bash
# 🚀 Скрипт быстрого деплоя Beauty CRM на сервер

set -e  # Остановить при ошибке

SERVER="ubuntu@91.201.215.32"
REMOTE_PATH="/home/ubuntu/beauty_crm"
LOCAL_PATH="$HOME/Desktop/beauty-crm"

echo "🚀 Начинаем деплой Beauty CRM..."
echo ""

# Проверка соединения с сервером
echo "📡 Проверка соединения с сервером..."
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'Соединение установлено'"; then
    echo "❌ Не удалось подключиться к серверу $SERVER"
    exit 1
fi
echo "✅ Соединение установлено"
echo ""

# Выбор режима деплоя
echo "Выберите режим деплоя:"
echo "1) Полный деплой (backend + frontend)"
echo "2) Только backend"
echo "3) Только frontend"
read -p "Введите номер (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📦 Полный деплой..."
        echo "🗑️  Очистка старых файлов на сервере..."
        ssh $SERVER "rm -rf $REMOTE_PATH/*"
        
        echo "📤 Загрузка всех файлов (исключая venv, node_modules, .git)..."
        rsync -avz --progress \
            --exclude 'venv' \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '__pycache__' \
            --exclude '*.pyc' \
            --exclude '.DS_Store' \
            $LOCAL_PATH/ $SERVER:$REMOTE_PATH/
        ;;
    2)
        echo ""
        echo "🐍 Деплой только backend..."
        echo "🗑️  Удаление старой папки backend..."
        ssh $SERVER "rm -rf $REMOTE_PATH/backend"
        
        echo "📤 Загрузка backend..."
        rsync -avz --progress \
            --exclude 'venv' \
            --exclude '__pycache__' \
            --exclude '*.pyc' \
            --exclude '.git' \
            --exclude '.DS_Store' \
            $LOCAL_PATH/backend/ $SERVER:$REMOTE_PATH/backend/
        ;;
    3)
        echo ""
        echo "⚛️  Деплой только frontend..."
        echo "🗑️  Удаление старой папки frontend..."
        ssh $SERVER "rm -rf $REMOTE_PATH/frontend"
        
        echo "📤 Загрузка frontend..."
        rsync -avz --progress \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '.DS_Store' \
            --exclude 'dist' \
            $LOCAL_PATH/frontend/ $SERVER:$REMOTE_PATH/frontend/
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "✅ Файлы загружены"
echo ""

# Перезапуск сервисов
echo "🔄 Перезапуск сервисов на сервере..."

if [ "$choice" = "1" ] || [ "$choice" = "2" ]; then
    echo "🐍 Перезапуск backend..."
    ssh $SERVER "sudo systemctl daemon-reload && sudo systemctl restart beauty_crm"
    echo "✅ Backend перезапущен"
fi

if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
    echo "🌐 Перезапуск nginx..."
    ssh $SERVER "sudo systemctl restart nginx"
    echo "✅ Nginx перезапущен"
fi

echo ""
echo "🎉 Деплой завершен успешно!"
echo ""
echo "📊 Проверка статуса сервисов:"
ssh $SERVER "sudo systemctl status beauty_crm --no-pager | head -n 10"
echo ""
echo "📝 Последние 20 строк логов:"
ssh $SERVER "sudo journalctl -u beauty_crm -n 20 --no-pager"
echo ""
echo "🌐 Сайт доступен по адресу: https://mlediamant.com"
echo ""
