import { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle, User, Phone } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

interface Booking {
  id: number;
  name: string; // Changed from client_name to match backend
  service: string;
  datetime: string;
  status: string;
  phone: string;
  notes?: string;
}

export default function EmployeeBookings() {
  const { t } = useTranslation(['employee/bookings', 'common']);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(t('common:error_loading'));
      }
      const data = await response.json();
      const allBookings = data.bookings || [];

      // Filter bookings based on selected filter
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      let filtered = allBookings;

      if (filter === 'upcoming') {
        filtered = allBookings.filter((b: Booking) => {
          const bookingDate = new Date(b.datetime);
          return bookingDate >= now;
        });
      } else if (filter === 'past') {
        filtered = allBookings.filter((b: Booking) => {
          const bookingDate = new Date(b.datetime);
          return bookingDate < now;
        });
      }

      // Sort by datetime (newest first for past, earliest first for upcoming)
      filtered.sort((a: Booking, b: Booking) => {
        const dateA = new Date(a.datetime).getTime();
        const dateB = new Date(b.datetime).getTime();
        return filter === 'past' ? dateB - dateA : dateA - dateB;
      });

      setBookings(filtered);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      setError(err.message || t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('common:error')}: {error}</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-pink-600" />
          {t('employeeBookings:my_bookings')}
        </h1>
        <p className="text-gray-600">{t('employeeBookings:view_and_manage_bookings')}</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
            ? 'bg-pink-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          {t('employeeBookings:all')}
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === 'upcoming'
            ? 'bg-pink-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          {t('employeeBookings:upcoming')}
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-lg transition-colors ${filter === 'past'
            ? 'bg-pink-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          {t('employeeBookings:past')}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">{t('employeeBookings:no_bookings')}</h3>
          <p className="text-gray-600">{t('employeeBookings:no_bookings_description')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {t('employeeBookings:booking')} #{booking.id}
                    </h3>
                    <Badge className={getStatusBadge(booking.status)}>
                      {t(`employeeBookings:status_${booking.status}`, booking.status)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{booking.service}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{booking.name || t('employeeBookings:no_name')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(booking.datetime).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{booking.phone || t('employeeBookings:no_phone')}</span>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>{t('employeeBookings:notes')}:</strong> {booking.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
