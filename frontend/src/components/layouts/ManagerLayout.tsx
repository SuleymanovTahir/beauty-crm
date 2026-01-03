// /frontend/src/components/layouts/ManagerLayout.tsx
//src/components/ManagerLayout.tsx
import { useState, useMemo, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  MessageCircle,
  Settings,
  LogOut,
  Filter,
  ChevronDown,
  Instagram,
  MessageSquare,
  Send,
  Music
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../icons/SocialIcons';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';

interface ManagerLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function ManagerLayout({ user, onLogout }: ManagerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['layouts/managerlayout', 'common']);
  const [showChatSubmenu, setShowChatSubmenu] = useState(false);
  const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);

  // Используем централизованную систему прав
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
  };  // Фильтруем меню на основе прав
  const menuItems = useMemo(() => {
    const allItems = [
      { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/manager/dashboard', requirePermission: () => true },
      { icon: MessageSquare, label: t('menu.chat'), path: '/manager/chat', hasSubmenu: true, requirePermission: () => true },
      { icon: Users, label: t('menu.clients'), path: '/manager/clients', requirePermission: () => permissions.canViewAllClients },
      { icon: BarChart3, label: t('menu.analytics'), path: '/manager/analytics', requirePermission: () => permissions.canViewAnalytics },
      { icon: Filter, label: t('menu.funnel'), path: '/manager/funnel', requirePermission: () => permissions.canViewAnalytics },
      { icon: Settings, label: t('menu.settings'), path: '/manager/settings', requirePermission: () => permissions.canViewSettings },
    ];

    return allItems.filter(item => item.requirePermission());
  }, [permissions, t]);

  const chatSubmenuItems = enabledMessengers.map(messenger => ({
    icon: messenger.type === 'instagram' ? InstagramIcon :
      messenger.type === 'telegram' ? TelegramIcon :
        messenger.type === 'whatsapp' ? WhatsAppIcon :
          messenger.type === 'tiktok' ? TikTokIcon : MessageSquare,
    label: messenger.name,
    type: messenger.type,
    path: `/manager/chat?messenger=${messenger.type}`,
    color: messenger.type === 'instagram' ? 'from-pink-500 to-purple-600' :
      messenger.type === 'whatsapp' ? 'from-green-500 to-green-600' :
        messenger.type === 'telegram' ? 'from-blue-500 to-blue-600' :
          'from-gray-900 to-black'
  }));


  const handleLogout = async () => {
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
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl text-pink-600">{t('crm')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('manager')}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
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
                          ? 'bg-pink-50 text-pink-600'
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

                    {/* Submenu Items */}
                    {showChatSubmenu && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {chatSubmenuItems.map((subItem, subIndex) => {
                          const params = new URLSearchParams(location.search);
                          const currentMessenger = params.get('messenger') || 'instagram';
                          const isActive = location.pathname === '/manager/chat' && subItem.type === currentMessenger;

                          return (
                            <li key={subIndex}>
                              <button
                                onClick={() => navigate(subItem.path)}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                              >
                                <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${subItem.color} flex items-center justify-center flex-shrink-0`}>
                                  <subItem.icon size={14} className="text-white" />
                                </div>
                                <span>{subItem.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
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
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

