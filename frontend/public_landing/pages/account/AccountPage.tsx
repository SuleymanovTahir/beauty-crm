import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { getDateLocale as getDateLocaleCentral } from '../../../src/utils/i18nUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Star,
  Award,
  Gift,
  Camera,
  Bell,
  Settings as SettingsIcon,
  MessageCircle,
  Sparkles,
  Repeat,

  Users,
  Zap,
  Loader2,
  LogOut,
  TrendingUp,
  ArrowRight,
  Home,
  Menu,
  Image,
  Trophy,
  Flame,
  Check,
  Heart,
  Share2,
  Download,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { PublicLanguageSwitcher } from '../../../components/shared/PublicLanguageSwitcher';

// V2 Imports
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../src/components/ui/card';
import { Button } from './v2_components/ui/button';
import { Badge } from './v2_components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './v2_components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './v2_components/ui/sheet';

// Import styles
import './AccountPage.css';

// Using local AccountPage.css for styles to avoid global conflicts

// Utility Components
// Utility Components
type TabKey = 'dashboard' | 'appointments' | 'gallery' | 'loyalty' | 'achievements' | 'masters' | 'beauty' | 'notifications' | 'settings' | 'contact';

const menuItems: { id: TabKey; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Главная', icon: Home },
  { id: 'appointments', label: 'Записи', icon: Calendar },
  { id: 'gallery', label: 'Галерея', icon: Image },
  { id: 'loyalty', label: 'Лояльность', icon: Award },
  { id: 'achievements', label: 'Достижения', icon: Trophy },
  { id: 'masters', label: 'Мастера', icon: Users },
  { id: 'beauty', label: 'Beauty Profile', icon: Sparkles },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'settings', label: 'Настройки', icon: SettingsIcon },
  { id: 'contact', label: 'Контакты', icon: Phone },
];



