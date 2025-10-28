import React, { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Clock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Stats {
  total_clients: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  new_clients: number;
  leads: number;
  customers: number;
  total_client_messages: number;
  total_bot_messages: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Загружаем реальные данные
      const [statsData, bookingsData] = await Promise.all([
        api.getStats(),
        api.getBookings(),
      ]);

      setStats(statsData);
      
      // Берём последние 3 записи
      if (bookingsData.bookings) {
        setRecentBookings(bookingsData.bookings.slice(0, 3));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      toast.error(`Ошибка: ${message}`);
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
          <p className="text-gray-600">Загрузка данных...</p>
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
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadDashboardData} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
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
          <p className="text-yellow-800">Нет данных</p>
        </div>
      </div>
    );
  }

  // ✅ Используем реальные данные из stats
  const stat_cards = [
    {
      icon: Calendar,
      label: 'Записи ожидают',
      value: stats.pending_bookings || 0,
      color: 'text-pink-600',
      bg: 'bg-pink-50'
    },
    {
      icon: Users,
      label: 'Новые клиенты',
      value: stats.new_clients || 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      icon: DollarSign,
      label: 'Общий доход',
      value: `${(stats.total_revenue || 0).toFixed(0)} AED`,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      icon: TrendingUp,
      label: 'Конверсия',
      value: `${(stats.conversion_rate || 0).toFixed(1)}%`,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string; color: string }> = {
      pending: { text: 'Ожидание', bg: 'bg-yellow-100', color: 'text-yellow-800' },
      confirmed: { text: 'Подтверждена', bg: 'bg-green-100', color: 'text-green-800' },
      completed: { text: 'Завершена', bg: 'bg-blue-100', color: 'text-blue-800' },
      cancelled: { text: 'Отменена', bg: 'bg-red-100', color: 'text-red-800' },
    };
    return badges[status] || { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Панель управления</h1>
        <p className="text-gray-600">Добро пожаловать в систему управления салоном</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stat_cards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-2xl text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Последние записи</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/bookings')}>
              Все записи
            </Button>
          </div>
          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => {
                const badge = getStatusBadge(booking.status);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">
                        {booking.name?.charAt(0) || 'С'}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{booking.name || 'Не указано'}</p>
                        <p className="text-xs text-gray-500">{booking.service || 'Нет услуги'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(booking.datetime).toLocaleTimeString('ru-RU', {
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
                <p>Нет записей</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Быстрые действия</h2>
          <div className="space-y-3">
            <Button
              className="w-full justify-start bg-pink-600 hover:bg-pink-700"
              onClick={() => navigate('/admin/bookings')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Создать запись
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              Добавить клиента
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/users/create')}
            >
              <Users className="w-4 h-4 mr-2" />
              Создать пользователя
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Просмотреть аналитику
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Календарь
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Всего клиентов</p>
              <p className="text-3xl text-gray-900 font-bold">{stats.total_clients}</p>
              <p className="text-xs text-green-600 mt-1">+{stats.new_clients} новых</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Всего записей</p>
              <p className="text-3xl text-gray-900 font-bold">{stats.total_bookings}</p>
              <p className="text-xs text-green-600 mt-1">{stats.completed_bookings} завершено</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Сообщений</p>
              <p className="text-3xl text-gray-900 font-bold">
                {(stats.total_client_messages || 0) + (stats.total_bot_messages || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                👤 {stats.total_client_messages || 0} | 🤖 {stats.total_bot_messages || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}