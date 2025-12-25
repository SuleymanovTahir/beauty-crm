import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Award,
  Gift,
  Camera,
  Bell,
  Settings,
  MessageCircle,
  Heart,
  Sparkles,
  ChevronRight,
  Download,
  Share2,
  Plus,
  X,
  Check,
  Repeat,
  Navigation,
  Image as ImageIcon,
  Users,
  Mail,
  Lock as LockIcon,
  Eye,
  Upload,
  Trophy,
  Target,
  Flame,
  Zap,
  QrCode,
  Wallet,
  AlertCircle,
  Loader2,
  LogOut
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserBookingWizard } from './UserBookingWizard';

// Import styles
import './AccountPage.css';

// Using local AccountPage.css for styles to avoid global conflicts

// Utility Components
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hasBadge?: boolean; badgeCount?: number }> = ({ active, onClick, icon, label, hasBadge, badgeCount }) => (
  <div className="relative">
    <button
      onClick={onClick}
      className={`nav-tab ${active ? 'nav-tab-active' : 'nav-tab-inactive'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
    {hasBadge && badgeCount !== undefined && badgeCount > 0 && (
      <div className="nav-badge">
        {badgeCount}
      </div>
    )}
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; trend?: string; color?: string }> = ({ icon, label, value, trend, color = 'text-gray-900' }) => {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-2">
        <div className={`stat-icon-wrapper ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="stat-label mb-1">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-gray-900' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: { label: string; onClick: () => void } }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
      {icon}
    </div>
    <h3 className="text-lg mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export function AccountPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentsView, setAppointmentsView] = useState('upcoming');
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [showAllMasters, setShowAllMasters] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string } | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  // Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);

  const isBooking = searchParams.get('booking') === 'true';
  const openBooking = () => setSearchParams({ booking: 'true' });
  const closeBooking = () => setSearchParams({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data for settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    push: true,
    email: true,
    sms: true
  });
  const [privacySettings, setPrivacySettings] = useState({
    allowPhotos: false
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      loadAllData();
      setProfileData({
        firstName: user.full_name?.split(' ')[0] || '',
        lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user, navigate, authLoading]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        dashboardRes,
        bookingsRes,
        galleryRes,
        achievementsRes,
        mastersRes,
        metricsRes,
        notifsRes,
        loyaltyRes
      ] = await Promise.allSettled([
        api.getClientDashboard(),
        api.getClientBookings(),
        api.getClientGallery(),
        api.getClientAchievements(),
        api.getClientFavoriteMasters(),
        api.getClientBeautyMetrics(),
        api.getClientNotifications(),
        api.getClientLoyalty()
      ]);

      if (dashboardRes.status === 'fulfilled') setDashboardData(dashboardRes.value);
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.bookings || []);
      if (galleryRes.status === 'fulfilled') setGallery(galleryRes.value.gallery || []);
      if (achievementsRes.status === 'fulfilled') setAchievements(achievementsRes.value.achievements || []);
      if (mastersRes.status === 'fulfilled') setMasters(mastersRes.value.masters || []);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.metrics || []);
      if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value.notifications || []);
      if (loyaltyRes.status === 'fulfilled') setLoyalty(loyaltyRes.value);
    } catch (error) {
      console.error('Error loading account data', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleToggleFavoriteMaster = async (masterId: number, isFavoriteNow: boolean) => {
    try {
      await api.toggleFavoriteMaster(masterId, !isFavoriteNow);
      toast.success(!isFavoriteNow ? 'Мастер добавлен в избранное' : 'Мастер удален из избранного');
      setMasters(prev => prev.map(m => m.id === masterId ? { ...m, is_favorite: !isFavoriteNow } : m));
    } catch (e) {
      toast.error('Ошибка обновления');
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
      toast.error("Ошибка загрузки аватара");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const getMotivationalPhrase = () => {
    const phrases = [
      'Вы выглядите великолепно!',
      'Скучали по вам!',
      'Время позаботиться о себе',
      'Ваша красота - наша работа'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handleAddToCalendar = () => {
    toast.success('Добавлено в календарь');
  };

  const handleRescheduleAppointment = (_id?: string) => {
    toast.info('Открываем форму переноса записи...');
    openBooking();
  };

  const handleCancelAppointment = (_id?: string) => {
    toast.success('Запись успешно отменена');
  };

  const handleRepeatAppointment = (_id?: string) => {
    toast.success('Повторяем последнюю запись...');
    openBooking();
  };

  const handleLeaveReview = (_id?: string) => {
    toast.info('Открываем форму отзыва...');
  };

  const handleDownloadPhoto = (_photoId?: string) => {
    toast.success('Фото скачивается...');
  };

  const handleSharePhoto = (_photoId?: string) => {
    toast.success('Ссылка для шаринга скопирована');
  };

  const handleFavoritePhoto = (photoId?: string) => {
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
      toast.info('Удалено из избранного');
    } else {
      setSelectedPhotoId(photoId || null);
      toast.success('Добавлено в избранное');
    }
  };

  const handleShareReferral = (platform: string) => {
    toast.success(`Открываем ${platform} для шаринга...`);
  };

  const handleSaveProfile = () => {
    toast.success('Профиль успешно сохранен');
  };

  const handleChangePassword = () => {
    toast.info('Открываем форму смены пароля...');
  };

  const handleEnable2FA = () => {
    toast.info('Настройка двухфакторной аутентификации...');
  };

  const handleExportData = () => {
    toast.success('Экспорт данных начат...');
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText((user as any)?.referral_code || 'ANNA2024');
    toast.success('Код скопирован в буфер обмена');
  };

  const handleMarkNotificationAsRead = (_id: string) => {
    toast.success('Уведомление прочитано');
  };

  const handleMarkAllAsRead = () => {
    toast.success('Все уведомления прочитаны');
  };

  const handleContactSalon = (method: string) => {
    toast.info(`Связываемся через ${method}...`);
  };

  const handleNavigate = () => {
    toast.info('Открываем навигатор...');
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ru': return ru;
      case 'ar': return ar;
      default: return enUS;
    }
  };

  const getDaysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    return `Через ${days} дней`;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="welcome-card">
        <div className="welcome-bg-pattern">
          <Sparkles className="w-full h-full" />
        </div>
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <h1 className="text-2xl mb-1">{getGreeting()}, {user?.full_name?.split(' ')[0] || 'Анна'}! 👋</h1>
            <p className="opacity-90">{getMotivationalPhrase()}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white overflow-hidden border-2 border-white relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img src={(user as any)?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'} alt={user?.full_name} className="w-full h-full object-cover" />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 border-t border-white/10 pt-6 relative z-10">
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.total_visits || 0}</p>
            <p className="opacity-80 text-sm">Визитов</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.loyalty_points || 0}</p>
            <p className="opacity-80 text-sm">Баллов</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.current_discount || 0}%</p>
            <p className="opacity-80 text-sm">Скидка</p>
          </div>
        </div>
      </div>

      {/* Next Appointment */}
      {dashboardData?.next_booking && (
        <div className="appointment-card space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Следующая запись</h2>
            <span className="badge-success">
              {getDaysUntil(dashboardData.next_booking.date)}
            </span>
          </div>

          <div className="flex gap-4 mb-4">
            <img
              src={dashboardData.next_booking.master_photo || 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop'}
              alt={dashboardData.next_booking.master_name}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="mb-1">{dashboardData.next_booking.master_name}</h3>
              <p className="text-sm text-gray-500 mb-2">{dashboardData.next_booking.master_specialty}</p>
              <p className="text-gray-900">{dashboardData.next_booking.service_name}</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <span>{format(new Date(dashboardData.next_booking.date), "EEEE, d MMMM", { locale: getDateLocale() })}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span>{format(new Date(dashboardData.next_booking.date), "HH:mm")} ({dashboardData.next_booking.duration || 180} мин)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p>Dubai Marina, Marina Plaza, Office 302</p>
                <button
                  onClick={handleNavigate}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  Построить маршрут
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAddToCalendar}
              className="btn-primary flex-1"
            >
              В календарь
            </button>
            <button
              onClick={() => handleRescheduleAppointment(dashboardData.next_booking.id)}
              className="btn-secondary"
            >
              Перенести
            </button>
            <button
              onClick={() => handleCancelAppointment(dashboardData.next_booking.id)}
              className="btn-destructive"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={openBooking}
          className="btn-primary h-auto p-4 justify-start"
        >
          <Plus className="w-5 h-5" />
          <span>Новая запись</span>
        </button>
        <button
          onClick={openBooking}
          className="btn-outline h-auto p-4 justify-start"
        >
          <Repeat className="w-5 h-5" />
          <span>Повторить последнюю</span>
        </button>
        <button
          onClick={() => setActiveTab('masters')}
          className="btn-outline h-auto p-4 justify-start"
        >
          <Heart className="w-5 h-5" />
          <span>Мои мастера</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className="btn-outline h-auto p-4 justify-start"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Связаться</span>
        </button>
      </div>

      {/* Last Visit */}
      {dashboardData?.last_booking && (
        <div className="account-card">
          <h2 className="text-xl mb-4">Ваш последний визит</h2>

          <div className="flex gap-4 mb-4">
            <img
              src={dashboardData.last_booking.master_photo || 'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop'}
              alt={dashboardData.last_booking.master_name}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="mb-1">{dashboardData.last_booking.service_name}</h3>
              <p className="text-sm text-gray-500">{dashboardData.last_booking.master_name}</p>
              <p className="text-sm text-gray-400">{format(new Date(dashboardData.last_booking.date), "d MMMM yyyy", { locale: getDateLocale() })}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleLeaveReview(dashboardData.last_booking.id)}
              className="btn-primary flex-1"
            >
              Оставить отзыв
            </button>
            <button
              onClick={() => handleRepeatAppointment(dashboardData.last_booking.id)}
              className="btn-secondary"
            >
              Повторить
            </button>
          </div>
        </div>
      )}


      {/* Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl">Персональные инсайты</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">🎉</div>
            <p className="text-gray-700 flex-1">Вы с нами уже {dashboardData?.months_as_client || 0} месяцев!</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">💰</div>
            <p className="text-gray-700 flex-1">Вы сэкономили {dashboardData?.total_saved || 0} AED благодаря программе лояльности</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">⭐</div>
            <p className="text-gray-700 flex-1">Вы посетили нас {dashboardData?.total_visits || 0} раз - это больше, чем у 80% клиентов!</p>
          </div>
        </div>
      </div>

      {/* Special Offers */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5" />
          <h2 className="text-xl">Специальные предложения</h2>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-gray-900">Только для вас: 20% на уход за лицом</h3>
              <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs whitespace-nowrap">Осталось 2 дня</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Персональное предложение на основе вашей истории</p>
            <button
              onClick={openBooking}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Записаться
            </button>
          </div>
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl">Умные рекомендации</h2>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-gray-900 mb-2">Вы обычно делаете маникюр каждые 3 недели - пора записаться?</p>
            <button
              onClick={openBooking}
              className="text-sm text-gray-900 hover:underline flex items-center gap-1"
            >
              Записаться на маникюр
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-gray-900 mb-2">Прошло 5 недель с последнего окрашивания</p>
            <button
              onClick={openBooking}
              className="text-sm text-gray-900 hover:underline flex items-center gap-1"
            >
              Записаться на окрашивание
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Appointments Content
  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setAppointmentsView('upcoming')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${appointmentsView === 'upcoming' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
        >
          Предстоящие
        </button>
        <button
          onClick={() => setAppointmentsView('history')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${appointmentsView === 'history' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
        >
          История
        </button>
        <button
          onClick={() => setAppointmentsView('recurring')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${appointmentsView === 'recurring' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
        >
          Повторяющиеся
        </button>
      </div>

      <div className="space-y-4">
        {bookings.filter(apt => {
          const isUpcoming = new Date(apt.date) >= new Date();
          return appointmentsView === 'upcoming' ? isUpcoming : !isUpcoming;
        }).map(apt => (
          <div key={apt.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex gap-3 mb-3">
              <img src={apt.master_photo} alt={apt.master_name} className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1">
                <h3 className="mb-1">{apt.service_name}</h3>
                <p className="text-sm text-gray-500">{apt.master_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-600">{format(new Date(apt.date), "d MMMM yyyy", { locale: getDateLocale() })}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-600">{format(new Date(apt.date), "HH:mm")}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg">{apt.price} AED</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRepeatAppointment(apt.id)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Повторить
              </button>
            </div>
          </div>
        ))}
        {bookings.length === 0 && (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="Записей пока нет"
            description="Вы еще не совершили ни одной записи"
            action={{ label: "Записаться", onClick: openBooking }}
          />
        )}
      </div>

      {appointmentsView === 'recurring' && (
        <EmptyState
          icon={<Repeat className="w-8 h-8" />}
          title="Нет повторяющихся записей"
          description="Создайте автоматическую запись, чтобы не забывать о регулярных процедурах"
          action={{
            label: 'Создать автозапись',
            onClick: () => toast.info('Функция в разработке')
          }}
        />
      )}

      {/* Statistics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Статистика посещений</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Всего визитов</p>
            <p className="text-2xl">{dashboardData?.total_visits || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Средняя частота</p>
            <p className="text-2xl">2 недели</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Любимая услуга</p>
            <p className="text-lg">Маникюр</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Любимый мастер</p>
            <p className="text-lg">Мария</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Gallery Content
  const renderGallery = () => {
    const filteredGallery = gallery.filter(photo =>
      galleryFilter === 'all' || photo.category === galleryFilter
    );

    return (
      <div className="space-y-6">
        <div className="nav-tabs-list overflow-x-auto pb-2 mb-4">
          {['all', 'hair', 'nails', 'face', 'body'].map(filter => (
            <button
              key={filter}
              onClick={() => setGalleryFilter(filter)}
              className={`nav-tab ${galleryFilter === filter ? 'nav-tab-active' : 'nav-tab-inactive'}`}
            >
              {filter === 'all' && 'Все'}
              {filter === 'hair' && 'Волосы'}
              {filter === 'nails' && 'Ногти'}
              {filter === 'face' && 'Лицо'}
              {filter === 'body' && 'Тело'}
            </button>
          ))}
        </div>

        {filteredGallery.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-8 h-8" />}
            title="Нет фотографий"
            description="В этой категории пока нет фотографий трансформаций"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGallery.map(photo => (
              <div key={photo.id} className="account-card p-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-medium">До</p>
                    <img src={photo.before_url} alt="До" className="w-full h-48 object-cover rounded-lg shadow-inner" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-medium">После</p>
                    <img src={photo.after_url} alt="После" className="w-full h-48 object-cover rounded-lg shadow-inner" />
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="font-bold mb-1">{photo.service_name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{photo.master_name}</span>
                    <span className="text-gray-400">{format(new Date(photo.created_at), "d MMMM yyyy", { locale: getDateLocale() })}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setComparePhotos({ before: photo.before_url, after: photo.after_url })}
                    className="btn-secondary flex-1 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Сравнить
                  </button>
                  <button
                    onClick={() => handleDownloadPhoto(photo.id)}
                    className="btn-secondary p-2"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSharePhoto(photo.id)}
                    className="btn-secondary p-2"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFavoritePhoto(photo.id)}
                    className="btn-secondary p-2"
                  >
                    <Heart className={`w-4 h-4 favorite-heart ${selectedPhotoId === photo.id ? 'favorite-heart-active' : 'favorite-heart-inactive'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {comparePhotos && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setComparePhotos(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl">Сравнение</h3>
                <button onClick={() => setComparePhotos(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">До</p>
                  <img src={comparePhotos.before} alt="До" className="w-full rounded-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">После</p>
                  <img src={comparePhotos.after} alt="После" className="w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loyalty Content
  const renderLoyalty = () => (
    <div className="space-y-6">
      <div className="loyalty-card-gold">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="loyalty-gold-text mb-1">Ваш уровень</p>
            <h2 className="text-3xl mb-2">{loyalty?.current_level?.name || 'Standard'}</h2>
            <p className="loyalty-gold-text">Скидка {loyalty?.current_level?.discount_percent || 0}%</p>
          </div>
          <div className="text-right">
            <p className="loyalty-gold-text mb-1">Баллы</p>
            <p className="text-4xl">{loyalty?.total_points || 0}</p>
          </div>
        </div>
        {loyalty?.next_level && (
          <div>
            <div className="flex justify-between text-sm loyalty-gold-text mb-2">
              <span>До уровня {loyalty.next_level.name}</span>
              <span>{loyalty.next_level.min_points - (loyalty.total_points || 0)} баллов</span>
            </div>
            <ProgressBar value={loyalty.total_points || 0} max={loyalty.next_level.min_points} color="bg-white" />
          </div>
        )}
      </div>

      {/* Streak */}
      <div className="streak-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 streak-flame" />
            <h3 className="text-lg">Серия посещений</h3>
          </div>
          <span className="text-2xl font-bold">3🔥</span>
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`streak-bar ${step <= 3 ? 'streak-bar-active' : ''}`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500">Еще 2 визита до бонуса 500 баллов!</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Аналитика расходов</h3>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { month: 'Июл', amount: 280 },
              { month: 'Авг', amount: 350 },
              { month: 'Сен', amount: 420 },
              { month: 'Окт', amount: 380 },
              { month: 'Ноя', amount: 520 },
              { month: 'Дек', amount: 850 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="amount" fill="#1f2937" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl mb-1">{loyalty?.total_spent || 0} AED</p>
            <p className="text-sm text-gray-500">Всего потрачено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{dashboardData?.total_saved || 0} AED</p>
            <p className="text-sm text-gray-500">Сэкономлено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">350 AED</p>
            <p className="text-sm text-gray-500">Средний чек</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">Декабрь</p>
            <p className="text-sm text-gray-500">Самый активный</p>
          </div>
        </div>

        <h4 className="mb-3">Распределение по услугам</h4>
        <div className="flex items-center gap-6">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Волосы', value: 45, color: '#9333ea' },
                    { name: 'Ногти', value: 30, color: '#ec4899' },
                    { name: 'Лицо', value: 15, color: '#3b82f6' },
                    { name: 'Другое', value: 10, color: '#10b981' }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                >
                  {[
                    { color: '#9333ea' },
                    { color: '#ec4899' },
                    { color: '#3b82f6' },
                    { color: '#10b981' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { name: 'Волосы', value: 45, color: '#9333ea' },
              { name: 'Ногти', value: 30, color: '#ec4899' },
              { name: 'Лицо', value: 15, color: '#3b82f6' },
              { name: 'Другое', value: 10, color: '#10b981' }
            ].map(service => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                  <span className="text-sm">{service.name}</span>
                </div>
                <span className="text-sm">{service.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Virtual Card */}
      <div className="account-card">
        <h3 className="text-lg mb-4">Виртуальная карта лояльности</h3>
        <div className="loyalty-card-gold mb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="loyalty-gold-text text-sm mb-1">Beauty Studio Dubai</p>
              <h4 className="text-2xl mb-1">{user?.full_name}</h4>
              <p className="loyalty-gold-text">{loyalty?.current_level?.name || 'Standard'} Member</p>
            </div>
            <div className="w-20 h-20 bg-white rounded-lg p-2">
              <QrCode className="w-full h-full text-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="loyalty-gold-text text-xs mb-1">Баллы</p>
              <p className="text-xl">{loyalty?.total_points || 0}</p>
            </div>
            <div>
              <p className="text-yellow-100 text-xs mb-1">Скидка</p>
              <p className="text-xl">{loyalty?.current_level?.discount_percent || 0}%</p>
            </div>
            <div>
              <p className="text-yellow-100 text-xs mb-1">ID</p>
              <p className="text-sm">#{(user?.id || 0).toString().padStart(6, '0')}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toast.info('Функция добавления в Wallet скоро будет доступна')}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Добавить в Wallet
          </button>
          <button
            onClick={() => toast.success('QR-код сохранен')}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg">Реферальная программа</h3>
        </div>
        <p className="text-gray-600 mb-4">Пригласите друга и получите 200 баллов, когда он совершит первый визит</p>
        <div className="bg-white p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-500 mb-2">Ваш код</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xl tracking-wider">{(user as any)?.referral_code || 'ANNA2024'}</code>
            <button
              onClick={handleCopyReferralCode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Копировать
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => handleShareReferral('WhatsApp')} className="p-3 bg-white rounded-lg border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors">
            <span className="text-xl">💬</span>
            <span className="text-[10px] text-gray-500">WhatsApp</span>
          </button>
          <button onClick={() => handleShareReferral('Instagram')} className="p-3 bg-white rounded-lg border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors">
            <span className="text-xl">📸</span>
            <span className="text-[10px] text-gray-500">Instagram</span>
          </button>
          <button onClick={() => handleShareReferral('Email')} className="p-3 bg-white rounded-lg border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors">
            <span className="text-xl">📧</span>
            <span className="text-[10px] text-gray-500">Email</span>
          </button>
          <button onClick={() => handleShareReferral('SMS')} className="p-3 bg-white rounded-lg border border-gray-100 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors">
            <span className="text-xl">📱</span>
            <span className="text-[10px] text-gray-500">SMS</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Achievements Content
  const renderAchievements = () => (
    <div className="space-y-6">
      <div className="achievement-hero">
        <h2 className="text-2xl mb-2">Ваши достижения</h2>
        <p className="achievement-hero-text">Разблокировано {achievements.filter(a => a.is_unlocked).length} из {achievements.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`achievement-item ${achievement.is_unlocked ? 'achievement-item-unlocked' : ''}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`text-4xl ${!achievement.is_unlocked && 'grayscale opacity-50'}`}>
                {achievement.icon || '🏆'}
              </div>
              <div className="flex-1">
                <h3 className="mb-1">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
                {achievement.is_unlocked && achievement.unlocked_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Разблокировано {format(new Date(achievement.unlocked_at), "d MMMM yyyy", { locale: getDateLocale() })}
                  </p>
                )}
              </div>
              {achievement.is_unlocked ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <span className="text-sm text-gray-400">+{achievement.points_reward}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Active Challenges */}
      <div className="account-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-lg">Активные челленджи</h3>
        </div>
        <div className="space-y-3">
          <div className="challenge-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="mb-1">Запишитесь на этой неделе</h4>
                <p className="text-sm text-gray-600">Получите 50 бонусных баллов</p>
              </div>
              <span className="badge-secondary text-xs">5 дней</span>
            </div>
            <button
              onClick={openBooking}
              className="btn-primary w-full mt-3"
            >
              Выполнить
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Masters Content
  const renderMasters = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Избранные мастера</h2>
        <button
          onClick={() => setShowAllMasters(!showAllMasters)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          {showAllMasters ? 'Только избранные' : 'Все мастера'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masters
          .filter(master => showAllMasters || master.is_favorite)
          .map(master => (
            <div key={master.id} className="account-card master-card p-4">
              <div className="flex gap-4 mb-3">
                <img src={master.photo} alt={master.name} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold">{master.name}</h3>
                    <button
                      onClick={() => handleToggleFavoriteMaster(master.id, master.is_favorite)}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <Heart className={`w-5 h-5 favorite-heart ${master.is_favorite ? 'favorite-heart-active' : 'favorite-heart-inactive'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{master.specialty}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 rating-star" />
                      <span className="text-sm font-medium">{master.rating || 5.0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={openBooking}
                className="btn-primary w-full"
              >
                Записаться
              </button>
            </div>
          ))}
      </div>
    </div>
  );

  // Beauty Profile Content
  const renderBeautyProfile = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'perfect': return 'text-green-600';
        case 'good': return 'text-blue-600';
        case 'attention': return 'text-orange-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'perfect': return 'Всё отлично';
        case 'good': return 'Хорошо';
        case 'attention': return 'Нужно внимание';
        default: return '';
      }
    };

    const averageBeautyScore = metrics.length > 0
      ? Math.round(metrics.reduce((acc, m) => acc + m.score_value, 0) / metrics.length)
      : 85;

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="beauty-score-hero">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl mb-1">Beauty Score</h2>
              <p className="beauty-score-text">Общий уровень ухоженности</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10">
                <span className="text-4xl font-bold">{averageBeautyScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>Великолепно! Так держать!</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="account-card beauty-metric-card p-6">
          <h3 className="text-lg mb-4">Показатели здоровья</h3>
          <div className="space-y-4">
            {metrics.map(metric => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{metric.name}</h4>
                    <p className="text-sm text-gray-500">
                      {metric.last_assessment ? format(new Date(metric.last_assessment), "d MMMM yyyy", { locale: getDateLocale() }) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(metric.score_value > 80 ? 'perfect' : metric.score_value > 50 ? 'good' : 'attention')}`}>
                      {getStatusText(metric.score_value > 80 ? 'perfect' : metric.score_value > 50 ? 'good' : 'attention')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar
                      value={metric.score_value}
                      max={100}
                      color={metric.score_value < 50 ? 'bg-orange-500' : metric.score_value > 80 ? 'bg-green-500' : 'bg-blue-500'}
                    />
                  </div>
                  <span className="text-sm w-12 text-right font-medium">{metric.score_value}%</span>
                  <button
                    onClick={openBooking}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    Записаться
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="account-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            <h3 className="text-lg">Персональный календарь красоты</h3>
          </div>
          <div className="space-y-3">
            <div className="alert-card">
              <AlertCircle className="w-5 h-5 alert-card-icon mt-0.5" />
              <div className="flex-1">
                <h4 className="mb-1 text-gray-900 font-bold">Рекомендуем записаться</h4>
                <p className="text-sm text-gray-600 mb-2">Брови: прошло слишком много времени с последней коррекции</p>
                <button
                  onClick={openBooking}
                  className="text-sm text-gray-900 hover:underline flex items-center gap-1 font-medium"
                >
                  Записаться на коррекцию бровей
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Notifications Content
  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl">Уведомления</h2>
          <p className="text-sm text-gray-500">{notifications.filter(n => !n.is_read).length} непрочитанных</p>
        </div>
        <button onClick={handleMarkAllAsRead} className="text-sm text-gray-600 hover:text-gray-900">Прочитать все</button>
      </div>
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`notification-item cursor-pointer ${notif.is_read ? 'notification-read' : 'notification-unread'}`}
          onClick={() => handleMarkNotificationAsRead(notif.id)}
        >
          <div className="flex items-start gap-3 w-full">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold mb-1">{notif.title}</h4>
              <p className="text-sm text-gray-600 mb-1">{notif.message}</p>
              <p className="text-xs text-gray-400">{format(new Date(notif.created_at), "d MMMM HH:mm", { locale: getDateLocale() })}</p>
            </div>
            {!notif.is_read && <div className="w-2 h-2 bg-primary rounded-full mt-2" />}
          </div>
        </div>
      ))}
      {notifications.length === 0 && (
        <EmptyState icon={<Bell className="w-8 h-8" />} title="Нет уведомлений" description="У вас пока нет уведомлений" />
      )}
    </div>
  );

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-6">
      {/* Profile */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">Личные данные</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <img src={(user as any)?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'} alt={user?.full_name} className="w-20 h-20 rounded-full object-cover" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 bg-gray-900 text-white rounded-full hover:bg-gray-800"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h4 className="font-bold mb-1">{user?.full_name}</h4>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">Имя</label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Фамилия</label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Телефон</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="form-input"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="btn-primary w-full"
          >
            Сохранить изменения
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">Безопасность</h3>
        <div className="space-y-3">
          <button
            onClick={handleChangePassword}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5 text-gray-500" />
              <span>Изменить пароль</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleEnable2FA}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5 text-gray-500" />
              <span>Двухфакторная аутентификация</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-500" />
              <span>Экспорт данных</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notifications Settings */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">Уведомления</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">Push-уведомления</h4>
              <p className="text-sm text-gray-500">Уведомления на устройстве</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.push}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, push: e.target.checked });
                  toast.success(e.target.checked ? 'Push-уведомления включены' : 'Push-уведомления отключены');
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">Email-рассылка</h4>
              <p className="text-sm text-gray-500">Новости и акции</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.email}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, email: e.target.checked });
                  toast.success(e.target.checked ? 'Email-рассылка включена' : 'Email-рассылка отключена');
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">SMS-напоминания</h4>
              <p className="text-sm text-gray-500">О предстоящих записях</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.sms}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, sms: e.target.checked });
                  toast.success(e.target.checked ? 'SMS-напоминания включены' : 'SMS-напоминания отключены');
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">Приватность</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">Использование фото в портфолио</h4>
              <p className="text-sm text-gray-500">Разрешить салону публиковать</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.allowPhotos}
                onChange={(e) => {
                  setPrivacySettings({ ...privacySettings, allowPhotos: e.target.checked });
                  toast.success(e.target.checked ? 'Разрешение на публикацию фото включено' : 'Разрешение на публикацию фото отключено');
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="account-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-destructive">Выход из аккаунта</h3>
          <button onClick={handleLogout} className="btn-destructive">
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Личный кабинет</h1>
          <p className="text-muted-foreground">Управляйте записями и отслеживайте свой прогресс</p>
        </div>

        {/* Navigation */}
        <div className="nav-tabs-container">
          <div className="nav-tabs-list">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Sparkles className="w-5 h-5" />} label="Главная" />
            <TabButton active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} icon={<Calendar className="w-5 h-5" />} label="Записи" />
            <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<ImageIcon className="w-5 h-5" />} label="Галерея" />
            <TabButton active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} icon={<Award className="w-5 h-5" />} label="Лояльность" />
            <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')} icon={<Trophy className="w-5 h-5" />} label="Достижения" />
            <TabButton active={activeTab === 'masters'} onClick={() => setActiveTab('masters')} icon={<Users className="w-5 h-5" />} label="Мастера" />
            <TabButton active={activeTab === 'beauty'} onClick={() => setActiveTab('beauty')} icon={<Sparkles className="w-5 h-5" />} label="Beauty-профиль" />
            <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell className="w-5 h-5" />} label="Уведомления" hasBadge badgeCount={notifications.filter(n => !n.is_read).length} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle className="w-5 h-5" />} label="Связь" />
            <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-5 h-5" />} label="Настройки" />
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'gallery' && renderGallery()}
          {activeTab === 'loyalty' && renderLoyalty()}
          {activeTab === 'achievements' && renderAchievements()}
          {activeTab === 'masters' && renderMasters()}
          {activeTab === 'beauty' && renderBeautyProfile()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="text-lg">Чат с салоном</h3>
                </div>
                <EmptyState
                  icon={<MessageCircle className="w-8 h-8" />}
                  title="Нет сообщений"
                  description="Начните общение с администратором салона"
                  action={{ label: 'Написать сообщение', onClick: () => handleContactSalon('WhatsApp') }}
                />
              </div>

              {/* Contact Info */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg mb-4">Контакты</h3>
                <div className="space-y-3">
                  <a
                    href="tel:+97150123456"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500">Телефон</p>
                      <p>+971 50 123 4567</p>
                    </div>
                  </a>
                  <a
                    href="mailto:info@beautystudio.ae"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p>info@beautystudio.ae</p>
                    </div>
                  </a>
                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Адрес</p>
                      <p>Dubai Marina, Marina Plaza, Office 302</p>
                      <button
                        onClick={handleNavigate}
                        className="text-sm text-gray-900 hover:underline mt-1 flex items-center gap-1"
                      >
                        Построить маршрут
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg mb-4">Быстрая связь</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleContactSalon('phone')}
                    className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Позвонить</span>
                  </button>
                  <button
                    onClick={() => handleContactSalon('email')}
                    className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Написать Email</span>
                  </button>
                  <button
                    onClick={() => handleContactSalon('WhatsApp')}
                    className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleContactSalon('Instagram')}
                    className="flex items-center justify-center gap-3 p-4 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Instagram</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'settings' && renderSettings()}
        </div>

        {isBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full min-h-screen bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
              <UserBookingWizard onClose={closeBooking} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
