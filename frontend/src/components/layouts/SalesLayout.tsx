import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  MessageSquare,
  Users,
  MessageCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface SalesLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function SalesLayout({ user, onLogout }: SalesLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['layouts/SalesLayout', 'common']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const menuItems = [
    { icon: Users, label: 'Клиенты', path: '/sales/clients' },
    { icon: MessageSquare, label: 'Instagram чат', path: '/sales/chat', badge: unreadCount },
    { icon: BarChart3, label: 'Аналитика', path: '/sales/analytics' },
    { icon: MessageCircle, label: 'Внутренний чат', path: '/sales/internal-chat' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-xl">
                <span className="text-white">💼</span>
              </div>
              <div>
                <span className="text-sm text-gray-900 block">💎 CRM</span>
                <span className="text-xs text-gray-500">Продажи</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                      transition-all duration-200 relative
                      ${location.pathname.startsWith(item.path)
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="flex-1">
                <span className="text-sm text-gray-900 block">{user?.full_name || 'Продажник'}</span>
                <span className="text-xs text-gray-500 capitalize">Продажи</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}