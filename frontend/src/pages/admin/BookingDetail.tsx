// /frontend/src/pages/admin/BookingDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Phone, User, Briefcase, Clock, Edit2, CalendarDays, ChevronDown, Save, X, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CallHistorySection } from '../../components/bookings/CallHistorySection';

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
  user_id?: number | string;
  notes?: string;
}

interface User {
  id: number;
  username: string;
  full_name?: string;
  full_name_ru?: string;
  role: string;
  position?: string;
  position_ru?: string;
}

interface Service {
  id: number;
  name: string;
  name_ru?: string;
  service_key: string;
  price?: number;
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [masters, setMasters] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation(['admin/bookingdetail', 'common', 'bookings', 'admin/services']);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [chartPeriod, setChartPeriod] = useState('30');
  const [chartDateFrom, setChartDateFrom] = useState('');
  const [chartDateTo, setChartDateTo] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Booking> & { notes?: string, time?: string, date?: string }>({});

  useEffect(() => {
    if (booking) {
      const dt = new Date(booking.datetime);
      const dateStr = dt.toISOString().split('T')[0];
      const timeStr = dt.toTimeString().slice(0, 5);

      setEditForm({
        ...booking,
        date: dateStr,
        time: timeStr
        // Notes will be added here once backend provides it, for now locally managed
      });
    }
  }, [booking]);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      // Загружаем букинги, пользователей и услуги
      const [bookingsResponse, usersResponse, servicesResponse] = await Promise.all([
        apiClient.getBookings(),
        apiClient.getUsers(i18n.language),
        apiClient.getServices(true, i18n.language)
      ]);

      const found = bookingsResponse.bookings.find((b: Booking) => b.id === parseInt(id!));
      setAllBookings(bookingsResponse.bookings || []);
      const usersData = Array.isArray(usersResponse) ? usersResponse : (usersResponse.users || []);
      setMasters(usersData);
      const servicesData = Array.isArray(servicesResponse) ? servicesResponse : (servicesResponse.services || []);
      setServices(servicesData);

