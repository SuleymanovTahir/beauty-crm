import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, MessageSquare, Eye, Loader, RefreshCw, AlertCircle, Plus, Trash2, X, Check } from 'lucide-react';

const api = {
  baseURL: 'http://localhost:8000',
  
  async getBookings() {
    const res = await fetch(`${this.baseURL}/api/bookings`, { credentials: 'include' });
    return res.json();
  },
  
  async getClients() {
    const res = await fetch(`${this.baseURL}/api/clients`, { credentials: 'include' });
    return res.json();
  },
  
  async getServices() {
    const res = await fetch(`${this.baseURL}/api/services`, { credentials: 'include' });
    return res.json();
  },
  
  async createBooking(data) {
    const res = await fetch(`${this.baseURL}/api/bookings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  async updateBookingStatus(id, status) {
    const res = await fetch(`${this.baseURL}/api/bookings/${id}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  }
};

const statusConfig = {
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Подтверждена', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-800' },
  new: { label: 'Новая', color: 'bg-purple-100 text-purple-800' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  
  // Автокомплит состояния
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  const [addForm, setAddForm] = useState({
    phone: '',
    date: '',
    time: '',
    revenue: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = bookings.filter(booking => {
      const matchesSearch = 
        (booking.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsData, clientsData, servicesData] = await Promise.all([
        api.getBookings(),
        api.getClients(),
        api.getServices()
      ]);
      
      setBookings(bookingsData.bookings || []);
      setClients(clientsData.clients || []);
      setServices(servicesData.services || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateBookingStatus(id, newStatus);
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (err) {
      alert('Ошибка обновления статуса');
    }
  };

  const handleAddBooking = async () => {
    if (!selectedClient || !selectedService || !addForm.date || !addForm.time) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      setAddingBooking(true);
      await api.createBooking({
        instagram_id: selectedClient.instagram_id,
        name: selectedClient.display_name,
        phone: addForm.phone || selectedClient.phone,
        service: selectedService.name_ru,
        date: addForm.date,
        time: addForm.time,
        revenue: addForm.revenue || selectedService.price,
      });

      alert('Запись создана ✅');
      setShowAddDialog(false);
      resetForm();
      await loadData();
    } catch (err) {
      alert(`❌ Ошибка: ${err.message}`);
    } finally {
      setAddingBooking(false);
    }
  };

  const resetForm = () => {
    setClientSearch('');
    setServiceSearch('');
    setSelectedClient(null);
    setSelectedService(null);
    setAddForm({ phone: '', date: '', time: '', revenue: 0 });
  };

  const filteredClients = clients.filter(c =>
    (c.display_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const filteredServices = services.filter(s =>
    (s.name_ru || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const formatDateTime = (datetime) => {
    try {
      const date = new Date(datetime);
      return date.toLocaleDateString('ru-RU') + ' ' + 
             date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return datetime;
    }
  };

  const stats = {
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'new').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.revenue || 0), 0)
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader style={{ width: '32px', height: '32px', color: '#ec4899', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '0.5rem', padding: '1rem' }}>
          <AlertCircle style={{ color: '#c00' }} />
          <p style={{ color: '#800', marginTop: '0.5rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar style={{ width: '32px', height: '32px', color: '#ec4899' }} />
            Управление записями
          </h1>
          <p style={{ color: '#666' }}>{filteredBookings.length} записей</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #ddd',
          borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <RefreshCw style={{ width: '16px', height: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Обновить
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ожидают</p>
          <h3 style={{ fontSize: '1.875rem', color: '#eab308', fontWeight: 'bold' }}>{stats.pending}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Завершённых</p>
          <h3 style={{ fontSize: '1.875rem', color: '#3b82f6', fontWeight: 'bold' }}>{stats.completed}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Всего</p>
          <h3 style={{ fontSize: '1.875rem', color: '#111', fontWeight: 'bold' }}>{stats.total}</h3>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Доход</p>
          <h3 style={{ fontSize: '1.875rem', color: '#10b981', fontWeight: 'bold' }}>{stats.revenue} AED</h3>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
            padding: '0.625rem 2.5rem 0.625rem 0.75rem', border: '1px solid #d1d5db',
            borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer',
            backgroundColor: '#fff', minWidth: '150px'
          }}>
            <option value="all">Все статусы</option>
            <option value="new">Новая</option>
            <option value="pending">Ожидает</option>
            <option value="confirmed">Подтверждена</option>
            <option value="completed">Завершена</option>
            <option value="cancelled">Отменена</option>
          </select>
          <button onClick={() => setShowAddDialog(true)} style={{
            padding: '0.625rem 1.25rem', backgroundColor: '#ec4899', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: '500', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '0.5rem'
          }}>
            <Plus style={{ width: '16px', height: '16px' }} />
            Добавить
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredBookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>ID</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Клиент</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Услуга</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Дата</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Телефон</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Статус</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking, idx) => (
                  <tr key={booking.id} style={{ borderBottom: idx !== filteredBookings.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111', fontWeight: '500' }}>#{booking.id}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', backgroundColor: '#fce7f3',
                          borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#ec4899', fontWeight: '500', fontSize: '0.875rem'
                        }}>
                          {(booking.name || 'N').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.875rem', color: '#111' }}>{booking.name || 'Без имени'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>{booking.service_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111' }}>{formatDateTime(booking.datetime)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>{booking.phone || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <select
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          ...( statusConfig[booking.status] ? {
                            backgroundColor: statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('yellow') ? '#fef3c7' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('green') ? '#d1fae5' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('blue') ? '#dbeafe' :
                                             statusConfig[booking.status].color.split(' ')[0].replace('bg-', '').includes('red') ? '#fee2e2' : '#f3f4f6',
                            color: statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('yellow') ? '#92400e' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('green') ? '#065f46' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('blue') ? '#1e40af' :
                                   statusConfig[booking.status].color.split(' ')[1].replace('text-', '').includes('red') ? '#991b1b' : '#374151'
                          } : {})
                        }}
                      >
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Eye style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/chat?client_id=${booking.client_id}`)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <MessageSquare style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#9ca3af' }}>
            <Calendar style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.125rem' }}>Записи не найдены</p>
          </div>
        )}
      </div>

      {/* Add Booking Dialog */}
      {showAddDialog && (
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
            {/* Header */}
            <div style={{
              padding: '1.5rem', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                Добавить запись
              </h3>
              <button onClick={() => { setShowAddDialog(false); resetForm(); }} style={{
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: '#6b7280', fontSize: '1.5rem'
              }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Client Autocomplete */}
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
                        filteredClients.map(client => (
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
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
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

              {/* Service Autocomplete */}
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
                        filteredServices.map(service => (
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
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
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

              {/* Date & Time */}
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
                  <input
                    type="time"
                    value={addForm.time}
                    onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem',
                      border: '1px solid #d1d5db', borderRadius: '0.5rem',
                      fontSize: '0.95rem', boxSizing: 'border-box'
                    }}
                  />
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
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex', gap: '0.75rem'
            }}>
              <button
                onClick={() => { setShowAddDialog(false); resetForm(); }}
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
                onClick={handleAddBooking}
                disabled={addingBooking}
                style={{
                  flex: 1, padding: '0.75rem',
                  backgroundColor: '#ec4899', border: 'none',
                  borderRadius: '0.5rem', color: '#fff',
                  fontWeight: '500', cursor: addingBooking ? 'not-allowed' : 'pointer',
                  opacity: addingBooking ? 0.5 : 1
                }}
              >
                {addingBooking ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}