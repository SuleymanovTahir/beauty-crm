
import { useState } from 'react';
import { Calendar, Clock, MapPin, Repeat, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// import { bookings as initialBookings, masters } from '../data/mockData';

export function Appointments({ bookings, masters }: any) {
  const [filter, setFilter] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');

  const upcomingAppointments = bookings?.filter((a: any) => ['pending', 'confirmed'].includes(a.status)) || [];
  const historyAppointments = bookings?.filter((a: any) => ['completed', 'cancelled'].includes(a.status)) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-500">Предстоящая</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Завершена</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Отменена</Badge>;
      default:
        return null;
    }
  };

  const safeDate = (dateStr: any) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const renderAppointment = (appointment: any) => {
    const master = masters?.find((m: any) => m.id === appointment.master_id);
    // if (!master) return null; // Don't return null, show what we have

    return (
      <Card key={appointment.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={master?.photo || master?.avatar_url} alt={master?.name} />
              <AvatarFallback>{master?.name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{master?.name || 'Мастер'}</div>
                  <div className="text-sm text-muted-foreground">{master?.specialty || master?.job_title}</div>
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              <div className="text-sm font-medium">{appointment.service_name}</div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {safeDate(appointment.date || appointment.datetime).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(safeDate(appointment.date || appointment.datetime), 'HH:mm')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="font-bold">{appointment.price} AED</div>

                {appointment.status === 'completed' && (
                  <Button size="sm" variant="outline">
                    <Repeat className="w-4 h-4 mr-2" />
                    Повторить
                  </Button>
                )}

                {appointment.status === 'upcoming' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Изменить</Button>
                    <Button size="sm" variant="outline">Отменить</Button>
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
        <h1>Мои записи</h1>
        <p className="text-muted-foreground">Управляйте вашими визитами</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Предстоящие
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            История
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Повторяющиеся
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointment)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">Нет предстоящих записей</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Запишитесь на услугу прямо сейчас
                </p>
                <Button>Записаться</Button>
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
                <h3 className="mb-2">История пуста</h3>
                <p className="text-sm text-muted-foreground">
                  Здесь будут отображаться завершенные визиты
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4 mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">Повторяющиеся записи</h3>
              <p className="text-sm text-muted-foreground">
                Функция в разработке. Скоро вы сможете настроить автоматические записи.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
