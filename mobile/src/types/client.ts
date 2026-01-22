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

export interface Client {
  id?: number;
  instagram_id?: string;
  username?: string;
  name?: string;
  full_name: string; // Primary display name
  phone?: string;
  email?: string;
  profile_pic?: string;
  status: ClientStatus;
  temperature?: ClientTemperature;
  total_visits: number;
  total_spend: number;
  loyalty_points: number;
  discount?: number;
  birthday?: string;
  gender?: string;
  notes?: string;
  labels?: string[];
  is_pinned?: boolean;
  preferred_messenger?: string;
  first_contact?: string;
  last_contact?: string;
  last_visit?: string; // Alias for component compatibility
  language?: string;
}

export interface ClientDashboard {
  client: Client;
  upcoming_bookings: number;
  next_booking?: {
    id: number;
    service_name: string;
    datetime: string;
    master?: string;
  };
  loyalty_points: number;
  loyalty_level?: string;
  total_visits: number;
  total_spend: number;
}

export interface LoyaltyInfo {
  points: number;
  level: string;
  next_level?: string;
  points_to_next_level?: number;
  benefits: string[];
  referral_code?: string;
  referral_bonus?: number;
}
