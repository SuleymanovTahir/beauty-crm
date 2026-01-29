// Shared service types for web and mobile
import type { TimeSlot } from './booking';

export type ServiceCategory =
  | 'manicure'
  | 'pedicure'
  | 'lashes'
  | 'brows'
  | 'cosmetics'
  | 'hair'
  | 'massage'
  | 'body'
  | 'makeup'
  | 'spa'
  | 'other';

export interface Service {
  id: number;
  key: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  description_ru?: string;
  description_en?: string;
  description_ar?: string;
  price: number;
  min_price?: number;
  max_price?: number;
  currency: string;
  category?: ServiceCategory;
  duration?: number; // in minutes
  benefits?: string[];
  is_active: boolean;
  image_url?: string;
  sort_order?: number;
  requires_deposit?: boolean;
  deposit_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceWithEmployees extends Service {
  employees?: Employee[];
}

export interface Employee {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  role: string;
  photo_url?: string;
  bio?: string;
  bio_ru?: string;
  bio_en?: string;
  specialization?: string;
  years_of_experience?: number;
  is_service_provider: boolean;
  services?: string[];
  service_ids?: number[];
  rating?: number;
  reviews_count?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface EmployeeSchedule {
  employee_id: number;
  date: string;
  working_hours: {
    start: string;
    end: string;
  };
  breaks?: {
    start: string;
    end: string;
  }[];
  available_slots: TimeSlot[];
}

// TimeSlot is imported from booking.ts to avoid duplication

export interface ServiceCategory_DB {
  id: number;
  key: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface ServiceFilters {
  category?: ServiceCategory;
  is_active?: boolean;
  search?: string;
  employee_id?: number;
  min_price?: number;
  max_price?: number;
}
