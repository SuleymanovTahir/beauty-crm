import React from 'react';
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
  Filter,
  CalendarDays,
  Scissors,
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Панель управления', path: '/admin/dashboard' },
    { icon: ShoppingCart, label: 'Записи', path: '/admin/bookings' },
    { icon: Users, label: 'Клиенты', path: '/admin/clients' },
    { icon: MessageCircle, label: 'Сообщения', path: '/admin/messages' },
    { icon: MessageSquare, label: 'Чат', path: '/admin/chat' },
    { icon: BarChart3, label: 'Аналитика', path: '/admin/analytics' },
    { icon: Scissors, label: 'Услуги', path: '/admin/services' },
    { icon: UserPlus, label: 'Сотрудники', path: '/admin/users' },
    { icon: CalendarDays, label: 'Календарь', path: '/admin/calendar' },
    { icon: Settings, label: 'Настройки', path: '/admin/settings' },
    { icon: Wrench, label: 'Настройки бота', path: '/admin/bot-settings' },
  ];

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

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-pink-600">💎 CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Администратор</p>
        </div>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-pink-600' : 'text-gray-500'}`} />
                    <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>
                  </Link>
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