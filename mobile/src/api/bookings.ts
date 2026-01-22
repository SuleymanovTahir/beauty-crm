import apiClient from './client';
import { Booking, BookingFilters, CreateBookingRequest, TimeSlot } from '../types';

interface BookingsResponse {
  bookings: Booking[];
  total?: number;
}

export const bookingsApi = {
  // For employees/admins
  getAll: async (filters?: BookingFilters): Promise<Booking[]> => {
    const response = await apiClient.get<BookingsResponse>('/api/bookings', filters as Record<string, unknown>);
    return response.data.bookings || [];
  },

  getById: async (id: number): Promise<Booking> => {
    const response = await apiClient.get<Booking>(`/api/bookings/${id}`);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Booking> => {
    const response = await apiClient.post<Booking>(`/api/bookings/${id}/status`, { status });
    return response.data;
  },

  // For clients
  getClientBookings: async (): Promise<Booking[]> => {
    const response = await apiClient.get<BookingsResponse>('/api/client/bookings');
    return response.data.bookings || [];
  },

  createClientBooking: async (data: CreateBookingRequest): Promise<Booking> => {
    const response = await apiClient.post<Booking>('/api/client/bookings', data);
    return response.data;
  },

  cancelClientBooking: async (id: number): Promise<void> => {
    await apiClient.post(`/api/client/bookings/${id}/cancel`);
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
      '/api/public/available-slots',
      params
    );
    return response.data.slots || [];
  },
};
