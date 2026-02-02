// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

// App Configuration
export const APP_NAME = 'Beauty CRM';
export const DEFAULT_LANGUAGE = 'ru';
export const SUPPORTED_LANGUAGES = ['ru', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt'];

// Cache Configuration
export const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Booking Configuration
export const MIN_BOOKING_ADVANCE_HOURS = 2;
export const MAX_BOOKING_ADVANCE_DAYS = 30;
