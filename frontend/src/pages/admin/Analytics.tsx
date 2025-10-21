import React, { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, Calendar, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { api } from '../../services/api';

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

export default function Analytics() {
  const [period, setPeriod] = useState('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загрузить статистику
      const statsData = await api.getStats();
      setStats(statsData);
      
      // Загрузить аналитику
      let analyticsData;
      if (dateFrom && dateTo) {
        analyticsData = await api.getAnalytics(0, dateFrom, dateTo);
      } else {
        analyticsData = await api.getAnalytics(parseInt(period));
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
    if (value === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      setDateFrom('');
      setDateTo('');
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
        <div className="flex flex-col md:flex-row gap-4 flex-wrap items-end">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Последние 7 дней</SelectItem>
              <SelectItem value="14">Последние 14 дней</SelectItem>
              <SelectItem value="30">Последний месяц</SelectItem>
              <SelectItem value="90">Последние 3 месяца</SelectItem>
              <SelectItem value="custom">Свой период</SelectItem>
            </SelectContent>
          </Select>
          
          {showCustomDates && (
            <>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="От"
                className="w-full md:w-[180px]"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="До"
                className="w-full md:w-[180px]"
              />
              <Button onClick={handleApplyCustomDates} className="bg-pink-600 hover:bg-pink-700">
                Применить
              </Button>
            </>
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl text-gray-900 mb-6">Распределение услуг</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={servicesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {servicesData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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