import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, MessageSquare, Eye, Loader, RefreshCw, AlertCircle } from 'lucide-react';
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
  new: { label: 'Новая', color: 'bg-purple-100 text-purple-800' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Загрузить данные при монтировании компонента
  useEffect(() => {
    console.log('📌 Bookings монтирован, начинаю загрузку...');
    loadBookings();
  }, []);

  // Фильтровать данные при изменении поискового запроса или статуса
  useEffect(() => {
    console.log(`🔍 Фильтрую: searchTerm="${searchTerm}", statusFilter="${statusFilter}"`);
    const filtered = bookings.filter(booking => {
      const matchesSearch = 
        booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    console.log(`✅ Отфильтровано: ${filtered.length} из ${bookings.length}`);
    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Начало загрузки...');
      console.log('🚀 Загружаю записи из API...');
      
      setDebugInfo('Вызов api.getBookings()...');
      const data = await api.getBookings();
      
      console.log('📦 Получено с API:', data);
      setDebugInfo(`Получены данные: ${JSON.stringify(data).substring(0, 100)}...`);
      
      // Проверяем структуру данных
      const bookingsArray = data.bookings || (Array.isArray(data) ? data : []);
      console.log('✅ Массив записей:', bookingsArray);
      setDebugInfo(`Массив: ${bookingsArray.length} записей`);
      
      setBookings(bookingsArray);
      
      if (bookingsArray.length === 0) {
        console.log('⚠️ Записи не найдены');
        setDebugInfo('Записи не найдены в системе');
        toast.info('Нет записей в системе');
      } else {
        console.log(`✅ Загружено ${bookingsArray.length} записей`);
        setDebugInfo(`✅ Успешно загружено ${bookingsArray.length} записей`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      const fullError = err instanceof Error ? err.stack : String(err);
      
      console.error('❌ Ошибка загрузки:', err);
      console.error('❌ Full stack:', fullError);
      
      setError(message);
      setDebugInfo(`❌ ОШИБКА: ${message}\n\n${fullError}`);
      toast.error(`Ошибка загрузки: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Пользователь нажал "Обновить"');
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
    toast.success('Данные обновлены');
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    console.log(`📝 Обновляю статус записи ${id} на "${newStatus}"`);
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
      toast.success('Статус записи обновлён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления';
      console.error('❌ Ошибка:', err);
      toast.error(`Ошибка: ${message}`);
    }
  };

  // ✅ Функция для открытия чата с клиентом
  const handleOpenChat = (booking: Booking) => {
    console.log(`💬 Открываю чат с клиентом ${booking.client_id}`);
    navigate(`/admin/chat?client_id=${booking.client_id}`);
  };

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return date.toLocaleDateString('ru-RU') + ' ' + 
             date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return datetime;
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

  console.log('🎨 Рендерю Bookings. Loading:', loading, 'Error:', error);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600 text-center">Загрузка записей...</p>
          
          {/* Debug Info */}
          <div className="w-full p-4 bg-gray-100 rounded-lg border border-gray-300 text-left">
            <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
              {debugInfo || 'Инициализация...'}
            </p>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Откройте DevTools (F12) → Console для подробной отладки
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ошибка загрузки записей</p>
              <p className="text-red-700 text-sm mt-2">{error}</p>
              
              {/* Debug Info */}
              <div className="mt-4 p-3 bg-red-100 rounded border border-red-300 text-left">
                <p className="text-xs font-mono text-red-800 whitespace-pre-wrap font-bold">
                  Debug информация:
                </p>
                <p className="text-xs font-mono text-red-700 mt-1 whitespace-pre-wrap">
                  {debugInfo}
                </p>
              </div>
              
              <div className="text-xs text-red-600 mt-3 bg-red-100 p-3 rounded">
                <p className="font-bold mb-2">Попробуйте:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Откройте F12 → Console и ищите красные ошибки</li>
                  <li>Проверьте что backend запущен: python main.py</li>
                  <li>Проверьте URL API: http://localhost:8000</li>
                  <li>Откройте F12 → Network и посмотрите запрос к /api/bookings</li>
                  <li>Статус ответа должен быть 200, а не 500 или 401</li>
                </ul>
              </div>
              
              <Button onClick={loadBookings} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать ещё раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-pink-600" />
            Управление записями
          </h1>
          <p className="text-gray-600">{filteredBookings.length} записей</p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Ожидают подтверждения</p>
          <h3 className="text-3xl text-yellow-600 font-bold">{stats.pending}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Завершённых</p>
          <h3 className="text-3xl text-blue-600 font-bold">{stats.completed}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Всего записей</p>
          <h3 className="text-3xl text-gray-900 font-bold">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Общий доход</p>
          <h3 className="text-3xl text-green-600 font-bold">{stats.revenue.toFixed(0)} AED</h3>
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
              <SelectItem value="new">Новая</SelectItem>
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
        {filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Клиент</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Услуга</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Дата и время</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Телефон</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Сумма</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">#{booking.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-medium text-sm">
                          {booking.name?.charAt(0).toUpperCase() || 'N'}
                        </div>
                        <span className="text-sm text-gray-900">{booking.name || 'Без имени'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.service_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDateTime(booking.datetime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{booking.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <Select
                        value={booking.status}
                        onValueChange={(value) => handleStatusChange(booking.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <Badge className={statusConfig[booking.status as keyof typeof statusConfig]?.color || 'bg-gray-100'}>
                            {statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {(booking.revenue || 0).toFixed(0)} AED
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                          title="Просмотр деталей"
                          className="hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenChat(booking)}
                          title="Написать клиенту"
                          className="hover:bg-green-50"
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
        ) : (
          <div className="py-20 text-center text-gray-500">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg">Записи не найдены</p>
            {bookings.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">В системе ещё нет записей</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}