#!/bin/bash

# Скрипт для запуска всех тестов проекта

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ BEAUTY CRM SYSTEM${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}\n"

# Время начала
START_TIME=$(date +%s)

# Переменные для отслеживания результатов
BACKEND_RESULT=0
FRONTEND_RESULT=0
BUILD_RESULT=0

# ============================================================================
# 1. BACKEND ТЕСТЫ
# ============================================================================
echo -e "\n${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}   📦 BACKEND ТЕСТЫ${NC}"
echo -e "${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}\n"

cd backend

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Создание виртуального окружения...${NC}"
    python3 -m venv venv
fi

# Активация venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || . venv/bin/activate

# Установка зависимостей для тестирования
echo -e "${BLUE}📥 Установка зависимостей для тестирования...${NC}"
pip install -q -r requirements-test.txt

# Запуск тестов
echo -e "\n${BLUE}🚀 Запуск backend тестов...${NC}\n"

if python run_tests.py; then
    echo -e "\n${GREEN}✅ Backend тесты: ПРОЙДЕНЫ${NC}"
    BACKEND_RESULT=0
else
    echo -e "\n${RED}❌ Backend тесты: ПРОВАЛЕНЫ${NC}"
    BACKEND_RESULT=1
fi

cd ..

# ============================================================================
# 2. FRONTEND ТЕСТЫ
# ============================================================================
echo -e "\n${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}   🎨 FRONTEND ТЕСТЫ${NC}"
echo -e "${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}\n"

cd frontend

# Проверка node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Установка npm зависимостей...${NC}"
    npm install
fi

# Установка тестовых зависимостей
echo -e "${BLUE}📥 Установка зависимостей для тестирования...${NC}"
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8

# Запуск тестов
echo -e "\n${BLUE}🚀 Запуск frontend тестов...${NC}\n"

if npm run test:run; then
    echo -e "\n${GREEN}✅ Frontend тесты: ПРОЙДЕНЫ${NC}"
    FRONTEND_RESULT=0
else
    echo -e "\n${RED}❌ Frontend тесты: ПРОВАЛЕНЫ${NC}"
    FRONTEND_RESULT=1
fi

# ============================================================================
# 3. BUILD TEST
# ============================================================================
echo -e "\n${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}   🏗️  ТЕСТ СБОРКИ${NC}"
echo -e "${YELLOW}────────────────────────────────────────────────────────────────────────────────${NC}\n"

echo -e "${BLUE}🔨 Сборка фронтенда...${NC}\n"

if npm run build; then
    echo -e "\n${GREEN}✅ Сборка: УСПЕШНА${NC}"
    BUILD_RESULT=0
else
    echo -e "\n${RED}❌ Сборка: ПРОВАЛЕНА${NC}"
    BUILD_RESULT=1
fi

cd ..

# ============================================================================
# ИТОГОВЫЙ ОТЧЕТ
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   📊 ИТОГОВЫЙ ОТЧЕТ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}\n"

echo -e "📈 ${BLUE}Статистика:${NC}"
echo -e "   ├─ Время выполнения: ${DURATION} секунд"
echo -e "   ├─ Backend тесты: $([ $BACKEND_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "   ├─ Frontend тесты: $([ $FRONTEND_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "   └─ Сборка: $([ $BUILD_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"

TOTAL_RESULT=$((BACKEND_RESULT + FRONTEND_RESULT + BUILD_RESULT))

if [ $TOTAL_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                        ║${NC}"
    echo -e "${GREEN}║                    ✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!                              ║${NC}"
    echo -e "${GREEN}║                                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                        ║${NC}"
    echo -e "${RED}║                    ❌ ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ                           ║${NC}"
    echo -e "${RED}║                                                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${YELLOW}📋 Подробности:${NC}"
    [ $BACKEND_RESULT -ne 0 ] && echo -e "   ❌ Backend тесты провалены - проверьте backend/test_report_*.txt"
    [ $FRONTEND_RESULT -ne 0 ] && echo -e "   ❌ Frontend тесты провалены"
    [ $BUILD_RESULT -ne 0 ] && echo -e "   ❌ Сборка провалена"

    exit 1
fi
