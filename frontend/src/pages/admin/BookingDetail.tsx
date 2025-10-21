import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MessageSquare, User, Phone, Mail, Instagram, Save, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
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

interface Client {
  id: string;
  name: string;
  username: string;
  phone: string;
  display_name: string;
  total_messages: number;
  lifetime_value: number;
  last_contact: string;
}

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookingData();
  }, [id]);

  const loadBookingData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('ID записи не найден');
      }

      // Загружаем данные записи
      const bookingData = await api.getBooking(parseInt(id));
      setBooking(bookingData);
      setStatus(bookingData.status);
      setNotes(bookingData.notes || '');

      // Загружаем данные клиента
      if (bookingData.client_id) {
        const clientData = await api.getClient(bookingData.client_id);
        setClient(clientData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id) return;
      
      await api.updateBookingStatus(parseInt(id), newStatus);
      setStatus(newStatus);
      toast.success('Статус записи обновлен');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления статуса';
      toast.error(`Ошибка: ${message}`);
      console.error('Error updating booking status:', err);
    }
  };

  const handleSaveNotes = () => {
    toast.success('Заметки сохранены');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка данных записи...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadBookingData} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateTime = new Date(booking.datetime);
  const formattedDate = dateTime.toLocaleDateString('ru-RU');
  const formattedTime = dateTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/admin/bookings')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к записям
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-pink-600" />
              Запись #{id}
              <Badge className={statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-100'}>
                {statusConfig[status as keyof typeof statusConfig]?.label || status}
              </Badge>
            </h1>
            <p className="text-gray-600">{formattedDate} {formattedTime}</p>
          </div>
          <Button 
            className="bg-pink-600 hover:bg-pink-700"
            onClick={() => navigate(`/manager/chat?client=${booking.client_id}`)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Открыть чат
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-600" />
            Детали записи
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Услуга:</span>
              <span className="text-gray-900">{booking.service_name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Дата и время:</span>
              <span className="text-gray-900">{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Имя клиента:</span>
              <span className="text-gray-900">{booking.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Телефон:</span>
              <span className="text-gray-900">{booking.phone}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Статус:</span>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="confirmed">Подтверждена</SelectItem>
                  <SelectItem value="completed">Завершена</SelectItem>
                  <SelectItem value="cancelled">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Доход:</span>
              <span className="text-gray-900 text-lg text-green-600">{booking.revenue} AED</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-600">Создана:</span>
              <span className="text-gray-900">
                {new Date(booking.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {/* Client Information */}
        {client && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-pink-600" />
              Информация о клиенте
            </h2>
            
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl">
                  {(client.display_name || client.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg text-gray-900 mb-1">{client.display_name || client.name}</h3>
                  {client.username && (
                    <a 
                      href={`https://instagram.com/${client.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 text-sm flex items-center gap-1 hover:underline"
                    >
                      <Instagram className="w-4 h-4" />
                      @{client.username}
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl text-gray-900 mb-1">{client.total_messages}</p>
                  <p className="text-xs text-gray-600">Сообщений</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl text-green-600 mb-1">{client.lifetime_value}</p>
                  <p className="text-xs text-gray-600">LTV (AED)</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-900 mb-1">
                    {new Date(client.last_contact).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-xs text-gray-600">Последний контакт</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-pink-600 hover:bg-pink-700"
                onClick={() => navigate(`/admin/clients/${client.id}`)}
              >
                Профиль
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => navigate(`/manager/chat?client=${client.id}`)}
              >
                Чат
              </Button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-xl text-gray-900 mb-6">Заметки</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Добавьте заметки о записи..."
            className="min-h-[120px] mb-4"
          />
          <Button onClick={handleSaveNotes} className="bg-pink-600 hover:bg-pink-700">
            <Save className="w-4 h-4 mr-2" />
            Сохранить заметки
          </Button>
        </div>
      </div>
    </div>
  );
}