import { useState } from 'react';
import { Calendar, Clock, Repeat, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useTranslation } from 'react-i18next';

export function Appointments({ bookings, masters }: any) {
  const { t } = useTranslation(['account/appointments', 'common']);
  const [filter, setFilter] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');
  const appointments = bookings || []; // Use prop or default

  const upcomingAppointments = appointments.filter((a: any) => ['pending', 'confirmed', 'upcoming'].includes(a.status));
  const historyAppointments = appointments.filter((a: any) => ['completed', 'cancelled'].includes(a.status));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'confirmed':
      case 'pending':
        return <Badge className="bg-blue-500">{t('status_upcoming')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">{t('status_completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t('status_cancelled')}</Badge>;
      default:
        return null;
    }
  };

  const renderAppointment = (appointment: any) => {
    const master = masters?.find((m: any) => m.id === appointment.masterId) || { name: t('unknown_master'), specialty: 'Service', avatar: '' };

    return (
      <Card key={appointment.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={master.avatar} alt={master.name} />
              <AvatarFallback>{master.name?.[0] || '?'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{master.name}</div>
                  <div className="text-sm text-muted-foreground">{master.specialty}</div>
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              <div className="text-sm font-medium">{appointment.service}</div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(appointment.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {appointment.time}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="font-bold">{appointment.price} AED</div>

                {appointment.status === 'completed' && (
                  <Button size="sm" variant="outline">
                    <Repeat className="w-4 h-4 mr-2" />
                    {t('button_repeat')}
                  </Button>
                )}

                {(appointment.status === 'upcoming' || appointment.status === 'confirmed' || appointment.status === 'pending') && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">{t('button_change')}</Button>
                    <Button size="sm" variant="outline">{t('button_cancel')}</Button>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tab_upcoming')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tab_history')}</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tab_recurring')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointment)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">{t('no_upcoming')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('no_upcoming_desc')}
                </p>
                <Button>{t('button_book')}</Button>
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
                <h3 className="mb-2">{t('history_empty')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('history_empty_desc')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4 mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">{t('recurring_title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('recurring_desc')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
