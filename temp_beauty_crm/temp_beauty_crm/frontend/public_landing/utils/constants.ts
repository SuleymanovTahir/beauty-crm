/**
 * Константы для публичной страницы
 * Централизованное хранение конфигурационных значений
 */

// Типы для TypeScript
export type ExternalService = keyof typeof EXTERNAL_SERVICES;
export type DefaultValue = keyof typeof DEFAULT_VALUES;
export type Limit = keyof typeof LIMITS;
export type Timeout = keyof typeof TIMEOUTS;
export type TimeInterval = keyof typeof TIME_INTERVALS;

// Внешние сервисы
export const EXTERNAL_SERVICES = {
  IP_API: 'https://ipapi.co/json/',
  GOOGLE_MAPS: 'https://maps.google.com',
  WHATSAPP_BASE: 'https://wa.me/',
  GOOGLE_CALENDAR: 'https://calendar.google.com/calendar/render',
  GOOGLE_SEARCH: 'https://www.google.com/search',
} as const;

// Значения по умолчанию
export const DEFAULT_VALUES = {
  COUNTRY_CODE: '',
  PHONE_MIN_LENGTH: 5,
  CURRENCY: '',
  DEFAULT_EMAIL: '',
  DEFAULT_SALON_NAME: '',
  DEFAULT_SALON_NAME_ALT: '',
  DEFAULT_PHONE: '',
  DEFAULT_ADDRESS: '',
  DEFAULT_WHATSAPP: '',
  DEFAULT_INSTAGRAM: '',
} as const;

// Магические числа
export const LIMITS = {
  DISPLAY_SERVICES_COUNT: 12,
  HISTORY_LENGTH_THRESHOLD: 2,
  PHONE_MIN_LENGTH: 5,
  PHONE_MAX_LENGTH: 15,
} as const;

// Таймауты (в миллисекундах)
export const TIMEOUTS = {
  API_REQUEST: 10000,
  DEBOUNCE_SEARCH: 300,
  STATE_EXPIRY: 60 * 60 * 1000, // 1 hour
} as const;

// Временные интервалы
export const TIME_INTERVALS = {
  ONE_HOUR_MS: 60 * 60 * 1000,
  TWO_HOURS_MS: 2 * 60 * 60 * 1000,
} as const;
