# Использование валюты в приложении

## Проблема

Ранее валюта была захардкожена как "AED" во многих местах приложения. Это создавало проблемы при изменении валюты в настройках салона.

## Решение

Создана централизованная система управления валютой через настройки салона.

## Компоненты

### 1. Хук `useSalonSettings`

**Файл:** `/frontend/src/hooks/useSalonSettings.ts`

Предоставляет доступ к настройкам салона с кешированием:

```typescript
import { useSalonSettings, useCurrency } from "../hooks/useSalonSettings";

// Получить все настройки
const { settings, loading, currency } = useSalonSettings();

// Получить только валюту
const { currency, loading } = useCurrency();
```

**Особенности:**

- Автоматическое кеширование настроек
- Fallback на 'AED' при ошибке загрузки
- Функция `clearSalonSettingsCache()` для сброса кеша после обновления настроек

### 2. Компонент `Currency`

**Файл:** `/frontend/src/components/shared/Currency.tsx`

Компонент для отображения суммы с валютой:

```tsx
import { Currency } from '../components/shared/Currency';

// Использование
<Currency amount={1000} />
// Выведет: "1,000 AED" (или другую валюту из настроек)

<Currency amount={booking.revenue} showSymbol={true} />
```

### 3. Хук `useFormattedCurrency`

**Файл:** `/frontend/src/components/shared/Currency.tsx`

Хук для получения отформатированной строки с валютой:

```tsx
import { useFormattedCurrency } from "../components/shared/Currency";

const formattedPrice = useFormattedCurrency(service.price);
// Вернет: "500 AED"
```

## Миграция существующего кода

### До:

```tsx
<span>{booking.revenue} AED</span>
```

### После:

```tsx
import { Currency } from "../components/shared/Currency";

<Currency amount={booking.revenue} />;
```

### Или с хуком:

```tsx
import { useFormattedCurrency } from "../components/shared/Currency";

const price = useFormattedCurrency(service.price);
return <span>{price}</span>;
```

## Места, где нужно заменить хардкод

### Критичные компоненты (приоритет 1):

1. ✅ `/frontend/src/pages/admin/Bookings.tsx` - строки 1216, 1220
2. `/frontend/src/pages/admin/ClientDetail.tsx` - строки 544, 760
3. `/frontend/src/pages/admin/Analytics.tsx` - строки 275, 285, 368, 446
4. `/frontend/src/pages/admin/Dashboard.tsx` - уже частично использует `salonSettings?.currency`

### Средний приоритет:

5. `/frontend/src/pages/admin/Users.tsx` - строки 420, 535
6. `/frontend/src/pages/admin/Clients.tsx` - строка 979
7. `/frontend/src/pages/admin/Calendar.tsx` - строка 992
8. `/frontend/src/pages/manager/Dashboard.tsx` - строка 248

### Низкий приоритет (формы создания):

9. `/frontend/src/pages/admin/Services.tsx` - default values в формах
10. `/frontend/src/pages/admin/SpecialPackages.tsx` - default values
11. `/frontend/src/components/admin/EmployeeServices.tsx` - строка 212

### Переводы (не требуют изменений):

- Файлы в `/locales/` содержат примеры с "AED" - это нормально для примеров

## Настройка валюты

Валюта настраивается в:
**Settings → General → Currency**

Доступные валюты:

- AED (Dirham)
- USD (Dollar)
- EUR (Euro)
- RUB (Ruble)
- GBP (Pound)

## Очистка кеша

После обновления настроек салона нужно очистить кеш:

```typescript
import { clearSalonSettingsCache } from "../hooks/useSalonSettings";

// После сохранения настроек
await api.updateSalonSettings(data);
clearSalonSettingsCache(); // Очистить кеш
```

## Тестирование

1. Изменить валюту в Settings
2. Проверить отображение в:
   - Списке записей (Bookings)
   - Аналитике (Analytics)
   - Дашборде (Dashboard)
   - Профилях клиентов (ClientDetail)
3. Убедиться, что новая валюта отображается везде

## Примечания

- Компонент `Currency` автоматически форматирует числа с разделителями тысяч
- При ошибке загрузки настроек используется fallback "AED"
- Кеширование предотвращает множественные запросы к API
