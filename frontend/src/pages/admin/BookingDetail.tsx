import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MessageSquare, User, Phone, Mail, Instagram, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner@2.0.3';

// Mock data
const mockBooking = {
  id: 1,
  service: 'Перманентный макияж бровей',
  date: '20.10.2025',
  time: '10:00',
  status: 'pending',
  amount: 800,
  created: '19.10.2025 14:30',
  client: {
    id: 1,
    name: 'Анна Иванова',
    phone: '+971 50 123 4567',
    email: 'anna.ivanova@email.com',
    instagram: '@anna_ivanova',
    messages: 12,
    ltv: 2400,
    lastContact: '19.10.2025'
  },
  notes: 'Клиент просил подтвердить за день до процедуры'
};

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(mockBooking.status);
  const [notes, setNotes] = useState(mockBooking.notes);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    toast.success('Статус записи обновлен');
  };

  const handleSaveNotes = () => {
    toast.success('Заметки сохранены');
  };

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
              <Badge className={statusConfig[status as keyof typeof statusConfig].color}>
                {statusConfig[status as keyof typeof statusConfig].label}
              </Badge>
            </h1>
            <p className="text-gray-600">{mockBooking.date} {mockBooking.time}</p>
          </div>
          <Button className="bg-pink-600 hover:bg-pink-700">
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
              <span className="text-gray-900">{mockBooking.service}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Дата и время:</span>
              <span className="text-gray-900">{mockBooking.date} {mockBooking.time}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Имя клиента:</span>
              <span className="text-gray-900">{mockBooking.client.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Телефон:</span>
              <span className="text-gray-900">{mockBooking.client.phone}</span>
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
              <span className="text-gray-900 text-lg text-green-600">{mockBooking.amount} AED</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-600">Создана:</span>
              <span className="text-gray-900">{mockBooking.created}</span>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-pink-600" />
            Информация о клиенте
          </h2>
          
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl">
                {mockBooking.client.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg text-gray-900 mb-1">{mockBooking.client.name}</h3>
                <a 
                  href={`https://instagram.com/${mockBooking.client.instagram.substring(1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 text-sm flex items-center gap-1 hover:underline"
                >
                  <Instagram className="w-4 h-4" />
                  {mockBooking.client.instagram}
                </a>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{mockBooking.client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{mockBooking.client.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl text-gray-900 mb-1">{mockBooking.client.messages}</p>
                <p className="text-xs text-gray-600">Сообщений</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-green-600 mb-1">{mockBooking.client.ltv}</p>
                <p className="text-xs text-gray-600">LTV (AED)</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-900 mb-1">{mockBooking.client.lastContact}</p>
                <p className="text-xs text-gray-600">Последний контакт</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-pink-600 hover:bg-pink-700"
              onClick={() => navigate(`/admin/clients/${mockBooking.client.id}`)}
            >
              Профиль
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => navigate(`/admin/chat?client=${mockBooking.client.id}`)}
            >
              Чат
            </Button>
          </div>
        </div>

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
