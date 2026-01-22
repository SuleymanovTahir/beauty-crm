import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_DURATION } from '../constants/config';

interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = '@beauty_crm_cache_';

export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!data) return null;

      const item: CacheItem<T> = JSON.parse(data);

      // Check if expired
      if (Date.now() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_DURATION): Promise<void> {
    try {
      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  },

  /**
   * Remove cached value
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Cache remove error for key ${key}:`, error);
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  /**
   * Get or fetch with cache
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_DURATION
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Save to cache
    await this.set(key, data, ttl);

    return data;
  },

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(
        (k) => k.startsWith(CACHE_PREFIX) && k.includes(pattern)
      );
      await AsyncStorage.multiRemove(matchingKeys);
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  },
};

// Cache keys constants
export const CACHE_KEYS = {
  SERVICES: 'services',
  EMPLOYEES: 'employees',
  CLIENT_PROFILE: 'client_profile',
  CLIENT_BOOKINGS: 'client_bookings',
  LOYALTY: 'loyalty',
  SALON_SETTINGS: 'salon_settings',
} as const;

// Helper function to create cache key with params
export function createCacheKey(base: string, params?: Record<string, unknown>): string {
  if (!params) return base;
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('_');
  return `${base}_${sortedParams}`;
}
