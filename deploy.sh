#!/bin/bash

# 🚀 Скрипт деплоя Beauty CRM
# Использование: ./deploy.sh [server_ip]

set -e  # Остановка при ошибке

SERVER_IP="${1:-32.235}"  # IP сервера (по умолчанию 32.235)
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/beauty_crm"

echo "======================================================================"
echo "🚀 ДЕПЛОЙ BEAUTY CRM"
echo "======================================================================"
echo "Сервер: $SERVER_USER@$SERVER_IP"
echo "Путь: $SERVER_PATH"
echo ""

# Проверка SSH доступа
echo "📡 Проверка SSH доступа..."
if ! ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo "❌ Не удалось подключиться к серверу!"
    echo "Проверьте:"
    echo "  1. IP адрес сервера: $SERVER_IP"
    echo "  2. SSH ключ настроен"
    echo "  3. Сервер доступен"
    exit 1
fi
echo "✅ SSH доступ OK"
echo ""

# Синхронизация файлов
echo "📦 Синхронизация файлов..."
echo "Backend..."
rsync -avz --progress \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='static/uploads/*' \
    --exclude='static/recordings/*' \
    ./backend/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/"

echo ""
echo "Frontend..."
rsync -avz --progress \
    --exclude='node_modules/' \
    --exclude='dist/' \
    --exclude='build/' \
    --exclude='.DS_Store' \
    ./frontend/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/frontend/"

echo ""
echo "✅ Файлы синхронизированы"
echo ""

# Перезапуск сервисов на сервере
echo "🔄 Перезапуск сервисов..."
ssh "$SERVER_USER@$SERVER_IP" << 'EOF'
    set -e

    echo "📝 Reload systemd daemon..."
    sudo systemctl daemon-reload

    echo "🔄 Restart beauty_crm service..."
    sudo systemctl restart beauty_crm

    echo "🔄 Restart nginx..."
    sudo systemctl restart nginx

    echo ""
    echo "✅ Сервисы перезапущены"
    echo ""

    # Проверка статуса
    echo "📊 Проверка статуса сервисов..."
    echo ""
    echo "Beauty CRM:"
    sudo systemctl status beauty_crm --no-pager -l | head -5
    echo ""
    echo "Nginx:"
    sudo systemctl status nginx --no-pager -l | head -5
EOF

echo ""
echo "======================================================================"
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!"
echo "======================================================================"
echo ""
echo "📋 Полезные команды:"
echo "  Логи в реальном времени:"
echo "    ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u beauty_crm -f'"
echo ""
echo "  Статус сервиса:"
echo "    ssh $SERVER_USER@$SERVER_IP 'sudo systemctl status beauty_crm'"
echo ""
echo "  Перезапуск сервиса:"
echo "    ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart beauty_crm'"
echo ""
