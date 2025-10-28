import React, { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { customPieLabel, customPiePercentLabel, customPieLegend } from '../../components/shared/PieChartLabel';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { api } from '../../services/api';
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
  const [chartData, setChartData] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      toast.error(`Ошибка загрузки аналитики: ${message}`);
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setShowCustomDates(value === 'custom');

    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
      // Перезагружаем данные только если НЕ кастомный период
      setTimeout(() => loadData(), 0);
    }
  };

  const handleApplyCustomDates = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Выберите обе даты');
      return;
    }
    if (dateFrom > dateTo) {
      toast.error('Дата начала должна быть раньше даты конца');
      return;
    }
    loadData();
  };

  // ✅ ФУНКЦИЯ ЭКСПОРТА CSV
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

      toast.success('Файл успешно скачан');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Ошибка при экспорте файла');
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ошибка загрузки аналитики</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadData} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }



  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  // Преобразовать данные для графиков
  const bookingsTrendData = analytics?.bookings_by_day?.map(([date, count]) => ({
    name: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    записи: count
  })) || [];

  const servicesData = analytics?.services_stats?.map(([name, count, revenue]) => ({
    name,
    value: count,
    revenue,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  })) || [];

  const statusData = analytics?.status_stats?.map(([status, count]) => ({
    name: status === 'pending' ? 'Ожидает' : status === 'completed' ? 'Завершена' : status === 'cancelled' ? 'Отменена' : 'Подтверждена',
    записи: count
  })) || [];

  const topServices = analytics?.services_stats?.slice(0, 5).map(([name, count, revenue]) => ({
    name,
    count,
    revenue
  })) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-pink-600" />
          Аналитика и отчеты
        </h1>
        <p className="text-gray-600">Детальный анализ работы салона</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap items-stretch sm:items-end">
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
            <Button onClick={handleApplyCustomDates} className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
              Применить
            </Button>
          )}

          <Button
            variant="outline"
            onClick={loadData}
            className="md:ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>

          {/* ✅ КНОПКА ЭКСПОРТА */}
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-3xl text-gray-900 mb-2">
              {stats.conversion_rate.toFixed(1)}%
            </h3>
            <p className="text-gray-600 text-sm mb-2">Конверсия</p>
            <div className="text-sm text-green-600">
              От посетителей к клиентам
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-3xl text-gray-900 mb-2">
              {analytics?.avg_response_time.toFixed(0) || 0} мин
            </h3>
            <p className="text-gray-600 text-sm mb-2">Время ответа</p>
            <div className="text-sm text-blue-600">
              Среднее время
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-3xl text-gray-900 mb-2">
              {stats.total_revenue.toLocaleString()} AED
            </h3>
            <p className="text-gray-600 text-sm mb-2">Доход</p>
            <div className="text-sm text-green-600">
              За период
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-3xl text-gray-900 mb-2">
              {stats.total_revenue > 0 ? (stats.total_revenue / stats.total_bookings).toFixed(0) : 0} AED
            </h3>
            <p className="text-gray-600 text-sm mb-2">Средний чек</p>
            <div className="text-sm text-green-600">
              На запись
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bookings Trend */}
        {bookingsTrendData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl text-gray-900 mb-6">Динамика записей</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="записи"
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
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg sm:text-xl text-gray-900 mb-4 sm:mb-6">Распределение услуг</h2>
            <ResponsiveContainer width="100%" height={window.innerWidth < 432 ? 350 : 450}>
              <PieChart>
                <Pie
                  data={servicesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy={window.innerWidth < 432 ? "40%" : "45%"}
                  outerRadius={window.innerWidth < 432 ? 70 : 100}
                  label={window.innerWidth < 432 ? undefined : customPiePercentLabel}
                >
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                {window.innerWidth < 1004 ? null : (
                  <Legend
                    content={customPieLegend}
                    verticalAlign="bottom"
                    height={window.innerWidth < 640 ? 100 : 80}
                    wrapperStyle={{
                      fontSize: window.innerWidth < 640 ? '10px' : '12px',
                      paddingTop: '10px'
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            {/* Показываем упрощенную легенду на очень маленьких экранах */}
            {window.innerWidth < 1004 && (
              <div className="mt-4 space-y-2 px-2">
                {servicesData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <span className="text-gray-700 font-semibold flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Chart */}
        {statusData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl text-gray-900 mb-6">Статусы записей</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="записи" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Services Table */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl text-gray-900">Топ услуг</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Название</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Количество</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Доход</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topServices.map((service, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {service.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
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