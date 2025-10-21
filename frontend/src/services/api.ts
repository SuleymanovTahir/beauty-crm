// frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Добавляем токен если он сохранен
    const token = localStorage.getItem('session_token');
    if (token) {
      // На backend это будет читаться из Cookie, но добавим и в header на всякий случай
      headers['Authorization'] = `Bearer ${token}`;
    }

    const defaultOptions: RequestInit = {
      headers,
      credentials: 'include', // Включить куки для сессий
      ...options,
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ===== АВТОРИЗАЦИЯ =====
  async login(username: string, password: string) {
    const formData = new FormData();
    formData.append('email', username); // Backend ожидает 'email' параметр
    formData.append('password', password);

    const response = await this.request('/api/login', {
      method: 'POST',
      body: formData,
      headers: {},
    });

    // Сохраняем токен для дальнейших запросов
    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  private setToken(token: string) {
    // Сохраняем токен для использования в будущих запросах
    (this as any).token = token;
  }

  async logout() {
    return this.request('/api/logout', { method: 'POST' });
  }

  // ===== КЛИЕНТЫ =====
  async getClients() {
    return this.request('/api/clients');
  }

  async getClientDetail(clientId: string) {
    return this.request(`/api/clients/${clientId}`);
  }

  async updateClient(clientId: string, data: any) {
    return this.request(`/api/clients/${clientId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClientStatus(clientId: string, status: string) {
    return this.request(`/admin/api/clients/${clientId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async pinClient(clientId: string) {
    return this.request(`/admin/api/clients/${clientId}/pin`, {
      method: 'POST',
    });
  }

  // ===== ЗАПИСИ =====
  async getBookings() {
    return this.request('/api/bookings');
  }

  async getBookingDetail(bookingId: number) {
    return this.request(`/api/bookings/${bookingId}`);
  }

  async createBooking(data: any) {
    return this.request('/api/bookings/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBookingStatus(bookingId: number, status: string) {
    return this.request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // ===== ЧАТ =====
  async sendMessage(instagramId: string, message: string) {
    return this.request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ instagram_id: instagramId, message }),
    });
  }

  async getChatHistory(clientId: string, limit: number = 50) {
    return this.request(`/api/chat/${clientId}/history?limit=${limit}`);
  }

  // ===== УСЛУГИ =====
  async getServices() {
    return this.request('/api/services');
  }

  async createService(data: any) {
    return this.request('/admin/api/services/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(serviceId: number, data: any) {
    return this.request(`/admin/api/services/${serviceId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteService(serviceId: number) {
    return this.request(`/admin/api/services/${serviceId}/delete`, {
      method: 'POST',
    });
  }

  // ===== АНАЛИТИКА =====
  async getStats() {
    return this.request('/api/stats');
  }

  async getAnalytics(period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `/api/analytics?period=${period}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }
    return this.request(url);
  }

  async getFunnel() {
    return this.request('/api/funnel');
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====
  async getUsers() {
    return this.request('/api/users');
  }

  async deleteUser(userId: number) {
    return this.request(`/admin/api/users/${userId}/delete`, {
      method: 'POST',
    });
  }

  // ===== ЭКСПОРТ =====
  async exportClients(format: string = 'csv') {
    const response = await fetch(`${this.baseURL}/admin/api/export/clients?format=${format}`, {
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    return new URL(blob);
  }
}

// Экспортируем глобальный экземпляр
export const api = new ApiClient();