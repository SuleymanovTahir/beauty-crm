// Shared booking types for web and mobile

export type BookingStatus =
  | 'new'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'in_progress';

export type BookingSource =
  | 'instagram'
  | 'website'
  | 'phone'
  | 'walk-in'
  | 'referral'
  | 'app'
  | 'whatsapp'
  | 'telegram'
  | 'other';

export interface Booking {
  id: number;
  instagram_id?: string;
  client_id?: number;
  client?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
  };
  service_name: string;
  service_key?: string;
  service_id?: number;
  datetime: string;
  end_datetime?: string;
  phone?: string;
  name?: string;
  master?: string;
  master_id?: number;
  employee?: {
    id: number;
    full_name: string;
    photo_url?: string;
  };
  status: BookingStatus;
  revenue?: number;
  price?: number;
  currency?: string;
  source?: BookingSource;
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at?: string;
  reminder_sent?: boolean;
  confirmation_sent?: boolean;
  rating?: number;
  rating_comment?: string;
}

export interface CreateBookingRequest {
  service_key?: string;
  service_id?: number;
  datetime: string;
  master_id?: number;
  client_id?: number;
  phone?: string;
  name?: string;
  email?: string;
  notes?: string;
  source?: BookingSource;
}

export interface UpdateBookingRequest {
  service_key?: string;
  service_id?: number;
  datetime?: string;
  master_id?: number;
  status?: BookingStatus;
  notes?: string;
  internal_notes?: string;
  revenue?: number;
}

export interface TimeSlot {
  time: string;
  datetime?: string;
  available: boolean;
  employee_id?: number;
}

export interface DaySchedule {
  date: string;
  slots: TimeSlot[];
  is_working_day: boolean;
}

export interface BookingFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  status?: BookingStatus;
  master_id?: number;
  client_id?: string | number;
  service_id?: number;
  source?: BookingSource;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BookingStats {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  average_revenue: number;
}
