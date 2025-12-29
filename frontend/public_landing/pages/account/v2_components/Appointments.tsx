
import { useState } from 'react';
import { Calendar, Clock, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// import { bookings as initialBookings, masters } from '../data/mockData';

export function Appointments({ bookings, masters }: any) {

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
      <Card key={appointment.id} className="group overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-gray-50 shadow-md">
                <AvatarImage src={master?.photo || master?.avatar_url} alt={master?.name} className="object-cover" />
                <AvatarFallback className="bg-gray-100 text-gray-500 text-xl">{master?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                {getStatusBadge(appointment.status)}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-xl text-gray-900 group-hover:text-pink-600 transition-colors">
                    {appointment.service_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <span className="font-medium text-gray-700">{master?.name || 'Мастер'}</span>
                    <span>•</span>
                    <span>{master?.specialty || master?.job_title}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{appointment.price} AED</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 border border-gray-100">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  {safeDate(appointment.date || appointment.datetime).toLocaleDateString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long'
                  })}
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 border border-gray-100">
                  <Clock className="w-4 h-4 text-purple-500" />
                  {format(safeDate(appointment.date || appointment.datetime), 'HH:mm')}
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-4 sm:mt-0 gap-3 min-w-[120px]">
              {appointment.status === 'completed' && (
                <Button size="sm" className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl">
                  <Repeat className="w-4 h-4 mr-2" />
                  Повторить
                </Button>
              )}

              {appointment.status === 'upcoming' && (
                <>
                  <Button size="sm" variant="outline" className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:text-red-700 rounded-xl">
                    Отменить
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent inline-block">
            Мои записи
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">История ваших визитов и предстоящие сеансы</p>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-gray-100/50 p-1 rounded-full mb-6 inline-flex w-auto">
          <TabsTrigger value="upcoming" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            Предстоящие
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">Нет предстоящих записей</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Самое время позаботиться о себе. Выберите услугу и запишитесь к любимому мастеру.
              </p>
              <Button className="mt-6 bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-8">
                Записаться на визит
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingAppointments.map((apt: any) => renderAppointment(apt))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyAppointments.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                <Repeat className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">История визитов пуста</h3>
              <p className="text-gray-500 mt-2">
                Здесь будут отображаться ваши прошедшие процедуры.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {historyAppointments.map((apt: any) => renderAppointment(apt))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
