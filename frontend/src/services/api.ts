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
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        // Выбрасываем объект с полной информацией об ошибке
        const error: any = new Error(errorData.error || errorData.message || `API Error: ${response.status}`)
        error.error_type = errorData.error_type
        error.email = errorData.email
        error.status = response.status
        throw error
      }

      return response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }

  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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

  async register(username: string, password: string, full_name: string, email: string, phone: string, role: string = 'employee', position: string = '', privacy_accepted: boolean = false, newsletter_subscribed: boolean = true) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('full_name', full_name)
    formData.append('email', email)
    formData.append('phone', phone)
    formData.append('role', role)
    formData.append('position', position)
    formData.append('privacy_accepted', privacy_accepted.toString())
    formData.append('newsletter_subscribed', newsletter_subscribed.toString())

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

  async forgotPassword(email: string) {
    const formData = new URLSearchParams()
    formData.append('email', email)

    return this.request<any>('/api/forgot-password', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  async resetPassword(token: string, newPassword: string) {
    const formData = new URLSearchParams()
    formData.append('token', token)
    formData.append('new_password', newPassword)

    return this.request<any>('/api/reset-password', {
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

  async deleteAccount(password: string, confirm: boolean) {
    return this.request('/api/account/delete', {
      method: 'POST',
      body: JSON.stringify({ password, confirm }),
    })
  }

  // ===== DASHBOARD =====
  async getDashboard() {
    return this.request<any>('/api/dashboard')
  }

  async getStats(comparisonPeriod: string = '7days') {
    return this.request<any>(`/api/stats?comparison_period=${comparisonPeriod}`)
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

  // ===== FEEDBACK =====
  async getFeedbackStats() {
    return this.request<any>('/api/feedback/stats')
  }

  async submitFeedback(data: any) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ===== ПЛАНЫ И ЦЕЛИ =====
  // Role-based plan methods
  async getMyPlans() {
    return this.request<any>('/api/plans/my-plans')
  }

  async getMyPlanForMetric(metricType: string, periodType?: string) {
    const url = periodType
      ? `/api/plans/my-plan/${metricType}?period_type=${periodType}`
      : `/api/plans/my-plan/${metricType}`
    return this.request<any>(url)
  }

  async getRolePlans(roleKey: string, activeOnly: boolean = true) {
    return this.request<any>(`/api/plans/role/${roleKey}?active_only=${activeOnly}`)
  }

  async createRolePlan(roleKey: string, metricType: string, targetValue: number,
    periodType: string, visibleToRoles?: string[],
    canEditRoles?: string[], startDate?: string, endDate?: string) {
    const data: any = {
      role_key: roleKey,
      metric_type: metricType,
      target_value: targetValue,
      period_type: periodType
    }
    if (visibleToRoles) data.visible_to_roles = visibleToRoles
    if (canEditRoles) data.can_edit_roles = canEditRoles
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate

    return this.request('/api/plans/role', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createIndividualPlan(userId: number, metricType: string, targetValue: number,
    periodType: string, startDate?: string, endDate?: string) {
    const data: any = {
      user_id: userId,
      metric_type: metricType,
      target_value: targetValue,
      period_type: periodType
    }
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate

    return this.request('/api/plans/individual', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async canEditPlan(planId: number) {
    return this.request<any>(`/api/plans/${planId}/can-edit`)
  }

  // Backward compatibility methods
  async getPlans(activeOnly: boolean = true) {
    return this.request<any>(`/api/plans?active_only=${activeOnly}`)
  }

  async getPlan(metricType: string, periodType?: string) {
    const url = periodType
      ? `/api/plans/${metricType}?period_type=${periodType}`
      : `/api/plans/${metricType}`
    return this.request<any>(url)
  }

  async setPlan(metricType: string, targetValue: number, periodType: string, startDate?: string, endDate?: string) {
    const data: any = { metric_type: metricType, target_value: targetValue, period_type: periodType }
    if (startDate) data.start_date = startDate
    if (endDate) data.end_date = endDate

    return this.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPlanProgress(metricType: string, currentValue: number) {
    return this.request<any>(`/api/plans/${metricType}/progress?current_value=${currentValue}`)
  }

  async deletePlan(planId: number) {
    return this.request(`/api/plans/${planId}`, {
      method: 'DELETE',
    })
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

  async getUserProfileByUsername(username: string) {
    return this.request<any>(`/api/users/by-username/${username}/profile`)
  }

  async updateUserProfile(userId: number, data: { username: string; full_name: string; email?: string; position?: string; photo?: string }) {
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
  async getClients(messenger: string = 'instagram') {
    return this.request<any>(`/api/clients?messenger=${messenger}`)
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

  async updateClientTemperature(clientId: string, temperature: string) {
    return this.request(`/api/clients/${clientId}/temperature`, {
      method: 'POST',
      body: JSON.stringify({ temperature }),
    })
  }

  async pinClient(clientId: string) {
    return this.request(`/api/clients/${clientId}/pin`, {
      method: 'POST',
    })
  }

  async deleteClient(clientId: string) {
    return this.request(`/api/clients/${encodeURIComponent(clientId)}/delete`, {
      method: 'POST',
    })
  }

  async createClient(data: any) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bulkAction(action: string, clientIds: string[]) {
    return this.request('/api/clients/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, client_ids: clientIds }),
    })
  }

  // ===== ЗАПИСИ =====
  async getBookings() {
    return this.request<any>('/api/bookings')
  }

  async getClientBookings() {
    return this.request<any>('/api/client/bookings')
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

  async cancelBooking(bookingId: number) {
    return this.request(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'cancelled' }),
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


  async getChatMessages(clientId: string, limit: number = 50, messenger: string = 'instagram') {
    return this.request(`/api/chat/messages?client_id=${clientId}&limit=${limit}&messenger=${messenger}`)
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

  // ===== СОТРУДНИКИ =====
  async getEmployeesForService(serviceId: number) {
    return this.request<{ employees: Array<{ id: number; full_name: string; position: string; photo: string | null; is_active: boolean }> }>(`/api/services/${serviceId}/employees`)
  }

  async getEmployeeBusySlots(employeeId: number, date: string) {
    return this.request<{ busy_slots: Array<{ booking_id: number; start_time: string; end_time: string; service_name: string }> }>(`/api/employees/${employeeId}/busy-slots?date=${date}`)
  }

  // ===== ПОЛЬЗОВАТЕЛИ =====
  async getUsers() {
    return this.request<any>(`/api/users?_t=${Date.now()}`)
  }

  // После getUsers() (примерно строка 150)

  async getRoles(): Promise<{ roles: Array<{ key: string; name: string; level: number }> }> {
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

  // ===== ИМПОРТ =====
  async importClients(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/api/clients/import`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Import failed' }))
      throw new Error(error.detail || 'Import failed')
    }

    return response.json()
  }


  // ===== NOTIFICATIONS =====
  async getNotifications(unreadOnly: boolean = false, limit: number = 50) {
    return this.request<{ notifications: any[] }>(`/api/notifications?unread_only=${unreadOnly}&limit=${limit}`)
  }

  async markNotificationRead(id: number) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'POST',
    })
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'POST',
    })
  }

  // ===== UNREAD COUNT =====
  async getUnreadCount() {
    return this.request<any>('/api/notifications/unread-count')
  }

  async getTotalUnread() {
    return this.request<{ unread_count: number }>('/api/notifications/unread-count').then(data => ({ total: data.unread_count }))
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
    return this.request<any>(`/api/permissions/user/${userId}`)
  }

  async updateUserRole(userId: number, role: string) {
    return this.request(`/api/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  async updateUserCustomPermissions(userId: number, permissions: Record<string, boolean>) {
    return this.request(`/api/permissions/user/${userId}/custom`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    })
  }

  async getAllRoles() {
    return this.request<any>('/api/permissions/roles')
  }

  async getPermissionDescriptions() {
    return this.request<any>('/api/permissions/descriptions')
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

  async getMyProfile() {
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

  // ===== ГРАФИК РАБОТЫ =====
  async getUserSchedule(userId: number) {
    return this.request<any[]>(`/api/schedule/user/${userId}`)
  }

  async updateUserSchedule(userId: number, schedule: any[]) {
    return this.request(`/api/schedule/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    })
  }

  async getUserTimeOff(userId: number) {
    return this.request<any[]>(`/api/schedule/user/${userId}/time-off`)
  }

  async addUserTimeOff(userId: number, data: { start_datetime: string; end_datetime: string; type: string; reason?: string }) {
    return this.request(`/api/schedule/user/${userId}/time-off`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTimeOff(id: number) {
    return this.request(`/api/schedule/time-off/${id}`, {
      method: 'DELETE',
    })
  }

  async rejectUser(userId: number) {
    return this.request(`/api/users/${userId}/reject`, {
      method: 'POST',
    })
  }

  async grantPermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/grant`, {
      method: 'POST',
      body: JSON.stringify({ resource }),
    })
  }

  async revokePermission(userId: number, resource: string) {
    return this.request(`/api/users/${userId}/permissions/revoke`, {
      method: 'POST',
      body: JSON.stringify({ resource }),
    })
  }

  // ===== РАСПИСАНИЕ (НОВОЕ) =====
  async getWorkingHours(masterName: string) {
    return this.request<any>(`/api/schedule/${masterName}/working-hours`)
  }

  async setWorkingHours(masterName: string, dayOfWeek: number, startTime: string, endTime: string) {
    return this.request(`/api/schedule/${masterName}/working-hours`, {
      method: 'POST',
      body: JSON.stringify({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime
      }),
    })
  }

  async addTimeOff(masterName: string, startDate: string, endDate: string, type: string = 'vacation', reason?: string) {
    return this.request(`/api/schedule/${masterName}/time-off`, {
      method: 'POST',
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        type: type,
        reason: reason
      }),
    })
  }

  async getTimeOffs(masterName: string) {
    return this.request<any>(`/api/schedule/${masterName}/time-off`)
  }

  async getAvailableSlots(masterName: string, date: string, duration: number = 60) {
    return this.request<{
      success: boolean;
      master: string;
      date: string;
      available_slots: { time: string; is_optimal: boolean }[];
      count: number;
    }>(`/api/schedule/${masterName}/available-slots?date=${date}&duration=${duration}`)
  }

  async getAvailableDates(masterName: string, year: number, month: number, duration: number = 60) {
    return this.request<{
      success: boolean;
      master: string;
      year: number;
      month: number;
      available_dates: string[]; // YYYY-MM-DD
    }>(`/api/schedule/${masterName}/available-dates?year=${year}&month=${month}&duration=${duration}`)
  }

  async createHold(data: { service_id: number, master_name: string, date: string, time: string, client_id: string }) {
    return this.request<{ success: boolean; error?: string }>('/api/bookings/hold', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAllMastersAvailability(date: string) {
    return this.request<{
      success: boolean;
      date: string;
      availability: Record<string, string[]>;
    }>(`/api/schedule/available-slots?date=${date}`);
  }

  async getHolidays(start?: string, end?: string): Promise<any[]> {
    const params: any = {};
    if (start) params.start_date = start;
    if (end) params.end_date = end;

    // Note: We use the public fetch wrapper if available or standard request
    try {
      // Using 'request' helper which wraps fetch
      return this.request<any[]>('/api/holidays?' + new URLSearchParams(params).toString());
    } catch (e) {
      console.error("Failed to fetch holidays", e);
      return [];
    }
  }

  async createHoliday(data: { date: string; name: string; is_closed?: boolean; master_exceptions?: number[] }) {
    return this.request<{ success: boolean }>('/api/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteHoliday(date: string) {
    return this.request<{ success: boolean }>(`/api/holidays/${date}`, {
      method: 'DELETE',
    });
  }


  // ===== BOOKING REMINDERS =====
  async getBookingReminderSettings() {
    return this.request<{ settings: any[] }>('/api/booking-reminder-settings')
  }

  async createBookingReminderSetting(data: any) {
    return this.request('/api/booking-reminder-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async toggleBookingReminderSetting(id: number) {
    return this.request(`/api/booking-reminder-settings/${id}/toggle`, {
      method: 'PUT',
    })
  }

  async deleteBookingReminderSetting(id: number) {
    return this.request(`/api/booking-reminder-settings/${id}`, {
      method: 'DELETE',
    })
  }

  // ===== MESSENGERS =====
  async getMessengerSettings() {
    return this.request<{ settings: any[] }>('/api/messengers/settings')
  }

  async updateMessengerSetting(type: string, data: any) {
    return this.request(`/api/messengers/settings/${type}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ===== MESSENGERS =====
  async getEnabledMessengers() {
    return this.request<{
      enabled_messengers: Array<{
        type: string
        name: string
      }>
    }>('/api/messengers/enabled')
  }

  // ===== POSITIONS =====
  async getPositions(activeOnly: boolean = true) {
    return this.request<{
      positions: Array<{
        id: number
        name: string
        name_en?: string
        name_ar?: string
        description?: string
        is_active: number
        sort_order: number
        created_at: string
        updated_at: string
      }>
    }>(`/api/positions?active_only=${activeOnly}`)
  }
  // ===== BROADCASTS =====
  async getUserSubscriptions() {
    return this.request<{
      subscriptions: Record<string, { is_subscribed: boolean; channels: { email: boolean; telegram: boolean; instagram: boolean } }>;
      available_types: Record<string, { name: string; description: string }>;
    }>('/api/subscriptions')
  }

  async updateSubscription(type: string, isSubscribed: boolean, channels?: { email?: boolean; telegram?: boolean; instagram?: boolean }) {
    const data: any = {
      subscription_type: type,
      is_subscribed: isSubscribed
    };
    if (channels) {
      if (channels.email !== undefined) data.email_enabled = channels.email;
      if (channels.telegram !== undefined) data.telegram_enabled = channels.telegram;
      if (channels.instagram !== undefined) data.instagram_enabled = channels.instagram;
    }
    return this.request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async previewBroadcast(data: {
    subscription_type: string;
    channels: string[];
    subject: string;
    message: string;
    target_role?: string;
  }) {
    return this.request<{
      total_users: number;
      by_channel: Record<string, number>;
      users_sample: Array<{
        id: number;
        username: string;
        full_name: string;
        role: string;
        contact: string;
        channel: string;
      }>;
    }>('/api/broadcasts/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendBroadcast(data: {
    subscription_type: string;
    channels: string[];
    subject: string;
    message: string;
    target_role?: string;
  }) {
    return this.request<{
      success: boolean;
      results: Record<string, { sent: number; failed: number }>;
      message: string;
    }>('/api/broadcasts/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBroadcastHistory() {
    return this.request<{
      history: Array<{
        id: number;
        subscription_type: string;
        channels: string[];
        subject: string;
        total_sent: number;
        created_at: string;
        results: string;
      }>;
    }>('/api/broadcasts/history')
  }

  async getSalonWorkingHours() {
    return this.get('/api/salon-settings/working-hours');
  }
}

export const api = new ApiClient()
