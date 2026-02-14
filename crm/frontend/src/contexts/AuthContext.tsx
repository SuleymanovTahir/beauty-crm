// /frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  secondary_role?: string;
  email?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем авторизацию при загрузке приложения
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');

        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser({
            id: userData.id,
            username: userData.username,
            full_name: userData.full_name,
            role: userData.role,
            secondary_role: userData.secondary_role,
            email: userData.email,
            phone: userData.phone
          });
        }
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('username', userData.username);
    if (userData.full_name) localStorage.setItem('user_name', userData.full_name);
    if (userData.email) localStorage.setItem('user_email', userData.email);
    if (userData.phone) localStorage.setItem('user_phone', userData.phone);
    if (userData.id) localStorage.setItem('user_id', String(userData.id));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_id');
    setUser(null);
  };

  const updateUser = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
