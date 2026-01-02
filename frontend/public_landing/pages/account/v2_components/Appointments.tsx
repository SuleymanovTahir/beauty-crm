import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Repeat, CheckCircle, Loader2, CalendarPlus } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';
import { toast } from 'sonner';
import { RescheduleDialog } from './RescheduleDialog';

export function Appointments() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [currency, setCurrency] = useState('AED');
  const [filter, setFilter] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');

  // Add to Google Calendar function
  const addToGoogleCalendar = (appointment: any) => {
    const startDate = new Date(appointment.date.replace(' ', 'T'));
    if (isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    const formatDateForGoogle = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: appointment.service_name,
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
      details: `${t('appointments.master', 'Мастер')}: ${appointment.master_name}`,
      location: localStorage.getItem('salon_name') || 'Beauty Salon',
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
    toast.success(t('appointments.added_to_calendar', 'Добавлено в календарь'));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientBookings();
      if (data.success) {
        setBookings(data.bookings || []);
        if (data.currency) setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm(t('appointments.confirm_cancel', 'Вы уверены, что хотите отменить запись?'))) {
      return;
    }

    try {
      const result = await apiClient.cancelBooking(bookingId);
      if (result.success) {
        toast.success(t('appointments.cancelled', 'Запись отменена'));
        await loadBookings(); // Reload bookings
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const handleEditBooking = (appointment: any) => {
    setRescheduleData(appointment);
    setIsRescheduleOpen(true);
  };

  const upcomingAppointments = bookings.filter(a =>
    a.status === 'upcoming' || a.status === 'confirmed' || a.status === 'pending'
  );
  const historyAppointments = bookings.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'confirmed':
        return <Badge className="bg-blue-500">{t('appointments.status_upcoming', 'Предстоящая')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">{t('appointments.status_pending', 'Ожидает')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">{t('appointments.status_completed', 'Завершена')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t('appointments.status_cancelled', 'Отменена')}</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const renderAppointment = (appointment: any) => {
    // Extract time from datetime string (format: "2026-01-05T14:00")
    const dateTime = new Date(appointment.date);
    const timeString = dateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return (
      <Card key={appointment.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={appointment.master_photo} alt={appointment.master_name} />
              <AvatarFallback>{appointment.master_name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{appointment.master_name}</div>
                  <div className="text-sm text-muted-foreground">{appointment.master_specialty || t('appointments.master', 'Мастер')}</div>
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              <div className="text-sm font-medium">{appointment.service_name}</div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {dateTime.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeString}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="font-bold">{appointment.price} {currency}</div>

                {appointment.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/new-booking', {
                      state: {
                        prefillMaster: appointment.master_id,
                        prefillService: appointment.service_id,
                        repeatBooking: appointment
                      }
                    })}
                  >
                    <Repeat className="w-4 h-4 mr-2" />
                    {t('appointments.repeat', 'Повторить')}
                  </Button>
                )}

                {(appointment.status === 'upcoming' || appointment.status === 'confirmed' || appointment.status === 'pending') && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addToGoogleCalendar(appointment)}
                    >
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      {t('appointments.add_to_calendar', 'В календарь')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditBooking(appointment)}>{t('appointments.edit', 'Изменить')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleCancelBooking(appointment.id)}>{t('appointments.cancel', 'Отменить')}</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('appointments.title', 'Мои записи')}</h1>
          <p className="text-muted-foreground">{t('appointments.subtitle', 'Управляйте вашими визитами')}</p>
        </div>
        <Button onClick={() => navigate('/new-booking')}>
          <CalendarPlus className="w-4 h-4 mr-2" />
          {t('appointments.new_booking', 'Добавить запись')}
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('appointments.upcoming', 'Предстоящие')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {t('appointments.history', 'История')}
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            {t('appointments.recurring', 'Повторяющиеся')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointment)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">{t('appointments.no_upcoming', 'Нет предстоящих записей')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('appointments.book_now_message', 'Запишитесь на услугу прямо сейчас')}
                </p>
                <Button onClick={() => navigate('/new-booking')}>{t('appointments.book_now', 'Записаться')}</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {historyAppointments.length > 0 ? (
            historyAppointments.map(renderAppointment)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">{t('appointments.history_empty', 'История пуста')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('appointments.history_empty_message', 'Здесь будут отображаться завершенные визиты')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4 mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">{t('appointments.recurring_title', 'Повторяющиеся записи')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('appointments.recurring_message', 'Функция в разработке. Скоро вы сможете настроить автоматические записи.')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <RescheduleDialog
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        appointment={rescheduleData}
      />
    </div>
  );
}
