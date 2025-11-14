// frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://mlediamant.com')

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options,
    }


    try {
      const response = await fetch(url, defaultOptions)

      if (response.status === 401) {
        localStorage.removeItem('user')
        localStorage.removeItem('session_token')
        window.location.href = '/login'
        throw new Error('Сессия истекла. Пожалуйста, перезагрузитесь.')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || error.message || `API Error: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }

  }

  // ===== АВТОРИЗАЦИЯ =====
  async login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await this.request<any>('/api/login', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    if (response.token) {
      localStorage.setItem('session_token', response.token)
    }

    return response
  }

  async register(username: string, password: string, full_name: string, email: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)

    return this.request<any>('/api/register', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async verifyEmail(email: string, code: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)
    formData.append('code', code)

    return this.request<any>('/api/verify-email', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async resendVerification(email: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)

    return this.request<any>('/api/resend-verification', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async askBotAdvice(question: string, context?: string) {
    return this.request('/api/chat/ask-bot', {
      method: 'POST',
      body: JSON.stringify({
        question: question,
        context: context || ''
      }),
    })
  }

  async getBotSuggestion(clientId: string) {
    return this.request('/api/chat/bot-suggest', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId }),
    })
  }

  async updateClientBotMode(clientId: string, mode: 'manual' | 'assistant' | 'autopilot') {
    return this.request(`/api/clients/${clientId}/bot-mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    })
  }

  async updateBotGloballyEnabled(enabled: boolean) {
    return this.request('/api/settings/bot-globally-enabled', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    })
  }

  async logout() {
    try {
      await this.request('/api/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('session_token')
    }
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    return this.request<any>('/api/dashboard')
  }

  async getStats() {
    return this.request<any>('/api/stats')
  }


  async getAnalytics(period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `/api/analytics?period=${period}`
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`
    }
    return this.request<any>(url)
  }

  async getFunnel() {
    return this.request<any>('/api/funnel')
  }
  // ===== НАСТРОЙКИ САЛОНА =====
  async getSalonSettings() {
    return this.request<any>('/api/salon-settings')
  }

  async updateSalonSettings(data: any) {
    return this.request('/api/salon-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getUserProfile(userId: number) {
    return this.request<any>(`/api/users/${userId}/profile`)
  }

  async updateUserProfile(userId: number, data: { username: string; full_name: string; email?: string }) {
    return this.request(`/api/users/${userId}/update-profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async changePassword(userId: number, data: { new_password: string; old_password?: string }) {
    return this.request(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  // ===== КЛИЕНТЫ =====
  async getClients() {
    return this.request<any>('/api/clients')
  }

  async getClientUnreadCount(clientId: string) {
    return this.request<any>(`/api/chat/unread/${clientId}`)
  }

  async getClient(clientId: string) {
    return this.request<any>(`/api/clients/${clientId}`)
  }

  async updateClient(clientId: string, data: any) {
    return this.request(`/api/clients/${clientId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClientStatus(clientId: string, status: string) {
    return this.request(`/api/clients/${clientId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async pinClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/pin`, {
      method: 'POST',
    })
  }

  async deleteClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/delete`, {
      method: 'POST',
    })
  }

  async createClient(data: any) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== ЗАПИСИ =====
  async getBookings() {
    return this.request<any>('/api/bookings')
  }

  async getBooking(bookingId: number) {
    return this.request<any>(`/api/bookings/${bookingId}`)
  }

  async createBooking(data: any) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBookingStatus(key: string, data: any) {
    return this.request(`/api/statuses/booking/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ===== ЗАМЕТКИ КЛИЕНТА =====
  async getClientNotes(clientId: string) {
    return this.request<any>(`/api/clients/${clientId}/notes`)
  }

  async addClientNote(clientId: string, noteText: string) {
    return this.request(`/api/clients/${clientId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note_text: noteText }),
    })
  }

  async deleteClientNote(clientId: string, noteId: number) {
    return this.request(`/api/clients/${clientId}/notes/${noteId}`, {
      method: 'DELETE',
    })
  }

  async updateClientNote(clientId: string, noteId: number, noteText: string) {
    return this.request(`/api/clients/${clientId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ note_text: noteText }),
    })
  }

  // ===== ЧАТ =====
  async sendMessage(instagramId: string, message: string) {
    return this.request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ instagram_id: instagramId, message }),
    })
  }

  // ✅ НОВОЕ: Отправка файлов
  async sendFile(instagramId: string, fileUrl: string, fileType: string = 'image') {
    return this.request('/api/chat/send-file', {
      method: 'POST',
      body: JSON.stringify({
        instagram_id: instagramId,
        file_url: fileUrl,
        file_type: fileType
      }),
    })
  }


  async getChatMessages(clientId: string, limit: number = 50) {
    return this.request(`/api/chat/messages?client_id=${clientId}&limit=${limit}`)
  }

  // ===== УСЛУГИ =====
  async getServices(activeOnly: boolean = true) {
    return this.request<any>(`/api/services?active_only=${activeOnly}`)
  }

  async createService(data: any) {
    return this.request('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateService(serviceId: number, data: any) {
    return this.request(`/api/services/${serviceId}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteService(serviceId: number) {
    return this.request(`/api/services/${serviceId}/delete`, {
      method: 'POST',
    })
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====
  async getUsers() {
    return this.request<any>('/api/users')
  }

  // После getUsers() (примерно строка 150)

  async getRoles(): Promise<{ roles: Array<{key: string; name: string; level: number}> }> {
    const response = await fetch('/api/roles', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Ошибка загрузки ролей');
    return response.json();
  }



  async createUser(data: { username: string; password: string; full_name: string; email?: string; role: string }) {
    const formData = new FormData()
    formData.append('username', data.username)
    formData.append('password', data.password)
    formData.append('full_name', data.full_name)
    if (data.email) formData.append('email', data.email)
    formData.append('role', data.role)

    const response = await fetch(`${this.baseURL}/register`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Ошибка создания пользователя')
    }

    return response.json().catch(() => ({ success: true }))
  }

  async deleteUser(userId: number) {
    return this.request(`/api/users/${userId}/delete`, {
      method: 'POST',
    })
  }


  // ===== ЭКСПОРТ =====
  async exportClients(format: string = 'csv') {
    const response = await fetch(`${this.baseURL}/api/export/clients?format=${format}`, {
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Export failed')

    return response.blob()
  }

  // Экспорт с обработкой длинных названий
  async exportAnalytics(format: string = 'csv', period: number = 30, dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/analytics?format=${format}&period=${period}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }

    return response.blob();
  }

  async exportMessages(clientId?: string, format: string = 'csv', dateFrom?: string, dateTo?: string) {
    let url = `${this.baseURL}/api/export/messages?format=${format}`;
    if (clientId) url += `&client_id=${clientId}`;
    if (dateFrom && dateTo) {
      url += `&date_from=${dateFrom}&date_to=${dateTo}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Export failed');

    return response.blob();
  }

  async exportFullData(format: string = 'csv') {
    const response = await fetch(`${this.baseURL}/api/export/full-data?format=${format}`, {
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Export failed')

    return response.blob()
  }



  // ===== UNREAD COUNT =====
  async getUnreadCount() {
    return this.request<any>('/api/unread-count')
  }

  // ===== BOT SETTINGS =====
  async getBotSettings() {
    return this.request<any>('/api/bot-settings')  // ✅ Правильный путь
  }

  async updateBotSettings(data: any) {
    return this.request('/api/settings/bot', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== SPECIAL PACKAGES =====
  async getSpecialPackages() {
    return this.request<any>('/api/special-packages')
  }

  async createSpecialPackage(data: any) {
    return this.request('/api/special-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSpecialPackage(packageId: number, data: any) {
    return this.request(`/api/special-packages/${packageId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteSpecialPackage(packageId: number) {
    return this.request(`/api/special-packages/${packageId}`, {
      method: 'DELETE',
    })
  }

  // ===== РОЛИ И ПРАВА =====


  async createRole(data: { role_key: string; role_name: string; role_description?: string }) {
    return this.request('/api/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteRole(roleKey: string) {
    return this.request(`/api/roles/${roleKey}`, {
      method: 'DELETE',
    })
  }

  async getRolePermissions(roleKey: string) {
    return this.request<any>(`/api/roles/${roleKey}/permissions`)
  }

  async updateRolePermissions(roleKey: string, permissions: any) {
    return this.request(`/api/roles/${roleKey}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissions }),
    })
  }

  async getAvailablePermissions() {
    return this.request<any>('/api/permissions/available')
  }

  async getUserPermissions(userId: number) {
    return this.request<any>(`/api/users/${userId}/permissions`)
  }
  
  async updateUserRole(userId: number, role: string) {
    return this.request(`/api/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  // ===== РЕАКЦИИ =====
  async reactToMessage(messageId: number, emoji: string) {
    return this.request('/api/chat/react', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, emoji }),
    })
  }

  async getMessageReactions(messageId: number) {
    return this.request<any>(`/api/chat/reactions/${messageId}`)
  }

  // ===== ШАБЛОНЫ СООБЩЕНИЙ =====
  async getMessageTemplates() {
    return this.request<any>('/api/chat/templates')
  }

  async createMessageTemplate(data: { title: string; content: string; category?: string }) {
    return this.request('/api/chat/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: data.title,
        content: data.content,
        category: data.category || 'general'
      }),
    })
  }

  async updateMessageTemplate(templateId: number, data: { name?: string; title?: string; content?: string; category?: string }) {
    const requestData: any = {};

    // Добавляем только те поля, которые переданы
    if (data.title !== undefined) requestData.name = data.title;
    if (data.name !== undefined) requestData.name = data.name;
    if (data.content !== undefined) requestData.content = data.content;
    if (data.category !== undefined) requestData.category = data.category;

    return this.request(`/api/chat/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    })
  }

  async deleteMessageTemplate(templateId: number) {
    return this.request(`/api/chat/templates/${templateId}`, {
      method: 'DELETE',
    })
  }

  // ===== ОТЛОЖЕННЫЕ СООБЩЕНИЯ =====
  async scheduleMessage(clientId: string, message: string, sendAt: string) {
    return this.request('/api/chat/schedule', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, message, send_at: sendAt }),
    })
  }

  async getScheduledMessages() {
    return this.request<any>('/api/chat/scheduled')
  }

  async cancelScheduledMessage(messageId: number) {
    return this.request(`/api/chat/scheduled/${messageId}/cancel`, {
      method: 'POST',
    })
  }

  // После метода deleteMessageTemplate, добавь:

  // ===== СТАТУСЫ =====
  async getClientStatuses() {
    return this.request<any>('/api/statuses/client')
  }

  async createClientStatus(data: { status_key: string; status_label: string; status_color: string }) {
    return this.request('/api/statuses/client', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteClientStatus(statusKey: string) {
    return this.request(`/api/statuses/client/${statusKey}`, {
      method: 'DELETE',
    })
  }



  async createBookingStatus(data: { status_key: string; status_label: string; status_color: string }) {
    return this.request('/api/statuses/booking', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBookingStatuses() {
    return this.request<any>('/api/statuses/booking')
  }

  // После метода deleteClientNote добавить:

  // ===== МАСТЕРА =====
  async getMasters() {
    return this.request<any>('/api/masters')
  }

  async addMasterTimeOff(masterId: number, data: { date_from: string; date_to: string; reason?: string }) {
    return this.request(`/api/masters/${masterId}/time-off`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getMasterTimeOff(masterId: number) {
    return this.request<any>(`/api/masters/${masterId}/time-off`)
  }

  async deleteMasterTimeOff(timeOffId: number) {
    return this.request(`/api/masters/time-off/${timeOffId}`, {
      method: 'DELETE',
    })
  }

  async addSalonHoliday(data: { date: string; name?: string }) {
    return this.request('/api/salon/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getSalonHolidays() {
    return this.request<any>('/api/salon/holidays')
  }

  async deleteSalonHoliday(date: string) {
    return this.request(`/api/salon/holidays/${date}`, {
      method: 'DELETE',
    })
  }

  async updateUserPermissions(userId: number, data: { permissions: any }) {
    return this.request(`/api/users/${userId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== EMPLOYEE PROFILE (Self-Service) =====
  async getMyEmployeeProfile() {
    return this.request<any>('/api/employees/my-profile')
  }

  async updateMyEmployeeProfile(data: {
    full_name?: string;
    name_ru?: string;
    name_ar?: string;
    position?: string;
    position_ru?: string;
    position_ar?: string;
    experience?: string;
    photo?: string;
    bio?: string;
    phone?: string;
    email?: string;
    instagram?: string;
  }) {
    return this.request('/api/employees/my-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || error.detail || 'Upload failed')
    }

    return response.json()
  }

  // ===== USER MANAGEMENT =====
  async getPendingUsers() {
    return this.request<any>('/api/pending-users')
  }

  async approveUser(userId: number) {
    return this.request(`/api/users/${userId}/approve`, {
      method: 'POST',
    })
  }

  async rejectUser(userId: number) {
    return this.request(`/api/users/${userId}/reject`, {
      method: 'POST',
    })
  }

  async grantPermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/${resource}/grant`, {
      method: 'POST',
    })
  }

  async revokePermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/${resource}/revoke`, {
      method: 'POST',
    })
  }

  // ===== MY PROFILE =====
  async getMyProfile() {
    return this.request<any>('/api/my-profile')
  }

  async updateMyProfile(data: {
    username?: string
    full_name?: string
    email?: string
    current_password?: string
    new_password?: string
    photo_url?: string
  }) {
    return this.request('/api/my-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }


}

export const api = new ApiClient()