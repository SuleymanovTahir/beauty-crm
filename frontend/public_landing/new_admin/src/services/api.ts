const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async getUsers() {
    const response = await fetch(`${API_URL}/api/users`);
    return response.json();
  },

  async getServices() {
    const response = await fetch(`${API_URL}/api/services`);
    return response.json();
  },

  async getClientBookings() {
    const response = await fetch(`${API_URL}/api/client/bookings`);
    return response.json();
  },

  async getPublicAvailableSlots(date: string, masterId: number) {
    const response = await fetch(`${API_URL}/api/public/available-slots?date=${date}&master_id=${masterId}`);
    return response.json();
  },

  async getAvailableDates(masterName: string, year: number, month: number, duration: number) {
    const response = await fetch(
      `${API_URL}/api/available-dates?master=${masterName}&year=${year}&month=${month}&duration=${duration}`
    );
    return response.json();
  },

  async getAllMastersAvailability(date: string) {
    const response = await fetch(`${API_URL}/api/all-masters-availability?date=${date}`);
    return response.json();
  },

  async getHolidays() {
    const response = await fetch(`${API_URL}/api/holidays`);
    return response.json();
  },

  async createHold(data: any) {
    const response = await fetch(`${API_URL}/api/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async createBooking(data: any) {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async cancelBooking(bookingId: number) {
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};
