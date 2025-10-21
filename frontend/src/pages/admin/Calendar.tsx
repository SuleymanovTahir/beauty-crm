import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Phone, Loader, AlertCircle, Grid3x3, List, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Ожидает', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300' },
  confirmed: { label: 'Подтверждена', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  completed: { label: 'Завершена', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  cancelled: { label: 'Отменена', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
  new: { label: 'Новая', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-300' },
};

// ← НОВОЕ: часы от 00:00 до 23:59
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getBookings();
      const bookingsArray = data.bookings || [];
      setBookings(bookingsArray);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const mondayOfWeek = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getBookingsForTimeSlot = (day: Date, hour: number) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return (
        bookingDate.toDateString() === day.toDateString() &&
        bookingDate.getHours() === hour
      );
    });
  };

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // ← НОВОЕ: функции для редактирования
  const handleEditBooking = (booking: Booking) => {
    navigate(`/admin/bookings/${booking.id}`);
    setSelectedBooking(null);
  };

  // ← НОВОЕ: функция для отмены
  const handleCancelBooking = async (bookingId: number) => {
    try {
      await api.updateBookingStatus(bookingId, 'cancelled');
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      setSelectedBooking(null);
      toast.success('Запись отменена');
    } catch (err) {
      toast.error('Ошибка отмены');
    }
  };

  // ← НОВОЕ: функция для удаления
  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm('Удалить эту запись?')) return;

    try {
      setBookings(bookings.filter(b => b.id !== bookingId));
      setSelectedBooking(null);
      toast.success('Запись удалена');
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <button onClick={loadBookings} className="mt-2 text-red-600 hover:text-red-700 font-medium">
                Попробовать ещё раз
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-pink-600" />
          Календарь записей
        </h1>
        <p className="text-gray-600">Визуальное отображение всех записей (00:00 - 23:59)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="min-w-[200px] text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <p className="text-sm text-gray-600">
                {mondayOfWeek.toLocaleDateString('ru-RU')} - {weekDays[6].toLocaleDateString('ru-RU')}
              </p>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition text-sm font-medium"
            >
              Сегодня
            </button>
            
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setView('week')}
                className={`p-2 transition ${view === 'week' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('month')}
                className={`p-2 transition ${view === 'month' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          </div>
        ) : view === 'week' ? (
          // НЕДЕЛЬНЫЙ ВИД
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-20 px-4 py-3 text-left text-sm font-semibold text-gray-600 bg-gray-50">Время</th>
                  {weekDays.map((day, idx) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th
                        key={idx}
                        className={`px-4 py-3 text-center text-sm font-semibold transition ${
                          isToday ? 'bg-pink-50 border-b-2 border-pink-500' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`font-bold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                          {dayNames[idx]}
                        </div>
                        <div className={`text-xs ${isToday ? 'text-pink-600' : 'text-gray-600'}`}>
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="w-20 px-4 py-3 text-xs font-medium text-gray-600 bg-gray-50 text-center sticky left-0">
                      {hour.toString().padStart(2, '0')}:00
                    </td>
                    {weekDays.map((day, dayIdx) => {
                      const dayBookings = getBookingsForTimeSlot(day, hour);
                      return (
                        <td
                          key={dayIdx}
                          className="px-2 py-2 min-w-[140px] align-top"
                        >
                          {dayBookings.map(booking => (
                            <div
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={`p-2 rounded-lg mb-1 cursor-pointer border-2 transition hover:shadow-md ${statusConfig[booking.status]?.bgColor || 'bg-gray-100'}`}
                            >
                              <p className="text-xs font-bold text-gray-900 truncate">{booking.name}</p>
                              <p className="text-xs text-gray-700">{booking.service_name}</p>
                              <p className="text-xs text-gray-600">{booking.phone}</p>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // МЕСЯЧНЫЙ ВИД
          <div className="p-6">
            <div className="grid grid-cols-7 gap-4">
              {dayNames.map(day => (
                <div key={day} className="text-center font-bold text-gray-700 py-3 border-b-2 border-gray-200">
                  {day}
                </div>
              ))}

              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date(mondayOfWeek);
                date.setDate(date.getDate() + i);
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const dayBookings = bookings.filter(b => {
                  const bDate = new Date(b.datetime);
                  return bDate.toDateString() === date.toDateString();
                });

                return (
                  <div
                    key={i}
                    className={`min-h-[120px] p-2 border-2 rounded-lg transition ${
                      isCurrentMonth
                        ? 'bg-white border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className={`text-sm font-bold mb-2 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map(booking => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={`w-full text-left text-xs px-2 py-1 rounded border transition hover:shadow-md ${statusConfig[booking.status]?.bgColor || 'bg-gray-100'} truncate`}
                          title={`${booking.name} - ${booking.service_name}`}
                        >
                          {booking.name}
                        </button>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-600 px-2">+{dayBookings.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Booking Detail */}
      {selectedBooking && (
        <div className="fixed bottom-0 right-0 left-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full md:w-[400px] rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4">
            <button
              onClick={() => setSelectedBooking(null)}
              className="float-right text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Запись #{selectedBooking.id}</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {selectedBooking.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Клиент</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.name}</p>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">Услуга</p>
                <p className="font-semibold text-gray-900">{selectedBooking.service_name}</p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600">Дата и время</p>
                  <p className="font-bold text-blue-600">
                    {new Date(selectedBooking.datetime).toLocaleDateString('ru-RU')} в{' '}
                    {new Date(selectedBooking.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Phone className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600">Телефон</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.phone}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-2">Статус</p>
                <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${statusConfig[selectedBooking.status]?.bgColor}`}>
                  {statusConfig[selectedBooking.status]?.label || selectedBooking.status}
                </div>
              </div>

              {selectedBooking.revenue > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Сумма</p>
                  <p className="text-2xl font-bold text-yellow-600">{selectedBooking.revenue} AED</p>
                </div>
              )}

              {/* ← НОВОЕ: Кнопки действий */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleEditBooking(selectedBooking)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Редактировать
                </Button>
                <Button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  disabled={selectedBooking.status === 'cancelled'}
                >
                  Отменить
                </Button>
                <Button
                  onClick={() => handleDeleteBooking(selectedBooking.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}