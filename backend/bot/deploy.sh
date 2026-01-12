#!/bin/bash

# 🚀 Скрипт деплоя Beauty CRM
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

SERVER_IP="91.201.215.32"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/beauty_crm"

echo "======================================================================"
echo "🚀 ДЕПЛОЙ BEAUTY CRM - HOTFIX"
echo "======================================================================"
echo "Сервер: $SERVER_USER@$SERVER_IP"
echo "Домен: mlediamant.com"
echo "Путь: $SERVER_PATH"
echo ""
echo "🔥 Исправления:"
echo "  ✅ user_status таблица"
echo "  ✅ loyalty API endpoints (/admin/loyalty/*)"
echo "  ✅ beauty metrics SQL ошибка"
echo "  ✅ 20+ недостающих API endpoints"
echo ""

# Синхронизация файлов
echo "📦 Синхронизация backend..."
rsync -avz --progress \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='static/uploads/*' \
    --exclude='static/recordings/*' \
    ./backend/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/"

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
    echo "📊 Статус beauty_crm:"
    sudo systemctl status beauty_crm --no-pager -l | head -10
EOF

echo ""
echo "======================================================================"
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "======================================================================"
echo ""
echo "🔍 Проверка:"
echo "  1. Откройте: https://mlediamant.com/crm"
echo "  2. Проверьте внутренний чат (должен работать)"
echo "  3. Проверьте программу лояльности"
echo ""
echo "📋 Логи в реальном времени:"
echo "  ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u beauty_crm -f'"
echo ""
