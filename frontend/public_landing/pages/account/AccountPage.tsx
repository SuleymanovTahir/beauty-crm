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
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';

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
  const { t, i18n } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // States
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [appointmentsView, setAppointmentsView] = useState('upcoming');
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [showAllMasters, setShowAllMasters] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string } | null>(null);


  // Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [salonSettings, setSalonSettings] = useState<any>(null);

  const isBooking = searchParams.get('booking') === 'true';
  const openBooking = () => setSearchParams({ tab: activeTab, booking: 'true' });
  const closeBooking = () => setSearchParams({ tab: activeTab });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
        loyaltyRes,
        salonRes
      ] = await Promise.allSettled([
        api.getClientDashboard(),
        api.getClientBookings(),
        api.getClientGallery(),
        api.getClientAchievements(),
        api.getClientFavoriteMasters(),
        api.getClientBeautyMetrics(),
        api.getClientNotifications(),
        api.getClientLoyalty(),
        fetch('/api/public/salon-settings').then(r => r.json())
      ]);

      if (dashboardRes.status === 'fulfilled') setDashboardData(dashboardRes.value);
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.bookings || []);
      if (galleryRes.status === 'fulfilled') setGallery(galleryRes.value.gallery || []);
      if (achievementsRes.status === 'fulfilled') setAchievements(achievementsRes.value.achievements || []);
      if (mastersRes.status === 'fulfilled') setMasters(mastersRes.value.masters || []);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.metrics || []);
      if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value.notifications || []);
      if (loyaltyRes.status === 'fulfilled') setLoyalty(loyaltyRes.value);
      if (salonRes.status === 'fulfilled') setSalonSettings(salonRes.value);
    } catch (error) {
      console.error('Error loading account data', error);
      toast.error(t('account:toasts.loading_error'));
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
      toast.success(!isFavoriteNow ? t('account:toasts.master_favorited') : t('account:toasts.master_unfavorited'));
      setMasters(prev => prev.map(m => m.id === masterId ? { ...m, is_favorite: !isFavoriteNow } : m));
    } catch (e) {
      toast.error(t('account:toasts.update_error'));
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

  const handleDownloadPhoto = (_photoId?: string) => {
    toast.success(t('account:toasts.downloading'));
  };

  const handleSharePhoto = (_photoId?: string) => {
    toast.success(t('account:toasts.sharing_copied'));
  };



  const handleShareReferral = (platform: string) => {
    toast.success(t('account:toasts.sharing_open', { platform }));
  };

  const handleSaveProfile = () => {
    toast.success(t('account:toasts.profile_saved'));
  };

  const handleChangePassword = () => {
    toast.info(t('account:toasts.password_form_open'));
  };

  const handleEnable2FA = () => {
    toast.info(t('account:toasts.two_factor_setup'));
  };

  const handleExportData = () => {
    toast.success(t('account:toasts.export_started'));
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText((user as any)?.referral_code || 'REFCODE');
    toast.success(t('account:toasts.code_copied'));
  };

  const handleMarkNotificationAsRead = (_id: string) => {
    toast.success(t('account:toasts.notif_read'));
  };

  const handleMarkAllAsRead = () => {
    toast.success(t('account:toasts.all_notif_read'));
  };

  const handleContactSalon = (method: string) => {
    toast.info(t('account:toasts.contact_method', { method }));
  };

  const handleNavigate = () => {
    toast.info(t('account:toasts.navigator_open'));
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
    if (days === 0) return t('account:dashboard.appointment.today');
    if (days === 1) return t('account:dashboard.appointment.tomorrow');
    return t('account:dashboard.appointment.in_days', { count: days });
  };

  const getVisitInsightText = (visitCount: number) => {
    if (visitCount === 0) return t('account:dashboard.insight_visits_0');
    if (visitCount >= 1 && visitCount <= 3) return t('account:dashboard.insight_visits_1_3', { count: visitCount });
    if (visitCount >= 4 && visitCount <= 9) return t('account:dashboard.insight_visits_4_9', { count: visitCount });
    return t('account:dashboard.insight_visits_10_plus', { count: visitCount });
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
            <h1 className="text-2xl mb-1">{getGreeting()}, {user?.full_name?.split(' ')[0] || ''}! 👋</h1>
            <p className="opacity-90">{getMotivationalPhrase()}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white overflow-hidden border-2 border-white relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {(user as any)?.avatar_url ? (
              <img src={(user as any).avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white text-xl font-bold">
                {(user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 border-t border-white/10 pt-6 relative z-10">
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.visit_stats?.total_visits || 0}</p>
            <p className="opacity-80 text-sm">{t('account:dashboard.stats.visits')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.loyalty?.points || 0}</p>
            <p className="opacity-80 text-sm">{t('account:dashboard.stats.points')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl mb-1">{dashboardData?.loyalty?.current_discount || 0}%</p>
            <p className="opacity-80 text-sm">{t('account:dashboard.stats.discount')}</p>
          </div>
        </div>
      </div>

      {/* Next Appointment */}
      {dashboardData?.next_booking && (
        <div className="appointment-card space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">{t('account:dashboard.next_appointment')}</h2>
            <span className="badge-success">
              {getDaysUntil(dashboardData.next_booking.date)}
            </span>
          </div>

          <div className="flex gap-4 mb-4">
            {dashboardData.next_booking.master_photo ? (
              <img
                src={dashboardData.next_booking.master_photo}
                alt={dashboardData.next_booking.master_name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {(dashboardData.next_booking.master_name?.[0] || 'M').toUpperCase()}
              </div>
            )}
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
              <span>{format(new Date(dashboardData.next_booking.date), "HH:mm")} ({dashboardData.next_booking.duration || 60} {t('account:dashboard.appointment.minutes_short')})</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p>{salonSettings?.address || 'Dubai Marina, Marina Plaza, Office 302'}</p>
                <button
                  onClick={handleNavigate}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  {t('account:dashboard.appointment.get_directions')}
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
              {t('account:dashboard.appointment.add_to_calendar')}
            </button>
            <button
              onClick={() => handleRescheduleAppointment(dashboardData.next_booking.id)}
              className="btn-secondary"
            >
              {t('account:dashboard.appointment.reschedule')}
            </button>
            <button
              onClick={() => handleCancelAppointment(dashboardData.next_booking.id)}
              className="btn-destructive"
            >
              {t('account:dashboard.appointment.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-xl mb-4 mt-6">{t('account:dashboard.quick_actions')}</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={openBooking}
          className="btn-primary h-auto p-4 justify-start"
        >
          <Plus className="w-5 h-5" />
          <span>{t('account:dashboard.book_now')}</span>
        </button>
        <button
          onClick={() => dashboardData?.last_visit && handleRepeatAppointment(dashboardData.last_visit.id)}
          className="btn-outline h-auto p-4 justify-start"
        >
          <Repeat className="w-5 h-5" />
          <span>{t('account:dashboard.repeat_last')}</span>
        </button>
        <button
          onClick={() => handleTabChange('masters')}
          className="btn-outline h-auto p-4 justify-start"
        >
          <Heart className="w-5 h-5" />
          <span>{t('account:dashboard.my_masters')}</span>
        </button>
        <button
          onClick={() => handleTabChange('chat')}
          className="btn-outline h-auto p-4 justify-start"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{t('account:dashboard.contact_us')}</span>
        </button>
      </div>

      {/* Last Visit */}
      {dashboardData?.last_visit && (
        <div className="account-card">
          <h2 className="text-xl mb-4">{t('account:dashboard.last_visit')}</h2>

          <div className="flex gap-4 mb-4">
            {dashboardData.last_visit.master_photo ? (
              <img
                src={dashboardData.last_visit.master_photo}
                alt={dashboardData.last_visit.master_name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                {(dashboardData.last_visit.master_name?.[0] || 'M').toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="mb-1">{dashboardData.last_visit.service_name}</h3>
              <p className="text-sm text-gray-500">{dashboardData.last_visit.master_name}</p>
              <p className="text-sm text-gray-400">{format(new Date(dashboardData.last_visit.date), "d MMMM yyyy", { locale: getDateLocale() })}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleLeaveReview(dashboardData.last_visit.id)}
              className="btn-primary flex-1"
            >
              {t('account:dashboard.appointment.leave_review')}
            </button>
            <button
              onClick={() => handleRepeatAppointment(dashboardData.last_visit.id)}
              className="btn-secondary"
            >
              {t('account:dashboard.appointment.repeat')}
            </button>
          </div>
        </div>
      )}


      {/* Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl">{t('account:dashboard.insights_title')}</h2>
        </div>
        <div className="space-y-3">
          {dashboardData?.visit_stats?.months_as_client > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">🎉</div>
              <p className="text-gray-700 flex-1">{t('account:dashboard.insight_months', { count: dashboardData.visit_stats.months_as_client })}</p>
            </div>
          )}
          {dashboardData?.loyalty?.total_saved > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">💰</div>
              <p className="text-gray-700 flex-1">{t('account:dashboard.insight_saved', { amount: dashboardData.loyalty.total_saved })}</p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">
              {(dashboardData?.visit_stats?.total_visits || 0) === 0 ? '👋' : (dashboardData?.visit_stats?.total_visits || 0) >= 10 ? '⭐' : '🎯'}
            </div>
            <p className="text-gray-700 flex-1">{getVisitInsightText(dashboardData?.visit_stats?.total_visits || 0)}</p>
          </div>
        </div>
      </div>

      {/* Special Offers */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-pink-500" />
          <h2 className="text-xl">{t('account:dashboard.special_offers')}</h2>
        </div>
        <div className="space-y-3">
          {(dashboardData as any)?.special_offers?.length > 0 ? (
            (dashboardData as any).special_offers.map((offer: any) => (
              <div key={offer.id} className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900 font-medium">{offer.title}</h3>
                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs whitespace-nowrap">
                    {t('account:dashboard.days_left', { days: offer.days_left })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{offer.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-pink-600">{offer.price} AED</span>
                    {offer.original_price > offer.price && (
                      <span className="text-sm text-gray-400 line-through">{offer.original_price} AED</span>
                    )}
                  </div>
                  <button
                    onClick={openBooking}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                  >
                    {t('account:common.book')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">{t('account:dashboard.no_offers')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Recommendations */}
      {dashboardData?.recommendations?.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl">{t('account:dashboard.smart_recommendations')}</h2>
          </div>
          <div className="space-y-3">
            {dashboardData.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-xl border ${idx % 2 === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-gray-900 mb-2">{rec.text}</p>
                <button
                  onClick={openBooking}
                  className="text-sm text-gray-900 hover:underline flex items-center gap-1 font-medium"
                >
                  {t('account:common.book')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
            title={t('account:dashboard.appointment.no_appointments')}
            description={t('account:dashboard.appointment.no_appointments_desc')}
            action={{ label: t('account:dashboard.book_now'), onClick: openBooking }}
          />
        )}
      </div>

      {appointmentsView === 'recurring' && (
        <EmptyState
          icon={<Repeat className="w-8 h-8" />}
          title={t('account:dashboard.appointment.no_recurring')}
          description={t('account:dashboard.appointment.no_recurring_desc')}
          action={{
            label: t('account:dashboard.appointment.create_auto'),
            onClick: () => toast.info(t('account:toasts.dev_mode'))
          }}
        />
      )}

      {/* Statistics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">{t('account:stats.title')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('account:stats.total_visits')}</p>
            <p className="text-2xl">{dashboardData?.visit_stats?.total_visits || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('account:stats.avg_frequency')}</p>
            <p className="text-2xl">
              {dashboardData?.visit_stats?.avg_frequency ? (
                typeof dashboardData.visit_stats.avg_frequency === 'string' && dashboardData.visit_stats.avg_frequency.includes('weeks')
                  ? t('account:stats.weeks', { count: parseInt(dashboardData.visit_stats.avg_frequency) })
                  : dashboardData.visit_stats.avg_frequency
              ) : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('account:stats.fav_service')}</p>
            <p className="text-lg">{dashboardData?.visit_stats?.fav_service || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('account:stats.fav_master')}</p>
            <p className="text-lg">{dashboardData?.visit_stats?.fav_master || '—'}</p>
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
              {t(`account:gallery.categories.${filter}`)}
            </button>
          ))}
        </div>

        {filteredGallery.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-8 h-8" />}
            title={t('account:gallery.no_photos')}
            description={t('account:gallery.no_photos_desc')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGallery.map(photo => (
              <div key={photo.id} className="account-card p-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-medium">{t('account:gallery.before')}</p>
                    <img src={photo.before} alt={t('account:gallery.before')} className="w-full h-48 object-cover rounded-lg shadow-inner" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-medium">{t('account:gallery.after')}</p>
                    <img src={photo.after} alt={t('account:gallery.after')} className="w-full h-48 object-cover rounded-lg shadow-inner" />
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="font-bold mb-1">{photo.notes || t('account:gallery.title')}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{photo.category}</span>
                    <span className="text-gray-400">{format(new Date(photo.date), "d MMMM yyyy", { locale: getDateLocale() })}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setComparePhotos({ before: photo.before, after: photo.after })}
                    className="btn-secondary flex-1 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    {t('account:gallery.compare')}
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
                </div>
              </div>
            ))}
          </div>
        )}

        {comparePhotos && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setComparePhotos(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t('account:gallery.compare')}</h3>
                <button onClick={() => setComparePhotos(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2 font-medium">{t('account:gallery.before')}</p>
                  <img src={comparePhotos.before} alt={t('account:gallery.before')} className="w-full rounded-lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 font-medium">{t('account:gallery.after')}</p>
                  <img src={comparePhotos.after} alt={t('account:gallery.after')} className="w-full rounded-lg" />
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
          <span className="text-2xl font-bold">{dashboardData?.streak?.count || 0}🔥</span>
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`streak-bar ${step <= (dashboardData?.streak?.count || 0) ? 'streak-bar-active' : ''}`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500">
          {(dashboardData?.streak?.bonus_target || 5) - (dashboardData?.streak?.count || 0) > 0
            ? `Еще ${(dashboardData?.streak?.bonus_target || 5) - (dashboardData?.streak?.count || 0)} визита до бонуса ${dashboardData?.streak?.bonus_amount || 500} баллов!`
            : `Бонус ${dashboardData?.streak?.bonus_amount || 500} баллов получен!`}
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg mb-4">Аналитика расходов</h3>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardData?.analytics?.monthly_spending?.length > 0
              ? dashboardData.analytics.monthly_spending
              : [{ month: '-', amount: 0 }]}>
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
            <p className="text-2xl mb-1">{dashboardData?.analytics?.total_spent || 0} AED</p>
            <p className="text-sm text-gray-500">Всего потрачено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{dashboardData?.analytics?.total_saved || 0} AED</p>
            <p className="text-sm text-gray-500">Сэкономлено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{dashboardData?.analytics?.avg_check || 0} AED</p>
            <p className="text-sm text-gray-500">Средний чек</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{dashboardData?.analytics?.most_active_month || '-'}</p>
            <p className="text-sm text-gray-500">Самый активный</p>
          </div>
        </div>

        <h4 className="mb-3">Распределение по услугам</h4>
        <div className="flex items-center gap-6">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(() => {
                    const dist = dashboardData?.analytics?.service_distribution || [];
                    const colors = { hair: '#9333ea', nails: '#ec4899', face: '#3b82f6', other: '#10b981' };
                    const names = { hair: 'Волосы', nails: 'Ногти', face: 'Лицо', other: 'Другое' };
                    return dist.length > 0
                      ? dist.map((d: any) => ({ name: names[d.category as keyof typeof names] || d.category, value: d.percentage, color: colors[d.category as keyof typeof colors] || '#6b7280' }))
                      : [{ name: '-', value: 100, color: '#e5e7eb' }];
                  })()}
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
            {(() => {
              const dist = dashboardData?.analytics?.service_distribution || [];
              const colors = { hair: '#9333ea', nails: '#ec4899', face: '#3b82f6', other: '#10b981' };
              const names = { hair: 'Волосы', nails: 'Ногти', face: 'Лицо', other: 'Другое' };
              const items = dist.length > 0
                ? dist.map((d: any) => ({ name: names[d.category as keyof typeof names] || d.category, value: d.percentage, color: colors[d.category as keyof typeof colors] || '#6b7280' }))
                : [];
              return items.map((service: any) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                    <span className="text-sm">{service.name}</span>
                  </div>
                  <span className="text-sm">{service.value}%</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Virtual Card */}
      <div className="account-card">
        <h3 className="text-lg mb-4">Виртуальная карта лояльности</h3>
        <div className="loyalty-card-gold mb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="loyalty-gold-text text-sm mb-1">{salonSettings?.name || 'Beauty Studio'}</p>
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
          <div className="relative flex-1 group">
            <button
              onClick={() => toast.info('Функция добавления в Wallet скоро будет доступна')}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Добавить в Wallet
            </button>
            <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Wallet позволяет добавить вашу карту лояльности в Apple Wallet или Google Pay для быстрого доступа и уведомлений при посещении салона.
            </div>
          </div>
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
          <h3 className="text-lg">{t('account:referral.title')}</h3>
        </div>
        <p className="text-gray-600 mb-4">
          {t('account:referral.message', {
            referrer_bonus: (dashboardData as any)?.referral_campaign?.referrer_bonus || 200,
            bonus_points: (dashboardData as any)?.referral_campaign?.bonus_points || 200
          })}
        </p>
        <div className="bg-white p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-500 mb-2">{t('account:referral.your_code')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xl tracking-wider">{dashboardData?.loyalty?.referral_code || '—'}</code>
            <button
              onClick={handleCopyReferralCode}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!dashboardData?.loyalty?.referral_code}
            >
              {t('account:referral.copy')}
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
        <h2 className="text-2xl mb-2">{t('account:achievements.title')}</h2>
        <p className="achievement-hero-text">
          {t('account:achievements.unlocked_phrase', {
            count: achievements.filter(a => a.is_unlocked).length,
            total: achievements.length
          })}
        </p>
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
                <h3 className="mb-1">{i18n.language === 'ru' ? achievement.title_ru : achievement.title_en}</h3>
                <p className="text-sm text-gray-600">{i18n.language === 'ru' ? achievement.description_ru : achievement.description_en}</p>
                {achievement.is_unlocked && achievement.unlocked_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('account:achievements.unlocked_on', {
                      date: format(new Date(achievement.unlocked_at), "d MMMM yyyy", { locale: getDateLocale() })
                    })}
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
      {dashboardData?.challenges?.length > 0 && (
        <div className="account-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg">{t('account:achievements.challenges_title')}</h3>
          </div>
          <div className="space-y-3">
            {dashboardData.challenges.map((challenge: any) => (
              <div key={challenge.id} className="challenge-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="pr-4">
                    <h4 className="mb-1">{i18n.language === 'ru' ? challenge.title_ru : challenge.title_en}</h4>
                    <p className="text-sm text-gray-600">{i18n.language === 'ru' ? challenge.description_ru : challenge.description_en}</p>
                    <p className="text-pink-600 text-sm font-medium mt-1">+{challenge.bonus_points} {t('account:dashboard.stats.points')}</p>
                  </div>
                  {challenge.days_left && (
                    <span className="badge-secondary text-xs whitespace-nowrap">
                      {t('account:achievements.days_remains', { count: challenge.days_left })}
                    </span>
                  )}
                </div>
                <button
                  onClick={openBooking}
                  className="btn-primary w-full mt-3"
                >
                  {t('account:achievements.complete_challenge')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Masters Content
  const renderMasters = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">{t('account:masters.title')}</h2>
        <button
          onClick={() => setShowAllMasters(!showAllMasters)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          {showAllMasters ? t('account:masters.show_favorites') : t('account:masters.show_all')}
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
                {t('account:common.book')}
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
        case 'perfect': return t('account:beauty.status_perfect_label');
        case 'good': return t('account:beauty.status_good_label');
        case 'attention': return t('account:beauty.status_attention_label');
        default: return '';
      }
    };

    const metricsList = Array.isArray(metrics) ? metrics : [];
    const averageBeautyScore = metricsList.length > 0
      ? Math.round(metricsList.reduce((acc, m) => {
        const val = Number(m.score_value);
        return acc + (isNaN(val) ? 0 : val);
      }, 0) / metricsList.length)
      : 85;

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="beauty-score-hero">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl mb-1">{t('account:beauty.score_title')}</h2>
              <p className="beauty-score-text">{t('account:beauty.score_subtitle')}</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10">
                <span className="text-4xl font-bold">{averageBeautyScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>{t('account:beauty.status_perfect')}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="account-card beauty-metric-card p-6">
          <h3 className="text-lg mb-4">{t('account:beauty.health_metrics')}</h3>
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
                  <span className="text-sm w-12 text-right font-medium">{metric.score_value ?? 0}%</span>
                  <button
                    onClick={openBooking}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    {t('account:common.book')}
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
            <h3 className="text-lg">{t('account:beauty.calendar_title')}</h3>
          </div>
          <div className="space-y-3">
            <div className="alert-card">
              <AlertCircle className="w-5 h-5 alert-card-icon mt-0.5" />
              <div className="flex-1">
                <h4 className="mb-1 text-gray-900 font-bold">{t('account:beauty.recommend_booking')}</h4>
                <p className="text-sm text-gray-600 mb-2">{t('account:beauty.recommend_desc')}</p>
                <button
                  onClick={openBooking}
                  className="text-sm text-gray-900 hover:underline flex items-center gap-1 font-medium"
                >
                  {t('account:beauty.recommend_action')}
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
          <h2 className="text-xl">{t('account:notifications.title')}</h2>
          <p className="text-sm text-gray-500">
            {t('account:notifications.unread_count', { count: notifications.filter(n => !n.is_read).length })}
          </p>
        </div>
        <button onClick={handleMarkAllAsRead} className="text-sm text-gray-600 hover:text-gray-900">
          {t('account:notifications.mark_all_read')}
        </button>
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
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title={t('account:notifications.no_notifications')}
          description={t('account:notifications.no_notifications_desc') || ''}
        />
      )}
    </div>
  );

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-6">
      {/* Profile */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">{t('account:settings.profile_title')}</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {(user as any)?.avatar_url ? (
              <img src={(user as any).avatar_url} alt={user?.full_name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {(user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('account:settings.first_name')}</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">{t('account:settings.last_name')}</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">{t('account:settings.email')}</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">{t('account:settings.phone')}</label>
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
            {t('account:settings.save_changes')}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">{t('account:settings.security_title')}</h3>
        <div className="space-y-3">
          <button
            onClick={handleChangePassword}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5 text-gray-500" />
              <span>{t('account:settings.change_password')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleEnable2FA}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5 text-gray-500" />
              <span>{t('account:settings.two_factor')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-between p-4 border border-border/10 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-500" />
              <span>{t('account:settings.export_data')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notifications Settings */}
      {/* Notifications Settings */}
      <div className="account-card p-6">
        <h3 className="text-lg mb-4">{t('account:settings.notifications_title')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">{t('account:settings.push_notifications')}</h4>
              <p className="text-sm text-gray-500">{t('account:settings.push_desc')}</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.push}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, push: e.target.checked });
                  toast.success(e.target.checked ? t('account:settings.push_enabled') : t('account:settings.push_disabled'));
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">{t('account:settings.email_newsletter')}</h4>
              <p className="text-sm text-gray-500">{t('account:settings.email_desc')}</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.email}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, email: e.target.checked });
                  toast.success(e.target.checked ? t('account:settings.email_enabled') : t('account:settings.email_disabled'));
                }}
                className="sr-only toggle-input peer"
              />
              <div className="toggle-slider"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">{t('account:settings.sms_reminders')}</h4>
              <p className="text-sm text-gray-500">{t('account:settings.sms_desc')}</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.sms}
                onChange={(e) => {
                  setNotificationSettings({ ...notificationSettings, sms: e.target.checked });
                  toast.success(e.target.checked ? t('account:settings.sms_enabled') : t('account:settings.sms_disabled'));
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
        <h3 className="text-lg mb-4">{t('account:settings.privacy_title')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-1">{t('account:settings.privacy_photos')}</h4>
              <p className="text-sm text-gray-500">{t('account:settings.privacy_photos_desc')}</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.allowPhotos}
                onChange={(e) => {
                  setPrivacySettings({ ...privacySettings, allowPhotos: e.target.checked });
                  toast.success(e.target.checked ? t('account:settings.privacy_photos_enabled') : t('account:settings.privacy_photos_disabled'));
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
          <h3 className="text-lg font-bold text-destructive">{t('account:settings.logout_title')}</h3>
          <button onClick={handleLogout} className="btn-destructive">
            <LogOut className="w-4 h-4" />
            {t('account:settings.logout')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">{t('account:title')}</h1>
            <p className="text-muted-foreground">{t('account:subtitle')}</p>
          </div>

          {/* Language Switcher */}
          <PublicLanguageSwitcher />
        </div>

        {/* Navigation */}
        <div className="nav-tabs-container">
          <div className="nav-tabs-list">
            <TabButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<Sparkles className="w-5 h-5" />} label={t('account:tabs.dashboard')} />
            <TabButton active={activeTab === 'appointments'} onClick={() => handleTabChange('appointments')} icon={<Calendar className="w-5 h-5" />} label={t('account:tabs.appointments')} />
            <TabButton active={activeTab === 'gallery'} onClick={() => handleTabChange('gallery')} icon={<ImageIcon className="w-5 h-5" />} label={t('account:tabs.gallery')} />
            <TabButton active={activeTab === 'loyalty'} onClick={() => handleTabChange('loyalty')} icon={<Award className="w-5 h-5" />} label={t('account:tabs.loyalty')} />
            <TabButton active={activeTab === 'achievements'} onClick={() => handleTabChange('achievements')} icon={<Trophy className="w-5 h-5" />} label={t('account:tabs.achievements')} />
            <TabButton active={activeTab === 'masters'} onClick={() => handleTabChange('masters')} icon={<Users className="w-5 h-5" />} label={t('account:tabs.masters')} />
            <TabButton active={activeTab === 'beauty'} onClick={() => handleTabChange('beauty')} icon={<Sparkles className="w-5 h-5" />} label={t('account:tabs.beauty')} />
            <TabButton active={activeTab === 'notifications'} onClick={() => handleTabChange('notifications')} icon={<Bell className="w-5 h-5" />} label={t('account:tabs.notifications')} hasBadge badgeCount={notifications.filter(n => !n.is_read).length} />
            <TabButton active={activeTab === 'chat'} onClick={() => handleTabChange('chat')} icon={<MessageCircle className="w-5 h-5" />} label={t('account:tabs.chat')} />
            <TabButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<Settings className="w-5 h-5" />} label={t('account:tabs.settings')} />
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
                  <h3 className="text-lg">{t('account:chat.title')}</h3>
                </div>
                <EmptyState
                  icon={<MessageCircle className="w-8 h-8" />}
                  title={t('account:chat.no_messages')}
                  description={t('account:chat.no_messages_desc')}
                  action={{ label: t('account:chat.write_message'), onClick: () => handleContactSalon('WhatsApp') }}
                />
              </div>

              {/* Contact Info */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg mb-4">{t('account:chat.contacts_title')}</h3>
                <div className="space-y-3">
                  <a
                    href={salonSettings?.phone ? `tel:${salonSettings.phone}` : '#'}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('phone', 'Phone')}</p>
                      <p>{salonSettings?.phone || t('notAvailable', 'Not available')}</p>
                    </div>
                  </a>
                  <a
                    href={salonSettings?.email ? `mailto:${salonSettings.email}` : '#'}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('email', 'Email')}</p>
                      <p>{salonSettings?.email || t('notAvailable', 'Not available')}</p>
                    </div>
                  </a>
                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">{t('address', 'Address')}</p>
                      <p>{salonSettings?.address || t('notAvailable', 'Not available')}</p>
                      <button
                        onClick={handleNavigate}
                        className="text-sm text-gray-900 hover:underline mt-1 flex items-center gap-1"
                      >
                        {t('getDirections', 'Get Directions')}
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg mb-4">{t('account:chat.quick_contact')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleContactSalon('phone')}
                    className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{t('account:chat.call')}</span>
                  </button>
                  <button
                    onClick={() => handleContactSalon('email')}
                    className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    <span>{t('account:chat.write_email')}</span>
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
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto wizard-scrollable">
            <div className="w-full min-h-full bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
              <UserBookingWizard onClose={closeBooking} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
