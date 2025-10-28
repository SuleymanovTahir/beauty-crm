import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  Wrench,
  Settings,
  LogOut,
  UserPlus,
  CalendarDays,
  Scissors,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface AdminLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Панель управления', path: '/admin/dashboard' },
    { icon: ShoppingCart, label: 'Записи', path: '/admin/bookings' },
    { icon: Users, label: 'Клиенты', path: '/admin/clients' },
    { icon: MessageSquare, label: 'Чат', path: '/admin/chat', badge: unreadCount },
    { icon: BarChart3, label: 'Аналитика', path: '/admin/analytics' },
    { icon: Scissors, label: 'Услуги', path: '/admin/services' },
    { icon: UserPlus, label: 'Сотрудники', path: '/admin/users' },
    { icon: CalendarDays, label: 'Календарь', path: '/admin/calendar' },
    { icon: Settings, label: 'Настройки', path: '/admin/settings' },
    { icon: Wrench, label: 'Настройки бота', path: '/admin/bot-settings' },
  ];

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Закрываем меню при изменении размера экрана
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Блокируем скролл body когда меню открыто
  useEffect(() => {
    if (isMobileMenuOpen && window.innerWidth <= 1100) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      onLogout();
      navigate('/login', { replace: true });
      toast.success('Вы успешно вышли из системы');
    }
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    // Закрываем меню только на мобильных
    if (window.innerWidth <= 1100) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="mobile-burger-button fixed top-4 right-4 z-50 w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="mobile-overlay fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside className={`mobile-sidebar w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'is-open' : ''
        }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-pink-600">💎 CRM</h1>
            <p className="text-sm text-gray-500 mt-1">Администратор</p>
          </div>
          {/* Close button - только для мобильных */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="mobile-close-button w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleMenuItemClick(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${isActive
                        ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-pink-600' : 'text-gray-500'}`} />
                    <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>

                    {item.badge && item.badge > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
              {user?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || 'Администратор'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}