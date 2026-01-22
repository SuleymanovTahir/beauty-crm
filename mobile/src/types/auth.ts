export type UserRole = 'director' | 'admin' | 'manager' | 'sales' | 'marketer' | 'employee' | 'client';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  position?: string;
  photo_url?: string;
  is_active: boolean;
  email_verified: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  requires_verification?: boolean;
  requires_approval?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}
