
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

    return (
      <Card key={appointment.id} className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow group">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Status Strip */}
            <div className={`w-full sm:w-2 h-2 sm:h-auto ${appointment.status === 'upcoming' || appointment.status === 'confirmed' ? 'bg-blue-500' :
                appointment.status === 'completed' ? 'bg-green-500' :
                  'bg-gray-300'
              }`} />

            <div className="p-6 flex-1 flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="w-16 h-16 border-2 border-white shadow-sm ring-2 ring-gray-50">
                <AvatarImage src={master?.photo || master?.avatar_url} alt={master?.name} />
                <AvatarFallback>{master?.name?.[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-lg text-gray-900 group-hover:text-pink-600 transition-colors">
                      {master?.name || 'Мастер'}
                    </div>
                    <div className="text-sm text-muted-foreground">{master?.specialty || master?.job_title}</div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="font-medium text-gray-800 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                  {appointment.service_name}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5 bg-white border px-2 py-1 rounded-md shadow-sm">
                    <Calendar className="w-4 h-4 text-pink-500" />
                    <span className="font-medium">
                      {safeDate(appointment.date || appointment.datetime).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border px-2 py-1 rounded-md shadow-sm">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">
                      {format(safeDate(appointment.date || appointment.datetime), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-4 sm:mt-0 gap-4">
                <div className="font-bold text-xl text-gray-900">{appointment.price} AED</div>

                <div className="flex gap-2">
                  {appointment.status === 'completed' && (
                    <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                      <Repeat className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  )}

                  {appointment.status === 'upcoming' && (
                    <>
                      {/* <Button size="sm" variant="ghost">Изменить</Button> */}
                      <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600">Отменить</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Мои записи</h2>
          <p className="text-muted-foreground">История ваших визитов и предстоящие сеансы</p>
        </div>
        <Button onClick={() => window.location.href = '/new-booking'} className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-200 transition-all hover:scale-105">
          + Новая запись
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full" onValueChange={(v: any) => setFilter(v)}>
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Предстоящие</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">История</TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Повторяющиеся</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointment)
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Нет предстоящих записей</h3>
              <p className="text-gray-500 mt-1 mb-6">Запишитесь на процедуру прямо сейчас</p>
              <Button onClick={() => window.location.href = '/new-booking'} variant="outline">Записаться</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
