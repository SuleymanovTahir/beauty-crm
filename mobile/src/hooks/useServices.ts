import { useState, useEffect, useCallback } from 'react';
import { servicesApi, employeesApi } from '../api/services';
import { Service, Employee } from '../types';
import { cache, CACHE_KEYS, createCacheKey } from '../utils/cache';
import { getNetworkStatus } from './useOffline';

interface UseServicesReturn {
  services: Service[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useServices(language: string = 'ru'): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async (forceRefresh = false) => {
    const cacheKey = createCacheKey(CACHE_KEYS.SERVICES, { language });

    try {
      // Try cache first if online and not forcing refresh
      if (!forceRefresh) {
        const cached = await cache.get<Service[]>(cacheKey);
        if (cached) {
          setServices(cached);
          setLoading(false);
          return;
        }
      }

      // Check network
      const { isOnline } = getNetworkStatus();
      if (!isOnline) {
        const cached = await cache.get<Service[]>(cacheKey);
        if (cached) {
          setServices(cached);
        }
        setError('Нет подключения к интернету');
        setLoading(false);
        return;
      }

      // Fetch from API
      const data = await servicesApi.getAll(language);
      const activeServices = data.filter((s) => s.is_active);

      setServices(activeServices);
      setError(null);

      // Cache the result
      await cache.set(cacheKey, activeServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Ошибка загрузки услуг');

      // Try to use cached data
      const cached = await cache.get<Service[]>(cacheKey);
      if (cached) {
        setServices(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchServices(true);
  }, [fetchServices]);

  return { services, loading, error, refresh };
}

interface UseEmployeesReturn {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEmployees(serviceKey?: string): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    const cacheKey = createCacheKey(CACHE_KEYS.EMPLOYEES, { serviceKey });

    try {
      // Try cache first
      if (!forceRefresh) {
        const cached = await cache.get<Employee[]>(cacheKey);
        if (cached) {
          setEmployees(cached);
          setLoading(false);
          return;
        }
      }

      // Check network
      const { isOnline } = getNetworkStatus();
      if (!isOnline) {
        const cached = await cache.get<Employee[]>(cacheKey);
        if (cached) {
          setEmployees(cached);
        }
        setError('Нет подключения к интернету');
        setLoading(false);
        return;
      }

      // Fetch from API
      const data = serviceKey
        ? await employeesApi.getByService(serviceKey)
        : await employeesApi.getAll();

      const serviceProviders = data.filter((e) => e.is_service_provider);

      setEmployees(serviceProviders);
      setError(null);

      // Cache the result
      await cache.set(cacheKey, serviceProviders);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Ошибка загрузки мастеров');

      // Try to use cached data
      const cached = await cache.get<Employee[]>(cacheKey);
      if (cached) {
        setEmployees(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [serviceKey]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchEmployees(true);
  }, [fetchEmployees]);

  return { employees, loading, error, refresh };
}
