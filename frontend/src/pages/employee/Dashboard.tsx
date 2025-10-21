import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

const mockBookings = [
  {
    id: 1,
    client: 'Анна Иванова',
    service: 'Перманентный макияж бровей',
    time: '10:00',
    status: 'confirmed'
  },
  {
    id: 2,
    client: 'Мария Петрова',
    service: 'Коррекция бровей',
    time: '12:00',
    status: 'confirmed'
  },
  {
    id: 3,
    client: 'Елена Сидорова',
    service: 'Перманентный макияж губ',
    time: '14:00',
    status: 'pending'
  },
];

export default function EmployeeDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Мои записи</h1>
        <p className="text-gray-600">Сегодня, {new Date().toLocaleDateString('ru-RU')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Записей сегодня</p>
          <h3 className="text-3xl text-gray-900">{mockBookings.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Подтверждено</p>
          <h3 className="text-3xl text-green-600">
            {mockBookings.filter(b => b.status === 'confirmed').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">В ожидании</p>
          <h3 className="text-3xl text-yellow-600">
            {mockBookings.filter(b => b.status === 'pending').length}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl text-gray-900 mb-6">Расписание на сегодня</h2>
        <div className="space-y-4">
          {mockBookings.map((booking) => (
            <div key={booking.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-lg text-gray-900 mb-1">{booking.time}</p>
                    <p className="text-gray-900">{booking.client}</p>
                    <p className="text-gray-600 text-sm">{booking.service}</p>
                  </div>
                </div>
                <Badge className={
                  booking.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }>
                  {booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидание'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
