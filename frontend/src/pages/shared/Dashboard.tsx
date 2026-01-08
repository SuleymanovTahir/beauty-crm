
import { useEffect, useState, useMemo } from 'react';
import {
  Users, Loader, AlertCircle, Crown, UserPlus, UserCheck,
  TrendingUp, Calendar, FileText, Clock, Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { DateFilterDropdown } from '../../components/shared/DateFilterDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { Badge } from '../../components/ui/badge';

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

export default function UniversalDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const permissions = usePermissions(currentUser?.role || 'employee');
  const { t, i18n } = useTranslation(['admin/dashboard', 'common', 'employee/Dashboard']);

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [botAnalytics, setBotAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last30days');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingStatusFilter] = useState<string>('all');
  const [salonSettings, setSalonSettings] = useState<any>(null);

  const rolePrefix = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'director') return '/crm';
    return `/${currentUser?.role || 'employee'}`;
  }, [currentUser?.role]);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter, customDateRange, currentUser?.role]);

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

      let comparisonPeriod: string = dateFilter;
      if (dateFilter === 'last7days') comparisonPeriod = '7days';
      if (dateFilter === 'last30days') comparisonPeriod = '30days';
      if (dateFilter === 'thisMonth' || dateFilter === 'lastMonth') comparisonPeriod = 'month';

      const params = new URLSearchParams({
        comparison_period: comparisonPeriod,
        period: dateFilter === 'custom' ? 'custom' : dateFilter
      });

      if (dateFilter === 'custom') {
        params.append('start_date', customDateRange.start);
        params.append('end_date', customDateRange.end);
      }

      // Add master filter for employees
      if (currentUser?.role === 'employee') {
        params.append('master', currentUser.full_name || currentUser.username);
      }

      const [kpiData, bookingsData, clientsData, botData, settingsData] = await Promise.all([
        api.get(`/api/dashboard/kpi?${params.toString()}`).catch(() => null),
        api.getBookings(),
        api.getClients(),
        api.get('/api/bot-analytics?days=30').catch(() => null),
        api.getPublicSalonSettings().catch(() => ({ currency: 'AED' })),
      ]);

      // Transform kpiData to stats format for compatibility
      if (kpiData?.success && kpiData.kpi) {
        const k = kpiData.kpi;
        const transformedStats: Stats = {
          total_revenue: k.revenue.total,
          total_bookings: k.bookings.total,
          completed_bookings: k.bookings.completed,
          pending_bookings: k.bookings.total - k.bookings.completed - k.bookings.cancelled,
          cancelled_bookings: k.bookings.cancelled,
          conversion_rate: k.bookings.completion_rate,
          new_clients: k.clients.new,
          leads: k.bookings.total, // fallback
          customers: k.clients.total_active,
          total_client_messages: 0,
          total_bot_messages: 0,
          vip_clients: 0,
          active_clients: k.clients.total_active,
          avg_booking_value: k.revenue.average_check,
          cancellation_rate: k.bookings.cancellation_rate,
          total_clients: k.clients.total_active, // fallback
          growth: k.trends ? {
            revenue: { percentage: k.trends.revenue_change_percent, trend: k.trends.revenue_change_percent >= 0 ? 'up' : 'down' },
            total_clients: { percentage: k.trends.bookings_change_percent, trend: k.trends.bookings_change_percent >= 0 ? 'up' : 'down' },
            new_clients: { percentage: 0, trend: 'stable' },
            vip_clients: { percentage: 0, trend: 'stable' },
            active_clients: { percentage: 0, trend: 'stable' },
            pending_bookings: { percentage: 0, trend: 'stable' }
          } : undefined
        };
        setStats(transformedStats);
      }

      setBotAnalytics(botData);
      setSalonSettings(settingsData);

      if (bookingsData.bookings) {
        // Filter bookings for employee
        let filteredBookings = bookingsData.bookings;
        if (currentUser?.role === 'employee') {
          const masterName = currentUser.full_name || currentUser.username;
          filteredBookings = filteredBookings.filter((b: any) => b.master === masterName);
        }

        const enrichedBookings = filteredBookings.slice(0, 10).map((booking: any) => {
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
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const dateRange = getDateRange();
      toast.info(`Generating ${format.toUpperCase()} report...`);
      const response = await fetch('/api/admin/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ format, start_date: dateRange.start, end_date: dateRange.end })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t('common:success'));
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast.error('Export error');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('common:loading')}...</p>
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
              <p className="text-red-800 font-medium">{t('common:error_loading')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadDashboardData} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('common:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Employee / Sales View
  if (currentUser?.role === 'employee' || currentUser?.role === 'sales') {
    const isSales = currentUser?.role === 'sales';

    return (
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 font-bold">
              {t('common:welcome')}, {currentUser.full_name || currentUser.username}!
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              {isSales ? 'Ваши показатели продаж и воронки' : t('employee/Dashboard:my_bookings')}
            </p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="font-medium">{t('admin/dashboard:date_filter', 'Период:')}</span>
            </div>
            <DateFilterDropdown
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value);
                setShowDatePicker(value === 'custom');
              }}
            />
          </div>
          {showDatePicker && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">От:</label>
                <input type="date" className="w-full px-3 py-2 border rounded-lg" value={customDateRange.start.split('T')[0]} onChange={(e) => setCustomDateRange({ ...customDateRange, start: new Date(e.target.value).toISOString() })} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">До:</label>
                <input type="date" className="w-full px-3 py-2 border rounded-lg" value={customDateRange.end.split('T')[0]} onChange={(e) => setCustomDateRange({ ...customDateRange, end: new Date(e.target.value).toISOString() })} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
            <p className="text-sm opacity-80 mb-1">{isSales ? 'Выручка сделок' : 'Ваша выручка'}</p>
            <h3 className="text-3xl font-bold">{stats?.total_revenue?.toLocaleString()} {salonSettings?.currency}</h3>
            {stats?.growth?.revenue && (
              <div className="flex items-center gap-1 text-xs mt-1">
                <TrendingUp className={`w-3 h-3 ${stats.growth.revenue.trend === 'down' ? 'rotate-180' : ''}`} />
                <span>{stats.growth.revenue.percentage}% к прошлому периоду</span>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">{isSales ? 'Всего лидов' : t('employee/Dashboard:today_bookings')}</p>
            <h3 className="text-3xl text-gray-900 font-bold">{stats?.total_bookings || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">{isSales ? 'Конверсия в сделку' : 'Моя конверсия'}</p>
            <h3 className="text-3xl text-green-600 font-bold">{stats?.conversion_rate?.toFixed(1)}%</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">Новых клиентов</p>
            <h3 className="text-3xl text-blue-600 font-bold">{stats?.new_clients || 0}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 font-bold mb-6">
            {isSales ? 'Последние лиды' : t('employee/Dashboard:schedule_for_today')}
          </h2>
          {recentBookings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">{isSales ? 'У вас пока нет активных лидов' : t('employee/Dashboard:no_bookings_today')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gray-50" onClick={() => navigate(`${rolePrefix}/bookings/${booking.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {new Date(booking.datetime).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-gray-900 text-sm">{booking.name}</p>
                        <p className="text-gray-500 text-xs">{booking.service}</p>
                      </div>
                    </div>
                    <Badge className={
                      booking.status === 'confirmed' || booking.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }>
                      {t(`admin/dashboard:status_${booking.status}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin/Manager View
  if (!stats) return null;

  const stat_cards = [
    { icon: Users, label: t('admin/dashboard:total_clients'), value: stats.total_clients || 0, color: 'text-blue-600', bg: 'bg-blue-50', growth: stats.growth?.total_clients },
    { icon: Crown, label: t('admin/dashboard:vip_clients'), value: stats.vip_clients || 0, color: 'text-yellow-600', bg: 'bg-yellow-50', growth: stats.growth?.vip_clients },
    { icon: UserPlus, label: t('admin/dashboard:new_clients'), value: stats.new_clients || 0, color: 'text-green-600', bg: 'bg-green-50', growth: stats.growth?.new_clients },
    { icon: UserCheck, label: t('admin/dashboard:active_clients'), value: stats.active_clients || 0, color: 'text-purple-600', bg: 'bg-purple-50', growth: stats.growth?.active_clients },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string; color: string }> = {
      pending: { text: t('admin/dashboard:status_pending'), bg: 'bg-yellow-100', color: 'text-yellow-800' },
      confirmed: { text: t('admin/dashboard:status_confirmed'), bg: 'bg-green-100', color: 'text-green-800' },
      completed: { text: t('admin/dashboard:status_completed'), bg: 'bg-blue-100', color: 'text-blue-800' },
      cancelled: { text: t('admin/dashboard:status_cancelled'), bg: 'bg-red-100', color: 'text-red-800' },
    };
    return badges[status] || { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
  };

  const filteredRecentBookings = bookingStatusFilter === 'all'
    ? recentBookings
    : recentBookings.filter(b => b.status === bookingStatusFilter);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 font-bold">{t('admin/dashboard:title')}</h1>
          <p className="text-sm md:text-base text-gray-600">{t('admin/dashboard:welcome')}</p>
        </div>

        {permissions.roleLevel >= 80 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportReport('pdf')}>
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportReport('excel')}>
              <FileText className="w-4 h-4 mr-2" /> Excel
            </Button>
          </div>
        )}
      </div>

      {/* Date Filter */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">{t('admin/dashboard:date_filter', 'Период:')}</span>
          </div>
          <DateFilterDropdown
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value);
              setShowDatePicker(value === 'custom');
            }}
          />
        </div>
        {showDatePicker && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">От:</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" value={customDateRange.start.split('T')[0]} onChange={(e) => setCustomDateRange({ ...customDateRange, start: new Date(e.target.value).toISOString() })} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">До:</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" value={customDateRange.end.split('T')[0]} onChange={(e) => setCustomDateRange({ ...customDateRange, end: new Date(e.target.value).toISOString() })} />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stat_cards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                {stat.growth && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${stat.growth.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`w-3 h-3 ${stat.growth.trend === 'down' ? 'rotate-180' : ''}`} />
                    <span>{stat.growth.percentage > 0 ? '+' : ''}{stat.growth.percentage}%</span>
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Conv */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm opacity-80 mb-1">Выручка</p>
          <h3 className="text-3xl font-bold mb-1">{stats.total_revenue?.toLocaleString()} {salonSettings?.currency}</h3>
          {stats.growth?.revenue && (
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className={`w-3 h-3 ${stats.growth.revenue.trend === 'down' ? 'rotate-180' : ''}`} />
              {stats.growth.revenue.percentage}%
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Средний чек</p>
          <h3 className="text-3xl font-bold text-gray-900">{stats.avg_booking_value?.toLocaleString()} {salonSettings?.currency}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Отмены</p>
          <h3 className="text-3xl font-bold text-red-600">{stats.cancellation_rate?.toFixed(1)}%</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Конверсия</p>
          <h3 className="text-3xl font-bold text-purple-600">{stats.conversion_rate?.toFixed(1)}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Последние записи</h2>
            <Link to={`${rolePrefix}/bookings`} className="text-pink-600 text-sm font-medium hover:underline">Все записи</Link>
          </div>
          <div className="space-y-4">
            {filteredRecentBookings.map((booking) => {
              const badge = getStatusBadge(booking.status);
              return (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate(`${rolePrefix}/bookings/${booking.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border">
                      <img src={getDynamicAvatar(booking.name, 'cold', booking.gender)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.name}</p>
                      <p className="text-xs text-gray-500">{booking.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{new Date(booking.datetime).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.bg} ${badge.color}`}>{badge.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Быстрые действия</h2>
            <div className="space-y-2">
              <Button className="w-full justify-start gap-2 bg-pink-600 hover:bg-pink-700" onClick={() => navigate(`${rolePrefix}/bookings`)}>
                <Calendar className="w-4 h-4" /> Новая запись
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`${rolePrefix}/clients`)}>
                <Users className="w-4 h-4" /> База клиентов
              </Button>
              {permissions.canViewAnalytics && (
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`${rolePrefix}/analytics`)}>
                  <TrendingUp className="w-4 h-4" /> Аналитика
                </Button>
              )}
            </div>
          </div>

          {botAnalytics && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
              <h3 className="font-bold flex items-center gap-2 mb-4">🤖 Бот Аналитика</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] opacity-70">Конверсия</p>
                  <p className="text-xl font-bold">{botAnalytics.conversion_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] opacity-70">Активных сессий</p>
                  <p className="text-xl font-bold">{botAnalytics.total_sessions}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}