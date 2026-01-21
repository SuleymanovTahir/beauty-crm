#!/bin/bash

# Скрипт для замены всех type="date" на CRMDatePicker во всех файлах CRM
# Исключаем файлы в public_landing/pages/account/booking (новая система бронирования)

echo "🔧 Начинаем замену календарей..."

# Найдем все файлы с type="date" в src, исключая DateTimeStep
files=$(grep -rl 'type="date"' /Users/tahir/Desktop/beauty-crm/frontend/src --include="*.tsx" | grep -v "DateTimeStep")

count=0
for file in $files; do
    echo "📝 Обрабатываем: $file"
    
    # Проверяем, есть ли уже импорт CRMDatePicker
    if ! grep -q "import.*CRMDatePicker" "$file"; then
        # Находим последний import и добавляем после него
        sed -i '' "/^import.*from/a\\
import { CRMDatePicker } from '../../components/shared/CRMDatePicker';
" "$file" 2>/dev/null || sed -i '' "/^import.*from/a\\
import { CRMDatePicker } from '../../../components/shared/CRMDatePicker';
" "$file" 2>/dev/null || sed -i '' "/^import.*from/a\\
import { CRMDatePicker } from '../../../../components/shared/CRMDatePicker';
" "$file"
    fi
    
    ((count++))
done

echo "✅ Обработано файлов: $count"
echo "⚠️  ВНИМАНИЕ: Необходимо вручную заменить <input type=\"date\"> на <CRMDatePicker>"
echo "   Используйте поиск и замену в IDE для каждого файла"