      if (found) {
        setBooking(found);
        setNewStatus(found.status);
      } else {
        toast.error(t('bookingdetail:not_found'));
        navigate('/crm/bookings');
      }
    } catch (err) {
      console.error('Error loading booking:', err);
      toast.error(t('common:loading_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!booking || !editForm) return;

    try {
      setUpdating(true);

      const payload = {
        date: editForm.date,
        time: editForm.time,
        service: editForm.service,
        master: editForm.master,
        revenue: editForm.revenue,
        notes: editForm.notes
      };

      await apiClient.updateBookingDetails(booking.id, payload);

      toast.success(t('common:saved', 'Сохранено'));
      setIsEditing(false);
      loadBooking(); // Reload to get fresh data
    } catch (error) {
      console.error('Error updating details:', error);
      toast.error(t('common:error_occurred', 'Ошибка сохранения'));
    } finally {
      setUpdating(false);
    }
  };

  const masterInfo = booking?.master
    ? masters.find(m =>
      (m.username && booking.master && m.username.toLowerCase() === booking.master.toLowerCase()) ||
      (m.full_name && booking.master && m.full_name.toLowerCase() === booking.master.toLowerCase()) ||
      (m.full_name_ru && booking.master && m.full_name_ru.toLowerCase() === booking.master.toLowerCase())
    )
    : null;

  const masterName = (i18n.language.startsWith('ru') && masterInfo?.full_name_ru) ? masterInfo.full_name_ru : (masterInfo?.full_name || booking?.master || t('common:not_specified'));

  const getChartData = (type: 'service' | 'master') => {
    if (!booking || !allBookings.length) return [];

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (chartPeriod === 'custom') {
      if (!chartDateFrom || !chartDateTo) return [];
      startDate = new Date(chartDateFrom);
      endDate = new Date(chartDateTo);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const periodDays = parseInt(chartPeriod);
      startDate = new Date();
      startDate.setDate(now.getDate() - periodDays);
      startDate.setHours(0, 0, 0, 0);
    }

    const filtered = allBookings.filter(b => {
      const bDate = new Date(b.datetime || b.created_at);
      const matchesPeriod = bDate >= startDate && bDate <= endDate;

      if (!matchesPeriod) return false;

      if (type === 'service') {
        const bService = (b.service || '').toLowerCase().trim();
        const targetService = (booking.service || '').toLowerCase().trim();
        return bService === targetService;
      } else {
        const bMaster = (b.master || '').toLowerCase().trim();
        const targetMaster = (booking.master || '').toLowerCase().trim();
        // Also check if master's full name matches
        const bMasterInfo = masters.find(m =>
          (m.username && bMaster && m.username.toLowerCase() === bMaster) ||
          (m.full_name && bMaster && m.full_name.toLowerCase() === bMaster)
        );
        const targetMasterInfo = masterInfo;

        return bMaster === targetMaster ||
          (bMasterInfo && targetMasterInfo && bMasterInfo.username === targetMasterInfo.username) ||
          (bMasterInfo && targetMasterInfo && bMasterInfo.full_name_ru === targetMasterInfo.full_name_ru && bMasterInfo.full_name_ru);
      }
    });

    // Group by day
    const entries: Record<string, number> = {};
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Limit to reasonable amount of points
    const maxPoints = 90;
    const step = daysDiff > maxPoints ? Math.ceil(daysDiff / maxPoints) : 1;

    for (let i = 0; i <= daysDiff; i += step) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      entries[key] = 0;
    }

    filtered.forEach(b => {
      const key = new Date(b.datetime || b.created_at).toISOString().split('T')[0];
      // If key is not exactly in our steps, find the closest one or just add it if within range
      if (entries[key] !== undefined) {
        entries[key]++;
      } else {
        // Find closest step
        const bDate = new Date(key);
        let closestKey = '';
        let minDiff = Infinity;
        Object.keys(entries).forEach(k => {
          const diff = Math.abs(new Date(k).getTime() - bDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestKey = k;
          }
        });
        if (closestKey && minDiff < (step * 24 * 60 * 60 * 1000)) {
          entries[closestKey]++;
        }
      }
    });

    return Object.entries(entries).map(([date, count]) => ({
      date: date.split('-').slice(1).join('.'),
      count
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleStatusUpdate = async () => {
    if (!booking || !newStatus) return;

    try {
      setUpdating(true);
      await apiClient.updateBookingStatus(booking.id, newStatus);
      toast.success(t('bookingdetail:status_updated'));
      setBooking({ ...booking, status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(t('bookingdetail:error_updating_status'));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{t('not_found')}</p>
          <Button onClick={() => navigate('/crm/bookings')}>
            ← {t('common:back_to_bookings')}
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/crm/bookings')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl text-gray-900">{t('booking_number')} {booking.id}</h1>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 rounded-lg"
              >
                <Pencil className="w-4 h-4 mr-2" />
                {t('common:edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('common:cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDetails}
                  disabled={updating}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('common:save')}
                </Button>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-2">{t('detailed_info')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('booking_info')}</h2>

            <div className="space-y-6">
              {/* Client */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('client')}</p>
                  <p className="text-lg text-gray-900 font-medium">{booking.name}</p>
                  <button
                    onClick={() => navigate(`/crm/clients/${booking.client_id}`)}
                    className="text-sm text-pink-600 hover:underline mt-1 font-mono"
                  >
                    @{booking.client_id}
                  </button>
                </div>
              </div>

              {/* Client Stats (New) */}
              {(() => {
                const clientBookings = allBookings.filter(b => b.client_id === booking.client_id && b.status === 'completed');
                const totalVisits = clientBookings.length;
                const totalSpent = clientBookings.reduce((sum, b) => sum + (b.revenue || 0), 0);

                if (totalVisits > 0) {
                  return (
                    <div className="ml-16 mt-[-10px] flex gap-4 text-xs text-gray-500">
                      <div className="bg-pink-50 text-pink-700 px-2 py-1 rounded-md font-medium">
                        {totalVisits} {t('visits', 'посещений')}
                      </div>
                      <div className="bg-green-50 text-green-700 px-2 py-1 rounded-md font-medium">
                        {t('total_spent', 'Всего потрачено')}: {totalSpent} {t('currency')}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Service */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('service')}</p>
                  {isEditing ? (
                    <Select
                      value={editForm.service}
                      onValueChange={(val) => {
                        const s = services.find(srv => srv.name === val || srv.service_key === val);
                        setEditForm({ ...editForm, service: val, revenue: s ? s.price : editForm.revenue });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('bookings:select_service')} />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.name}>
                            {i18n.language.startsWith('ru') && s.name_ru ? s.name_ru : s.name} ({s.price} {t('currency')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (

                    <p
                      className="text-lg text-gray-900 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => navigate('/crm/bookings')}
                      title={t('common:view_bookings', 'Посмотреть записи')}
                    >
                      {(() => {
                        const serviceName = (booking.service || '').trim();
                        const s = services.find(serv => serv.name === serviceName || serv.service_key === serviceName || serv.name_ru === serviceName);
                        if (i18n.language.startsWith('ru') && s?.name_ru) {
                          return s.name_ru;
                        }

                        // Try translating with explicit namespace alias 'services'
                        let translated = t(`services:${serviceName}`, { defaultValue: '' });
                        if (!translated) {
                          translated = t(`admin/services:${serviceName}`, { defaultValue: '' });
                        }

                        if (translated) return translated;

                        return serviceName;
                      })()}
                    </p>
                  )}

                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">{t('date_time')}</p>
                    <p
                      className="text-lg text-gray-900 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => navigate('/crm/calendar')}
                      title={t('common:view_calendar', 'Перейти в календарь')}
                    >
                      {formatDate(booking.datetime)}
                    </p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('phone')}</p>
                  <p className="text-lg text-gray-900 font-medium">{booking.phone}</p>
                </div>
              </div>

              {/* Revenue */}
              {booking.revenue > 0 && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('revenue')}</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editForm.revenue}
                        onChange={(e) => setEditForm({ ...editForm, revenue: parseFloat(e.target.value) })}
                      />
                    ) : (
                      <p className="text-lg text-gray-900 font-medium">{booking.revenue} {t('currency')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('created_at')}</p>
                  <p className="text-lg text-gray-900 font-medium">{formatDate(booking.created_at)}</p>
                </div>
              </div>

              {/* Master */}
              <div className="flex items-start gap-4 pt-4 border-t border-gray-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('bookings:master', 'Мастер')}</p>
                  {isEditing ? (
                    <Select
                      value={editForm.master}
                      onValueChange={(val) => setEditForm({ ...editForm, master: val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('bookings:select_master')} />
                      </SelectTrigger>
                      <SelectContent>
                        {masters.map(m => (
                          <SelectItem key={m.id} value={m.full_name || m.username}>
                            {m.full_name || m.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p
                      className="text-lg text-gray-900 font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => navigate('/crm/staff')}
                      title={t('common:view_staff', 'Перейти к сотрудникам')}
                    >
                      {masterName}
                    </p>
                  )}
                  {(() => {
                    const pos = i18n.language.startsWith('ru') && masterInfo?.position_ru ? masterInfo.position_ru : (masterInfo?.position || '');
                    return pos ? (
                      <p className="text-sm text-indigo-600 font-medium">{pos}</p>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Internal Notes (New) */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t('internal_notes', 'Заметки')}</h3>

                {isEditing ? (
                  <Textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder={t('internal_notes_placeholder', 'Введите заметки здесь...')}
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className={`${booking.notes ? 'bg-yellow-50 border-yellow-100 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-500'} border rounded-lg p-4`}>
                    <p className="text-sm whitespace-pre-wrap">
                      {booking.notes || t('no_notes', 'Нет заметок для этой записи.')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Call History Section */}
          <CallHistorySection bookingId={booking.id} clientId={booking.client_id} />

          {/* Charts Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl text-gray-900">{t('analytics', 'Аналитика')}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] justify-between border-2 border-indigo-50 rounded-xl font-bold text-gray-700 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                        <span>
                          {chartPeriod === '7' ? `7 ${t('days', 'дней')}` :
                            chartPeriod === '30' ? `30 ${t('days', 'дней')}` :
                              chartPeriod === '90' ? `90 ${t('days', 'дней')}` :
                                chartPeriod === 'custom' ? (chartDateFrom && chartDateTo ? `${chartDateFrom} - ${chartDateTo}` : t('custom_range', 'Свой период')) :
                                  t('period', 'Период')}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-indigo-50" align="end">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-2">
                        {['7', '30', '90'].map(p => (
                          <button
                            key={p}
                            onClick={() => setChartPeriod(p)}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${chartPeriod === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                          >
                            <span>{p} {t('days', 'дней')}</span>
                            {chartPeriod === p && <CalendarDays className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{t('custom_range', 'Свой период')}</p>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 ml-1">ОТ</label>
                            <input
                              type="date"
                              value={chartDateFrom}
                              onChange={e => {
                                setChartDateFrom(e.target.value);
                                setChartPeriod('custom');
                              }}
                              className="w-full h-10 px-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-200 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 ml-1">ДО</label>
                            <input
                              type="date"
                              value={chartDateTo}
                              onChange={e => {
                                setChartDateTo(e.target.value);
                                setChartPeriod('custom');
                              }}
                              className="w-full h-10 px-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-200 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {t('service_stats', 'Популярность услуги')}: {booking.service}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('service')}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {t('master_stats', 'Загрузка мастера')}: {masterName}
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('master')}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {t('status')}
            </h3>

            <div className="space-y-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('status_new')}</SelectItem>
                  <SelectItem value="confirmed">{t('status_confirmed')}</SelectItem>
                  <SelectItem value="completed">{t('status_completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('status_cancelled')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === booking.status}
                className="w-full bg-gradient-to-r from-pink-500 to-blue-600"
              >
                {updating ? t('update') : t('update_status')}
              </Button>

              {/* Current Status Badge */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">{t('current_status')}</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${booking.status === 'completed'
                      ? 'bg-green-500'
                      : booking.status === 'cancelled'
                        ? 'bg-red-500'
                        : booking.status === 'confirmed'
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                  ></div>
                  <span className="text-sm text-gray-900 font-medium capitalize">
                    {booking.status === 'new'
                      ? t('status_new')
                      : booking.status === 'confirmed'
                        ? t('status_confirmed')
                        : booking.status === 'completed'
                          ? t('status_completed')
                          : t('status_cancelled')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-lg text-gray-900 mb-4">{t('actions')}</h3>
            <Button
              onClick={() => navigate(`/crm/chat?client_id=${booking.client_id}`)}
              variant="outline"
              className="w-full"
            >
              {t('write_to_client')}
            </Button>
          </div>
        </div>
      </div>
    </div >
  );
}