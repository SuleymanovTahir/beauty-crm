import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Image,
  Award,
  Trophy,
  Users,
  Sparkles,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  X,
  Ticket,
  MoreHorizontal
} from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { Avatar, AvatarImage, AvatarFallback } from './v2_components/ui/avatar';
import { Dashboard } from './v2_components/Dashboard';
import { Appointments } from './v2_components/Appointments';
import { Gallery } from './v2_components/Gallery';
import { Loyalty } from './v2_components/Loyalty';
import { Achievements } from './v2_components/Achievements';
import { Masters } from './v2_components/Masters';
import { BeautyProfile } from './v2_components/BeautyProfile';
import { Notifications } from './v2_components/Notifications';
import { Settings } from './v2_components/Settings';
import { PromoCodesView } from './PromoCodesView';
import { apiClient } from '../../../src/api/client';
import LanguageSwitcher from '../../../src/components/LanguageSwitcher';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSalonSettings } from '../../hooks/useSalonSettings';
import { getPhotoUrl } from '../../../src/utils/photoUtils';
import { cn } from '../../../src/lib/utils';
import '../../../src/components/layouts/MainLayout.css';

type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings' | 'promocodes';



export function AccountPage() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const { settings } = useSalonSettings();
  const salonName = settings?.name || 'Beauty Salon';
  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;
  const [features, setFeatures] = useState<Record<string, boolean>>({
    loyalty_program: true, // default to true until loaded to avoid flickering
    referral_program: true,
    challenges: true
  });

  const menuItems = useMemo(() => [
    { id: 'dashboard' as Tab, label: t('tabs.dashboard', 'Главная'), icon: Home, path: '/account/dashboard' },
    { id: 'appointments' as Tab, label: t('tabs.appointments', 'Записи'), icon: Calendar, path: '/account/appointments' },
    { id: 'gallery' as Tab, label: t('tabs.gallery', 'Галерея'), icon: Image, path: '/account/gallery' },
    { id: 'loyalty' as Tab, label: t('tabs.loyalty', 'Лояльность'), icon: Award, path: '/account/loyalty', hidden: !features.loyalty_program },
    { id: 'achievements' as Tab, label: t('tabs.achievements', 'Достижения'), icon: Trophy, path: '/account/achievements', hidden: !features.challenges },
    { id: 'masters' as Tab, label: t('tabs.masters', 'Мастера'), icon: Users, path: '/account/masters' },
    { id: 'beauty' as Tab, label: t('tabs.beauty', 'Бьюти-профиль'), icon: Sparkles, path: '/account/beauty' },
    { id: 'notifications' as Tab, label: t('tabs.notifications', 'Уведомления'), icon: Bell, path: '/account/notifications', badge: unreadCount },
    { id: 'promocodes' as Tab, label: t('tabs.promocodes', 'Промокоды'), icon: Ticket, path: '/account/promocodes' },
    { id: 'settings' as Tab, label: t('tabs.settings', 'Настройки'), icon: SettingsIcon, path: '/account/settings' },
  ], [t, features, unreadCount]);

  const mainTabs = useMemo(() => [
    { id: 'dashboard', icon: Home, label: t('tabs.dashboard'), path: '/account/dashboard' },
    { id: 'appointments', icon: Calendar, label: t('tabs.appointments'), path: '/account/appointments' },
    { id: 'loyalty', icon: Award, label: t('tabs.loyalty'), path: '/account/loyalty' },
    { id: 'notifications', icon: Bell, label: t('tabs.notifications'), path: '/account/notifications', badge: unreadCount },
    { id: 'more', icon: MoreHorizontal, label: t('tabs.more', 'Ещё') },
  ], [t, unreadCount]);

  // Determine active tab from URL
  const getActiveTabFromPath = (): Tab => {
    const path = location.pathname;
    const item = menuItems.find(m => m.path === path);
    return item?.id || 'dashboard';
  };

  const activeTab = getActiveTabFromPath();

  // Load user data and notifications count
  useEffect(() => {
    loadUserData();
    loadNotifications();
    loadFeatures();

    // Set up polling for notifications every 30 seconds
    const notifInterval = setInterval(loadNotifications, 30000);

    // Window event listeners for reactive updates
    const handleProfileUpdated = () => {
      loadUserData();
    };

    const handleMessengersUpdated = () => {
      loadUserData();
    };

    const handleNotificationReceived = () => {
      loadNotifications();
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    window.addEventListener('messengers-updated', handleMessengersUpdated);
    window.addEventListener('notification-received', handleNotificationReceived);

    return () => {
      clearInterval(notifInterval);
      window.removeEventListener('profile-updated', handleProfileUpdated);
      window.removeEventListener('messengers-updated', handleMessengersUpdated);
      window.removeEventListener('notification-received', handleNotificationReceived);
    };
  }, []);

  // Sync URL on mount - if user navigates to /account, redirect to /account/dashboard
  useEffect(() => {
    if (location.pathname === '/account') {
      navigate('/account/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const loadUserData = async () => {
    try {
      // Try to load from API first
      const profileData = await apiClient.getClientProfile();

      if (profileData.success && profileData.profile) {
        setUserData({
          name: profileData.profile.name || 'Guest',
          email: profileData.profile.email || '',
          username: profileData.profile.username || '',
          avatar: profileData.profile.avatar || '',
          currentTier: profileData.profile.tier || 'bronze'
        });

        // Update localStorage
        if (profileData.profile.name) localStorage.setItem('user_name', profileData.profile.name);
        if (profileData.profile.email) localStorage.setItem('user_email', profileData.profile.email);
        if (profileData.profile.phone) localStorage.setItem('user_phone', profileData.profile.phone);
        if (profileData.profile.username) localStorage.setItem('username', profileData.profile.username);
      } else {
        // Fallback to localStorage if API fails
        const userName = localStorage.getItem('user_name') || 'Guest';
        const userEmail = localStorage.getItem('user_email') || '';

        setUserData({
          name: userName,
          email: userEmail,
          avatar: '',
          currentTier: 'bronze'
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);

      // Fallback to localStorage
      const userName = localStorage.getItem('user_name') || 'Guest';
      const userEmail = localStorage.getItem('user_email') || '';

      setUserData({
        name: userName,
        email: userEmail,
        avatar: '',
        currentTier: 'bronze'
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const notifData = await apiClient.getClientNotifications();
      if (notifData.success) {
        const notifList = notifData.notifications || [];
        setNotifications(notifList);
        const unread = notifList.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationRead = async (notifId: number) => {
    try {
      const result = await apiClient.markNotificationRead(notifId);
      if (result.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Salon settings теперь загружаются через хук useSalonSettings

  const loadFeatures = async () => {
    try {
      const data = await apiClient.getFeatures();
      if (data.success && data.features) {
        setFeatures(data.features);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };


  const handleTabChange = (path: string) => {
    navigate(path);
    setShowMoreModal(false);
  };

  const handleLogout = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      t('common:confirm_logout', 'Вы уверены, что хотите выйти из системы?')
    );

    if (!confirmed) return;

    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_phone');
      localStorage.removeItem('user_id');
      navigate('/login', { replace: true });
      toast.success(t('common:logout_success', 'Вы успешно вышли из системы'));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <Appointments />;
      case 'gallery':
        return <Gallery />;
      case 'loyalty':
        return <Loyalty />;
      case 'achievements':
        return <Achievements />;
      case 'masters':
        return <Masters />;
      case 'beauty':
        return <BeautyProfile />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      case 'promocodes':
        return <PromoCodesView />;
      default:
        return <Dashboard />;
    }
  };




  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo Section */}
      <div className="sidebar-header-premium flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900 truncate">{salonName}</h1>
      </div>

      {/* User Profile Hook */}
      <div className="user-card-sidebar shadow-sm border border-pink-50/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 rounded-xl">
            <AvatarImage src={userData?.avatar} alt={userData?.name} className="object-cover" />
            <AvatarFallback className="bg-pink-100 text-pink-600 font-bold">{userData?.name?.[0] || 'G'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-900 truncate">{userData?.name || 'Guest'}</div>
            <div className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider">{userData?.currentTier || 'bronze'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          if (item.hidden) return null;
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <li key={item.id} className="list-none mb-1">
              <button
                onClick={() => handleTabChange(item.path)}
                className={cn(
                  "w-full menu-item-premium",
                  isActive && "active"
                )}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer-premium mt-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 p-2 bg-gray-50 rounded-xl">
            <LanguageSwitcher variant="minimal" />
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
            title={t('common:logout')}
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="text-[10px] text-center text-gray-400 font-medium">
          {salonName} v1.0.1
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Toaster />

      {/* Notification Bell - Fixed Top Right */}
      {activeTab === 'dashboard' && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Bell size={24} className={unreadCount > 0 ? 'text-pink-500' : 'text-gray-600'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  <Bell size={18} className="text-pink-500" />
                  {t('account:notifications.title', 'Уведомления')}
                </span>
                <button onClick={() => setShowNotifDropdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {t('account:notifications.no_notifications', 'Нет новых уведомлений')}
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-pink-50' : ''
                      }`}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.action_url) navigate(notif.action_url);
                      setShowNotifDropdown(false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></span>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{notif.title}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav lg:hidden">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'more') setShowMoreModal(true);
              else navigate(tab.path!);
            }}
            className={cn(
              "mobile-nav-btn",
              location.pathname === tab.path && "active"
            )}
          >
            <div className="mobile-nav-icon-container">
              <tab.icon size={24} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="mobile-nav-badge">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* More Menu Modal */}
      {showMoreModal && (
        <div className="more-menu-modal animate-in fade-in" onClick={() => setShowMoreModal(false)}>
          <div className="more-menu-content animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="more-menu-header">
              <span className="more-menu-title">{t('tabs.more', 'Ещё')}</span>
              <button onClick={() => setShowMoreModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="more-menu-items">
              {menuItems.map((item: any) => {
                if (mainTabs.some(t => t.id === item.id)) return null;
                if (item.hidden) return null;

                const Icon = item.icon;
                return (
                  <div key={item.id} className="menu-group">
                    <button
                      onClick={() => { navigate(item.path); setShowMoreModal(false); }}
                      className="menu-item-link"
                    >
                      <Icon size={20} className="text-gray-700" />
                      <span className="font-medium text-gray-700">{item.label}</span>
                    </button>
                  </div>
                );
              })}

              <div className="user-profile-section">
                <div className="quick-actions-row">
                  <div className="quick-action-item justify-center">
                    <LanguageSwitcher variant="minimal" />
                  </div>
                  <button
                    onClick={() => { navigate('/account/notifications'); setShowMoreModal(false); }}
                    className="quick-action-btn"
                  >
                    <div className="quick-action-text-part">
                      <span className="quick-action-label">{t('tabs.notifications')}</span>
                    </div>
                    <div className="quick-action-icon-wrapper">
                      <Bell size={20} className="text-gray-700" />
                      {unreadCount > 0 && <span className="quick-action-badge">{unreadCount}</span>}
                    </div>
                  </button>
                </div>

                <div className="profile-logout-row">
                  <div className="user-card-premium flex-1">
                    <div className="user-card-content">
                      <div className="user-avatar-wrapper">
                        <Avatar className="w-10 h-10 rounded-xl">
                          <AvatarImage src={userData?.avatar} alt={userData?.name} className="object-cover" />
                          <AvatarFallback className="bg-pink-100 text-pink-600 font-bold">{userData?.name?.[0] || 'G'}</AvatarFallback>
                        </Avatar>
                        <div className="user-status-indicator" />
                      </div>
                      <div className="user-info-text">
                        <div className="user-name-premium">{userData?.name}</div>
                        <div className="user-role-premium">{userData?.currentTier}</div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { handleLogout(); setShowMoreModal(false); }} className="logout-btn-minimal">
                    <LogOut size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar Desktop */}
        <aside className="fixed lg:sticky top-0 left-0 z-30 h-screen w-64 desktop-sidebar sidebar-premium shadow-sm hidden lg:block">
          <SidebarContent />
        </aside>

        {/* Основной контент */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto pb-[80px] lg:pb-0">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
