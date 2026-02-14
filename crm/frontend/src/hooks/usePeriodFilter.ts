import { useMemo } from 'react';

interface UsePeriodFilterParams<T> {
  items: T[];
  period: string;
  dateFrom: string;
  dateTo: string;
  getItemDate: (item: T) => string | Date;
}

export function usePeriodFilter<T>({
  items,
  period,
  dateFrom,
  dateTo,
  getItemDate
}: UsePeriodFilterParams<T>) {
  return useMemo(() => {
    if (period === 'all') {
      return items;
    }

    return items.filter(item => {
      const itemDate = new Date(getItemDate(item));
      const now = new Date();

      if (period === 'today') {
        return itemDate.toDateString() === now.toDateString();
      }
      
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      }
      
      if (period === '7' || period === '14' || period === '30' || period === '90') {
        const days = parseInt(period);
        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return itemDate >= daysAgo;
      }
      
      if (period === 'custom' && dateFrom && dateTo) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999); // Включаем конец дня
        return itemDate >= from && itemDate <= to;
      }

      return true;
    });
  }, [items, period, dateFrom, dateTo, getItemDate]);
}