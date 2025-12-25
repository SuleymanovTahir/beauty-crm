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
  MapPin,
  Phone,
  Star,
  Award,
  Gift,
  Camera,
  Bell,
  Settings,
  MessageCircle,
  User,
  Heart,
  Sparkles,
  ChevronRight,
  Plus,
  X,
  Check,
  Repeat,
  ImageIcon,
  Users,
  Trophy,
  Upload,
  QrCode,
  Wallet,
  Clock,
  LogOut,
  Loader2,
  Share2
} from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserBookingWizard } from './UserBookingWizard';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import './AccountPage.css';

// Utility Components
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hasBadge?: boolean; badgeCount?: number }> = ({ active, onClick, icon, label, hasBadge, badgeCount }) => (
  <div className="relative">
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap font-medium ${active
        ? 'account-tab-active shadow-sm'
        : 'account-tab-inactive'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
    {hasBadge && badgeCount !== undefined && badgeCount > 0 && (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
        {badgeCount}
      </div>
    )}
  </div>
);

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

export default function AccountPage() {
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      loadAllData();
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

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ru': return ru;
      case 'ar': return ar;
      default: return enUS;
    }
  };

  const currentLoyaltyLevel = loyalty?.current_level;
  const nextLoyaltyLevel = loyalty?.next_level;

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
      <div className="welcome-card-bg text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {user?.full_name || 'Гость'}! 👋</h1>
            <p className="text-gray-300 text-lg">Вы выглядите великолепно! Время позаботиться о себе.</p>
          </div>
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={(user as any)?.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-gray-800 text-2xl">{user?.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-8 border-t border-white/10 pt-8">
          <div className="text-center group cursor-pointer">
            <p className="text-4xl font-bold mb-1 group-hover:scale-110 transition-transform">{dashboardData?.total_visits || 0}</p>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Визитов</p>
          </div>
          <div className="text-center group cursor-pointer">
            <p className="text-4xl font-bold mb-1 group-hover:scale-110 transition-transform">{dashboardData?.loyalty_points || 0}</p>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Баллов</p>
          </div>
          <div className="text-center group cursor-pointer">
            <p className="text-4xl font-bold mb-1 group-hover:scale-110 transition-transform">{dashboardData?.current_discount || 0}%</p>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Скидка</p>
          </div>
        </div>
      </div>

      {/* Next Appointment */}
      {dashboardData?.next_booking && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Следующая запись</h2>
            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold animate-pulse">
              Через {Math.ceil((new Date(dashboardData.next_booking.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} дней
            </span>
          </div>

          <div className="flex gap-6 mb-6">
            <img
              src={dashboardData.next_booking.master_photo}
              className="w-24 h-24 rounded-2xl object-cover shadow-md"
            />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">{dashboardData.next_booking.master_name}</h3>
              <p className="text-sm text-gray-500 mb-3">{dashboardData.next_booking.master_specialty}</p>
              <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {dashboardData.next_booking.service_name}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Calendar className="w-5 h-5 text-gray-900" />
              </div>
              <span className="font-medium text-sm">{format(new Date(dashboardData.next_booking.date), "EEEE, d MMMM", { locale: getDateLocale() })}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-gray-900" />
              </div>
              <span className="font-medium text-sm">{format(new Date(dashboardData.next_booking.date), "HH:mm", { locale: getDateLocale() })} ({dashboardData.next_booking.duration || 180} мин)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MapPin className="w-5 h-5 text-gray-900" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold">Dubai Marina, Marina Plaza, Office 302</p>
                <p className="text-gray-400">Бесплатная парковка 2 часа</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md">
              В календарь
            </button>
            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all">
              Перенести
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => openBooking()} className="p-6 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-all flex flex-col items-center gap-3 shadow-md group">
          <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold">Новая запись</span>
        </button>
        <button onClick={() => openBooking()} className="p-6 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex flex-col items-center gap-3 shadow-sm group">
          <div className="p-3 bg-gray-50 rounded-xl group-hover:scale-110 transition-transform">
            <Repeat className="w-6 h-6 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900">Повторить</span>
        </button>
        <button onClick={() => setActiveTab('masters')} className="p-6 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex flex-col items-center gap-3 shadow-sm group">
          <div className="p-3 bg-gray-50 rounded-xl group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900">Мои мастера</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className="p-6 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex flex-col items-center gap-3 shadow-sm group">
          <div className="p-3 bg-gray-50 rounded-xl group-hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900">Поддержка</span>
        </button>
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button onClick={() => setAppointmentsView('upcoming')} className={`px-6 py-2 rounded-lg font-bold transition-all ${appointmentsView === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Предстоящие
        </button>
        <button onClick={() => setAppointmentsView('history')} className={`px-6 py-2 rounded-lg font-bold transition-all ${appointmentsView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          История
        </button>
      </div>

      <div className="space-y-4">
        {bookings.filter(b => appointmentsView === 'upcoming' ? new Date(b.date) >= new Date() : new Date(b.date) < new Date()).map(apt => (
          <div key={apt.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all">
            <div className="flex gap-6">
              <img src={apt.master_photo} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{apt.service_name}</h3>
                  <span className="text-xl font-bold">{apt.price} AED</span>
                </div>
                <p className="text-gray-500 mb-4">{apt.master_name}</p>
                <div className="flex gap-4 text-sm font-medium text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(apt.date), "d MMMM", { locale: getDateLocale() })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(apt.date), "HH:mm", { locale: getDateLocale() })}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
              <button className="flex-1 py-2.5 bg-gray-50 text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all">
                Подробнее
              </button>
              <button className="px-6 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all">
                Повторить
              </button>
            </div>
          </div>
        ))}
        {bookings.length === 0 && (
          <EmptyState icon={<Calendar className="w-12 h-12" />} title="Записей пока нет" description="Ваша история посещений пуста. Самое время это исправить!" action={{ label: "Записаться", onClick: openBooking }} />
        )}
      </div>
    </div>
  );

  const renderGallery = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'hair', 'nails', 'face', 'body'].map(f => (
          <button key={f} onClick={() => setGalleryFilter(f)} className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all ${galleryFilter === f ? 'bg-gray-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'Все' : f === 'hair' ? 'Волосы' : f === 'nails' ? 'Ногти' : f === 'face' ? 'Лицо' : 'Тело'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gallery.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
            <div className="grid grid-cols-2 gap-2 mb-4 h-64">
              <div className="relative overflow-hidden rounded-xl">
                <img src={item.before_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] font-bold rounded uppercase">До</span>
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <img src={item.after_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 text-white text-[10px] font-bold rounded uppercase">После</span>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{item.service_name}</h3>
            <p className="text-sm text-gray-500">{item.master_name} • {format(new Date(item.created_at), "d MMMM yyyy", { locale: getDateLocale() })}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setComparePhotos({ before: item.before_url, after: item.after_url })} className="flex-1 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">
                Сравнить
              </button>
              <button className="p-2 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-all"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLoyalty = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">Ваш статус</p>
              <h2 className="text-4xl font-extrabold">{loyalty?.current_level?.name || 'Standard'}</h2>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">Бонусные баллы</p>
              <p className="text-5xl font-black">{loyalty?.total_points || 0}</p>
            </div>
          </div>
          {loyalty?.next_level && (
            <div className="space-y-4">
              <div className="flex justify-between items-end text-sm font-bold">
                <span>До уровня {loyalty.next_level.name}</span>
                <span>{loyalty.next_level.min_points - (loyalty.total_points || 0)} баллов</span>
              </div>
              <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(((loyalty.total_points || 0) / loyalty.next_level.min_points) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className="mb-10 flex justify-between items-end">
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Личный кабинет</h1>
        <p className="text-gray-500 text-lg font-medium">Ваша территория красоты и комфорта</p>
      </div>
      <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
        <LogOut className="w-5 h-5" />
        Выйти
      </button>
    </div>
  );

  return (
    <div className="account-page-container min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        {renderHeader()}

        <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide mb-8">
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

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'gallery' && renderGallery()}
          {activeTab === 'loyalty' && renderLoyalty()}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map(a => (
                <div key={a.id} className={`p-6 rounded-2xl border-2 transition-all ${a.is_unlocked ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-sm' : 'bg-white border-gray-100 grayscale opacity-60'}`}>
                  <div className="text-5xl mb-4">{a.icon || '🏆'}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{a.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{a.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="px-3 py-1 bg-white/50 rounded-full text-xs font-bold text-gray-600">+{a.points_reward} баллов</span>
                    {a.is_unlocked && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'masters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masters.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative group overflow-hidden">
                  <div className="flex items-center gap-4 mb-6">
                    <img src={m.photo} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{m.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{m.specialty}</p>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold">{m.rating || 5.0}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleToggleFavoriteMaster(m.id, m.is_favorite)} className="absolute top-4 right-4 p-2 rounded-xl bg-gray-50 hover:bg-red-50 transition-all">
                    <Heart className={`w-5 h-5 ${m.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                  <button onClick={() => openBooking()} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">Записаться</button>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'beauty' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Your Beauty Score</h2>
                    <p className="text-white/70 text-lg">Комплексный анализ здоровья и красоты ваших волос и кожи</p>
                  </div>
                  <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20 flex items-center justify-center">
                    <span className="text-5xl font-black">88%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map(m => (
                  <div key={m.name} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-900">{m.name}</h4>
                      <span className="text-sm font-bold text-green-600">Отлично</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mb-4">
                      <div className="h-full bg-gray-900 rounded-full" style={{ width: `${m.score_value}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">Последнее обновление: {format(new Date(m.last_assessment), "d MMMM", { locale: getDateLocale() })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {notifications.map(n => (
                <div key={n.id} className={`p-6 rounded-2xl border transition-all ${n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50/50 border-blue-100 shadow-sm'}`}>
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${n.type === 'booking' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {n.type === 'booking' ? <Calendar className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{n.title}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed mb-2">{n.message}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{format(new Date(n.created_at), "d MMMM HH:mm", { locale: getDateLocale() })}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <EmptyState icon={<Bell className="w-12 h-12" />} title="Нет уведомлений" description="Здесь будут появляться важные сообщения от салона" />}
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="max-w-2xl mx-auto text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Чат с администратором</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Эта функция находится в разработке. Скоро вы сможете общаться с нами напрямую!</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="tel:+971501234567" className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">Позвонить</a>
                <a href="https://wa.me/971501234567" className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all">WhatsApp</a>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-2xl font-bold mb-8">Настройки профиля</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-widest ml-1">Имя</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" defaultValue={user?.full_name} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-widest ml-1">Телефон</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="tel" defaultValue={user?.phone} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all font-medium" />
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]">Сохранить изменения</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isBooking && (
        <UserBookingWizard onClose={closeBooking} />
      )}

      {comparePhotos && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl transition-all animate-in fade-in" onClick={() => setComparePhotos(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-6xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setComparePhotos(null)} className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl hover:bg-gray-50 transition-all border border-gray-100">
              <X className="w-6 h-6 text-gray-900" />
            </button>
            <h3 className="text-2xl font-black mb-8 text-center uppercase tracking-tighter">Сравнение результата</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-center font-black text-gray-400 uppercase tracking-widest text-xs">До процедуры</p>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100">
                  <img src={comparePhotos.before} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-center font-black text-green-500 uppercase tracking-widest text-xs">После процедуры</p>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-green-50">
                  <img src={comparePhotos.after} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
