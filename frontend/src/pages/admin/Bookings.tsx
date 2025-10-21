import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, MessageSquare, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner@2.0.3';

// Mock data
const mockBookings = [
  {
    id: 1,
    client: 'Анна Иванова',
    service: 'Перманентный макияж бровей',
    date: '2025-10-20',
    time: '10:00',
    phone: '+971 50 123 4567',
    status: 'pending',
    created: '2025-10-19 14:30',
    amount: 800
  },
  {
    id: 2,
    client: 'Мария Петрова',
    service: 'Маникюр + педикюр',
    date: '2025-10-20',
    time: '12:00',
    phone: '+971 50 234 5678',
    status: 'confirmed',
    created: '2025-10-18 09:15',
    amount: 350
  },
  {
    id: 3,
    client: 'Елена Сидорова',
    service: 'Массаж лица',
    date: '2025-10-19',
    time: '15:00',
    phone: '+971 50 345 6789',
    status: 'completed',
    created: '2025-10-17 11:20',
    amount: 450
  },
  {
    id: 4,
    client: 'Ольга Николаева',
    service: 'Наращивание ресниц',
    date: '2025-10-20',
    time: '14:00',
    phone: '+971 50 456 7890',
    status: 'pending',
    created: '2025-10-19 16:45',
    amount: 500
  },
  {
    id: 5,
    client: 'София Козлова',
    service: 'Стрижка и укладка',
    date: '2025-10-18',
    time: '11:00',
    phone: '+971 50 567 8901',
    status: 'cancelled',
    created: '2025-10-15 13:00',
    amount: 300
  },
];

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(mockBookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.amount, 0)
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    toast.success('Статус записи обновлен');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-pink-600" />
          Управление записями
        </h1>
        <p className="text-gray-600">{filteredBookings.length} записей</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Ожидают подтверждения</p>
          <h3 className="text-3xl text-yellow-600">{stats.pending}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Завершенных</p>
          <h3 className="text-3xl text-blue-600">{stats.completed}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Всего записей</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Общий доход</p>
          <h3 className="text-3xl text-green-600">{stats.revenue} AED</h3>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по клиенту или услуге..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="confirmed">Подтверждена</SelectItem>
              <SelectItem value="completed">Завершена</SelectItem>
              <SelectItem value="cancelled">Отменена</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-pink-600 hover:bg-pink-700">
            Добавить запись
          </Button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">ID</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Клиент</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Услуга</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Дата и время</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Телефон</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Статус</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Сумма</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">#{booking.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                        {booking.client.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-900">{booking.client}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{booking.service}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(booking.date).toLocaleDateString('ru-RU')} {booking.time}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{booking.phone}</td>
                  <td className="px-6 py-4">
                    <Select
                      value={booking.status}
                      onValueChange={(value) => handleStatusChange(booking.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <Badge className={statusConfig.pending.color}>
                            {statusConfig.pending.label}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="confirmed">
                          <Badge className={statusConfig.confirmed.color}>
                            {statusConfig.confirmed.label}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="completed">
                          <Badge className={statusConfig.completed.color}>
                            {statusConfig.completed.label}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="cancelled">
                          <Badge className={statusConfig.cancelled.color}>
                            {statusConfig.cancelled.label}
                          </Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{booking.amount} AED</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
