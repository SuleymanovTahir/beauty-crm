import apiClient from './client';
import { API_ENDPOINTS } from '@beauty-crm/shared/api';
import type { Booking, BookingFilters, CreateBookingRequest, TimeSlot } from '@beauty-crm/shared/types';

interface BookingsResponse {
  bookings: Booking[];
  total?: number;
}

export const bookingsApi = {
  // For employees/admins
  getAll: async (filters?: BookingFilters): Promise<Booking[]> => {
    const response = await apiClient.get<BookingsResponse>(API_ENDPOINTS.BOOKINGS.LIST, filters as Record<string, unknown>);
    return response.data.bookings || [];
  },

  getById: async (id: number): Promise<Booking> => {
    const response = await apiClient.get<Booking>(API_ENDPOINTS.BOOKINGS.DETAIL(id));
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Booking> => {
    const response = await apiClient.post<Booking>(`${API_ENDPOINTS.BOOKINGS.DETAIL(id)}/status`, { status });
    return response.data;
  },

  confirm: async (id: number): Promise<Booking> => {
    const response = await apiClient.post<Booking>(API_ENDPOINTS.BOOKINGS.CONFIRM(id));
    return response.data;
  },

  complete: async (id: number): Promise<Booking> => {
    const response = await apiClient.post<Booking>(API_ENDPOINTS.BOOKINGS.COMPLETE(id));
    return response.data;
  },

  cancel: async (id: number, reason?: string): Promise<Booking> => {
    const response = await apiClient.post<Booking>(API_ENDPOINTS.BOOKINGS.CANCEL(id), { reason });
    return response.data;
  },

  // For clients (client portal)
  getClientBookings: async (): Promise<Booking[]> => {
    const response = await apiClient.get<BookingsResponse>(API_ENDPOINTS.CLIENT_PORTAL.BOOKINGS);
    return response.data.bookings || [];
  },

  createClientBooking: async (data: CreateBookingRequest): Promise<Booking> => {
    const response = await apiClient.post<Booking>(API_ENDPOINTS.CLIENT_PORTAL.BOOKINGS, data);
    return response.data;
  },

  cancelClientBooking: async (id: number): Promise<void> => {
    await apiClient.post(`${API_ENDPOINTS.CLIENT_PORTAL.BOOKINGS}/${id}/cancel`);
  },

  // Available time slots
  getAvailableSlots: async (
    date: string,
    serviceKey: string,
    masterId?: number
  ): Promise<TimeSlot[]> => {
    const params: Record<string, unknown> = { date, service_key: serviceKey };
    if (masterId) params.master_id = masterId;

    const response = await apiClient.get<{ slots: TimeSlot[] }>(
      API_ENDPOINTS.BOOKINGS.AVAILABLE_SLOTS,
      params
    );
    return response.data.slots || [];
  },
};
