#!/bin/bash

# Скрипт для замены botsettings: на пустую строку в BotSettings.tsx

FILE="/Users/tahir/Desktop/beauty-crm/frontend/src/pages/admin/BotSettings.tsx"

# Создаем backup
cp "$FILE" "$FILE.backup"

# Заменяем все вхождения botsettings: на пустую строку
sed -i '' "s/t('botsettings:/t('/g" "$FILE"
sed -i '' 's/t("botsettings:/t("/g' "$FILE"

echo "✅ Replaced all 'botsettings:' prefixes in BotSettings.tsx"
echo "📁 Backup saved as BotSettings.tsx.backup"
