export type ServiceCategory =
  | 'manicure'
  | 'pedicure'
  | 'lashes'
  | 'brows'
  | 'cosmetics'
  | 'hair'
  | 'massage'
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
  price: number;
  min_price?: number;
  max_price?: number;
  currency: string;
  category?: ServiceCategory;
  duration?: number; // in minutes
  benefits?: string[];
  is_active: boolean;
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
  specialization?: string;
  years_of_experience?: number;
  is_service_provider: boolean;
  services?: string[];
  rating?: number;
  reviews_count?: number;
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

interface TimeSlot {
  time: string;
  available: boolean;
}
