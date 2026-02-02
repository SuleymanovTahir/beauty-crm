import { useState, useEffect, useCallback } from 'react';
import { bookingsApi } from '../api/bookings';
import { Booking, BookingFilters, CreateBookingRequest } from '../types';
import { cache, CACHE_KEYS } from '../utils/cache';
import { getNetworkStatus } from './useOffline';

interface UseClientBookingsReturn {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBooking: (data: CreateBookingRequest) => Promise<{ success: boolean; error?: string }>;
  cancelBooking: (id: number) => Promise<{ success: boolean; error?: string }>;
}

export function useClientBookings(): UseClientBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (forceRefresh = false) => {
    const cacheKey = CACHE_KEYS.CLIENT_BOOKINGS;

    try {
      // Try cache first
      if (!forceRefresh) {
        const cached = await cache.get<Booking[]>(cacheKey);
        if (cached) {
          setBookings(cached);
          setLoading(false);
          // Continue to fetch fresh data in background
        }
      }

      // Check network
      const { isOnline } = getNetworkStatus();
      if (!isOnline) {
        if (!bookings.length) {
          const cached = await cache.get<Booking[]>(cacheKey);
          if (cached) setBookings(cached);
        }
        setError('Нет подключения к интернету');
        setLoading(false);
        return;
      }

      // Fetch from API
      const data = await bookingsApi.getClientBookings();
      const sorted = data.sort(
        (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );

      setBookings(sorted);
      setError(null);

      // Cache the result
      await cache.set(cacheKey, sorted);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Ошибка загрузки записей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBookings(true);
  }, [fetchBookings]);

  const createBooking = useCallback(
    async (data: CreateBookingRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const { isOnline } = getNetworkStatus();
        if (!isOnline) {
          return { success: false, error: 'Нет подключения к интернету' };
        }

        await bookingsApi.createClientBooking(data);

        // Invalidate cache and refresh
        await cache.remove(CACHE_KEYS.CLIENT_BOOKINGS);
        await fetchBookings(true);

        return { success: true };
      } catch (err) {
        console.error('Error creating booking:', err);
        return { success: false, error: 'Ошибка создания записи' };
      }
    },
    [fetchBookings]
  );

  const cancelBooking = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const { isOnline } = getNetworkStatus();
        if (!isOnline) {
          return { success: false, error: 'Нет подключения к интернету' };
        }

        await bookingsApi.cancelClientBooking(id);

        // Update local state
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
        );

        // Invalidate cache
        await cache.remove(CACHE_KEYS.CLIENT_BOOKINGS);

        return { success: true };
      } catch (err) {
        console.error('Error cancelling booking:', err);
        return { success: false, error: 'Ошибка отмены записи' };
      }
    },
    []
  );

  return { bookings, loading, error, refresh, createBooking, cancelBooking };
}

// Hook for employee bookings with filters
interface UseEmployeeBookingsReturn {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (id: number, status: string) => Promise<{ success: boolean; error?: string }>;
}

export function useEmployeeBookings(filters?: BookingFilters): UseEmployeeBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const { isOnline } = getNetworkStatus();
      if (!isOnline) {
        setError('Нет подключения к интернету');
        setLoading(false);
        return;
      }

      const data = await bookingsApi.getAll(filters);
      const sorted = data.sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );

      setBookings(sorted);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Ошибка загрузки записей');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBookings();
  }, [fetchBookings]);

  const updateStatus = useCallback(
    async (id: number, status: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { isOnline } = getNetworkStatus();
        if (!isOnline) {
          return { success: false, error: 'Нет подключения к интернету' };
        }

        await bookingsApi.updateStatus(id, status);

        // Update local state
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: status as Booking['status'] } : b))
        );

        return { success: true };
      } catch (err) {
        console.error('Error updating status:', err);
        return { success: false, error: 'Ошибка обновления статуса' };
      }
    },
    []
  );

  return { bookings, loading, error, refresh, updateStatus };
}
