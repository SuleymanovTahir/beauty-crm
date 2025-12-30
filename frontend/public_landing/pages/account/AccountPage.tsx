import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Image, Award, Trophy, Users, Sparkles, Bell, Settings as SettingsIcon, Menu, LogOut } from 'lucide-react';
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

type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings';

const menuItems = [
  { id: 'dashboard' as Tab, label: 'Главная', icon: Home, path: '/account/dashboard' },
  { id: 'appointments' as Tab, label: 'Записи', icon: Calendar, path: '/account/appointments' },
  { id: 'gallery' as Tab, label: 'Галерея', icon: Image, path: '/account/gallery' },
  { id: 'loyalty' as Tab, label: 'Лояльность', icon: Award, path: '/account/loyalty' },
  { id: 'achievements' as Tab, label: 'Достижения', icon: Trophy, path: '/account/achievements' },
  { id: 'masters' as Tab, label: 'Мастера', icon: Users, path: '/account/masters' },
  { id: 'beauty' as Tab, label: 'Бьюти-профиль', icon: Sparkles, path: '/account/beauty' },
  { id: 'notifications' as Tab, label: 'Уведомления', icon: Bell, path: '/account/notifications' },
  { id: 'settings' as Tab, label: 'Настройки', icon: SettingsIcon, path: '/account/settings' },
];

export function AccountPage() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<any>(null);

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
  }, []);

  // Sync URL on mount - if user navigates to /account, redirect to /account/dashboard
  useEffect(() => {
    if (location.pathname === '/account') {
      navigate('/account/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const loadUserData = async () => {
    try {
      // Get user name from localStorage
      const userName = localStorage.getItem('user_name') || 'Guest';
      const userEmail = localStorage.getItem('user_email') || '';

      setUserData({
        name: userName,
        email: userEmail,
        avatar: '',
        currentTier: 'Bronze'
      });

      // Load notifications count
      const notifData = await apiClient.getClientNotifications();
      if (notifData.success) {
        const unread = (notifData.notifications || []).filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const unreadNotifications = unreadCount;

  const handleTabChange = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
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

    return (
      <button
        onClick={() => handleTabChange(item.path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
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
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={userData?.avatar} alt={userData?.name} />
            <AvatarFallback>{userData?.name?.[0] || 'G'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{userData?.name || 'Guest'}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {userData?.currentTier || 'Bronze'}
            </div>
          </div>
        </div>
      </div>

      {/* Меню */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Футер */}
      <div className="p-4 border-t space-y-3">
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
          Beauty Salon App
          <br />
          v1.0.0
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Toaster />

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
            <Sparkles className="w-6 h-6 text-pink-500" />
            <span className="font-bold">Beauty Salon</span>
          </div>

          <Avatar className="w-8 h-8">
            <AvatarImage src={userData?.avatar} alt={userData?.name} />
            <AvatarFallback>{userData?.name?.[0] || 'G'}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex h-screen pt-[73px] lg:pt-0">
        {/* Десктопный сайдбар */}
        <aside className="hidden lg:block w-[280px] bg-white border-r flex-shrink-0">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <span className="text-xl font-bold">Beauty Salon</span>
            </div>
          </div>
          <SidebarContent />
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
