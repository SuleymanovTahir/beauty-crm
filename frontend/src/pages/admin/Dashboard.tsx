// /frontend/src/pages/admin/Dashboard.tsx
//src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Users, Loader, AlertCircle, Crown, UserPlus, UserCheck, TrendingUp, Calendar, CheckCircle, DollarSign, Percent, Star, XCircle, Clock, Filter, Download, Bell, FileText, Bot } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { DateFilterDropdown } from '../../components/shared/DateFilterDropdown';

interface Stats {
  total_clients: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  cancelled_bookings?: number;
  total_revenue: number;
  conversion_rate: number;
  new_clients: number;
  leads: number;
  customers: number;
  total_client_messages: number;
  total_bot_messages: number;
  vip_clients: number;
  active_clients: number;
  avg_booking_value?: number;
  cancellation_rate?: number;
  top_services?: Array<{ name: string; count: number; revenue: number }>;
  revenue_trend?: Array<{ label: string; value: number; amount: number }>;
  growth?: {
    total_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    vip_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    new_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    active_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    revenue: { percentage: number; trend: 'up' | 'down' | 'stable' };
    pending_bookings: { percentage: number; trend: 'up' | 'down' | 'stable' };
  };
  comparison_context?: string;
}

type DateFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['admin/dashboard', 'common']);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [botAnalytics, setBotAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last30days');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [salonSettings, setSalonSettings] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter, customDateRange]);

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const dateRange = getDateRange();
      toast.info(t('dashboard:export_generating', `Генерируем отчёт в формате ${format.toUpperCase()}...`));

      // TODO: Implement actual export API call
      const response = await fetch('/api/admin/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format,
          start_date: dateRange.start,
          end_date: dateRange.end,
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t('dashboard:export_success', 'Отчёт успешно экспортирован'));
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast.error(t('dashboard:export_error', 'Ошибка экспорта отчёта'));
    }
  };

  const getDateRange = (): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday.toISOString(),
          end: today.toISOString()
        };
      case 'last7days':
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        };
      case 'last30days':
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        };
      case 'thisMonth':
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: firstDayThisMonth.toISOString(),
          end: new Date().toISOString()
        };
      case 'lastMonth':
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: firstDayLastMonth.toISOString(),
          end: lastDayLastMonth.toISOString()
        };
      case 'custom':
        return customDateRange;
      default:
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        };
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);



      // Map dateFilter to comparison_period for backend
      let comparisonPeriod: string = dateFilter;
      if (dateFilter === 'last7days') comparisonPeriod = '7days';
      if (dateFilter === 'last30days') comparisonPeriod = '30days';
      if (dateFilter === 'thisMonth' || dateFilter === 'lastMonth') comparisonPeriod = 'month';

      const params = new URLSearchParams({
        comparison_period: comparisonPeriod
      });

      // Load real data with date filtering
      const [statsData, bookingsData, clientsData, botData, settingsData] = await Promise.all([
        api.get(`/api/stats?${params.toString()}`).catch(() => api.getStats()),
        api.getBookings(),
        api.getClients(),
        api.get('/api/bot-analytics?days=30').catch(() => null),
        api.getPublicSalonSettings().catch(() => ({ currency: '' })),
      ]);

      setStats(statsData);
      if (botData) setBotAnalytics(botData);
      setSalonSettings(settingsData);

      // Take last 3 bookings and enrich with client data
      if (bookingsData.bookings) {
        const enrichedBookings = bookingsData.bookings.slice(0, 3).map((booking: any) => {
          // Try to find client by client_id first, then by instagram_id
          const client = clientsData.clients?.find((c: any) =>
            c.id === booking.client_id || c.instagram_id === booking.instagram_id
          );
          return {
            ...booking,
            profile_pic: client?.profile_pic,
            gender: client?.gender
          };
        });
        setRecentBookings(enrichedBookings);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dashboard:error_loading');
      setError(message);
      toast.error(t('dashboard:errors.loading', { message }));
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('dashboard:loading_data')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{t('dashboard:error_loading')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadDashboardData} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('dashboard:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{t('dashboard:no_data')}</p>
        </div>
      </div>
    );
  }

  // Use real data from stats with growth indicators
  const stat_cards = [
    {
      icon: Users,
      label: t('dashboard:total_clients'),
      value: stats.total_clients || 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      growth: stats.growth?.total_clients
    },
    {
      icon: Crown,
      label: t('dashboard:vip_clients'),
      value: stats.vip_clients || 0,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      growth: stats.growth?.vip_clients
    },
    {
      icon: UserPlus,
      label: t('dashboard:new_clients'),
      value: stats.new_clients || 0,
      color: 'text-green-600',
      bg: 'bg-green-50',
      growth: stats.growth?.new_clients
    },
    {
      icon: UserCheck,
      label: t('dashboard:active_clients'),
      value: stats.active_clients || 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      growth: stats.growth?.active_clients
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string; color: string }> = {
      pending: { text: t('dashboard:status_pending'), bg: 'bg-yellow-100', color: 'text-yellow-800' },
      confirmed: { text: t('dashboard:status_confirmed'), bg: 'bg-green-100', color: 'text-green-800' },
      completed: { text: t('dashboard:status_completed'), bg: 'bg-blue-100', color: 'text-blue-800' },
      cancelled: { text: t('dashboard:status_cancelled'), bg: 'bg-red-100', color: 'text-red-800' },
    };
    return badges[status] || { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
  };

  // Filter bookings by status
  const filteredRecentBookings = bookingStatusFilter === 'all'
    ? recentBookings
    : recentBookings.filter(b => b.status === bookingStatusFilter);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">{t('dashboard:title')}</h1>
        <p className="text-sm md:text-base text-gray-600">{t('dashboard:welcome')}</p>
      </div>

      {/* Date Filter Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">{t('dashboard:date_filter', 'Период:')}</span>
          </div>
          <DateFilterDropdown
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value);
              if (value === 'custom') {
                setShowDatePicker(true);
              } else {
                setShowDatePicker(false);
              }
            }}
          />
        </div>

        {/* Custom Date Range Picker */}
        {showDatePicker && dateFilter === 'custom' && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">{t('dashboard:date_from', 'От:')}</label>
              <input
                type="date"
                value={customDateRange.start.split('T')[0] || ''}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: new Date(e.target.value).toISOString() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">{t('dashboard:date_to', 'До:')}</label>
              <input
                type="date"
                value={customDateRange.end.split('T')[0] || ''}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: new Date(e.target.value).toISOString() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stat_cards.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-2">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </h3>

                {/* Growth Indicator */}
                {stat.growth && (
                  <div className={`flex items-center gap-1 text-xs ${stat.growth.trend === 'up' ? 'text-green-600' :
                    stat.growth.trend === 'down' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                    {stat.growth.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                    {stat.growth.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                    {stat.growth.trend === 'stable' && <span className="w-4 h-4">—</span>}
                    <span className="font-medium">
                      {stat.growth.percentage > 0 ? '+' : ''}{stat.growth.percentage}%
                    </span>
                    {stats.comparison_context && (
                      <span className="text-gray-500 ml-1">{stats.comparison_context}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 md:w-14 md:h-14 ${stat.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-6 h-6 md:w-7 md:h-7 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 md:p-6 rounded-xl shadow-sm text-white hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm opacity-90 mb-2">{t('dashboard:total_revenue', 'Общий доход')}</p>
              <h3 className="text-2xl md:text-3xl font-bold mb-1">
                {stats.total_revenue?.toLocaleString() || 0} {salonSettings?.currency}
              </h3>
              {stats.growth?.revenue && (
                <div className="flex items-center gap-1 text-xs opacity-90">
                  {stats.growth.revenue.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                  {stats.growth.revenue.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                  <span className="font-medium">
                    {stats.growth.revenue.percentage > 0 ? '+' : ''}{stats.growth.revenue.percentage}%
                  </span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 md:w-7 md:h-7" />
            </div>
          </div>
        </div>

        {/* Average Booking Value */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-2">{t('dashboard:avg_booking_value', 'Средний чек')}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {stats.avg_booking_value?.toLocaleString() || 0} {salonSettings?.currency}
              </h3>
              <p className="text-xs text-gray-500">{t('dashboard:per_booking', 'за запись')}</p>
            </div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-2">{t('dashboard:cancellation_rate', 'Отмены')}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {stats.cancellation_rate?.toFixed(1) || 0}%
              </h3>
              <p className="text-xs text-gray-500">
                {stats.cancelled_bookings || 0} {t('dashboard:cancelled', 'отменено')}
              </p>
            </div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 md:w-7 md:h-7 text-red-600" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-2">{t('dashboard:conversion_rate', 'Конверсия')}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {stats.conversion_rate?.toFixed(1) || 0}%
              </h3>
              <p className="text-xs text-gray-500">{t('dashboard:lead_to_customer', 'лид → клиент')}</p>
            </div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Percent className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
            </div>
          </div>
        </div>
      </div>


      {/* Top Services */}
      {stats.top_services && stats.top_services.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl text-gray-900 mb-4">{t('dashboard:top_services', 'Топ услуги')}</h2>
          <div className="space-y-3">
            {stats.top_services.slice(0, 5).map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.count} {t('dashboard:bookings_count', 'записей')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{service.revenue?.toLocaleString() || 0} {salonSettings?.currency}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Grid - 1 колонка на мобильных */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl text-gray-900">{t('dashboard:recent_bookings')}</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/crm/bookings')} className="shrink-0">
                {t('dashboard:all_bookings')}
              </Button>
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBookingStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${bookingStatusFilter === 'all'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {t('dashboard:filter_all', 'Все')}
              </button>
              <button
                onClick={() => setBookingStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${bookingStatusFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
              >
                {t('dashboard:status_pending')}
              </button>
              <button
                onClick={() => setBookingStatusFilter('confirmed')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${bookingStatusFilter === 'confirmed'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
              >
                {t('dashboard:status_confirmed')}
              </button>
              <button
                onClick={() => setBookingStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${bookingStatusFilter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
              >
                {t('dashboard:status_completed')}
              </button>
              <button
                onClick={() => setBookingStatusFilter('cancelled')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${bookingStatusFilter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
              >
                {t('dashboard:status_cancelled')}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {filteredRecentBookings.length > 0 ? (
              filteredRecentBookings.map((booking) => {
                const badge = getStatusBadge(booking.status);
                return (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer gap-3"
                    onClick={() => navigate(`/crm/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {(() => {
                        const profilePic = booking.profile_pic;
                        const clientName = booking.name || 'N';

                        return (
                          <>
                            {profilePic && profilePic.trim() !== '' ? (
                              <img
                                src={`/api/proxy/image?url=${encodeURIComponent(profilePic)}`}
                                alt={clientName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <img
                              src={getDynamicAvatar(clientName, 'cold', booking.gender)}
                              alt={clientName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100"
                              style={{ display: profilePic && profilePic.trim() !== '' ? 'none' : 'block' }}
                            />
                          </>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{booking.name || t('dashboard:unknown_name')}</p>
                        <p className="text-xs text-gray-500 truncate">{booking.service || t('dashboard:no_service')}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 w-full sm:w-auto mt-2 sm:mt-0 pl-13 sm:pl-0">
                      <p className="text-sm text-gray-900">
                        {new Date(booking.datetime).toLocaleTimeString(i18n.language, {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${badge.bg} ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard:no_bookings')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl text-gray-900 mb-4">{t('dashboard:quick_actions')}</h2>
          <div className="space-y-2">
            <Button
              className="w-full justify-start bg-pink-600 hover:bg-pink-700 h-10"
              onClick={() => navigate('/crm/bookings')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:create_booking')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/crm/clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:add_client')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/crm/users/create')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:create_user')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/crm/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('dashboard:view_analytics')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/crm/calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:calendar')}
            </Button>
          </div>

          {/* Export Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t('dashboard:export_reports', 'Экспорт отчётов')}
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-9 text-sm"
                onClick={() => handleExportReport('pdf')}
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                {t('dashboard:export_pdf', 'Скачать PDF')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-9 text-sm"
                onClick={() => handleExportReport('excel')}
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                {t('dashboard:export_excel', 'Скачать Excel')}
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('dashboard:notifications', 'Уведомления')}
          </h2>
          <div className="space-y-3">
            {/* Pending Bookings Alert */}
            {stats.pending_bookings > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {t('dashboard:alert_pending_bookings', 'Ожидающие подтверждения')}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {stats.pending_bookings} {t('dashboard:bookings_need_confirmation', 'записей требуют подтверждения')}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs bg-white hover:bg-yellow-50"
                      onClick={() => navigate('/crm/bookings?status=pending')}
                    >
                      {t('dashboard:view_pending', 'Посмотреть')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* New Clients Alert */}
            {stats.new_clients > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {t('dashboard:alert_new_clients', 'Новые клиенты')}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      +{stats.new_clients} {t('dashboard:new_clients_today', 'новых клиентов за выбранный период')}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs bg-white hover:bg-blue-50"
                      onClick={() => navigate('/crm/clients')}
                    >
                      {t('dashboard:view_clients', 'Посмотреть')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* High Cancellation Rate Alert */}
            {stats.cancellation_rate && stats.cancellation_rate > 15 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {t('dashboard:alert_high_cancellations', 'Высокий процент отмен')}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {stats.cancellation_rate.toFixed(1)}% {t('dashboard:cancellation_warning', 'записей отменено')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No alerts state */}
            {stats.pending_bookings === 0 && stats.new_clients === 0 && (!stats.cancellation_rate || stats.cancellation_rate <= 15) && (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('dashboard:no_alerts', 'Нет уведомлений')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bot Analytics Widget */}
      {botAnalytics && botAnalytics.total_sessions > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl shadow-sm p-4 md:p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              {t('dashboard:bot_analytics_title', 'AI Бот Аналитика')}
            </h2>
            <span className="text-sm opacity-80">{t('dashboard:last_30_days', 'За 30 дней')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">{t('dashboard:conversion_rate', 'Конверсия')}</p>
              <p className="text-2xl font-bold">{botAnalytics.conversion_rate}%</p>
              <p className="text-xs opacity-70">{botAnalytics.bookings_created} {t('dashboard:bookings_stat', 'записей')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">{t('dashboard:sessions', 'Сессий')}</p>
              <p className="text-2xl font-bold">{botAnalytics.total_sessions}</p>
              <p className="text-xs opacity-70">~{botAnalytics.avg_messages_per_session} {t('dashboard:msg_short', 'сообщ.')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">{t('dashboard:escalations', 'Эскалаций')}</p>
              <p className="text-2xl font-bold">{botAnalytics.escalations}</p>
              <p className="text-xs opacity-70">{t('dashboard:to_manager', '→ менеджеру')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">{t('dashboard:peak_hours', 'Пиковые часы')}</p>
              <p className="text-lg font-bold">
                {botAnalytics.popular_hours?.slice(0, 3).map((h: any) => `${h.hour}:00`).join(', ') || '—'}
              </p>
              <p className="text-xs opacity-70">{t('dashboard:top_activity', 'топ активность')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl text-gray-900">{t('dashboard:revenue_trend', 'Динамика дохода')}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            {stats.growth?.revenue && (
              <span className={stats.growth.revenue.trend === 'up' ? 'text-green-600' : stats.growth.revenue.trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                {stats.growth.revenue.percentage > 0 ? '+' : ''}{stats.growth.revenue.percentage}%
              </span>
            )}
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-4">
          <div className="flex items-end justify-between h-48 gap-2">
            {stats.revenue_trend && stats.revenue_trend.length > 0 ? (
              stats.revenue_trend.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t-lg relative group cursor-pointer hover:opacity-80 transition-opacity" style={{ height: `${bar.value}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-pink-600 to-pink-400 rounded-t-lg"></div>
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {bar.amount.toLocaleString()} {salonSettings?.currency}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{bar.label}</span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                {t('dashboard:no_data', 'Нет данных')}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-t from-pink-600 to-pink-400 rounded"></div>
              <span className="text-xs text-gray-600">{t('dashboard:revenue', 'Доход')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{stats.total_revenue?.toLocaleString() || 0} {salonSettings?.currency}</span>
              <span className="text-xs text-gray-500">{t('dashboard:total', 'всего')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent New Clients */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-sm p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {t('dashboard:new_clients_section', 'Новые клиенты')}
            </h3>
            <span className="text-sm opacity-80">
              {t('dashboard:filter_' + dateFilter, dateFilter)}
            </span>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-center">
              <p className="text-4xl font-bold mb-1">+{stats.new_clients || 0}</p>
              <p className="text-sm opacity-90">{t('dashboard:new_registrations', 'новых регистраций')}</p>
            </div>
            {stats.growth?.new_clients && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-center gap-2">
                {stats.growth.new_clients.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {stats.growth.new_clients.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                <span className="font-medium">
                  {stats.growth.new_clients.percentage > 0 ? '+' : ''}{stats.growth.new_clients.percentage}%
                </span>
                <span className="text-sm opacity-80">{t('dashboard:vs_previous_period', 'к предыдущему периоду')}</span>
              </div>
            )}
          </div>
        </div>

        {/* VIP Clients */}
        <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-sm p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5" />
              {t('dashboard:vip_clients_section', 'VIP клиенты')}
            </h3>
            <span className="text-sm opacity-80">{t('dashboard:premium_tier', 'премиум уровень')}</span>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-center">
              <p className="text-4xl font-bold mb-1">{stats.vip_clients || 0}</p>
              <p className="text-sm opacity-90">{t('dashboard:vip_total', 'VIP статус')}</p>
            </div>
            {stats.growth?.vip_clients && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-center gap-2">
                {stats.growth.vip_clients.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {stats.growth.vip_clients.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                <span className="font-medium">
                  {stats.growth.vip_clients.percentage > 0 ? '+' : ''}{stats.growth.vip_clients.percentage}%
                </span>
                <span className="text-sm opacity-80">{t('dashboard:vs_previous_period', 'к предыдущему периоду')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}