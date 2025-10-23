import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon, Trash2, Edit, Check, X, Search } from 'lucide-react';
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
  
  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Service search
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

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

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

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
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

  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isCurrentDate = (date: Date) => date.toDateString() === currentDate.toDateString();

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="inline-block animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827' }}>
          Календарь
        </h1>
      </div>

      {/* Navigation */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        padding: '0.75rem',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={handlePrevDay} style={{
            width: '32px', height: '32px', border: '1px solid #d1d5db',
            borderRadius: '0.375rem', backgroundColor: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ChevronLeft size={16} color="#6b7280" />
          </button>

          <button onClick={handleNextDay} style={{
            width: '32px', height: '32px', border: '1px solid #d1d5db',
            borderRadius: '0.375rem', backgroundColor: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ChevronRight size={16} color="#6b7280" />
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.95rem', fontWeight: '600', color: '#111827'
        }}>
          {isToday(currentDate) && <CalendarIcon size={16} color="#ec4899" />}
          <span style={{ color: isToday(currentDate) ? '#ec4899' : '#111827' }}>
            {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleToday} style={{
            padding: '0.4rem 0.75rem', backgroundColor: '#fff',
            border: '2px solid #ec4899', borderRadius: '0.375rem',
            fontSize: '0.8rem', fontWeight: '600', color: '#ec4899', cursor: 'pointer'
          }}>
            Сегодня
          </button>

          <button onClick={openCreateModal} style={{
            padding: '0.4rem 0.75rem', backgroundColor: '#2563eb',
            color: '#fff', border: 'none', borderRadius: '0.375rem',
            fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.3rem'
          }}>
            <Plus size={14} />
            Запись
          </button>
        </div>
      </div>

      {/* Week Days */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '0.5rem',
        border: '1px solid #e5e7eb', padding: '0.5rem',
        marginBottom: '0.75rem', display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.375rem'
      }}>
        {weekDays.map((day, idx) => {
          const isCurrent = isCurrentDate(day);
          const isCurrentToday = isToday(day);
          
          return (
            <button key={idx} onClick={() => setCurrentDate(new Date(day))} style={{
              padding: '0.5rem 0.25rem',
              backgroundColor: isCurrent ? '#ec4899' : isCurrentToday ? '#fef3c7' : '#f9fafb',
              border: isCurrent ? '2px solid #ec4899' : '1px solid #e5e7eb',
              borderRadius: '0.375rem', cursor: 'pointer'
            }}>
              <div style={{
                fontSize: '0.65rem', fontWeight: '600',
                color: isCurrent ? '#fff' : '#6b7280', marginBottom: '0.125rem'
              }}>
                {DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </div>
              <div style={{
                fontSize: '0.9rem', fontWeight: 'bold',
                color: isCurrent ? '#fff' : '#111827'
              }}>
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '0.5rem',
        border: '1px solid #e5e7eb', overflow: 'hidden',
        flex: 1, display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {TIME_SLOTS.map((slot, slotIdx) => (
            <div key={slotIdx} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr',
              gap: '0', borderBottom: slotIdx !== TIME_SLOTS.length - 1 ? '1px solid #e5e7eb' : 'none',
              minHeight: '50px'
            }}>
              <div style={{
                padding: '0.5rem 0.25rem', backgroundColor: '#f9fafb',
                borderRight: '1px solid #e5e7eb', fontWeight: '600',
                color: '#6b7280', textAlign: 'center', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', gap: '0.25rem', whiteSpace: 'nowrap'
              }}>
                <Clock size={12} />
                {slot.display}
              </div>

              <div onClick={openCreateModal} style={{
                padding: '0.3rem', backgroundColor: '#fff',
                cursor: 'pointer', display: 'flex',
                flexDirection: 'column', gap: '0.2rem', overflow: 'auto'
              }}>
                {getBookingsForSlot(currentDate, slot.hour, slot.minute).map(booking => (
                  <div key={booking.id} onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }} style={{
                    padding: '0.35rem', backgroundColor: statusColors[booking.status]?.bg,
                    color: statusColors[booking.status]?.text,
                    border: `1px solid ${statusColors[booking.status]?.border}`,
                    borderRadius: '0.25rem', fontSize: '0.7rem',
                    cursor: 'pointer', fontWeight: 'bold',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }} title={`${booking.name} - ${booking.service}`}>
                    {booking.name} - {booking.service}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '1rem',
            width: '100%', maxWidth: '500px', maxHeight: '90vh',
            overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                {isEditing ? 'Редактировать запись' : 'Добавить запись'}
              </h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} style={{
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
              }}>×</button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Client Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Клиент *
                </label>
                <div style={{ position: 'relative' }}>
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
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
                  {selectedClient && (
                    <div style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)', display: 'flex',
                      alignItems: 'center', gap: '0.5rem'
                    }}>
                      <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
                      <button
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearch('');
                        }}
                        style={{
                          backgroundColor: 'transparent', border: 'none',
                          cursor: 'pointer', padding: 0
                        }}
                      >
                        <X style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                      </button>
                    </div>
                  )}
                  {showClientDropdown && !selectedClient && clientSearch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      marginTop: '0.5rem', backgroundColor: '#fff',
                      border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      maxHeight: '300px', overflowY: 'auto', zIndex: 10
                    }}>
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
                            style={{
                              width: '100%', padding: '0.75rem 1rem',
                              textAlign: 'left', border: 'none',
                              backgroundColor: '#fff', cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex', alignItems: 'center', gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                          >
                            <div style={{
                              width: '40px', height: '40px',
                              backgroundColor: '#fce7f3', borderRadius: '50%',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#ec4899',
                              fontWeight: '500', fontSize: '0.875rem', flexShrink: 0
                            }}>
                              {(client.display_name || 'N').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111' }}>
                                {client.display_name}
                              </div>
                              {client.phone && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                          Клиенты не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Услуга *
                </label>
                <div style={{ position: 'relative' }}>
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
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
                  {selectedService && (
                    <div style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)', display: 'flex',
                      alignItems: 'center', gap: '0.5rem'
                    }}>
                      <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
                      <button
                        onClick={() => {
                          setSelectedService(null);
                          setServiceSearch('');
                        }}
                        style={{
                          backgroundColor: 'transparent', border: 'none',
                          cursor: 'pointer', padding: 0
                        }}
                      >
                        <X style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                      </button>
                    </div>
                  )}
                  {showServiceDropdown && !selectedService && serviceSearch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      marginTop: '0.5rem', backgroundColor: '#fff',
                      border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      maxHeight: '300px', overflowY: 'auto', zIndex: 10
                    }}>
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
                            style={{
                              width: '100%', padding: '0.75rem 1rem',
                              textAlign: 'left', border: 'none',
                              backgroundColor: '#fff', cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111' }}>
                                  {service.name_ru}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {service.category}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ec4899' }}>
                                {service.price} {service.currency}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                          Услуги не найдены
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Master Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Мастер
                </label>
                <select
                  value={addForm.master}
                  onChange={(e) => setAddForm({ ...addForm, master: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontSize: '0.95rem', boxSizing: 'border-box',
                    backgroundColor: '#fff', cursor: 'pointer'
                  }}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Телефон {!selectedClient?.phone && '*'}
                </label>
                <input
                  type="tel"
                  placeholder="+971 50 123 4567"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Дата *
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Время *
                  </label>
                  <select
                    value={addForm.time}
                    onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box',
                      backgroundColor: '#fff', cursor: 'pointer'
                    }}
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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  Сумма (AED)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.revenue}
                  onChange={(e) => setAddForm({ ...addForm, revenue: Number(e.target.value) })}
                  style={{
                    width: '100%', padding: '0.75rem',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  disabled={addingBooking}
                  style={{
                    flex: 1, padding: '0.75rem',
                    backgroundColor: '#f3f4f6', border: '1px solid #d1d5db',
                    borderRadius: '0.5rem', cursor: 'pointer',
                    fontWeight: '500', color: '#374151'
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveBooking}
                  disabled={addingBooking}
                  style={{
                    flex: 1, padding: '0.75rem',
                    backgroundColor: '#ec4899', border: 'none',
                    borderRadius: '0.5rem', color: '#fff',
                    fontWeight: '500', cursor: addingBooking ? 'not-allowed' : 'pointer',
                    opacity: addingBooking ? 0.5 : 1
                  }}
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
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '1rem',
            width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
            maxHeight: '90vh', overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, backgroundColor: '#fff'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                Запись #{selectedBooking.id}
              </h3>
              <button onClick={() => setSelectedBooking(null)} style={{
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
              }}>
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Клиент
                </label>
                <input type="text" value={selectedBooking.name} readOnly style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.5rem', backgroundColor: '#f9fafb',
                  fontSize: '0.95rem', boxSizing: 'border-box'
                }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Услуга
                </label>
                <input type="text" value={selectedBooking.service} readOnly style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.5rem', backgroundColor: '#f9fafb',
                  fontSize: '0.95rem', boxSizing: 'border-box'
                }} />
              </div>

              {selectedBooking.master && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Мастер
                  </label>
                  <input type="text" value={selectedBooking.master} readOnly style={{
                    width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '0.5rem', backgroundColor: '#f9fafb',
                    fontSize: '0.95rem', boxSizing: 'border-box'
                  }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Телефон
                </label>
                <input type="tel" value={selectedBooking.phone} readOnly style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.5rem', backgroundColor: '#f9fafb',
                  fontSize: '0.95rem', boxSizing: 'border-box'
                }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Дата и время
                </label>
                <input type="text" value={new Date(selectedBooking.datetime).toLocaleString('ru-RU', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })} readOnly style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.5rem', backgroundColor: '#f9fafb',
                  fontSize: '0.95rem', boxSizing: 'border-box'
                }} />
              </div>

              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                  width: '100%', padding: '0.75rem 1rem',
                  backgroundColor: statusColors[selectedBooking.status]?.bg,
                  borderRadius: '0.5rem',
                  border: `2px solid ${statusColors[selectedBooking.status]?.border}`,
                  color: statusColors[selectedBooking.status]?.text,
                  fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem',
                  boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span>{statusLabels[selectedBooking.status]}</span>
                  <span>▼</span>
                </button>

                {showStatusDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    marginTop: '0.5rem', backgroundColor: '#fff',
                    border: '2px solid #e5e7eb', borderRadius: '0.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    zIndex: 10000, overflow: 'hidden'
                  }}>
                    {statuses.map(status => (
                      <button key={status} onClick={() => handleChangeStatus(status)} style={{
                        width: '100%', padding: '0.875rem 1rem', textAlign: 'left',
                        border: 'none',
                        backgroundColor: selectedBooking.status === status ? statusColors[status]?.bg : '#fff',
                        borderBottom: status !== statuses[statuses.length - 1] ? '1px solid #e5e7eb' : 'none',
                        cursor: 'pointer', color: statusColors[status]?.text,
                        fontWeight: selectedBooking.status === status ? 'bold' : 'normal',
                        fontSize: '0.95rem'
                      }}>
                        {statusLabels[status]}
                        {selectedBooking.status === status && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button onClick={() => handleDeleteBooking(selectedBooking)} style={{
                  flex: 1, padding: '0.75rem', backgroundColor: '#fee2e2',
                  border: '2px solid #fca5a5', borderRadius: '0.5rem',
                  color: '#991b1b', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', fontSize: '0.95rem'
                }}>
                  <Trash2 size={16} />
                  Удалить
                </button>
                
                <button onClick={() => {
                  setSelectedBooking(null);
                  openEditModal(selectedBooking);
                }} style={{
                  flex: 1, padding: '0.75rem', backgroundColor: '#dbeafe',
                  border: '2px solid #93c5fd', borderRadius: '0.5rem',
                  color: '#1e40af', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', fontSize: '0.95rem'
                }}>
                  <Edit size={16} />
                  Изменить
                </button>
              </div>

              <button onClick={() => setSelectedBooking(null)} style={{
                padding: '0.75rem', backgroundColor: '#2563eb',
                border: 'none', borderRadius: '0.5rem', color: '#fff',
                fontWeight: '500', cursor: 'pointer', marginTop: '0.5rem'
              }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}