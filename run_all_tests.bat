@echo off
REM Скрипт для запуска всех тестов проекта (Windows)

setlocal enabledelayedexpansion

echo ================================================================================
echo    🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ BEAUTY CRM SYSTEM
echo ================================================================================
echo.

set START_TIME=%TIME%
set BACKEND_RESULT=0
set FRONTEND_RESULT=0
set BUILD_RESULT=0

REM ============================================================================
REM 1. BACKEND ТЕСТЫ
REM ============================================================================
echo.
echo --------------------------------------------------------------------------------
echo    📦 BACKEND ТЕСТЫ
echo --------------------------------------------------------------------------------
echo.

cd backend

REM Проверка виртуального окружения
if not exist "venv" (
    echo ⚠️  Создание виртуального окружения...
    python -m venv venv
)

REM Активация venv
call venv\Scripts\activate.bat

REM Установка зависимостей
echo 📥 Установка зависимостей для тестирования...
pip install -q -r requirements-test.txt

REM Запуск тестов
echo.
echo 🚀 Запуск backend тестов...
echo.

python run_tests.py
if errorlevel 1 (
    echo.
    echo ❌ Backend тесты: ПРОВАЛЕНЫ
    set BACKEND_RESULT=1
) else (
    echo.
    echo ✅ Backend тесты: ПРОЙДЕНЫ
    set BACKEND_RESULT=0
)

cd ..

REM ============================================================================
REM 2. FRONTEND ТЕСТЫ
REM ============================================================================
echo.
echo --------------------------------------------------------------------------------
echo    🎨 FRONTEND ТЕСТЫ
echo --------------------------------------------------------------------------------
echo.

cd frontend

REM Проверка node_modules
if not exist "node_modules" (
    echo ⚠️  Установка npm зависимостей...
    call npm install
)

REM Установка тестовых зависимостей
echo 📥 Установка зависимостей для тестирования...
call npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8

REM Запуск тестов
echo.
echo 🚀 Запуск frontend тестов...
echo.

call npm run test:run
if errorlevel 1 (
    echo.
    echo ❌ Frontend тесты: ПРОВАЛЕНЫ
    set FRONTEND_RESULT=1
) else (
    echo.
    echo ✅ Frontend тесты: ПРОЙДЕНЫ
    set FRONTEND_RESULT=0
)

REM ============================================================================
REM 3. BUILD TEST
REM ============================================================================
echo.
echo --------------------------------------------------------------------------------
echo    🏗️  ТЕСТ СБОРКИ
echo --------------------------------------------------------------------------------
echo.

echo 🔨 Сборка фронтенда...
echo.

call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Сборка: ПРОВАЛЕНА
    set BUILD_RESULT=1
) else (
    echo.
    echo ✅ Сборка: УСПЕШНА
    set BUILD_RESULT=0
)

cd ..

REM ============================================================================
REM ИТОГОВЫЙ ОТЧЕТ
REM ============================================================================
echo.
echo ================================================================================
echo    📊 ИТОГОВЫЙ ОТЧЕТ
echo ================================================================================
echo.

set /a TOTAL_RESULT=BACKEND_RESULT+FRONTEND_RESULT+BUILD_RESULT

echo 📈 Статистика:
if %BACKEND_RESULT%==0 (
    echo    ├─ Backend тесты: ✅ PASS
) else (
    echo    ├─ Backend тесты: ❌ FAIL
)

if %FRONTEND_RESULT%==0 (
    echo    ├─ Frontend тесты: ✅ PASS
) else (
    echo    ├─ Frontend тесты: ❌ FAIL
)

if %BUILD_RESULT%==0 (
    echo    └─ Сборка: ✅ PASS
) else (
    echo    └─ Сборка: ❌ FAIL
)

if %TOTAL_RESULT%==0 (
    echo.
    echo ╔════════════════════════════════════════════════════════════════════════╗
    echo ║                                                                        ║
    echo ║                    ✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!                              ║
    echo ║                                                                        ║
    echo ╚════════════════════════════════════════════════════════════════════════╝
    exit /b 0
) else (
    echo.
    echo ╔════════════════════════════════════════════════════════════════════════╗
    echo ║                                                                        ║
    echo ║                    ❌ ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ                           ║
    echo ║                                                                        ║
    echo ╚════════════════════════════════════════════════════════════════════════╝
    echo.
    echo 📋 Подробности:
    if %BACKEND_RESULT% neq 0 echo    ❌ Backend тесты провалены - проверьте backend\test_report_*.txt
    if %FRONTEND_RESULT% neq 0 echo    ❌ Frontend тесты провалены
    if %BUILD_RESULT% neq 0 echo    ❌ Сборка провалена
    exit /b 1
)
