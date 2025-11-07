import React, { useEffect, useState } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface Booking {
  id: number;
  service: string;
  datetime: string;
  status: string;
  phone: string;
}

export default function EmployeeDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { t } = useTranslation(['employee/Dashboard', 'common']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/bookings', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error(t('dashboard:failed_to_fetch_bookings'));
        const data = await response.json();
        // Фильтруем только сегодняшние и будущие записи
        const today = new Date().toISOString().split('T')[0];
        setBookings(data.bookings.filter((b: any) => b.datetime.startsWith(today)));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('dashboard:unknown_error'));
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('dashboard:loading_error')}: {error}</span>
        </div>
      </div>
    );
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">{t('dashboard:my_bookings')}</h1>
        <p className="text-gray-600">{t('dashboard:today')}, {new Date().toLocaleDateString('ru-RU')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">{t('dashboard:today_bookings')}</p>
          <h3 className="text-3xl text-gray-900">{bookings.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">{t('dashboard:confirmed')}</p>
          <h3 className="text-3xl text-green-600">{confirmedCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">{t('dashboard:pending')}</p>
          <h3 className="text-3xl text-yellow-600">{pendingCount}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl text-gray-900 mb-6">{t('dashboard:schedule_for_today')}</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">{t('dashboard:no_bookings_today')}</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-lg text-gray-900 mb-1">{booking.datetime.split(' ')[1]}</p>
                      <p className="text-gray-900">{t('dashboard:booking')} #{booking.id}</p>
                      <p className="text-gray-600 text-sm">{booking.service}</p>
                      <p className="text-gray-600 text-sm">{booking.phone}</p>
                    </div>
                  </div>
                  <Badge className={
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }>
                    {booking.status === 'confirmed' ? t('dashboard:confirmed') : t('dashboard:pending')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}