import { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Filter,
  ChevronDown,
  MessageSquare,
  X,
  Menu,
  Globe,
  MapPinned
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../icons/SocialIcons';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { usePermissions } from '../../utils/permissions';
import { getPhotoUrl } from '../../utils/photoUtils';
import { getDynamicAvatar } from '../../utils/avatarUtils';

interface ManagerLayoutProps {
  user: { id: number; role: string; full_name: string } | null;
  onLogout: () => void;
}

export default function ManagerLayout({ user, onLogout }: ManagerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['layouts/managerlayout', 'common']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showChatSubmenu, setShowChatSubmenu] = useState(false);
  const [enabledMessengers, setEnabledMessengers] = useState<Array<{ type: string; name: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [salonSettings, setSalonSettings] = useState<{ name?: string; logo_url?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Используем централизованную систему прав
  const permissions = usePermissions(user?.role || 'employee');

  useEffect(() => {
    loadEnabledMessengers();
    loadUnreadCount();
    loadSalonSettings();
    loadUserProfile();

    const unreadInterval = setInterval(loadUnreadCount, 10000);

    const handleMessengersUpdate = () => {
      loadEnabledMessengers();
    };
    const handleProfileUpdate = () => {
      loadUserProfile();
    };

    window.addEventListener('messengers-updated', handleMessengersUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      clearInterval(unreadInterval);
      window.removeEventListener('messengers-updated', handleMessengersUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await api.getTotalUnread();
      setUnreadCount(data.total || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadSalonSettings = async () => {
    try {
      const settings = await api.getSalonSettings();
      setSalonSettings(settings);
    } catch (err) {
      console.error('Failed to load salon settings:', err);
    }
  };

  const loadUserProfile = async () => {
    if (user?.id) {
      try {
        const profile = await api.getUserProfile(user.id);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  };

  const loadEnabledMessengers = async () => {
    try {
      const response = await api.getEnabledMessengers();
      setEnabledMessengers(response.enabled_messengers);
    } catch (err) {
      console.error('Failed to load enabled messengers:', err);
    }
  };

  const menuItems = useMemo(() => {
    const allItems = [
      { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/manager/dashboard', requirePermission: () => true },
      { icon: MessageSquare, label: t('menu.chat'), path: '/manager/chat', badge: unreadCount, hasSubmenu: true, requirePermission: () => true },
      { icon: Users, label: t('menu.clients'), path: '/manager/clients', requirePermission: () => permissions.canViewAllClients },
      { icon: BarChart3, label: t('menu.analytics'), path: '/manager/analytics', requirePermission: () => permissions.canViewAnalytics },
      { icon: Filter, label: t('menu.funnel'), path: '/manager/funnel', requirePermission: () => permissions.canViewAnalytics },
      { icon: Settings, label: t('menu.settings'), path: '/manager/settings', requirePermission: () => permissions.canViewSettings },
    ];

    return allItems.filter(item => item.requirePermission());
  }, [permissions, t, unreadCount]);

  const chatSubmenuItems = enabledMessengers.map(messenger => ({
    icon: messenger.type === 'instagram' ? (props: any) => <InstagramIcon {...props} colorful={true} /> :
      messenger.type === 'telegram' ? (props: any) => <TelegramIcon {...props} colorful={true} /> :
        messenger.type === 'whatsapp' ? (props: any) => <WhatsAppIcon {...props} colorful={true} /> :
          messenger.type === 'tiktok' ? (props: any) => <TikTokIcon {...props} colorful={true} /> : MessageSquare,
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
      toast.success(t('logout_success', 'Вы успешно вышли из системы'));
    }
  };

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
              <div className="flex-shrink-0">
                {salonSettings?.logo_url ? (
                  <img
                    src={salonSettings.logo_url}
                    alt={salonSettings?.name || 'Logo'}
                    className="w-10 h-10 rounded-lg object-contain shadow-sm"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('icons8.com')) {
                        img.src = 'https://img.icons8.com/color/96/diamond.png';
                      }
                    }}
                  />
                ) : (
                  <img
                    src="https://img.icons8.com/color/96/diamond.png"
                    alt="Diamond"
                    className="w-10 h-10 rounded-lg object-contain shadow-sm"
                  />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-sm text-gray-900 block font-semibold truncate leading-tight">
                  {salonSettings?.name || 'CRM Панель'}
                </span>
                <span className="text-xs text-gray-500">{t('manager')}</span>
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
                          {chatSubmenuItems.map((subItem, subIndex) => {
                            const params = new URLSearchParams(location.search);
                            const currentMessenger = params.get('messenger') || 'instagram';
                            const isActive = location.pathname === '/manager/chat' && subItem.type === currentMessenger;

                            return (
                              <li key={subIndex}>
                                <button
                                  onClick={() => {
                                    navigate(subItem.path);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-purple-50 text-purple-600 font-medium' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                  <subItem.icon size={20} />
                                  <span>{subItem.label}</span>
                                </button>
                              </li>
                            );
                          })}
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
              {userProfile?.photo ? (
                <img
                  src={getPhotoUrl(userProfile.photo) || ''}
                  alt={userProfile.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                />
              ) : (
                <img
                  src={getDynamicAvatar(userProfile?.full_name || user?.full_name || 'Admin', 'warm', 'female')}
                  alt={userProfile?.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-100 shadow-sm"
                />
              )}
              <div className="flex-1 overflow-hidden">
                <span className="text-sm font-semibold text-gray-900 block truncate">{userProfile?.full_name || user?.full_name || 'Менеджер'}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 capitalize leading-tight">{user?.role || 'manager'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>{t('logout', 'Выход')}</span>
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

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
