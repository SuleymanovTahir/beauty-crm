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
  MoreHorizontal,
  Gift
} from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@site/public_landing/components/ui/avatar';
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
import { apiClient } from '@site/api/client';
import { api } from '@site/services/api';
import LanguageSwitcher from '@site/components/LanguageSwitcher';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSalonSettings } from '../../hooks/useSalonSettings';
import { getPhotoUrl } from '@site/utils/photoUtils';
import { cn } from '@site/lib/utils';
import { captureReferralAttributionFromCurrentUrl } from '../../utils/urlUtils';
import '@site/components/layouts/MainLayout.css';

type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings' | 'promocodes' | 'specialoffers';
type MobileTab = {
  id: string;
  icon: any;
  label: string;
  path?: string;
  badge?: number;
  hidden?: boolean;
};

type AccountMenuItem = {
  id: Tab;
  icon: any;
  label: string;
  path: string;
  badge?: number;
  hidden: boolean;
  showInSidebar?: boolean;
};



export function AccountPage() {
  const { t, i18n } = useTranslation(['account', 'common', 'adminpanel/loyaltymanagement', 'layouts/mainlayout']);
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [accountHiddenMenuItems, setAccountHiddenMenuItems] = useState<string[]>([]);

  const { settings } = useSalonSettings();
  const salonName = settings?.name || 'Beauty Salon';
  const logoUrl = settings?.logo_url ? getPhotoUrl(settings.logo_url) : null;
  const [features, setFeatures] = useState<Record<string, boolean>>({
    loyalty_program: true, // default to true until loaded to avoid flickering
    referral_program: true,
    challenges: true
  });

  const menuItems = useMemo<AccountMenuItem[]>(() => {
    const hiddenSet = new Set(accountHiddenMenuItems);
    const groupedHiddenMap: Record<string, Tab[]> = {
      'account-main': ['dashboard', 'appointments', 'gallery', 'masters', 'beauty'],
      'account-bonus-program': ['loyalty', 'achievements', 'promocodes', 'specialoffers'],
      'account-profile-tools': ['notifications', 'settings'],
    };

    Object.entries(groupedHiddenMap).forEach(([groupId, children]) => {
      if (hiddenSet.has(groupId) !== true) {
        return;
      }
      children.forEach((childId) => hiddenSet.add(childId));
    });

    const challengesHiddenByFeature = features.challenges === false;

    return [
      { id: 'dashboard', label: t('tabs.dashboard', 'Главная'), icon: Home, path: '/account/dashboard', hidden: hiddenSet.has('dashboard') },
      { id: 'appointments', label: t('tabs.appointments', 'Записи'), icon: Calendar, path: '/account/appointments', hidden: hiddenSet.has('appointments') },
      { id: 'gallery', label: t('tabs.gallery', 'Галерея'), icon: Image, path: '/account/gallery', hidden: hiddenSet.has('gallery') },
      { id: 'loyalty', label: t('adminpanel/loyaltymanagement:title'), icon: Award, path: '/account/loyalty', hidden: hiddenSet.has('loyalty') },
      {
        id: 'achievements',
        label: t('layouts/mainlayout:menu.challenges', 'Челленджи'),
        icon: Trophy,
        path: '/account/achievements',
        hidden: hiddenSet.has('achievements') ? true : challengesHiddenByFeature,
        showInSidebar: false,
      },
      {
        id: 'promocodes',
        label: t('layouts/mainlayout:menu.promo_codes', 'Промокоды'),
        icon: Ticket,
        path: '/account/promocodes',
        hidden: hiddenSet.has('promocodes'),
        showInSidebar: false,
      },
      {
        id: 'specialoffers',
        label: t('settings.special_offers', 'Специальные предложения и скидки'),
        icon: Gift,
        path: '/account/special-offers',
        hidden: hiddenSet.has('specialoffers'),
        showInSidebar: false,
      },
      { id: 'masters', label: t('tabs.masters', 'Мастера'), icon: Users, path: '/account/masters', hidden: hiddenSet.has('masters') },
      { id: 'beauty', label: t('tabs.beauty', 'Уход и рекомендации'), icon: Sparkles, path: '/account/beauty', hidden: hiddenSet.has('beauty') },
      { id: 'notifications', label: t('tabs.notifications', 'Уведомления'), icon: Bell, path: '/account/notifications', badge: unreadCount, hidden: hiddenSet.has('notifications') },
      { id: 'settings', label: t('tabs.settings', 'Настройки'), icon: SettingsIcon, path: '/account/settings', hidden: hiddenSet.has('settings') },
    ];
  }, [accountHiddenMenuItems, features.challenges, t, unreadCount]);

  useEffect(() => {
    captureReferralAttributionFromCurrentUrl(location.pathname, location.search);
  }, [location.pathname, location.search]);

  const visibleMenuIds = useMemo(
    () => menuItems.filter((item) => item.hidden !== true).map((item) => item.id),
    [menuItems]
  );

  const canOpenNotifications = useMemo(
    () => visibleMenuIds.includes('notifications'),
    [visibleMenuIds]
  );

  const fallbackAccountPath = useMemo(() => {
    const firstVisibleItem = menuItems.find((item) => item.hidden !== true);
    return firstVisibleItem?.path ?? '/account/dashboard';
  }, [menuItems]);

  const bonusProgramTabs = useMemo(() => {
    const bonusProgramIds = new Set<Tab>(['loyalty', 'achievements', 'promocodes', 'specialoffers']);
    return menuItems
      .filter((item) => bonusProgramIds.has(item.id))
      .filter((item) => item.hidden !== true)
      .map((item) => ({
        id: item.id,
        path: item.path,
        label: item.label,
        icon: item.icon
      }));
  }, [menuItems]);

  const mainTabs = useMemo(() => {
    const visibilityById = new Map(menuItems.map((item) => [item.id, item.hidden !== true]));
    const candidates: MobileTab[] = [
      { id: 'dashboard', icon: Home, label: t('tabs.dashboard'), path: '/account/dashboard', hidden: visibilityById.get('dashboard') !== true },
      { id: 'appointments', icon: Calendar, label: t('tabs.appointments'), path: '/account/appointments', hidden: visibilityById.get('appointments') !== true },
      { id: 'loyalty', icon: Award, label: t('adminpanel/loyaltymanagement:title'), path: '/account/loyalty', hidden: visibilityById.get('loyalty') !== true },
      { id: 'gallery', icon: Image, label: t('tabs.gallery'), path: '/account/gallery', hidden: visibilityById.get('gallery') !== true },
      { id: 'notifications', icon: Bell, label: t('tabs.notifications'), path: '/account/notifications', badge: unreadCount, hidden: visibilityById.get('notifications') !== true },
    ].filter((item) => item.hidden !== true);

    return [
      ...candidates.slice(0, 4),
      { id: 'more', icon: MoreHorizontal, label: t('tabs.more', 'Ещё') },
    ];
  }, [t, unreadCount, menuItems]);

  // Determine active tab from URL
  const getActiveTabFromPath = (): Tab => {
    const path = location.pathname;
    const item = menuItems.find(m => m.path === path);
    return item?.id || 'dashboard';
  };

  const activeTab = getActiveTabFromPath();
  const isBonusProgramSection = activeTab === 'loyalty'
    || activeTab === 'achievements'
    || activeTab === 'promocodes'
    || activeTab === 'specialoffers';

  useEffect(() => {
    const activeMenuLabel = menuItems.find((item) => item.id === activeTab)?.label ?? salonName;
    const tabParam = new URLSearchParams(location.search).get('tab');
    const settingsTabLabels: Record<string, string> = {
      profile: t('settings.profile', 'Профиль'),
      security: t('settings.security', 'Безопасность'),
      notifications: t('settings.notifications', 'Уведомления'),
      privacy: t('settings.privacy', 'Приватность'),
    };
    const titleParts: string[] = [activeMenuLabel];

    if (activeTab === 'settings' && tabParam !== null && tabParam.length > 0) {
      const tabLabel = settingsTabLabels[tabParam];
      if (tabLabel !== undefined && tabLabel.length > 0) {
        titleParts.push(tabLabel);
      }
    }

    document.title = titleParts.join(' · ');
  }, [activeTab, location.search, menuItems, salonName, t]);

  useEffect(() => {
    const activeItem = menuItems.find((item) => item.id === activeTab);
    if (activeItem === undefined) {
      return;
    }

    if (activeItem.hidden !== true) {
      return;
    }

    if (location.pathname === fallbackAccountPath) {
      return;
    }

    toast.error(t('common:access_denied', 'Доступ запрещен'));
    navigate(fallbackAccountPath, { replace: true });
  }, [activeTab, fallbackAccountPath, location.pathname, menuItems, navigate, t]);

  // Load user data and notifications count
  useEffect(() => {
    loadUserData();
    loadNotifications();
    loadFeatures();
    loadAccountMenuSettings();

    // Set up polling for notifications every 30 seconds
    const notifInterval = setInterval(loadNotifications, 30000);
    const accountMenuInterval = setInterval(loadAccountMenuSettings, 30000);

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

    const handleWindowFocus = () => {
      loadAccountMenuSettings();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAccountMenuSettings();
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    window.addEventListener('messengers-updated', handleMessengersUpdated);
    window.addEventListener('notification-received', handleNotificationReceived);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(notifInterval);
      clearInterval(accountMenuInterval);
      window.removeEventListener('profile-updated', handleProfileUpdated);
      window.removeEventListener('messengers-updated', handleMessengersUpdated);
      window.removeEventListener('notification-received', handleNotificationReceived);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Sync URL on mount - if user navigates to /account, redirect to /account/dashboard
  useEffect(() => {
    if (location.pathname === '/account' || location.pathname === '/account/') {
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
        const clickedNotification = notifications.find((item: any) => item.id === notifId);
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );
        if (clickedNotification && !clickedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
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
        setFeatures((previousState) => ({
          ...previousState,
          ...data.features
        }));
      }
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };

  const loadAccountMenuSettings = async () => {
    const loadHiddenItemsPreview = (): string[] => {
      try {
        const rawPreviewValue = localStorage.getItem('account_menu_hidden_items_preview');
        if (rawPreviewValue === null) {
          return [];
        }
        const parsedPreviewValue = JSON.parse(rawPreviewValue);
        if (!Array.isArray(parsedPreviewValue)) {
          return [];
        }
        return parsedPreviewValue
          .map((value) => String(value))
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
      } catch (error) {
        return [];
      }
    };

    const applyHiddenItems = (hiddenItems: unknown) => {
      if (!Array.isArray(hiddenItems)) {
        const previewHiddenItems = loadHiddenItemsPreview();
        setAccountHiddenMenuItems(previewHiddenItems);
        return;
      }

      const normalizedHiddenItems = hiddenItems
        .map((value) => String(value))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      setAccountHiddenMenuItems(normalizedHiddenItems);
    };

    try {
      const response = await apiClient.getClientAccountMenuSettings();
      applyHiddenItems(response.hidden_items);
      return;
    } catch (error) {
      console.error('Error loading client account menu settings:', error);
    }

    try {
      const response = await api.getAccountMenuSettings();
      applyHiddenItems(response.hidden_items);
      return;
    } catch (error) {
      console.error('Error loading admin account menu settings:', error);
    }

    setAccountHiddenMenuItems([]);
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
        return <Dashboard visibleMenuIds={visibleMenuIds} />;
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
        return <PromoCodesView mode="promo-codes" />;
      case 'specialoffers':
        return <PromoCodesView mode="special-offers" />;
      default:
        return <Dashboard visibleMenuIds={visibleMenuIds} />;
    }
  };




  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo Section */}
      <div className="sidebar-header-premium flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md p-1.5 shrink-0">
          <img
            src={logoUrl || '/logo.webp'}
            alt="Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('.webp')) {
                target.src = '/logo.png';
              }
            }}
          />
        </div>
        <h1 className="text-lg font-bold text-gray-900 truncate">{salonName}</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          if (item.hidden) return null;
          if (item.showInSidebar === false) return null;
          const isActive = location.pathname === item.path || (item.id === 'loyalty' && isBonusProgramSection);
          const Icon = item.icon;

          return (
            <li key={item.id} className="list-none mb-1">
              <button
                onClick={() => handleTabChange(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 menu-item-premium",
                  isActive && "active"
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer-premium mt-auto">
        <div className="user-card-sidebar px-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={userData?.avatar} alt={userData?.name} className="object-cover" />
              <AvatarFallback className="bg-pink-100 text-pink-600 font-bold">{userData?.name?.[0] ?? 'G'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 truncate">{userData?.name ?? 'Guest'}</div>
              <div className="text-[11px] text-gray-400 font-medium truncate">{userData?.email ?? ''}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 p-2 bg-gray-50 rounded-xl">
            <LanguageSwitcher variant="minimal" />
          </div>
          {canOpenNotifications && (
            <button
              onClick={() => navigate('/account/notifications')}
              className={cn(
                "p-3 rounded-xl transition-colors shadow-sm relative",
                location.pathname.includes('/notifications')
                  ? "bg-pink-50 text-pink-600"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              )}
              title={t('tabs.notifications', 'Уведомления')}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 badge-premium badge-premium-orange badge-header">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
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
      {activeTab === 'dashboard' && canOpenNotifications && (
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
                          {new Date(notif.created_at).toLocaleString(i18n.language)}
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
              if (tab.id === 'more') {
                setShowMoreModal(true);
                return;
              }

              if (tab.path) {
                navigate(tab.path);
              }
            }}
            className={cn(
              "mobile-nav-btn",
              (location.pathname === tab.path || (tab.id === 'loyalty' && isBonusProgramSection)) && "active"
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
                if (item.showInSidebar === false) return null;

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
                  {canOpenNotifications && (
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
                  )}
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
              {isBonusProgramSection && bonusProgramTabs.length > 0 && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-2">
                  <div className="flex flex-wrap gap-2">
                    {bonusProgramTabs.map((section) => {
                      const isActive = location.pathname === section.path;
                      const SectionIcon = section.icon;

                      return (
                        <button
                          key={section.path}
                          type="button"
                          onClick={() => navigate(section.path)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <SectionIcon size={16} />
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
