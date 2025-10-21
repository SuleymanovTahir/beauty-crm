import React from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const stats = [
    { icon: Calendar, label: 'Записи сегодня', value: '24', color: 'text-pink-600', bg: 'bg-pink-50' },
    { icon: Users, label: 'Новые клиенты', value: '8', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: DollarSign, label: 'Доход за день', value: '12,400 AED', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: TrendingUp, label: 'Рост продаж', value: '+15.3%', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const recentBookings = [
    { id: 1, client: 'Анна Иванова', service: 'Перманентный макияж', time: '10:00', status: 'pending' },
    { id: 2, client: 'Мария Петрова', service: 'Маникюр', time: '12:00', status: 'confirmed' },
    { id: 3, client: 'Елена Сидорова', service: 'Массаж лица', time: '14:00', status: 'completed' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Панель управления</h1>
        <p className="text-gray-600">Добро пожаловать в систему управления салоном</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Последние записи</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/bookings')}>
              Все записи
            </Button>
          </div>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                    {booking.client.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{booking.client}</p>
                    <p className="text-xs text-gray-500">{booking.service}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{booking.time}</p>
                  <p className="text-xs text-gray-500">{booking.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
