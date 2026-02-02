// Shared authentication types for web and mobile

export type UserRole =
  | 'director'
  | 'admin'
  | 'manager'
  | 'sales'
  | 'marketer'
  | 'employee'
  | 'client';

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
  permissions?: string[];
  two_factor_enabled?: boolean;
  created_at?: string;
  last_login?: string;
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
  role?: UserRole;
  position?: string;
  privacy_accepted?: boolean;
  newsletter_subscribed?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  requires_verification?: boolean;
  requires_approval?: boolean;
  error?: string;
  error_type?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface GoogleLoginRequest {
  token: string;
}
