import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Phone, User, Briefcase, Clock, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';

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

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(['admin/bookingdetail', 'common']);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      // Попробуем загрузить напрямую из всех букингов
      const response = await apiClient.getBookings();
      const found = response.bookings.find((b: Booking) => b.id === parseInt(id!));
      
      if (found) {
        setBooking(found);
        setNewStatus(found.status);
      } else {
        toast.error(t('bookingdetail:not_found'));
        navigate('/admin/bookings');
      }
    } catch (err) {
      console.error('Error loading booking:', err);
      toast.error(t('common:loading_error'));
    } finally {
      setLoading(false);
    }
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
          <Button onClick={() => navigate('/admin/bookings')}>
            ← {t('common:back_to_bookings')}
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
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
          onClick={() => navigate('/admin/bookings')}
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
                    onClick={() => navigate(`/admin/clients/${booking.client_id}`)}
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

              {/* Master */}
              {booking.master && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('master')}</p>
                    <p className="text-lg text-gray-900 font-medium">{booking.master}</p>
                  </div>
                </div>
              )}

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
                    <p className="text-lg text-gray-900 font-medium">{booking.revenue} AED</p>
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
                  <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
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
                    className={`w-3 h-3 rounded-full ${
                      booking.status === 'completed'
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
              onClick={() => navigate(`/admin/chat?client_id=${booking.client_id}`)}
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