/**
 * Централизованная обработка ошибок для внешних API вызовов
 */

import { config } from './config';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  originalError?: Error;
}

/**
 * Обработка ошибок внешних API
 */
export const handleExternalApiError = (error: unknown, serviceName: string): ApiError => {
  const apiError: ApiError = {
    message: `Failed to connect to ${serviceName}`,
    originalError: error instanceof Error ? error : new Error(String(error)),
  };

  if (error instanceof Error) {
    apiError.message = error.message || apiError.message;
    
    // Определяем тип ошибки
    if (error.message.includes('fetch')) {
      apiError.code = 'NETWORK_ERROR';
      apiError.message = `Network error: Unable to reach ${serviceName}`;
    } else if (error.message.includes('timeout')) {
      apiError.code = 'TIMEOUT_ERROR';
      apiError.message = `Request to ${serviceName} timed out`;
    } else {
      apiError.code = 'UNKNOWN_ERROR';
    }
  }

  // Логируем только в dev режиме
  if (config.isDev) {
    console.error(`[${serviceName}] Error:`, apiError);
  }

  return apiError;
};

/**
 * Безопасный вызов внешнего API с обработкой ошибок
 */
export const safeExternalApiCall = async <T>(
  apiCall: () => Promise<T>,
  serviceName: string,
  fallbackValue: T
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    const apiError = handleExternalApiError(error, serviceName);
    
    // В продакшене не показываем детальные ошибки пользователю
    if (config.isProd) {
      console.error(`[${serviceName}] Silent error:`, apiError.message);
    }
    
    return fallbackValue;
  }
};

/**
 * Обертка для fetch с таймаутом и обработкой ошибок
 */
export const safeFetch = async (
  url: string,
  options: RequestInit = {},
  timeout: number = config.api.timeout
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    
    throw error;
  }
};
