import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
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

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i);

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [form, setForm] = useState({ name: '', service: '', phone: '', datetime: '' });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(false);
      const data = await api.getBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      toast.error('Ошибка загрузки');
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const date = new Date(currentDate);
    const day = date.getDay() || 7;
    const diff = date.getDate() - day + 1;
    const monday = new Date(date.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getBookingsForSlot = (day: Date, hour: number) => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.datetime);
      return bookingDate.toDateString() === day.toDateString() && 
             bookingDate.getHours() === hour;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  const handleChangeMonth = (newMonth: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
  };

  const handleChangeYear = (newYear: number) => {
    setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
  };

  const handleCreateEvent = async () => {
    if (!form.name || !form.service || !form.phone || !form.datetime) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      const [date, time] = form.datetime.split('T');
      await api.createBooking({
        name: form.name,
        service: form.service,
        phone: form.phone,
        date,
        time,
        instagram_id: Date.now().toString(),
      });
      toast.success('Запись создана');
      setShowCreateModal(false);
      setForm({ name: '', service: '', phone: '', datetime: '' });
      setSelectedSlot(null);
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

  const weekDays = getWeekDays();
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Календарь
        </h1>
        <p style={{ color: '#6b7280' }}>{bookings.length} записей</p>
      </div>

      {/* Toolbar */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => handlePrevWeek()}
            style={{
              width: '40px',
              height: '40px',
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
            <ChevronLeft size={20} color="#6b7280" />
          </button>

          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', minWidth: '200px', textAlign: 'center' }}>
            {firstDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {lastDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </h2>

          <button
            type="button"
            onClick={() => handleNextWeek()}
            style={{
              width: '40px',
              height: '40px',
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
            <ChevronRight size={20} color="#6b7280" />
          </button>
        </div>

        {/* Selectors and Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Month Selector */}
          <select
            value={currentDate.getMonth()}
            onChange={(e) => handleChangeMonth(parseInt(e.target.value))}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={currentDate.getFullYear()}
            onChange={(e) => handleChangeYear(parseInt(e.target.value))}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            {Array.from({ length: 20 }, (_, i) => currentDate.getFullYear() - 10 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={handleToday}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
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
            Сегодня
          </button>

          <button
            onClick={() => {
              setForm({ name: '', service: '', phone: '', datetime: new Date().toISOString().slice(0, 16) });
              setShowCreateModal(true);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <Plus size={18} />
            Событие
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {/* Header with Days */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '0', borderBottom: '2px solid #e5e7eb' }}>
          <div style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#6b7280', backgroundColor: '#f9fafb' }}></div>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem',
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#111827',
                backgroundColor: day.toDateString() === new Date().toDateString() ? '#fef3c7' : '#fff',
                borderRight: '1px solid #e5e7eb'
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{DAYS[idx]}</div>
              <div style={{ fontSize: '1.125rem' }}>{day.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Hours Grid */}
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
          {HOURS.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '0', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{
                padding: '0.5rem',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRight: '1px solid #e5e7eb',
                fontWeight: '500'
              }}>
                {hour}:00
              </div>

              {weekDays.map((day, dayIdx) => {
                const dayBookings = getBookingsForSlot(day, hour);
                return (
                  <div
                    key={dayIdx}
                    onClick={() => {
                      setForm({
                        name: '',
                        service: '',
                        phone: '',
                        datetime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0).toISOString().slice(0, 16)
                      });
                      setShowCreateModal(true);
                    }}
                    style={{
                      minHeight: '80px',
                      padding: '0.5rem',
                      borderRight: '1px solid #e5e7eb',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    {dayBookings.map(booking => (
                      <div
                        key={booking.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                        }}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: statusColors[booking.status]?.bg,
                          color: statusColors[booking.status]?.text,
                          border: `1px solid ${statusColors[booking.status]?.border}`,
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={booking.name}
                      >
                        {booking.name} - {booking.service_name}
                      </div>
                    ))}
                  </div>
                );
              })}
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
            maxWidth: '400px',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>Создать событие</h3>
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
                type="datetime-local"
                value={form.datetime}
                onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

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
            maxWidth: '400px',
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>Клиент</label>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>Услуга</label>
                <input
                  type="text"
                  value={selectedBooking.service_name}
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>Телефон</label>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>Дата и время</label>
                <input
                  type="datetime-local"
                  value={selectedBooking.datetime.slice(0, 16)}
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