// frontend/src/pages/admin/Bookings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, MessageSquare, Eye, Loader } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Booking {
  id: number;
  client_id: string;
  service_name: string;
  datetime: string;
  phone: string;
  name: string;
  status: string;
  created_at: string;
  revenue: number;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузить данные при монтировании компонента
  useEffect(() => {
    loadBookings();
  }, []);

  // Фильтровать данные при изменении поискового запроса или статуса
  useEffect(() => {
    const filtered = bookings.filter(booking => {
      const matchesSearch = 
        booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(message);
      toast.error(`Ошибка: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
      toast.success('Статус записи обновлен');
    } catch (err) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length,
    revenue: bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.revenue || 0), 0)
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка записей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadBookings} className="mt-4 bg-red-600">
            Попробовать еще раз
          </Button>
        </div>
      </div>
    );
  }

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
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">#{booking.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                          {booking.name?.charAt(0) || 'N'}
                        </div>
                        <span className="text-sm text-gray-900">{booking.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.service_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(booking.datetime).toLocaleDateString('ru-RU')} {new Date(booking.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.revenue || 0} AED</td>
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
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Записи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}