export function AccountPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // States
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [appointmentsView, setAppointmentsView] = useState('upcoming');
  // Data States
  // V2 State
  const [activeTab, setActiveTab] = useState<Tab>(initialTab as Tab); // Use initialTab here
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
  const [showAllMasters, setShowAllMasters] = useState(false);



  // Booking Wizard State
  /* Booking Wizard State Removed - using separate route */
  const openBooking = () => navigate('/new-booking');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helper Functions ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-gray-900 border-r border-gray-100">
      {/* Profile Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-pink-50">
            <AvatarImage src={(user as any)?.avatar_url} alt={user?.full_name || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
              {(user?.full_name?.[0] || 'U').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate text-gray-900">{user?.full_name || 'Гость'}</div>
            <div className="text-sm text-pink-500 font-medium">Beauty Club</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const unreadCount = item.id === 'notifications' ? notifications.filter(n => !n.is_read).length : 0;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSearchParams({ tab: item.id });
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 font-medium shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-pink-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white h-5 min-w-5 flex items-center justify-center p-0 px-1 rounded-full text-xs">
                  {unreadCount}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="px-2">
          <PublicLanguageSwitcher />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'loyalty':
        return renderLoyalty();
      case 'achievements':
        return renderAchievements();
      case 'masters':
        return renderMasters();
      case 'beauty':
        return renderBeautyProfile();
      case 'notifications':
        return renderNotifications();
      case 'appointments':
        return renderAppointments();
      case 'gallery':
        return renderGallery();
      case 'contact':
        return renderContact();
      case 'settings':
        return renderSettings();

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"><Sparkles className="w-10 h-10 text-gray-400" /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Скоро будет доступно</h2>
            <p className="text-gray-500">Раздел находится в разработке.</p>
          </div>
        );
    }
  };

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
        api.get('/client/dashboard'),
        api.get('/client/bookings'),
        api.get('/client/gallery'),
        api.get('/client/notifications'),
        api.get('/client/loyalty'),
        api.get('/client/achievements'),
        api.get('/client/masters'),
        api.get('/client/beauty-profile')
      ]);

      setDashboardData(dashboardRes.data);
      setBookings(bookingsRes.data);
      setGallery(galleryRes.data);
      setNotifications(notifsRes.data);
      setLoyalty(loyaltyRes.data);
      setAchievements(achievementsRes.data);
      setMasters(mastersRes.data);
      setMetrics(metricsRes.data);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/client/upload-avatar`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        await api.updateClientProfile({ client_id: user?.id, avatar_url: data.url });
        toast.success('Аватар обновлен');
        window.location.reload();
      }
    } catch (error) {
      toast.error(t('account:toasts.avatar_upload_error'));
    }
  };

  const handleToggleFavoriteMaster = async (masterId: number, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await api.delete(`/client/masters/${masterId}/favorite`);
      } else {
        await api.post(`/client/masters/${masterId}/favorite`);
      }
      const res = await api.get('/client/masters');
      setMasters(res.data);
      toast.success(isFavorite ? t('account:toasts.removed_favorite') : t('account:toasts.added_favorite'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('account:toasts.error'));
    }
  };

  const handleShareReferral = (method: string) => {
    const code = dashboardData?.loyalty?.referral_code;
    if (!code) return;

    const text = t('account:referral.share_text', { code });
    const url = window.location.origin;

    switch (method) {
      case 'WhatsApp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'Telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'Email':
        window.open(`mailto:?subject=${encodeURIComponent(t('account:referral.share_subject'))}&body=${encodeURIComponent(text + ' ' + url)}`);
        break;
      case 'SMS':
        window.open(`sms:?body=${encodeURIComponent(text + ' ' + url)}`);
        break;
      default:
        handleCopyReferralCode();
    }
  };

  const handleCopyReferralCode = () => {
    const code = dashboardData?.loyalty?.referral_code;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success(t('account:toasts.code_copied'));
    }
  };

  const handleDownloadPhoto = (id: number) => {
    const photo = gallery.find(p => p.id === id);
    if (!photo) return;
    const link = document.createElement('a');
    link.href = photo.after || photo.image_url;
    link.download = `photo-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSharePhoto = async (id: number) => {
    const photo = gallery.find(p => p.id === id);
    if (!photo) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Beauty Result',
          text: photo.notes || 'Check out my new look!',
          url: photo.after || photo.image_url
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      handleDownloadPhoto(id);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/client/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success(t('account:toasts.marked_all_read'));
    } catch (error) {
      toast.error(t('account:toasts.error'));
    }
  };

  const handleMarkNotificationAsRead = async (id: number) => {
    try {
      await api.post(`/client/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking as read', error);
    }
  };
  // --- Render Functions ---

  const renderLoyalty = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Award className="w-40 h-40" /></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-yellow-100 font-medium mb-1">Ваш уровень</p>
              <h2 className="text-4xl font-bold tracking-tight">{loyalty?.current_level?.name || 'Bronze'}</h2>
            </div>
            <div className="text-right">
              <p className="text-yellow-100 font-medium mb-1">Баллы</p>
              <p className="text-5xl font-bold">{loyalty?.total_points || 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-yellow-100 mb-2">
              <span>Скидка {loyalty?.current_level?.discount_percent || 0}%</span>
              {loyalty?.next_level && <span>До уровня {loyalty.next_level.name}: {loyalty.next_level.min_points - (loyalty.total_points || 0)} баллов</span>}
            </div>
            {loyalty?.next_level && (
              <div className="w-full bg-black/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((loyalty.total_points || 0) / loyalty.next_level.min_points) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Серия посещений</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold">{dashboardData?.streak?.count || 0} 🔥</span>
              <span className="text-muted-foreground text-sm">Визитов подряд</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className={`h-2 flex-1 rounded-full ${step <= (dashboardData?.streak?.count || 0) ? 'bg-orange-500' : 'bg-gray-100'}`} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Реферальная программа</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <code className="text-lg font-bold text-gray-700">{dashboardData?.loyalty?.referral_code || '---'}</code>
              <Button variant="ghost" size="sm" onClick={handleCopyReferralCode}>Копировать</Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['WhatsApp', 'Telegram', 'Email', 'SMS'].map(method => (
                <Button key={method} variant="outline" size="sm" className="text-xs" onClick={() => handleShareReferral(method)}>{method}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {dashboardData?.analytics?.monthly_spending && (
        <Card>
          <CardHeader><CardTitle>История расходов</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.analytics.monthly_spending}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="amount" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Достижения</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {achievements.filter(a => a.is_unlocked).length} / {achievements.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map(achievement => (
          <Card key={achievement.id} className={`${achievement.is_unlocked ? 'border-green-200 bg-green-50/30' : 'opacity-70'}`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`text-4xl p-3 bg-white rounded-2xl shadow-sm ${!achievement.is_unlocked && 'grayscale'}`}>
                {achievement.icon || '🏆'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold flex items-center gap-2">
                  {i18n.language === 'ru' ? achievement.title_ru : achievement.title_en}
                  {achievement.is_unlocked && <Check className="w-4 h-4 text-green-600" />}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {i18n.language === 'ru' ? achievement.description_ru : achievement.description_en}
                </p>
                {achievement.is_unlocked ? (
                  <p className="text-xs text-green-600 mt-2 font-medium">Получено {format(new Date(achievement.unlocked_at), 'd MMM yyyy', { locale: ru })}</p>
                ) : (
                  <div className="mt-2 text-xs font-medium text-purple-600">Награда: +{achievement.points_reward} баллов</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMasters = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Мастера</h2>
        <Button variant="ghost" onClick={() => setShowAllMasters(!showAllMasters)}>
          {showAllMasters ? 'Показать избранных' : 'Показать всех'}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters
          .filter(master => showAllMasters || master.is_favorite)
          .map(master => (
            <Card key={master.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex p-4 gap-4">
                <img src={master.photo} alt={master.name} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold truncate">{master.name}</h3>
                    <button onClick={() => handleToggleFavoriteMaster(master.id, master.is_favorite)}>
                      <Heart className={`w-5 h-5 ${master.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{master.specialty}</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {master.rating || '5.0'}
                  </div>
                </div>
              </div>
              <CardFooter className="p-4 pt-0 bg-gray-50/50">
                <Button className="w-full mt-4" onClick={openBooking}>Записаться</Button>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  );

  const renderBeautyProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-gradient-to-r from-pink-100 to-purple-100 p-6 rounded-3xl">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
            {Math.round(metrics.reduce((acc, m) => acc + (Number(m.score_value) || 0), 0) / (metrics.length || 1))}%
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Beauty Profile</h2>
          <p className="text-gray-600">Ваш персональный индекс красоты</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric, i) => (
          <Card key={metric.name || i}>
            <CardContent className="p-6">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{metric.name}</span>
                <span className="font-bold text-pink-600">{metric.score_value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full"
                  style={{ width: `${metric.score_value}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">Обновлено: {metric.last_assessment ? format(new Date(metric.last_assessment), 'd MMM', { locale: ru }) : '-'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Уведомления</h2>
        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>Прочитать все</Button>
      </div>
      <div className="space-y-2">
        {notifications.length > 0 ? notifications.map(notif => (
          <div
            key={notif.id}
            onClick={() => handleMarkNotificationAsRead(notif.id)}
            className={`p-4 rounded-xl border transition-colors cursor-pointer flex gap-4 ${notif.is_read ? 'bg-white border-gray-100' : 'bg-blue-50/50 border-blue-100'}`}
          >
            <div className={`p-2 rounded-full h-fit ${notif.is_read ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className={`font-medium mb-1 ${!notif.is_read && 'text-blue-900'}`}>{notif.title}</h4>
              <p className="text-sm text-gray-600">{notif.message}</p>
              <p className="text-xs text-gray-400 mt-2">{format(new Date(notif.created_at), 'd MMMM, HH:mm', { locale: ru })}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-10 text-gray-500">Нет новых уведомлений</div>
        )}
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Мои записи</h2>
          <p className="text-gray-500">Предстоящие и прошлые визиты</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAppointmentsView('upcoming')} variant={appointmentsView === 'upcoming' ? 'default' : 'outline'}>Предстоящие</Button>
          <Button onClick={() => setAppointmentsView('history')} variant={appointmentsView === 'history' ? 'default' : 'outline'}>История</Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {appointmentsView === 'upcoming' ? (
            bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length > 0 ? (
              <div className="space-y-4">
                {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).map((booking) => (
                  <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center text-xl">📅</div>
                      <div>
                        <div className="font-bold text-gray-900">{booking.service_name}</div>
                        <div className="text-sm text-gray-500">{format(new Date(booking.datetime), 'd MMMM yyyy, HH:mm', { locale: ru })}</div>
                      </div>
                    </div>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>{booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><Calendar className="w-8 h-8" /></div>
                <h3 className="text-lg font-medium text-gray-900">Нет записей</h3>
                <Button onClick={openBooking} variant="link" className="text-pink-600">Записаться</Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {bookings.filter(b => b.status === 'completed').length > 0 ? (
                bookings.filter(b => b.status === 'completed').map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 opacity-80">
                    <div>
                      <div className="font-medium text-gray-900">{booking.service_name}</div>
                      <div className="text-sm text-gray-500">{format(new Date(booking.datetime), 'd MMMM yyyy', { locale: ru })}</div>
                    </div>
                    <Badge variant="outline">Завершен</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">История пуста</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderGallery = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Image className="w-6 h-6 text-pink-500" /> Галерея работ
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(gallery.length > 0 ? gallery : [1, 2, 3, 4, 5, 6]).map((item, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
            {typeof item === 'object' && item.image_url ? (
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-8 h-8" /></div>
            )}
            {typeof item === 'object' && item.id && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 bg-white/80 rounded-full hover:bg-white" onClick={(e) => { e.stopPropagation(); handleSharePhoto(item.id); }}>
                  <Share2 className="w-4 h-4 text-gray-700" />
                </button>
                <button className="p-1 bg-white/80 rounded-full hover:bg-white" onClick={(e) => { e.stopPropagation(); handleDownloadPhoto(item.id); }}>
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-900">Связь с салоном</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md shadow-pink-100/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-pink-500" /> Контакты</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone className="w-4 h-4 text-gray-400" /><span className="font-medium">+7 (999) 123-45-67</span></div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><MapPin className="w-4 h-4 text-gray-400" /><span>г. Москва, ул. Красивая, 15</span></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md shadow-purple-100/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-purple-500" /> Мессенджеры</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white h-12 text-lg" onClick={() => window.open('https://wa.me/79991234567', '_blank')}>WhatsApp</Button>
            <Button className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white h-12 text-lg" onClick={() => window.open('https://t.me/beauty_salon', '_blank')}>Telegram</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold">Настройки</h2>
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Профиль</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg"><AvatarImage src={(user as any)?.avatar_url} /><AvatarFallback>{(user?.full_name?.[0] || 'U').toUpperCase()}</AvatarFallback></Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-8 h-8 text-white" /></div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{user?.full_name}</h3>
              <p className="text-gray-500">{user?.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('account:dashboard.greeting_morning');
    if (hour < 18) return t('account:dashboard.greeting_day');
    return t('account:dashboard.greeting_evening');
  };

  const getMotivationalPhrase = () => {
    const phrases = t('account:dashboard.motivation', { returnObjects: true }) as string[];
    if (!Array.isArray(phrases)) return '';
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handleAddToCalendar = () => {
    toast.success(t('account:toasts.calendar_added'));
  };

  const handleRescheduleAppointment = (_id?: string) => {
    toast.info(t('account:toasts.reschedule_open'));
    openBooking();
  };

  const handleCancelAppointment = (_id?: string) => {
    toast.success(t('account:toasts.cancel_success'));
  };

  const handleRepeatAppointment = (_id?: string) => {
    toast.success(t('account:toasts.repeat_success'));
    openBooking();
  };

  const handleLeaveReview = (_id?: string) => {
    toast.info(t('account:toasts.review_open'));
  };

  const handleContactSalon = (method: string) => {
    toast.info(t('account:toasts.contact_method', { method }));
  };

  const getDateLocale = () => getDateLocaleCentral(i18n.language);



  const getVisitInsightText = (visitCount: number) => {
    if (visitCount === 0) return t('account:dashboard.insight_visits_0');
    if (visitCount >= 1 && visitCount <= 3) return t('account:dashboard.insight_visits_1_3', { count: visitCount });
    if (visitCount >= 4 && visitCount <= 9) return t('account:dashboard.insight_visits_4_9', { count: visitCount });
    return t('account:dashboard.insight_visits_10_plus', { count: visitCount });
  };



  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6 pb-8">
      {/* Приветствие */}
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {getGreeting()}, {user?.full_name?.split(' ')[0]}! <Sparkles className="w-6 h-6 text-pink-500" />
        </h1>
        <p className="text-muted-foreground">{getMotivationalPhrase()}</p>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('account:dashboard.stats.visits')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.visit_stats?.total_visits || 0}</div>
            <p className="text-xs text-muted-foreground">
              {getVisitInsightText(dashboardData?.visit_stats?.total_visits || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('account:dashboard.stats.points')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.loyalty?.points || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.loyalty?.current_level_name || 'Silver'} {t('account:loyalty.level')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('account:dashboard.stats.discount')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.loyalty?.current_discount || 0}%</div>
            <p className="text-xs text-muted-foreground">{t('account:dashboard.stats.discount_desc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ближайшая запись */}
      {dashboardData?.next_booking && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('account:dashboard.next_appointment')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={dashboardData.next_booking.master_photo} alt={dashboardData.next_booking.master_name} />
                <AvatarFallback>{dashboardData.next_booking.master_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{dashboardData.next_booking.master_name}</div>
                <div className="text-sm text-muted-foreground">{dashboardData.next_booking.service_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-white/50">
                    {format(new Date(dashboardData.next_booking.date), "d MMMM", { locale: getDateLocale() })}
                  </Badge>
                  <Badge variant="outline" className="bg-white/50">
                    {format(new Date(dashboardData.next_booking.date), "HH:mm")}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{dashboardData.next_booking.price} AED</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="flex-1 min-w-[30%] h-auto py-2 flex-col gap-1 whitespace-normal bg-white hover:bg-white/90" onClick={handleAddToCalendar}>
                <Calendar className="w-4 h-4" />
                <span className="text-xs text-center leading-tight">
                  {t('account:dashboard.appointment.add_to_calendar')}
                </span>
              </Button>
              <Button size="sm" variant="outline" className="flex-1 min-w-[30%] h-auto py-2 flex-col gap-1 whitespace-normal bg-white hover:bg-white/90" onClick={() => handleRescheduleAppointment(dashboardData.next_booking.id)}>
                <span className="text-xs text-center leading-tight">
                  {t('account:dashboard.appointment.reschedule')}
                </span>
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 min-w-[30%] h-auto py-2 flex-col gap-1 whitespace-normal" onClick={() => handleCancelAppointment(dashboardData.next_booking.id)}>
                <span className="text-xs text-center leading-tight">
                  {t('account:dashboard.appointment.cancel')}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <h2 className="text-xl mb-4 mt-6">{t('account:dashboard.quick_actions')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto min-h-[5rem] flex-col gap-2 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-all" onClick={openBooking}>
          <Calendar className="w-5 h-5 shrink-0" />
          <span className="text-sm text-center whitespace-normal">{t('account:dashboard.book_now')}</span>
        </Button>
        <Button variant="outline" className="h-auto min-h-[5rem] flex-col gap-2 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all" onClick={() => dashboardData?.last_visit && handleRepeatAppointment(dashboardData.last_visit.id)}>
          <Repeat className="w-5 h-5 shrink-0" />
          <span className="text-sm text-center whitespace-normal">{t('account:dashboard.repeat_last')}</span>
        </Button>
        <Button variant="outline" className="h-auto min-h-[5rem] flex-col gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all" onClick={() => handleTabChange('masters')}>
          <Users className="w-5 h-5 shrink-0" />
          <span className="text-sm text-center whitespace-normal">{t('account:dashboard.my_masters')}</span>
        </Button>
        <Button variant="outline" className="h-auto min-h-[5rem] flex-col gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all" onClick={() => handleContactSalon('whatsapp')}>
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm text-center whitespace-normal">{t('account:dashboard.contact_us')}</span>
        </Button>
      </div>

      {/* Последний визит */}
      {dashboardData?.last_visit && (
        <Card>
          <CardHeader>
            <CardTitle>{t('account:dashboard.last_visit')}</CardTitle>
            <CardDescription>
              {format(new Date(dashboardData.last_visit.date), "d MMMM yyyy", { locale: getDateLocale() })} - {dashboardData.last_visit.service_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleLeaveReview(dashboardData.last_visit.id)}>
              <Star className="w-4 h-4 mr-2" />
              {t('account:dashboard.appointment.leave_review')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleRepeatAppointment(dashboardData.last_visit.id)}>
              <Repeat className="w-4 h-4 mr-2" />
              {t('account:dashboard.appointment.repeat')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Инсайты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t('account:dashboard.insights_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/50 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-medium text-purple-900">
                {t('account:dashboard.insight_months', { count: dashboardData?.visit_stats?.months_as_client || 0 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('account:loyalty.saved')}</span>
              <span className="font-bold text-lg text-green-600">{dashboardData?.loyalty?.total_saved || 0} AED</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('account:loyalty.streak_title')}</span>
              <span className="font-bold flex items-center gap-1 text-lg">
                <Zap className="w-4 h-4 text-orange-500" />
                {dashboardData?.visit_stats?.streak || 0} {t('account:common.days')}
              </span>
            </div>
          </CardContent>
        </Card>

        {dashboardData?.recommendations?.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                {t('account:dashboard.smart_recommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="font-medium">{dashboardData.recommendations[0].text}</div>
                <p className="text-sm text-muted-foreground">
                  {t('account:dashboard.recommendation_sub')}
                </p>
              </div>
              <Button size="sm" className="w-full" onClick={openBooking}>
                {t('account:common.book')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Специальные предложения */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="w-5 h-5 text-pink-500" />
          {t('account:dashboard.special_offers')}
        </h2>
        {dashboardData?.special_offers?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardData.special_offers.map((offer: any) => (
              <Card key={offer.id} className="overflow-hidden">
                <div className="aspect-video relative bg-gray-100 flex items-center justify-center">
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gift className="w-12 h-12 text-pink-300" />
                  )}
                  <Badge className="absolute top-2 right-2 bg-red-500">
                    {t('account:dashboard.days_left', { days: offer.days_left })}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                  <CardDescription>{offer.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {offer.original_price > offer.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {offer.original_price} AED
                      </span>
                    )}
                    <span className="text-xl font-bold text-pink-600">
                      {offer.price} AED
                    </span>
                  </div>
                  <Button className="w-full" onClick={openBooking}>{t('account:common.book')}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{t('account:dashboard.no_offers')}</p>
          </div>
        )}
      </div>
    </div>
  );









  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-6 h-6 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
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
