// /frontend/src/pages/admin/Analytics.tsx
import { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, AlertCircle, Loader, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PeriodFilter } from '../../components/shared/PeriodFilter';
import { useCurrency } from '../../hooks/useSalonSettings';

interface AnalyticsData {
  bookings_by_day: [string, number][];
  services_stats: [string, number, number][];
  status_stats: [string, number][];
  avg_response_time: number;
  peak_hours?: Array<{
    hour: string;
    count: number;
  }>;
  drop_off_points?: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

interface Stats {
  total_clients: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  conversion_rate: number;
}

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const [period, setPeriod] = useState<string>('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [funnel, setFunnel] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { t, i18n: i18nInstance } = useTranslation(['analytics', 'common']);
  const { currency, formatCurrency } = useCurrency();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (period !== 'custom') {
      loadData();
    }
  }, [period]);

  const loadData = async () => {
    console.log('🔍 [Analytics] Starting to load analytics data...');
    try {
      setLoading(true);
      setError(null);

      // Определяем параметры периода для аналитики
      let periodNum: number;
      if (dateFrom && dateTo) {
        periodNum = 0; // будет использоваться dateFrom, dateTo
      } else if (period === 'today') {
        periodNum = 1;
      } else if (period === 'all') {
        periodNum = 365;
      } else {
        periodNum = parseInt(period);
        if (isNaN(periodNum)) {
          throw new Error(t('analytics:errors.invalid_period'));
        }
      }

      // Параллельная загрузка всех данных для ускорения (оптимизация производительности)
      console.log('📊 [Analytics] Loading all data in parallel...');
      const [statsData, funnelData, analyticsData] = await Promise.all([
        api.getStats(),
        api.get('/api/analytics/funnel'),
        dateFrom && dateTo
          ? api.getAnalytics(0, dateFrom, dateTo)
          : api.getAnalytics(periodNum)
      ]);

      console.log('✅ [Analytics] All data loaded successfully!');
      setStats(statsData);
      setFunnel(funnelData);
      setAnalytics(analyticsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('analytics:errors.loading_error');
      console.error('❌ [Analytics] Error loading analytics:', err);
      console.error('❌ [Analytics] Error details:', {
        message: message,
        response: (err as any)?.response?.data,
        status: (err as any)?.response?.status
      });
      setError(message);
      toast.error(`${t('analytics:errors.loading_error')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);

    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
      setTimeout(() => loadData(), 0);
    }
  };

  const handleApplyCustomDates = () => {
    if (!dateFrom || !dateTo) {
      toast.error(t('analytics:errors.select_both_dates'));
      return;
    }
    if (dateFrom > dateTo) {
      toast.error(t('analytics:errors.invalid_date_range'));
      return;
    }
    loadData();
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await api.exportAnalytics('csv', parseInt(period));

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('analytics:success.file_downloaded'));
    } catch (err) {
      console.error('Export error:', err);
      toast.error(t('analytics:errors.export_failed'));
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm md:text-base text-red-800 font-medium">{t('analytics:errors.loading_error')}</p>
              <p className="text-xs md:text-sm text-red-700 mt-1">{error}</p>
              <Button onClick={loadData} className="mt-4 bg-red-600 hover:bg-red-700 text-sm">
                {t('analytics:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-6 h-6 md:w-8 md:h-8 text-pink-600 animate-spin" />
          <p className="text-sm md:text-base text-gray-600">{t('analytics:detailed_analysis')}</p>
        </div>
      </div>
    );
  }

  const bookingsTrendData = analytics?.bookings_by_day?.map(([date, count]) => ({
    name: isMobile
      ? new Date(date).toLocaleDateString(i18nInstance.language, { day: 'numeric', month: 'numeric' })
      : new Date(date).toLocaleDateString(i18nInstance.language, { day: 'numeric', month: 'short' }),
    [t('analytics:bookings')]: count
  })) || [];

  const servicesData = analytics?.services_stats?.map(([name, count, revenue], index) => ({
    name,
    value: count,
    revenue,
    color: COLORS[index % COLORS.length]
  })) || [];

  const statusData = analytics?.status_stats?.map(([status, count]) => ({
    name: t(`analytics:status.${status}`),
    [t('analytics:bookings')]: count
  })) || [];

  const topServices = analytics?.services_stats?.slice(0, 5).map(([name, count, revenue]) => ({
    name,
    count,
    revenue
  })) || [];

  return (
    <div className="analytics-container p-4 md:p-8 pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-2 md:gap-3">
          <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-pink-600" />
          <span>{t('analytics:title')}</span>
        </h1>
        <p className="text-sm md:text-base text-gray-600">{t('analytics:detailed_analysis')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:flex-wrap sm:items-end">
          <PeriodFilter
            period={period}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPeriodChange={handlePeriodChange}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            showAllOption={false}
          />

          {period === 'custom' && (
            <Button onClick={handleApplyCustomDates} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto text-sm md:text-base">
              {t('analytics:apply')}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={loadData}
            className="md:ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('analytics:refresh')}
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? t('analytics:exporting') : t('analytics:export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="analytics-stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {stats.conversion_rate.toFixed(1)}%
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:conversion')}</p>
            <div className="text-xs md:text-sm text-green-600">
              {isMobile ? t('analytics:conversion') : t('analytics:from_visitors')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {analytics?.avg_response_time.toFixed(0) || 0} {t('analytics:min')}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:response_time')}</p>
            <div className="text-xs md:text-sm text-blue-600">
              {t('analytics:avg_time')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {isMobile ? `${(stats.total_revenue / 1000).toFixed(1)}k ${currency}` : formatCurrency(stats.total_revenue)}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:revenue')}</p>
            <div className="text-xs md:text-sm text-green-600">
              {t('analytics:for_period')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {stats.total_revenue > 0 ? formatCurrency(stats.total_revenue / stats.total_bookings) : formatCurrency(0)}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:avg_check')}</p>
            <div className="text-xs md:text-sm text-green-600">
              {t('analytics:per_booking')}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="analytics-chart-grid grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Bookings Trend */}
        {bookingsTrendData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl text-gray-900 mb-6">{t('analytics:bookings_trend')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={t('analytics:bookings')}
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ fill: '#ec4899' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Services Distribution */}
        {servicesData.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:services_distribution')}</h2>
            <ResponsiveContainer width="100%" height={isMobile ? 350 : 300}>
              <PieChart>
                <Pie
                  data={servicesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy={isMobile ? "40%" : "50%"}
                  outerRadius={isMobile ? 80 : 100}
                  label={!isMobile}
                  labelLine={!isMobile}
                >
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: isMobile ? 11 : 14,
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}
                />
                {!isMobile && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </PieChart>
            </ResponsiveContainer>

            {/* Mobile Legend - Improved */}
            {isMobile && servicesData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {servicesData.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">
                        {entry.name}
                      </div>
                      <div className="text-gray-600">
                        {entry.value} • {formatCurrency(entry.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Chart */}
        {statusData.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:booking_statuses')}</h2>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip contentStyle={{ fontSize: isMobile ? 12 : 14 }} />
                {!isMobile && <Legend />}
                <Bar dataKey={t('analytics:bookings')} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak Hours Chart */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
            <h2 className="text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:peak_hours')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name={t('analytics:bookings')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Services Table */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900">{t('analytics:top_services')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:name')}</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:quantity')}</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:income')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topServices.map((service, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                      <div className="truncate max-w-[150px] md:max-w-none">{service.name}</div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                      {service.count}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-green-600 font-medium">
                      {formatCurrency(service.revenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Funnel Overview */}
      {funnel && (
        <>
          {/* Conversion Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.visitor_to_engaged', 'Visitor -> Engaged')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.visitor_to_engaged}%</h3>
                {funnel.conversion_rates.visitor_to_engaged >= 60 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.engaged_to_booking', 'Engaged -> Started Booking')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.engaged_to_booking}%</h3>
                {funnel.conversion_rates.engaged_to_booking >= 50 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.booking_to_booked', 'Started -> Booked')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.booking_to_booked}%</h3>
                {funnel.conversion_rates.booking_to_booked >= 50 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.booked_to_completed', 'Booked -> Completed')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.booked_to_completed}%</h3>
                {funnel.conversion_rates.booked_to_completed >= 90 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
              <Filter className="w-6 h-6 text-pink-600" />
              {t('analytics:funnel_chart', 'Funnel Visualization')}
            </h2>

            <div className="space-y-4">
              {[
                { name: t('analytics:funnel.stages.visitors', 'Visitors'), value: funnel.visitors, color: 'bg-blue-500', desc: t('analytics:funnel.desc.visitors', 'Site/Social Visitors') },
                { name: t('analytics:funnel.stages.engaged', 'Engaged'), value: funnel.engaged, color: 'bg-cyan-500', desc: t('analytics:funnel.desc.engaged', 'Showed Interest') },
                { name: t('analytics:funnel.stages.started_booking', 'Started Booking'), value: funnel.started_booking, color: 'bg-green-500', desc: t('analytics:funnel.desc.started_booking', 'Opened Booking Form') },
                { name: t('analytics:funnel.stages.booked', 'Booked'), value: funnel.booked, color: 'bg-amber-500', desc: t('analytics:funnel.desc.booked', 'Completed Booking') },
                { name: t('analytics:funnel.stages.completed', 'Completed'), value: funnel.completed, color: 'bg-pink-500', desc: t('analytics:funnel.desc.completed', 'Service Completed') }
              ].map((stage, index, arr) => {
                const maxValue = Math.max(...arr.map(s => s.value));
                const percentage = (stage.value / (maxValue || 1)) * 100;
                const conversionPercent = (stage.value / (funnel.visitors || 1)) * 100;
                const prevValue = index > 0 ? arr[index - 1].value : 0;
                const loss = index > 0 ? prevValue - stage.value : 0;

                return (
                  <div key={index} className="relative">
                    <div className="flex items-center gap-4">
                      {/* Funnel Bar */}
                      <div className="flex-1">
                        <div
                          className={`${stage.color} text-white p-6 rounded-lg transition-all hover:shadow-lg cursor-pointer`}
                          style={{
                            width: `${Math.max(percentage, 5)}%`,
                            minWidth: '200px'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg mb-1">{stage.name}</h3>
                              <p className="text-sm opacity-90">{stage.desc}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl">{stage.value}</p>
                              <p className="text-sm opacity-90">{conversionPercent.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Losses */}
                    {loss > 0 && (
                      <div className="mt-2 ml-4 flex items-center gap-2 text-red-600 text-sm">
                        <TrendingDown className="w-4 h-4" />
                        <span>{t('analytics:funnel.losses', { count: loss })}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Drop-off Analysis */}
      {analytics?.drop_off_points && analytics.drop_off_points.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              {t('analytics:drop_off_analysis')}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {t('analytics:where_clients_leave')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:conversation_stage')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:drop_offs')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:percentage')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:recommendation')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.drop_off_points.map((point, index) => {
                  const recommendations: Record<string, string> = {
                    'after_price': t('analytics:work_on_objections'),
                    'no_slots': t('analytics:need_more_masters'),
                    'whatsapp_request': t('analytics:simplify_contact_collection'),
                    'after_greeting': t('analytics:improve_greeting'),
                    'service_selection': t('analytics:clarify_services')
                  };

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: point.percentage > 50 ? '#ef4444' :
                                point.percentage > 30 ? '#f59e0b' : '#10b981'
                            }}
                          />
                          {t(`analytics:stages.${point.stage}`)}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 font-medium">
                        {point.count}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${point.percentage}%`,
                                backgroundColor: point.percentage > 50 ? '#ef4444' :
                                  point.percentage > 30 ? '#f59e0b' : '#10b981'
                              }}
                            />
                          </div>
                          <span className="text-xs md:text-sm font-medium text-gray-900">
                            {point.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                        {recommendations[point.stage] || t('analytics:analyze_further')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 md:p-6 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                💡
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('analytics:optimization_tip')}
                </p>
                <p className="text-sm text-blue-800">
                  {t('analytics:focus_on_highest_drop_off')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
