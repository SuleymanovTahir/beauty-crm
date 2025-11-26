import { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  UserCog,
  Calendar,
  Scissors,
  X,
  Menu,
  Bot,
  Instagram,
  ChevronDown,
  Target,
  Globe,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';

interface AdminLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['layouts/adminlayout', 'common']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChatSubmenu, setShowChatSubmenu] = useState(false);
  const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);

  // Используем централизованную систему прав
  const permissions = usePermissions(user?.role || 'employee');

  useEffect(() => {
    loadUnreadCount();
    loadEnabledMessengers();
    const unreadInterval = setInterval(loadUnreadCount, 10000);

    // Слушаем событие обновления мессенджеров
    const handleMessengersUpdate = () => {
      loadEnabledMessengers();
    };
    window.addEventListener('messengers-updated', handleMessengersUpdate);

    return () => {
      clearInterval(unreadInterval);
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
      toast.success(t('logout_success'));
    }
  };

  // Фильтруем пункты меню на основе прав пользователя
  const menuItems = useMemo(() => {
    const allItems = [
      { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/admin/dashboard', requirePermission: () => true },
      { icon: FileText, label: t('menu.bookings'), path: '/admin/bookings', requirePermission: () => permissions.canViewAllBookings || permissions.canCreateBookings },
      { icon: Users, label: t('menu.clients'), path: '/admin/clients', requirePermission: () => permissions.canViewAllClients },
      { icon: MessageSquare, label: t('menu.chat'), path: '/admin/chat', badge: unreadCount, hasSubmenu: true, requirePermission: () => true },
      { icon: BarChart3, label: t('menu.analytics'), path: '/admin/analytics', requirePermission: () => permissions.canViewAnalytics },
      { icon: Star, label: t('menu.feedback', 'Feedback'), path: '/admin/feedback', requirePermission: () => permissions.canViewAnalytics },
      { icon: Target, label: t('menu.plans'), path: '/admin/plans', requirePermission: () => permissions.canViewAnalytics },
      { icon: Scissors, label: t('menu.services'), path: '/admin/services', requirePermission: () => permissions.canViewServices },
      { icon: Calendar, label: t('menu.calendar'), path: '/admin/calendar', requirePermission: () => permissions.canViewAllCalendars },
      { icon: UserCog, label: t('menu.users'), path: '/admin/users', requirePermission: () => permissions.canViewAllUsers },
      { icon: Globe, label: t('menu.public_content'), path: '/admin/public-content', requirePermission: () => permissions.canViewSettings },
      { icon: Settings, label: t('menu.settings'), path: '/admin/settings', requirePermission: () => permissions.canViewSettings },
      { icon: Bot, label: t('menu.bot_settings'), path: '/admin/bot-settings', requirePermission: () => permissions.canViewBotSettings },
    ];

    // Фильтруем только те пункты, к которым есть доступ
    return allItems.filter(item => item.requirePermission());
  }, [permissions, unreadCount, t]);

  const chatSubmenuItems = enabledMessengers.map(messenger => ({
    icon: messenger.type === 'instagram' ? Instagram : MessageSquare,
    label: messenger.name,
    path: messenger.type === 'instagram' ? '/admin/chat' : `/admin/chat?messenger=${messenger.type}`,
    color: messenger.type === 'instagram' ? 'from-pink-500 to-purple-600' :
      messenger.type === 'whatsapp' ? 'from-green-500 to-green-600' :
        messenger.type === 'telegram' ? 'from-blue-500 to-blue-600' :
          'from-gray-900 to-black'
  }));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xl">
                <span className="text-white">💎</span>
              </div>
              <div>
                <span className="text-sm text-gray-900 block">{t('crm')}</span>
                <span className="text-xs text-gray-500">{t('admin')}</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
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
                          transition-all duration-200 relative
                          ${location.pathname.startsWith(item.path)
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
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
                        {item.badge != null && Number(item.badge) > 0 && (
                          <span className="absolute right-10 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                            {Number(item.badge) > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>

                      {/* Submenu Items */}
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
                        transition-all duration-200 relative
                        ${location.pathname.startsWith(item.path)
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      {item.badge != null && Number(item.badge) > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                          {Number(item.badge) > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <span className="text-sm text-gray-900 block">{user?.full_name || 'Администратор'}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}