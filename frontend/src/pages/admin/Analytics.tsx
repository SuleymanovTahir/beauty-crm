//src/pages/admin/Analytics.tsx
import React, { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { customPieLabel, customPiePercentLabel, customPieLegend } from '../../components/shared/PieChartLabel';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { api } from '../../services/api';
import i18n from '../../i18n';
import { PeriodFilter } from '../../components/shared/PeriodFilter';

interface AnalyticsData {
  bookings_by_day: [string, number][];
  services_stats: [string, number, number][];
  status_stats: [string, number][];
  avg_response_time: number;
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
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { t } = useTranslation(['analytics', 'common']);

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
    try {
      setLoading(true);
      setError(null);

      const statsData = await api.getStats();
      setStats(statsData);

      let analyticsData;
      if (dateFrom && dateTo) {
        analyticsData = await api.getAnalytics(0, dateFrom, dateTo);
      } else {
        const periodNum = parseInt(period);
        if (isNaN(periodNum)) {
          throw new Error('Некорректный период');
        }
        analyticsData = await api.getAnalytics(periodNum);
      }
      setAnalytics(analyticsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('analytics:errors.loading_error');
      setError(message);
      toast.error(`${t('analytics:errors.loading_error')}: ${message}`);
      console.error('Analytics error:', err);
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
      ? new Date(date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'numeric' })
      : new Date(date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
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
              {analytics?.avg_response_time.toFixed(0) || 0} мин
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:response_time')}</p>
            <div className="text-xs md:text-sm text-blue-600">
              {t('analytics:avg_time')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {isMobile ? `${(stats.total_revenue / 1000).toFixed(1)}k` : stats.total_revenue.toLocaleString()} AED
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:revenue')}</p>
            <div className="text-xs md:text-sm text-green-600">
              {t('analytics:for_period')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {stats.total_revenue > 0 ? (stats.total_revenue / stats.total_bookings).toFixed(0) : 0} AED
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
                        {entry.value} • {entry.revenue} AED
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
                      {typeof service.revenue === 'number'
                        ? service.revenue.toLocaleString()
                        : 0} AED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
