// Shared common types for web and mobile

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  error_type?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Generic list response
export interface ListResponse<T> {
  items: T[];
  total?: number;
}

// Notification types
export type NotificationType =
  | 'booking_new'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'booking_completed'
  | 'message_new'
  | 'client_new'
  | 'task_assigned'
  | 'task_due'
  | 'payment_received'
  | 'review_new'
  | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
}

// Chat/Message types
export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_type: 'user' | 'client' | 'system';
  sender?: {
    id: number;
    full_name: string;
    photo_url?: string;
  };
  content: string;
  type: MessageType;
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Conversation {
  id: number;
  client_id?: number;
  client?: {
    id: number;
    full_name: string;
    profile_pic?: string;
  };
  participant_ids?: number[];
  last_message?: ChatMessage;
  unread_count: number;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

// Task types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  due_time?: string;
  assigned_to?: number;
  assigned_by?: number;
  client_id?: number;
  booking_id?: number;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

// Settings types
export interface SalonSettings {
  id: number;
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  working_hours?: {
    [key: string]: { start: string; end: string; is_working: boolean };
  };
  timezone?: string;
  currency: string;
  business_type?: 'beauty' | 'restaurant' | 'construction' | 'factory' | 'taxi' | 'delivery' | 'other';
  product_mode?: 'crm' | 'site' | 'both';
  crm_enabled?: boolean;
  site_enabled?: boolean;
  business_profile_config?: BusinessProfileConfig;
  language: string;
  booking_settings?: {
    min_advance_hours?: number;
    max_advance_days?: number;
    cancellation_hours?: number;
    auto_confirm?: boolean;
    require_deposit?: boolean;
  };
  notification_settings?: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
    reminder_hours?: number;
  };
}

export interface BusinessProfileConfig {
  schema_version: number;
  business_type: 'beauty' | 'restaurant' | 'construction' | 'factory' | 'taxi' | 'delivery' | 'other';
  modules: {
    crm: Record<string, boolean>;
    site: Record<string, boolean>;
  };
  role_permissions: Record<string, string[] | '*'>;
  shared_domains: Record<string, string>;
}

export interface BusinessProfileMatrixResponse {
  schema_version: number;
  module_catalog: {
    crm: string[];
    site: string[];
  };
  role_catalog: string[];
  profiles: Record<string, BusinessProfileConfig>;
  current: {
    business_type: string;
    product_mode: string;
    crm_enabled: boolean;
    site_enabled: boolean;
    business_profile_config: BusinessProfileConfig;
  };
}

// File/Media types
export interface MediaFile {
  id: number;
  url: string;
  filename: string;
  type: 'image' | 'video' | 'document' | 'audio';
  size: number;
  mime_type: string;
  created_at: string;
}

// Date/Time helpers
export interface DateRange {
  start: string;
  end: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

// Currency
export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// Language
export interface Language {
  code: string;
  name: string;
  native_name: string;
  flag?: string;
}
