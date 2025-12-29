import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getDateLocale as getDateLocaleCentral } from "../../../src/utils/i18nUtils";
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/api/client';
import { toast } from 'sonner';

// Managed Lucide Imports (Merged)
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
  Phone,
  Menu,
  Loader2,
} from 'lucide-react';

import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';

// V2 Component Imports
import { Dashboard } from './v2_components/Dashboard';
import { Appointments } from './v2_components/Appointments';
import { Gallery } from './v2_components/Gallery';
import { Loyalty } from './v2_components/Loyalty';
import { Achievements } from './v2_components/Achievements';
import { Masters } from './v2_components/Masters';
import { BeautyProfile } from './v2_components/BeautyProfile';
import { Notifications } from './v2_components/Notifications';
import { Settings } from './v2_components/Settings';

// UI Components
import { Button } from './v2_components/ui/button';
import { Badge } from './v2_components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './v2_components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './v2_components/ui/sheet';

// Import styles
import './AccountPage.css';

export function AccountPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  // const { t, i18n } = useTranslation(['account', 'common']); // Unused if no t() calls
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // States
  const initialTab = searchParams.get('tab') || 'dashboard';

  // V2 State
  type Tab = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings' | 'support';
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);

  // UI State
  // UI State


  const openBooking = () => navigate('/new-booking');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as Tab);
    setSearchParams({ tab });
  };

  // Define Menu Items Here
  const menuItems = [
    { id: 'dashboard' as Tab, label: 'Главная', icon: Home },
    { id: 'appointments' as Tab, label: 'Записи', icon: Calendar },
    { id: 'gallery' as Tab, label: 'Галерея', icon: Image },
    { id: 'loyalty' as Tab, label: 'Лояльность', icon: Award },
    { id: 'achievements' as Tab, label: 'Достижения', icon: Trophy },
    { id: 'masters' as Tab, label: 'Мастера', icon: Users },
    { id: 'beauty' as Tab, label: 'Бьюти-профиль', icon: Sparkles },
    { id: 'notifications' as Tab, label: 'Уведомления', icon: Bell },
    { id: 'settings' as Tab, label: 'Настройки', icon: SettingsIcon },
    { id: 'support' as Tab, label: 'Связь', icon: Phone },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      loadAllData();
    }
  }, [user, navigate, authLoading]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        dashboardRes,
        bookingsRes,
        galleryRes,
        notifsRes,
        loyaltyRes,
        achievementsRes,
        mastersRes,
        metricsRes
      ] = await Promise.all([
        api.get('/api/client/dashboard'),
        api.get('/api/client/my-bookings'),
        api.get('/api/client/gallery'),
        api.get('/api/client/my-notifications'),
        api.get('/api/client/loyalty'),
        api.get('/api/client/achievements'),
        api.get('/api/client/favorite-masters'),
        api.get('/api/client/beauty-metrics')
      ]);

      setDashboardData(dashboardRes);
      setBookings(bookingsRes.bookings || []);
      setGallery(galleryRes.gallery || []);
      setNotifications(notifsRes.notifications || []);
      setLoyalty(loyaltyRes);
      setAchievements(achievementsRes.achievements || []);
      setMasters(mastersRes.masters || []);
      setMetrics(metricsRes.metrics || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
      </div>
    );
  }

  // V2 Render Helpers
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} dashboardData={dashboardData} loyalty={loyalty} bookings={bookings} masters={masters} onNavigate={handleTabChange} />;
      case 'appointments':
        return <Appointments bookings={bookings} masters={masters} />;
      case 'gallery':
        return <Gallery gallery={gallery} masters={masters} />;
      case 'loyalty':
        return <Loyalty loyalty={loyalty} user={user} />;
      case 'achievements':
        return <Achievements achievements={achievements} />;
      case 'masters':
        return <Masters masters={masters} />;
      case 'beauty':
        return <BeautyProfile metrics={metrics} />;
      case 'notifications':
        return <Notifications notifications={notifications} />;
      case 'settings':
        return <Settings user={user} />;
      case 'support':
        return (
          <div className="space-y-6">
            <h1>Связь</h1>
            <p>Поддержка 24/7</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => window.location.href = "tel:+123456789"}>
                <Phone className="w-6 h-6" />
                Позвонить
              </Button>
              {/* Add more contacts */}
            </div>
          </div>
        );
      default:
        return <Dashboard user={user} dashboardData={dashboardData} loyalty={loyalty} bookings={bookings} masters={masters} onNavigate={handleTabChange} />;
    }
  };

  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const unreadNotifications = notifications?.filter((n: any) => !n.is_read)?.length || 0;
    const hasNotification = item.id === 'notifications' && unreadNotifications > 0;

    return (
      <button
        onClick={() => {
          setActiveTab(item.id);
          setMobileMenuOpen(false);
          setSearchParams({ tab: item.id });
        }}
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
    <div className="flex flex-col h-full bg-white">
      {/* Профиль */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={(user as any)?.avatar_url} alt={user?.full_name} />
            <AvatarFallback>{(user?.full_name?.[0] || 'U').toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{user?.full_name}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {loyalty?.tier || 'Bronze'}
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
      <div className="p-4 border-t space-y-4">
        <PublicLanguageSwitcher />

        <Button
          variant="outline"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Выйти
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          Beauty Salon App v1.0.0
        </div>
      </div>
    </div>
  );

  if (!user && !localStorage.getItem('token')) {
    // Check if user is loading?
    // Assuming ProtectedRoute handles redirection, but simple check here
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 lg:flex">
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
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Beauty CRM</span>
          </div>
        </div>
        <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setActiveTab('settings')}>
          <AvatarImage src={(user as any)?.avatar_url} />
          <AvatarFallback>{(user?.full_name?.[0] || 'U').toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[280px] h-screen sticky top-0 flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 bg-white">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none text-gray-900">Beauty CRM</h1>
              <p className="text-xs text-gray-400 mt-1 font-medium">Client Portal</p>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SidebarContent />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen pt-[60px] lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 pb-24 lg:pb-10">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          onClick={openBooking}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-300 p-0 flex items-center justify-center animate-bounce-slow"
        >
          <Calendar className="w-6 h-6" />
        </Button>
      </div>


    </div>
  );
}
