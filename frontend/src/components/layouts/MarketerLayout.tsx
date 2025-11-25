import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Send,
  ChevronDown,
  Instagram,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo, useEffect } from 'react';
import { usePermissions } from '../../utils/permissions';
import { api } from '../../services/api';

interface MarketerLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function MarketerLayout({ user, onLogout }: MarketerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['layouts/MarketerLayout', 'common']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showChatSubmenu, setShowChatSubmenu] = useState(false);
  const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);

  const permissions = usePermissions(user?.role || 'employee');

  useEffect(() => {
    loadEnabledMessengers();
    const handleMessengersUpdate = () => {
      loadEnabledMessengers();
    };
    window.addEventListener('messengers-updated', handleMessengersUpdate);
    return () => {
      window.removeEventListener('messengers-updated', handleMessengersUpdate);
    };
  }, []);

  const loadEnabledMessengers = async () => {
    try {
      const response = await api.getEnabledMessengers();
      setEnabledMessengers(response.enabled_messengers);
    } catch (err) {
      console.error('Failed to load enabled messengers:', err);
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

  const menuItems = useMemo(() => {
    const allItems = [
      { icon: BarChart3, label: 'Аналитика', path: '/marketer/analytics', requirePermission: () => permissions.canViewAnalytics },
      { icon: Send, label: 'Рассылки', path: '/marketer/broadcasts', requirePermission: () => permissions.canSendBroadcasts },
      { icon: MessageSquare, label: 'Чат', path: '/marketer/chat', hasSubmenu: true, requirePermission: () => true },
      { icon: MessageCircle, label: 'Внутренний чат', path: '/marketer/internal-chat', requirePermission: () => true },
    ];

    return allItems.filter(item => item.requirePermission());
  }, [permissions]);

  const chatSubmenuItems = enabledMessengers.map(messenger => ({
    icon: messenger.type === 'instagram' ? Instagram : MessageSquare,
    label: messenger.name,
    path: messenger.type === 'instagram' ? '/marketer/chat' : `/marketer/chat?messenger=${messenger.type}`,
    color: messenger.type === 'instagram' ? 'from-pink-500 to-purple-600' :
      messenger.type === 'whatsapp' ? 'from-green-500 to-green-600' :
        messenger.type === 'telegram' ? 'from-blue-500 to-blue-600' :
          'from-gray-900 to-black'
  }));

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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-xl">
                <span className="text-white">📊</span>
              </div>
              <div>
                <span className="text-sm text-gray-900 block">💎 CRM</span>
                <span className="text-xs text-gray-500">Таргетолог</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menuItems.map((item, index) => (
                <li key={index}>
                  {item.hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => setShowChatSubmenu(!showChatSubmenu)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                          transition-all duration-200
                          ${location.pathname.startsWith(item.path)
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                        <ChevronDown
                          size={16}
                          className={`ml-auto transition-transform ${showChatSubmenu ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {showChatSubmenu && (
                        <ul className="mt-1 ml-8 space-y-1">
                          {chatSubmenuItems.map((subItem, subIndex) => (
                            <li key={subIndex}>
                              <button
                                onClick={() => {
                                  navigate(subItem.path);
                                  setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700"
                              >
                                <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${subItem.color} flex items-center justify-center flex-shrink-0`}>
                                  <subItem.icon size={14} className="text-white" />
                                </div>
                                <span>{subItem.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                        transition-all duration-200
                        ${location.pathname.startsWith(item.path)
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'M'}
              </div>
              <div className="flex-1">
                <span className="text-sm text-gray-900 block">{user?.full_name || 'Таргетолог'}</span>
                <span className="text-xs text-gray-500 capitalize">Маркетинг</span>
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