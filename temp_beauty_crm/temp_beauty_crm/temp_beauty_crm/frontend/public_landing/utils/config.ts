/**
 * Конфигурация для разных окружений
 */

type Environment = 'development' | 'staging' | 'production';

const getEnvironment = (): Environment => {
  if (import.meta.env.DEV) return 'development';
  if (import.meta.env.MODE === 'staging') return 'staging';
  return 'production';
};

export const config = {
  env: getEnvironment(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  api: {
    baseUrl: import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin),
    timeout: 10000,
  },

  features: {
    enableDebugLogs: import.meta.env.DEV,
    enablePerformanceMonitoring: import.meta.env.PROD,
  },
} as const;
