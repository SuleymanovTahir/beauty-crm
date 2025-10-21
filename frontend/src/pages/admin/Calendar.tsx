import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Phone, Loader, AlertCircle, Grid3x3, List, Edit2, Trash2, ZoomIn, ZoomOut, Plus, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month' | 'day'>('week');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    service: '',
    phone: '',
    datetime: new Date().toISOString().slice(0, 16),
  });

  // Для месячного вида с выбором даты
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);

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

  // Для месячного вида: получить первый день месяца и построить календарь
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getBookingsForTimeSlot = (day: Date, hour: number) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return (
        bookingDate.toDateString() === day.toDateString() &&
        bookingDate.getHours() === hour
      );
    });
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return bookingDate.toDateString() === day.toDateString();
    });
  };

  const isCurrentViewDate = (date: Date) => {
    return date.toDateString() === currentDate.toDateString();
  };

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.6));
  };

  const handleCreateEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.service.trim() || !eventForm.phone.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      await api.createBooking({
        name: eventForm.name,
        service: eventForm.service,
        phone: eventForm.phone,
        date: eventForm.datetime.split('T')[0],
        time: eventForm.datetime.split('T')[1],
        instagram_id: Date.now().toString(),
      });

      toast.success('Запись создана');
      setShowCreateEvent(false);
      setEventForm({
        name: '',
        service: '',
        phone: '',
        datetime: new Date().toISOString().slice(0, 16),
      });
      await loadBookings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка создания';
      toast.error(`Ошибка: ${message}`);
    }
  };

  const handleEditBooking = (booking: Booking) => {
    navigate(`/admin/bookings/${booking.id}`);
    setSelectedBooking(null);
  };

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

  const calendarDays = getCalendarDays();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-pink-600" />
          Календарь записей
        </h1>
        <p className="text-gray-600">Визуальное отображение всех записей</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              
              <div className="min-w-[300px]">
                <h2 className="text-xl font-bold text-gray-900 text-center">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Выбор года и месяца */}
              <select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const d = new Date(currentDate);
                  d.setMonth(parseInt(e.target.value));
                  setCurrentDate(d);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const d = new Date(currentDate);
                  d.setFullYear(parseInt(e.target.value));
                  setCurrentDate(d);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <Button 
                onClick={handleToday}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition text-sm font-medium"
              >
                Сегодня
              </Button>
              
              <Button
                onClick={() => setShowCreateEvent(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm gap-2 font-semibold flex items-center whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Событие
              </Button>

              {/* View Switcher */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setView('day')}
                  className={`p-2 transition ${view === 'day' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="День"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`p-2 transition ${view === 'week' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Неделя"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`p-2 transition ${view === 'month' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Месяц"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Zoom Controls для день и неделя */}
          {view !== 'month' && (
            <div className="flex items-center gap-2 justify-center pt-4 border-t border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.6}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 w-16 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          </div>
        ) : view === 'day' ? (
          // ДНЕВНЫЙ ВИД
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', fontSize: `${zoomLevel * 100}%` }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-pink-50 sticky top-0">
                  <th className="px-4 py-3 text-center font-bold text-gray-900 min-w-[80px]">
                    Время
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900">
                    {currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => {
                  const dayBookings = getBookingsForTimeSlot(currentDate, hour);
                  return (
                    <tr key={hour} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 text-center min-w-[80px] sticky left-0 z-10">
                        {hour.toString().padStart(2, '0')}:00
                      </td>
                      <td className="px-4 py-2 align-top" style={{ minHeight: '60px' }}>
                        <div className="space-y-1">
                          {dayBookings.map(booking => (
                            <div
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={`p-2 rounded-lg cursor-pointer border-2 transition hover:shadow-md ${statusConfig[booking.status]?.bgColor || 'bg-gray-100'}`}
                            >
                              <p className="text-xs font-bold text-gray-900">{booking.name}</p>
                              <p className="text-xs text-gray-700">{booking.service_name}</p>
                              <p className="text-xs text-gray-600">{booking.phone}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : view === 'week' ? (
          // НЕДЕЛЬНЫЙ ВИД
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', fontSize: `${zoomLevel * 100}%` }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 sticky top-0 bg-white z-20">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 min-w-[60px] sticky left-0 z-10">Время</th>
                  {weekDays.map((day, idx) => {
                    const isViewDate = isCurrentViewDate(day);
                    return (
                      <th
                        key={idx}
                        onClick={() => setCurrentDate(day)}
                        className={`px-2 py-2 text-center text-xs font-semibold transition min-w-[100px] cursor-pointer ${
                          isViewDate ? 'bg-pink-50 border-b-2 border-pink-500' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`font-bold text-xs ${isViewDate ? 'text-pink-600' : 'text-gray-900'}`}>
                          {dayNames[idx]}
                        </div>
                        <div className={`text-xs ${isViewDate ? 'text-pink-600' : 'text-gray-600'}`}>
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
                    <td className="px-2 py-2 text-xs font-medium text-gray-600 bg-gray-50 text-center sticky left-0 z-10 min-w-[60px]">
                      {hour.toString().padStart(2, '0')}:00
                    </td>
                    {weekDays.map((day, dayIdx) => {
                      const dayBookings = getBookingsForTimeSlot(day, hour);
                      return (
                        <td
                          key={dayIdx}
                          className="px-1 py-1 align-top min-w-[100px]"
                          style={{ minHeight: '50px' }}
                        >
                          {dayBookings.map(booking => (
                            <div
                              key={booking.id}
                              onClick={() => setSelectedBooking(booking)}
                              className={`p-1 rounded mb-0.5 cursor-pointer border transition hover:shadow-md text-xs ${statusConfig[booking.status]?.bgColor || 'bg-gray-100'}`}
                            >
                              <p className="font-bold text-gray-900 truncate">{booking.name}</p>
                              <p className="text-gray-700 truncate">{booking.service_name}</p>
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
          // МЕСЯЧНЫЙ ВИД - ИСПРАВЛЕННЫЙ
          <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {/* Заголовки дней недели */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={`header-${day}`} className="text-center font-bold text-gray-700 py-2 border-b-2 border-gray-300 text-sm h-10 flex items-center justify-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Даты месяца */}
            <div className="grid grid-cols-7 gap-2 auto-rows-[120px]">
              {calendarDays.map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isViewDate = isCurrentViewDate(date);
                const dayBookings = getBookingsForDay(date);

                return (
                  <div
                    key={`date-${i}`}
                    onClick={() => setCurrentDate(date)}
                    className={`p-2 border-2 rounded-lg transition cursor-pointer ${
                      isViewDate
                        ? 'bg-pink-50 border-pink-400'
                        : isCurrentMonth
                        ? 'bg-white border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className={`text-sm font-bold mb-2 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '80px' }}>
                      {dayBookings.slice(0, 3).map(booking => (
                        <button
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded border transition hover:shadow-md ${statusConfig[booking.status]?.bgColor || 'bg-gray-100'} truncate block`}
                          title={`${booking.name} - ${booking.service_name}`}
                        >
                          {booking.name}
                        </button>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-600 px-1 font-medium">+{dayBookings.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Создать запись</h3>
              <button
                onClick={() => setShowCreateEvent(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-medium">Имя клиента</label>
                <Input
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  placeholder="Анна Петрова"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 font-medium">Услуга</label>
                <Input
                  value={eventForm.service}
                  onChange={(e) => setEventForm({ ...eventForm, service: e.target.value })}
                  placeholder="Маникюр"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 font-medium">Телефон</label>
                <Input
                  value={eventForm.phone}
                  onChange={(e) => setEventForm({ ...eventForm, phone: e.target.value })}
                  placeholder="+971 50 123 4567"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 font-medium">Дата и время</label>
                <Input
                  type="datetime-local"
                  value={eventForm.datetime}
                  onChange={(e) => setEventForm({ ...eventForm, datetime: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowCreateEvent(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Создать
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Booking Detail */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Запись #{selectedBooking.id}</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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
                    {new Date(selectedBooking.datetime).toLocaleDateString('ru-RU')} в {new Date(selectedBooking.datetime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}