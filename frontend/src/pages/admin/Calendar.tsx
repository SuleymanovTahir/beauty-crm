// frontend/src/pages/admin/Calendar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon, Trash2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Booking {
  id: number;
  client_id: string;
  service: string;
  datetime: string;
  phone: string;
  name: string;
  status: string;
  created_at: string;
  revenue: number;
  master?: string;
}

interface Service {
  id: number;
  key: string;
  name: string;
  name_ru: string;
  price: number;
  currency: string;
  category: string;
}

interface Client {
  id: string;
  instagram_id: string;
  display_name: string;
  phone?: string;
  namejt: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const SALON_START_HOUR = 9;
const SALON_END_HOUR = 21;

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = SALON_START_HOUR; hour <= SALON_END_HOUR; hour++) {
    slots.push({ hour, minute: 0, display: `${String(hour).padStart(2, '0')}:00` });
    if (hour < SALON_END_HOUR) {
      slots.push({ hour, minute: 30, display: `${String(hour).padStart(2, '0')}:30` });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  confirmed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  completed: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидание',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена'
};

export default function Calendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date(today));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [masters, setMasters] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [addForm, setAddForm] = useState({
    phone: '',
    date: '',
    time: '',
    revenue: 0,
    master: ''
  });
  
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, servicesData, clientsData, usersData] = await Promise.all([
        api.getBookings(),
        api.getServices(true),
        api.getClients(),
        api.getUsers()
      ]);
      
      setBookings(bookingsData.bookings || []);
      setServices(servicesData.services || []);
      setClients(clientsData.clients || []);
      setMasters(usersData.users?.filter((u: User) => 
        u.role === 'employee' || u.role === 'manager' || u.role === 'admin'
      ) || []);
    } catch (err) {
      toast.error('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getBookingsForSlot = (day: Date, hour: number, minute: number) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return bookingDate.toDateString() === day.toDateString() && 
             bookingDate.getHours() === hour &&
             bookingDate.getMinutes() === minute;
    });
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return bookingDate.toDateString() === day.toDateString();
    });
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    setCurrentDate(todayDate);
    
    const todayBookings = getBookingsForDay(todayDate);
    
    if (todayBookings.length === 0) {
      toast.success('📅 Сегодня записей нет - свободный день! 🎉', { duration: 3000 });
    } else if (todayBookings.length === 1) {
      toast.success(`📅 Одна запись на сегодня ⏰`, { duration: 3000 });
    } else {
      toast.success(`📅 ${todayBookings.length} записей на сегодня 🔥`, { duration: 3000 });
    }
  };

  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === currentDate.getDate() &&
           date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  };

  const formatMonth = (date: Date) => {
    return MONTHS[date.getMonth()];
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (booking: Booking) => {
    const bookingDate = new Date(booking.datetime);
    const client = clients.find(c => c.instagram_id === booking.client_id) || null;
    const service = services.find(s => s.name_ru === booking.service) || null;
    
    setSelectedClient(client);
    setSelectedService(service);
    setAddForm({
      phone: booking.phone,
      date: bookingDate.toISOString().split('T')[0],
      time: bookingDate.toTimeString().slice(0, 5),
      revenue: booking.revenue,
      master: booking.master || masters[0]?.full_name || ''
    });
    setIsEditing(true);
    setSelectedBooking(booking);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedService(null);
    setAddForm({
      phone: '',
      date: currentDate.toISOString().split('T')[0],
      time: TIME_SLOTS[0].display,
      revenue: 0,
      master: masters[0]?.full_name || ''
    });
  };

  const handleSaveBooking = async () => {
    if (!selectedClient || !selectedService || !addForm.date || !addForm.time) {
      toast.error('Заполните все обязательные поля (клиент, услуга, дата, время)');
      return;
    }

    try {
      setAddingBooking(true);
      if (isEditing && selectedBooking) {
        await api.updateBookingStatus(selectedBooking.id, 'cancelled');
        await api.createBooking({
          instagram_id: selectedClient.instagram_id,
          name: selectedClient.display_name,
          phone: addForm.phone || selectedClient.phone || '',
          service: selectedService.name_ru,
          date: addForm.date,
          time: addForm.time,
          revenue: addForm.revenue || selectedService.price,
          master: addForm.master,
        });
        toast.success('Запись обновлена');
      } else {
        await api.createBooking({
          instagram_id: selectedClient.instagram_id,
          name: selectedClient.display_name,
          phone: addForm.phone || selectedClient.phone || '',
          service: selectedService.name_ru,
          date: addForm.date,
          time: addForm.time,
          revenue: addForm.revenue || selectedService.price,
          master: addForm.master,
        });
        toast.success('Запись создана ✅');
      }
      
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(`❌ Ошибка: ${err.message}`);
    } finally {
      setAddingBooking(false);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!confirm(`Удалить запись для ${booking.name}?`)) return;
    
    try {
      await api.updateBookingStatus(booking.id, 'cancelled');
      toast.success('Запись удалена');
      setSelectedBooking(null);
      await loadData();
    } catch (err) {
      toast.error('Ошибка удаления');
      console.error(err);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedBooking) return;
    try {
      await api.updateBookingStatus(selectedBooking.id, newStatus);
      const updated = bookings.map(b => 
        b.id === selectedBooking.id ? { ...b, status: newStatus } : b
      );
      setBookings(updated);
      setSelectedBooking({ ...selectedBooking, status: newStatus });
      setShowStatusDropdown(false);
      toast.success('Статус изменён');
    } catch (err) {
      toast.error('Ошибка');
    }
  };

  const filteredClients = clients.filter((c: Client) =>
    (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const filteredServices = services.filter((s: Service) =>
    (s.name_ru || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        <p className="mt-4 text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-900">Календарь</span>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm text-purple-600 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Сегодня
            </button>
            <button 
              onClick={openCreateModal}
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Запись
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-purple-500">
            <CalendarIcon size={18} />
            <span className="text-sm">
              {currentDate.getDate()} {formatMonth(currentDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="grid grid-cols-8 gap-2">
          <div className="text-xs text-gray-500"></div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`
                text-center py-3 rounded-lg transition-colors cursor-pointer
                ${isSelected(day) ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'hover:bg-gray-50'}
              `}
              onClick={() => setCurrentDate(new Date(day))}
            >
              <div className="text-xs text-gray-500 mb-1">
                {isSelected(day) ? (
                  <span className="text-white/80">{DAYS[index]}</span>
                ) : (
                  DAYS[index]
                )}
              </div>
              <div className={`text-sm ${isSelected(day) ? 'text-white font-bold' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="space-y-2">
          {TIME_SLOTS.map((slot, index) => (
            <div
              key={index}
              className="grid grid-cols-8 gap-2 items-start"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <CalendarIcon size={14} className="text-gray-400" />
                {slot.display}
              </div>
              {weekDays.map((day, dayIndex) => {
                const slotBookings = getBookingsForSlot(day, slot.hour, slot.minute);
                return (
                  <button
                    key={dayIndex}
                    onClick={() => {
                      setCurrentDate(new Date(day));
                      if (slotBookings.length === 0) {
                        openCreateModal();
                      }
                    }}
                    className={`
                      min-h-[60px] p-2 rounded-lg border-2 transition-all text-left
                      ${slotBookings.length > 0 
                        ? 'border-solid' 
                        : 'border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }
                      ${isSelected(day) && slotBookings.length === 0 ? 'bg-purple-50/50' : 'bg-white'}
                    `}
                  >
                    {slotBookings.map(booking => (
                      <div
                        key={booking.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                        }}
                        className="text-xs font-medium p-2 rounded cursor-pointer mb-1 overflow-hidden"
                        style={{
                          backgroundColor: statusColors[booking.status]?.bg,
                          color: statusColors[booking.status]?.text,
                          border: `1px solid ${statusColors[booking.status]?.border}`,
                        }}
                        title={`${booking.name} - ${booking.service}`}
                      >
                        <div className="truncate font-semibold">{booking.name}</div>
                        <div className="truncate text-[10px] opacity-80">{booking.service}</div>
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 9999, 
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff', 
            borderRadius: '1rem',
            width: '100%', 
            maxWidth: '500px', 
            maxHeight: '90vh',
            overflow: 'auto', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Редактировать запись' : 'Добавить запись'}
              </h3>
              <button 
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Client Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Клиент *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск клиента по имени или телефону..."
                    value={selectedClient ? selectedClient.display_name : clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setSelectedClient(null);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  {selectedClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <button
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {showClientDropdown && !selectedClient && clientSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch('');
                              setShowClientDropdown(false);
                              setAddForm({ ...addForm, phone: client.phone || '' });
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {(client.display_name || 'N').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {client.display_name}
                              </div>
                              {client.phone && (
                                <div className="text-xs text-gray-500 truncate">
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          Клиенты не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Услуга *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск услуги..."
                    value={selectedService ? selectedService.name_ru : serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setSelectedService(null);
                      setShowServiceDropdown(true);
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  {selectedService && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      <button
                        onClick={() => {
                          setSelectedService(null);
                          setServiceSearch('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {showServiceDropdown && !selectedService && serviceSearch && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => {
                              setSelectedService(service);
                              setServiceSearch('');
                              setShowServiceDropdown(false);
                              setAddForm({ ...addForm, revenue: service.price });
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {service.name_ru}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {service.category}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-purple-600">
                                {service.price} {service.currency}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          Услуги не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Master Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Мастер
                </label>
                <select
                  value={addForm.master}
                  onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="">Выберите мастера</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.full_name}>
                      {m.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Телефон {!selectedClient?.phone && '*'}
                </label>
                <input
                  type="tel"
                  placeholder="+971 50 123 4567"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата *
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Время *
                  </label>
                  <select
                    value={addForm.time}
                    onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                  >
                    {TIME_SLOTS.map((slot, idx) => (
                      <option key={idx} value={slot.display}>
                        {slot.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Revenue */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Сумма (AED)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.revenue}
                  onChange={(e) => setAddForm({ ...addForm, revenue: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  disabled={addingBooking}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveBooking}
                  disabled={addingBooking}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingBooking ? 'Создание...' : isEditing ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedBooking && !showCreateModal && (
        <div style={{
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 9999, 
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff', 
            borderRadius: '1rem',
            width: '100%', 
            maxWidth: '450px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
            maxHeight: '90vh', 
            overflow: 'auto'
          }}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                Запись #{selectedBooking.id}
              </h3>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Клиент
                </label>
                <input 
                  type="text" 
                  value={selectedBooking.name} 
                  readOnly 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Услуга
                </label>
                <input 
                  type="text" 
                  value={selectedBooking.service} 
                  readOnly 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              {selectedBooking.master && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Мастер
                  </label>
                  <input 
                    type="text" 
                    value={selectedBooking.master} 
                    readOnly 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Телефон
                </label>
                <input 
                  type="tel" 
                  value={selectedBooking.phone} 
                  readOnly 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Дата и время
                </label>
                <input 
                  type="text" 
                  value={new Date(selectedBooking.datetime).toLocaleString('ru-RU', {
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit'
                  })} 
                  readOnly 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-between shadow-sm transition-all"
                  style={{
                    backgroundColor: statusColors[selectedBooking.status]?.bg,
                    color: statusColors[selectedBooking.status]?.text,
                    border: `2px solid ${statusColors[selectedBooking.status]?.border}`,
                  }}
                >
                  <span>{statusLabels[selectedBooking.status]}</span>
                  <span>▼</span>
                </button>

                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden z-10">
                    {statuses.map(status => (
                      <button 
                        key={status} 
                        onClick={() => handleChangeStatus(status)}
                        className="w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-100 last:border-b-0 transition-colors"
                        style={{
                          backgroundColor: selectedBooking.status === status ? statusColors[status]?.bg : '#fff',
                          color: statusColors[status]?.text,
                        }}
                      >
                        {statusLabels[status]}
                        {selectedBooking.status === status && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => handleDeleteBooking(selectedBooking)}
                  className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-red-700 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
                
                <button 
                  onClick={() => {
                    setSelectedBooking(null);
                    openEditModal(selectedBooking);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg text-blue-700 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit size={16} />
                  Изменить
                </button>
              </div>

              <button 
                onClick={() => setSelectedBooking(null)}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white font-medium rounded-lg transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}