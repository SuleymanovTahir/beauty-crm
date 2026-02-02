/**
 * Утилиты для работы с датами
 */

/**
 * Форматирует дату для Google Calendar (ISO формат без разделителей)
 * @param date - дата для форматирования
 * @returns Строка в формате YYYYMMDDTHHmmssZ
 */
export const formatDateForGoogle = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Получает сегодняшнюю дату в формате YYYY-MM-DD
 * @returns Строка даты в формате ISO
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Форматирует дату для отображения
 * @param dateString - строка даты
 * @param language - код языка (ru, en, etc.)
 * @param options - опции форматирования
 * @returns Отформатированная дата
 */
export const formatDate = (dateString: string, language: string = 'ru', options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

/**
 * Вычисляет разницу в днях между двумя датами
 * @param date1 - первая дата
 * @param date2 - вторая дата
 * @returns Количество дней
 */
export const getDaysDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};
