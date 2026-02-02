// Shared formatting utilities for web and mobile

/**
 * Format price with currency symbol
 */
export function formatPrice(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format price range
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (minPrice === maxPrice) {
    return formatPrice(minPrice, currency, locale);
  }
  return `${formatPrice(minPrice, currency, locale)} - ${formatPrice(maxPrice, currency, locale)}`;
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    // Russian format: +7 (XXX) XXX-XX-XX
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('971')) {
    // UAE format: +971 XX XXX XXXX
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  // Default: just add + if starts with digits
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return phone;
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(
  minutes: number,
  t?: (key: string, options?: Record<string, unknown>) => string
): string {
  if (minutes < 60) {
    return t ? t('time.minutes', { count: minutes }) : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return t ? t('time.hours', { count: hours }) : `${hours}h`;
  }

  return t
    ? `${t('time.hours', { count: hours })} ${t('time.minutes', { count: mins })}`
    : `${hours}h ${mins}m`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return '';

  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word[0]?.toUpperCase())
    .slice(0, maxLength)
    .join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Title case
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}
