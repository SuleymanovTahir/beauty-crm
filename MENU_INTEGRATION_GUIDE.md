# Инструкция по завершению интеграции настроек меню

## Что уже сделано ✅

1. ✅ Backend API для настроек меню (`/api/menu-settings`)
2. ✅ Таблица `menu_settings` в БД
3. ✅ Страница настройки меню (`/crm/menu-customization`)
4. ✅ Методы API в `api.ts`
5. ✅ Роут добавлен в `App.tsx`

## Что нужно доделать (5 минут работы)

### 1. Добавить состояние в AdminLayout.tsx

В строке ~58, после `const [userProfile, setUserProfile] = useState<any>(null);` добавить:

```tsx
const [menuSettings, setMenuSettings] = useState<{
  menu_order: string[] | null;
  hidden_items: string[] | null;
} | null>(null);
```

### 2. Добавить загрузку настроек в useEffect

В строке ~68, после `loadUserProfile();` добавить:

```tsx
loadMenuSettings();
```

### 3. Добавить функцию loadMenuSettings

После функции `loadUserProfile` (примерно строка 115) добавить:

```tsx
const loadMenuSettings = async () => {
  try {
    const settings = await api.getMenuSettings();
    setMenuSettings(settings);
  } catch (error) {
    console.error("Error loading menu settings:", error);
    setMenuSettings({ menu_order: null, hidden_items: null });
  }
};
```

### 4. Применить настройки к menuItems

В useMemo для menuItems (строка ~165), ПОСЛЕ фильтрации по правам, добавить:

```tsx
// Фильтруем только те пункты, к которым есть доступ
let filteredItems = allItems.filter((item) => item.requirePermission());

// Применяем настройки меню
if (menuSettings?.menu_order && menuSettings.menu_order.length > 0) {
  // Сортируем по сохраненному порядку
  const ordered = menuSettings.menu_order
    .map((id) => filteredItems.find((item) => item.path.includes(id)))
    .filter(Boolean);

  // Добавляем новые пункты, которых не было в настройках
  filteredItems.forEach((item) => {
    if (!ordered.find((o) => o?.path === item.path)) {
      ordered.push(item);
    }
  });

  filteredItems = ordered;
}

// Фильтруем скрытые пункты
if (menuSettings?.hidden_items && menuSettings.hidden_items.length > 0) {
  filteredItems = filteredItems.filter((item) => {
    const itemId = item.path.split("/").pop();
    return !menuSettings.hidden_items?.includes(itemId || "");
  });
}

return filteredItems;
```

### 5. Обновить зависимости useMemo

Изменить строку с зависимостями:

```tsx
}, [permissions, unreadCount, menuSettings, t]);
```

### 6. Добавить ссылку на настройку меню в Settings

В файле `/frontend/src/pages/admin/Settings.tsx` добавить кнопку:

```tsx
<Button onClick={() => navigate("/crm/menu-customization")} variant="outline">
  <Menu className="w-4 h-4 mr-2" />
  Настроить меню
</Button>
```

## Готово! 🎉

После этих изменений:

- Меню будет автоматически применять сохраненный порядок
- Скрытые пункты не будут отображаться
- Пользователи смогут настраивать меню через `/crm/menu-customization`

## Альтернатива (если не хочется редактировать AdminLayout)

Можно просто добавить пункт "Настройка меню" в Settings и пользоваться страницей настройки.
Настройки будут сохраняться, но не применяться автоматически до перезагрузки страницы.
