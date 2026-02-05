import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Image, Award, Trophy, Users, Sparkles, Bell, Settings as SettingsIcon, Menu, LogOut, X } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { Button } from './v2_components/ui/button';
import { Badge } from './v2_components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './v2_components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './v2_components/ui/sheet';
import { Dashboard } from './v2_components/Dashboard';
import { Appointments } from './v2_components/Appointments';
import { Gallery } from './v2_components/Gallery';
import { Loyalty } from './v2_components/Loyalty';
import { Achievements } from './v2_components/Achievements';
import { Masters } from './v2_components/Masters';
import { BeautyProfile } from './v2_components/BeautyProfile';
import { Notifications } from './v2_components/Notifications';
import { Settings } from './v2_components/Settings';
import { apiClient } from '../../../src/api/client';
import LanguageSwitcher from '../../../src/components/LanguageSwitcher';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSalonSettings } from '../../hooks/useSalonSettings';
import { getPhotoUrl } from '../../../src/utils/photoUtils';

type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings';



export function AccountPage() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const menuItems = [
    { id: 'dashboard' as Tab, label: t('tabs.dashboard', 'Главная'), icon: Home, path: '/account/dashboard' },
    { id: 'appointments' as Tab, label: t('tabs.appointments', 'Записи'), icon: Calendar, path: '/account/appointments' },
    { id: 'gallery' as Tab, label: t('tabs.gallery', 'Галерея'), icon: Image, path: '/account/gallery' },
    { id: 'loyalty' as Tab, label: t('tabs.loyalty', 'Лояльность'), icon: Award, path: '/account/loyalty' },
    { id: 'achievements' as Tab, label: t('tabs.achievements', 'Достижения'), icon: Trophy, path: '/account/achievements' },
    { id: 'masters' as Tab, label: t('tabs.masters', 'Мастера'), icon: Users, path: '/account/masters' },
    { id: 'beauty' as Tab, label: t('tabs.beauty', 'Бьюти-профиль'), icon: Sparkles, path: '/account/beauty' },
    { id: 'notifications' as Tab, label: t('tabs.notifications', 'Уведомления'), icon: Bell, path: '/account/notifications' },
    { id: 'settings' as Tab, label: t('tabs.settings', 'Настройки'), icon: SettingsIcon, path: '/account/settings' },
  ];

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

  const unreadNotifications = unreadCount;

  const handleTabChange = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
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
      default:
        return <Dashboard />;
    }
  };



  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    const hasNotification = item.id === 'notifications' && unreadNotifications > 0;

    // Check features
    if (item.id === 'loyalty' && !features.loyalty_program) return null;
    // Assuming 'achievements' corresponds to 'challenges' feature (or keep both? User asked for Challenges)
    if (item.id === 'achievements' && !features.challenges) return null;
    // If Referral is added later, check 'referral_program'

    return (
      <button
        onClick={() => handleTabChange(item.path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
          ? 'bg-pink-100 text-pink-600'
          : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {hasNotification && (
          <Badge className="bg-red-500">{unreadNotifications}</Badge>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Профиль */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={userData?.avatar} alt={userData?.name} />
            <AvatarFallback>{userData?.name?.[0] || 'G'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{userData?.name || 'Guest'}</div>
            <Badge variant="outline" className="text-xs mt-1 capitalize">
              {userData?.currentTier || 'bronze'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Меню - Scrollable */}
      <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Футер - Fixed at bottom */}
      <div className="p-4 border-t space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>{t('common:logout', 'Выйти')}</span>
          </button>
        </div>
        <div className="text-xs text-center text-muted-foreground">
          {salonName}
          <br />
          v1.0.0
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

      {/* Мобильная шапка */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <img
                src={logoUrl || '/logo.webp'}
                alt={salonName}
                className="w-full h-full object-contain rounded bg-white shadow-sm"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('/logo.png')) {
                    target.src = '/logo.png';
                  } else {
                    target.style.display = 'none';
                    document.getElementById('mobile-logo-fallback')?.classList.remove('hidden');
                  }
                }}
              />
              <div id="mobile-logo-fallback" className="hidden w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold absolute inset-0">
                {salonName?.[0] || 'C'}
              </div>
            </div>
            <span className="font-bold">{salonName}</span>
          </div>

          <Avatar className="w-8 h-8">
            <AvatarImage src={userData?.avatar} alt={userData?.name} />
            <AvatarFallback>{userData?.name?.[0] || 'G'}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex h-screen pt-[73px] lg:pt-0">
        {/* Десктопный сайдбар */}
        <aside className="hidden lg:flex lg:flex-col w-[280px] bg-white border-r flex-shrink-0">
          <div className="p-6 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative">
                <img
                  src={logoUrl || '/logo.webp'}
                  alt={salonName}
                  className="w-full h-full object-contain rounded-lg bg-white shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('/logo.png')) {
                      target.src = '/logo.png';
                    } else {
                      target.style.display = 'none';
                      document.getElementById('desktop-logo-fallback')?.classList.remove('hidden');
                    }
                  }}
                />
                <div id="desktop-logo-fallback" className="hidden w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold absolute inset-0">
                  {salonName?.[0] || 'C'}
                </div>
              </div>
              <span className="text-sm font-semibold truncate">{salonName}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <SidebarContent />
          </div>
        </aside>

        {/* Основной контент */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
