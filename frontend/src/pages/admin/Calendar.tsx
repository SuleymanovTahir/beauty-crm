import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Получаем часы работы из конфига (по умолчанию 9:00 - 21:00)
const SALON_START_HOUR = 9;
const SALON_END_HOUR = 21;

// Генерируем часы + 30 минут
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
  new: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидание',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена'
};

export default function Calendar() {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date(today));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [form, setForm] = useState({ name: '', service: '', phone: '', date: '', time: '' });
  
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Генерируем 7 дней вокруг текущей даты (3 дня до, текущий, 3 дня после)
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

  // ✅ НОВОЕ: Получить количество записей на конкретный день
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

  // ✅ ИСПРАВЛЕНО: Переключение на сегодня с красивым тостом
  const handleToday = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    setCurrentDate(todayDate);
    
    const todayBookings = getBookingsForDay(todayDate);
    
    // Красивый toast с разными сообщениями
    if (todayBookings.length === 0) {
      toast.success('📅 Сегодня записей нет - свободный день! 🎉', {
        duration: 3000,
      });
    } else if (todayBookings.length === 1) {
      toast.success(`📅 Одна запись на сегодня ⏰`, {
        duration: 3000,
      });
    } else {
      toast.success(`📅 ${todayBookings.length} записей на сегодня 🔥`, {
        duration: 3000,
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!form.name || !form.service || !form.phone || !form.date || !form.time) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      await api.createBooking({
        name: form.name,
        service: form.service,
        phone: form.phone,
        date: form.date,
        time: form.time,
        instagram_id: Date.now().toString(),
      });
      toast.success('Запись создана');
      setShowCreateModal(false);
      setForm({ name: '', service: '', phone: '', date: '', time: '' });
      await loadBookings();
    } catch (err) {
      toast.error('Ошибка создания');
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

  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isCurrentDate = (date: Date) => date.toDateString() === currentDate.toDateString();

  return (
    <div style={{ padding: '1rem 2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
          Календарь
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{bookings.length} записей</p>
      </div>

      {/* Top Toolbar */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Left: Navigation */}
        <button
          onClick={handlePrevDay}
          style={{
            width: '36px',
            height: '36px',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <ChevronLeft size={18} color="#6b7280" />
        </button>

        {/* Center: Current Date */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.3rem',
          minWidth: '140px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#ec4899',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            {isToday(currentDate) ? (
              <>
                <CalendarIcon size={14} />
                СЕГОДНЯ
              </>
            ) : (
              DAYS[currentDate.getDay()]
            )}
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            {currentDate.getDate()}
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
        </div>

        {/* Right: Navigation */}
        <button
          onClick={handleNextDay}
          style={{
            width: '36px',
            height: '36px',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <ChevronRight size={18} color="#6b7280" />
        </button>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleToday}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#fff',
              border: '2px solid #ec4899',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#ec4899',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ec4899';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.color = '#ec4899';
            }}
          >
            Сегодня
          </button>

          <button
            onClick={() => {
              setForm({
                name: '',
                service: '',
                phone: '',
                date: currentDate.toISOString().split('T')[0],
                time: TIME_SLOTS[0].display
              });
              setShowCreateModal(true);
            }}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <Plus size={16} />
            Событие
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '0.75rem',
        marginBottom: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.5rem'
      }}>
        {weekDays.map((day, idx) => {
          const isCurrent = isCurrentDate(day);
          const isCurrentToday = isToday(day);
          
          return (
            <button
              key={idx}
              onClick={() => setCurrentDate(new Date(day))}
              style={{
                padding: '0.75rem 0.5rem',
                backgroundColor: isCurrent ? '#ec4899' : isCurrentToday ? '#fef3c7' : '#f9fafb',
                border: isCurrent ? '2px solid #ec4899' : '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.backgroundColor = isCurrentToday ? '#fef3c7' : '#f9fafb';
                }
              }}
            >
              <div style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                color: isCurrent ? '#fff' : '#6b7280',
                marginBottom: '0.25rem'
              }}>
                {DAYS[day.getDay()]}
              </div>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 'bold',
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
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {/* Time Slots */}
        <div style={{ maxHeight: 'calc(100vh - 450px)', overflow: 'auto' }}>
          {TIME_SLOTS.map((slot, slotIdx) => (
            <div
              key={slotIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '0',
                borderBottom: '1px solid #e5e7eb',
                minHeight: '60px'
              }}
            >
              {/* Time Label */}
              <div style={{
                padding: '0.75rem 0.5rem',
                backgroundColor: '#f9fafb',
                borderRight: '1px solid #e5e7eb',
                fontWeight: '600',
                color: '#6b7280',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                gap: '0.25rem',
                whiteSpace: 'nowrap'
              }}>
                <Clock size={14} />
                {slot.display}
              </div>

              {/* Bookings for this slot */}
              <div
                onClick={() => {
                  setForm({
                    name: '',
                    service: '',
                    phone: '',
                    date: currentDate.toISOString().split('T')[0],
                    time: slot.display
                  });
                  setShowCreateModal(true);
                }}
                style={{
                  padding: '0.4rem',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  overflow: 'auto'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                {getBookingsForSlot(currentDate, slot.hour, slot.minute).map(booking => (
                  <div
                    key={booking.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBooking(booking);
                    }}
                    style={{
                      padding: '0.4rem',
                      backgroundColor: statusColors[booking.status]?.bg,
                      color: statusColors[booking.status]?.text,
                      border: `1px solid ${statusColors[booking.status]?.border}`,
                      borderRadius: '0.3rem',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={booking.name}
                  >
                    {booking.name} - {booking.service}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                Создать событие
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Имя клиента"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              <input
                type="text"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                placeholder="Услуга"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Телефон"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              {/* Time Selector */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Время
                </label>
                <select
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  {TIME_SLOTS.map((slot, idx) => (
                    <option key={idx} value={slot.display}>
                      {slot.display}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateEvent}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                Запись #{selectedBooking.id}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Клиент
                </label>
                <input
                  type="text"
                  value={selectedBooking.name}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Услуга
                </label>
                <input
                  type="text"
                  value={selectedBooking.service}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={selectedBooking.phone}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: statusColors[selectedBooking.status]?.bg,
                    borderRadius: '0.5rem',
                    border: `2px solid ${statusColors[selectedBooking.status]?.border}`,
                    color: statusColors[selectedBooking.status]?.text,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <span>{statusLabels[selectedBooking.status]}</span>
                  <span style={{ marginLeft: '0.5rem' }}>▼</span>
                </button>

                {showStatusDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    backgroundColor: '#fff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    zIndex: 10000,
                    overflow: 'hidden'
                  }}>
                    {statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          handleChangeStatus(status);
                          setShowStatusDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          textAlign: 'left',
                          border: 'none',
                          backgroundColor: selectedBooking.status === status ? statusColors[status]?.bg : '#fff',
                          borderBottom: status !== statuses[statuses.length - 1] ? '1px solid #e5e7eb' : 'none',
                          cursor: 'pointer',
                          color: statusColors[status]?.text,
                          fontWeight: selectedBooking.status === status ? 'bold' : 'normal',
                          fontSize: '0.95rem',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = statusColors[status]?.bg}
                        onMouseLeave={(e) => {
                          if (selectedBooking.status !== status) {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }
                        }}
                      >
                        {statusLabels[status]}
                        {selectedBooking.status === status && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
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