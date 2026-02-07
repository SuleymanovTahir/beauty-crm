// Shared client types for web and mobile

export type ClientStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'lead'
  | 'booked'
  | 'customer'
  | 'vip'
  | 'inactive'
  | 'blocked';

export type ClientTemperature = 'cold' | 'warm' | 'hot';

export type ClientSource =
  | 'instagram'
  | 'website'
  | 'referral'
  | 'walk-in'
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'google'
  | 'other';

export interface Client {
  id?: number;
  instagram_id?: string;
  username?: string;
  name?: string;
  full_name: string;
  phone?: string;
  email?: string;
  profile_pic?: string;
  status: ClientStatus;
  temperature?: ClientTemperature;
  source?: ClientSource;
  total_visits: number;
  total_spend: number;
  currency?: string;
  loyalty_points: number;
  loyalty_level?: string;
  discount?: number;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
  internal_notes?: string;
  labels?: string[];
  tags?: string[];
  is_pinned?: boolean;
  preferred_messenger?: string;
  preferred_language?: string;
  first_contact?: string;
  last_contact?: string;
  last_visit?: string;
  language?: string;
  address?: string;
  city?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
  assigned_employee_id?: number;
}

export interface ClientDashboard {
  client: Client;
  upcoming_bookings: number;
  past_bookings: number;
  next_booking?: {
    id: number;
    service_name: string;
    datetime: string;
    master?: string;
    master_id?: number;
  };
  recent_bookings?: {
    id: number;
    service_name: string;
    datetime: string;
    status: string;
  }[];
  loyalty_points: number;
  loyalty_level?: string;
  total_visits: number;
  total_spend: number;
  favorite_services?: string[];
  preferred_employee?: {
    id: number;
    full_name: string;
    photo_url?: string;
  };
}

export interface LoyaltyInfo {
  points: number;
  level: string;
  next_level?: string;
  points_to_next_level?: number;
  progress_percent?: number;
  benefits: string[];
  referral_code?: string;
  referral_bonus?: number;
  referrals_count?: number;
  history?: {
    id: number;
    points: number;
    type: 'earned' | 'redeemed' | 'expired' | 'bonus';
    description: string;
    created_at: string;
  }[];
}

export interface ClientFilters {
  status?: ClientStatus;
  temperature?: ClientTemperature;
  source?: ClientSource;
  search?: string;
  labels?: string[];
  date_from?: string;
  date_to?: string;
  min_visits?: number;
  min_spend?: number;
  assigned_employee_id?: number;
  is_pinned?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ClientStats {
  total: number;
  new_this_month: number;
  active: number;
  vip: number;
  inactive: number;
  average_spend: number;
  total_revenue: number;
}

export interface CreateClientRequest {
  full_name: string;
  phone?: string;
  email?: string;
  instagram_id?: string;
  source?: ClientSource;
  notes?: string;
  labels?: string[];
  birthday?: string;
  gender?: string;
}

export interface UpdateClientRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  status?: ClientStatus;
  temperature?: ClientTemperature;
  notes?: string;
  internal_notes?: string;
  labels?: string[];
  birthday?: string;
  gender?: string;
  discount?: number;
  is_pinned?: boolean;
  preferred_messenger?: string;
  assigned_employee_id?: number;
}
