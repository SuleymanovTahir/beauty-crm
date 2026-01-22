export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

export interface Booking {
  id: number;
  instagram_id?: string;
  client_id?: number;
  service_name: string;
  service_key?: string;
  datetime: string;
  phone?: string;
  name?: string;
  master?: string;
  master_id?: number;
  status: BookingStatus;
  revenue?: number;
  source?: string;
  notes?: string;
  created_at: string;
}

export interface CreateBookingRequest {
  service_key: string;
  datetime: string;
  master_id?: number;
  phone?: string;
  name?: string;
  notes?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  status?: BookingStatus;
  master_id?: number;
  client_id?: string;
}
