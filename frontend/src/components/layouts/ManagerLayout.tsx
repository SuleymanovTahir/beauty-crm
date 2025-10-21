import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  MessageSquare,
  MessageCircle,
  Settings,
  LogOut,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ManagerLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function ManagerLayout({ user, onLogout }: ManagerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Панель управления', path: '/manager/dashboard' },
    { icon: MessageSquare, label: 'Сообщения', path: '/manager/messages' },
    { icon: MessageCircle, label: 'Чат', path: '/manager/chat' },
    { icon: Users, label: 'Клиенты', path: '/manager/clients' },
    { icon: BarChart3, label: 'Аналитика', path: '/manager/analytics' },
    { icon: Filter, label: 'Воронка продаж', path: '/manager/funnel' },
    { icon: Settings, label: 'Настройки', path: '/manager/settings' },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login', { replace: true });
        toast.success('Вы успешно вышли из системы');
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      onLogout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl text-pink-600">Beauty Salon CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Менеджер</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-pink-50 text-pink-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white">
              {user?.full_name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{user?.full_name || 'Менеджер'}</p>
              <p className="text-xs text-gray-500">Менеджер</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Выход...' : 'Выйти'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}