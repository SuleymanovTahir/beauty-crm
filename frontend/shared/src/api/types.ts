// Shared API request/response types
import type {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Booking,
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingFilters,
  BookingStats,
  TimeSlot,
  Service,
  ServiceFilters,
  Employee,
  EmployeeSchedule,
  Client,
  ClientDashboard,
  ClientFilters,
  ClientStats,
  CreateClientRequest,
  UpdateClientRequest,
  LoyaltyInfo,
  Notification,
  ChatMessage,
  Conversation,
  Task,
  SalonSettings,
  PaginatedResponse,
} from '../types';

// Auth API
export interface AuthApi {
  login(data: LoginRequest): Promise<AuthResponse>;
  register(data: RegisterRequest): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  googleLogin(token: string): Promise<AuthResponse>;
  verifyEmail(token: string): Promise<{ success: boolean; message: string }>;
  forgotPassword(email: string): Promise<{ success: boolean; message: string }>;
  resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }>;
}

// Bookings API
export interface BookingsApi {
  getBookings(filters?: BookingFilters): Promise<PaginatedResponse<Booking>>;
  getBooking(id: number): Promise<Booking>;
  createBooking(data: CreateBookingRequest): Promise<Booking>;
  updateBooking(id: number, data: UpdateBookingRequest): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;
  cancelBooking(id: number, reason?: string): Promise<Booking>;
  confirmBooking(id: number): Promise<Booking>;
  completeBooking(id: number): Promise<Booking>;
  getAvailableSlots(serviceId: number, employeeId?: number, date?: string): Promise<TimeSlot[]>;
  getStats(dateRange?: { from: string; to: string }): Promise<BookingStats>;
}

// Services API
export interface ServicesApi {
  getServices(filters?: ServiceFilters): Promise<Service[]>;
  getService(id: number): Promise<Service>;
  getServiceByKey(key: string): Promise<Service>;
  getPublicServices(): Promise<Service[]>;
}

// Employees API
export interface EmployeesApi {
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee>;
  getEmployeeSchedule(id: number, date: string): Promise<EmployeeSchedule>;
  getEmployeeServices(id: number): Promise<Service[]>;
}

// Clients API
export interface ClientsApi {
  getClients(filters?: ClientFilters): Promise<PaginatedResponse<Client>>;
  getClient(id: number | string): Promise<Client>;
  createClient(data: CreateClientRequest): Promise<Client>;
  updateClient(id: number | string, data: UpdateClientRequest): Promise<Client>;
  deleteClient(id: number | string): Promise<void>;
  getClientBookings(id: number | string): Promise<Booking[]>;
  getClientStats(): Promise<ClientStats>;
}

// Client Portal API
export interface ClientPortalApi {
  getDashboard(): Promise<ClientDashboard>;
  getBookings(): Promise<Booking[]>;
  getLoyalty(): Promise<LoyaltyInfo>;
  updateProfile(data: Partial<Client>): Promise<Client>;
}

// Notifications API
export interface NotificationsApi {
  getNotifications(): Promise<Notification[]>;
  markAsRead(id: number): Promise<void>;
  markAllAsRead(): Promise<void>;
  getUnreadCount(): Promise<number>;
}

// Chat API
export interface ChatApi {
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation>;
  getMessages(conversationId: number): Promise<ChatMessage[]>;
  sendMessage(conversationId: number, content: string, type?: string): Promise<ChatMessage>;
  markAsRead(conversationId: number): Promise<void>;
}

// Tasks API
export interface TasksApi {
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task>;
  createTask(data: Partial<Task>): Promise<Task>;
  updateTask(id: number, data: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  completeTask(id: number): Promise<Task>;
}

// Settings API
export interface SettingsApi {
  getSalonSettings(): Promise<SalonSettings>;
  updateSalonSettings(data: Partial<SalonSettings>): Promise<SalonSettings>;
}

// Combined API interface
export interface BeautyCrmApi {
  auth: AuthApi;
  bookings: BookingsApi;
  services: ServicesApi;
  employees: EmployeesApi;
  clients: ClientsApi;
  clientPortal: ClientPortalApi;
  notifications: NotificationsApi;
  chat: ChatApi;
  tasks: TasksApi;
  settings: SettingsApi;
}
