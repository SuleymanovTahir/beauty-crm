// /frontend/src/pages/admin/BookingDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Phone, User, Briefcase, Clock, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

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
  master?: string; // Added master field
}

interface User {
  username: string;
  full_name?: string;
  role: string;
  position?: string;
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [masters, setMasters] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation(['admin/bookingdetail', 'common', 'bookings']);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [chartPeriod, setChartPeriod] = useState('30');
  const [chartDateFrom, setChartDateFrom] = useState('');
  const [chartDateTo, setChartDateTo] = useState('');

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      // Загружаем букинги и пользователей
      const [bookingsResponse, usersResponse] = await Promise.all([
        apiClient.getBookings(),
        apiClient.getUsers()
      ]);

      const found = bookingsResponse.bookings.find((b: Booking) => b.id === parseInt(id!));
      setAllBookings(bookingsResponse.bookings || []);
      setMasters(usersResponse.users || []);

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

  const masterInfo = booking?.master
    ? masters.find(m =>
      (m.username && booking.master && m.username.toLowerCase() === booking.master.toLowerCase()) ||
      (m.full_name && booking.master && m.full_name.toLowerCase() === booking.master.toLowerCase())
    )
    : null;

  const masterName = masterInfo?.full_name || booking?.master || t('common:not_specified');

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
          (bMasterInfo && targetMasterInfo && bMasterInfo.username === targetMasterInfo.username);
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
      return new Date(dateStr).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
          <h1 className="text-3xl text-gray-900 mb-1">{t('booking_number')} {booking.id}</h1>
          <p className="text-gray-600">{t('detailed_info')}</p>
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
                    className="text-sm text-pink-600 hover:underline mt-1"
                  >
                    {t('client_profile')}
                  </button>
                </div>
              </div>

              {/* Service */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('service')}</p>
                  <p className="text-lg text-gray-900 font-medium">{booking.service}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('date_time')}</p>
                  <p className="text-lg text-gray-900 font-medium">{formatDate(booking.datetime)}</p>
                </div>
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
                    <p className="text-lg text-gray-900 font-medium">{booking.revenue} {t('currency')}</p>
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
                  <p className="text-lg text-gray-900 font-bold">{masterName}</p>
                  {masterInfo?.position && (
                    <p className="text-sm text-indigo-600 font-medium">{masterInfo.position}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl text-gray-900">{t('analytics', 'Аналитика')}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                {['7', '30', '90'].map(p => (
                  <Button
                    key={p}
                    variant={chartPeriod === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartPeriod(p)}
                    className={chartPeriod === p ? 'bg-indigo-600' : ''}
                  >
                    {p} {t('days', 'дней')}
                  </Button>
                ))}
                <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-gray-50">
                  <input
                    type="date"
                    value={chartDateFrom}
                    onChange={e => {
                      setChartDateFrom(e.target.value);
                      setChartPeriod('custom');
                    }}
                    className="text-[10px] focus:outline-none bg-transparent"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={chartDateTo}
                    onChange={e => {
                      setChartDateTo(e.target.value);
                      setChartPeriod('custom');
                    }}
                    className="text-[10px] focus:outline-none bg-transparent"
                  />
                </div>
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
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
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
    </div>
  );
}