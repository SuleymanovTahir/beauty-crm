import { Calendar, Clock, Star, TrendingUp, Repeat, Users, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useTranslation } from 'react-i18next';

export function Dashboard({ user, dashboardData, loyalty, bookings, masters, onNavigate }: any) {
  const { t } = useTranslation(['account/dashboard', 'common']);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const getMotivation = () => {
    const phrases = [
      t('motivation_shine'),
      t('motivation_beautiful'),
      t('motivation_new_day'),
      t('motivation_be_yourself'),
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // Safe defaults
  const stats = dashboardData?.stats || { total_visits: 0 };
  const points = loyalty?.points || 0;
  const tier = loyalty?.tier || 'Bronze';
  const discount = loyalty?.discount_percent || 0;

  // Bookings mapping
  const upcomingAppointment = bookings?.find((a: any) => a.status === 'confirmed' || a.status === 'pending');
  // Sorting bookings to find last completed
  const lastAppointment = bookings
    ?.filter((a: any) => a.status === 'completed')
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())?.[0];

  const master = upcomingAppointment ? masters?.find((m: any) => m.id === upcomingAppointment.master_id) : null;

  const monthsSince = user?.created_at ? Math.floor(
    (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  ) : 0;

  // Handler for booking navigation
  const handleBooking = () => {
    window.location.href = '/new-booking';
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold md:text-4xl flex items-center gap-2">
            {getGreeting()}, {user?.full_name?.split(' ')[0]}! <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
          </h1>
          <p className="mt-2 text-blue-100 text-lg opacity-90">{getMotivation()}</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <div className="text-sm text-blue-100">{t('total_visits')}</div>
              <div className="mt-1 text-2xl font-bold flex items-center gap-2">
                {stats.total_visits} <Calendar className="h-4 w-4 opacity-70" />
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <div className="text-sm text-blue-100">{t('loyalty_points')}</div>
              <div className="mt-1 text-2xl font-bold flex items-center gap-2">
                {points} <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
              </div>
              <div className="text-xs text-blue-100 mt-1 bg-white/20 inline-block px-2 py-0.5 rounded-full capitalize">
                {t('tier_level', { tier })}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all">
              <div className="text-sm text-blue-100">{t('your_discount')}</div>
              <div className="mt-1 text-2xl font-bold flex items-center gap-2">
                {discount}% <TrendingUp className="h-4 w-4 text-green-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Actions & Services */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('quick_actions')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t('action_book'), icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50', action: handleBooking },
                { label: t('action_repeat'), icon: Repeat, color: 'text-violet-600', bg: 'bg-violet-50', action: () => { } },
                { label: t('action_masters'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', action: () => onNavigate && onNavigate('masters') },
                { label: t('action_support'), icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50', action: () => onNavigate && onNavigate('support') },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.action}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 group"
                >
                  <div className={`w-12 h-12 rounded-full ${action.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <span className="font-medium text-gray-700 text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming Appointment */}
          {upcomingAppointment ? (
            <Card className="border-0 shadow-lg bg-gradient-to-r from-pink-50 via-white to-purple-50 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-700">
                  <Clock className="w-5 h-5" />
                  {t('upcoming_appointment')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                  <div className="relative shrink-0">
                    <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-white shadow-md">
                      <AvatarImage src={master?.avatar_url} alt={master?.name} />
                      <AvatarFallback>{master?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-2 -right-2 bg-green-500 border-2 border-white">{t('confirmed')}</Badge>
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-2 w-full">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{master?.name || t('master')}</h3>
                    <p className="text-muted-foreground font-medium text-sm md:text-base line-clamp-2">
                      {upcomingAppointment.service_name || upcomingAppointment.services?.[0]?.name}
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <Badge variant="secondary" className="px-3 py-1 bg-white/80 backdrop-blur whitespace-nowrap">
                        {new Date(upcomingAppointment.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </Badge>
                      <Badge variant="secondary" className="px-3 py-1 bg-white/80 backdrop-blur whitespace-nowrap">
                        {upcomingAppointment.time_start || upcomingAppointment.time}
                      </Badge>
                      <span className="font-bold text-pink-600 text-lg ml-auto whitespace-nowrap">
                        {upcomingAppointment.total_price || upcomingAppointment.price} AED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1 bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-200 w-full">
                    {t('manage_appointment')}
                  </Button>
                  <Button variant="outline" className="flex-1 border-pink-200 text-pink-700 hover:bg-pink-50 w-full" onClick={() => onNavigate && onNavigate('appointments')}>
                    {t('to_calendar')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-pink-300 transition-colors bg-gray-50/50">
              <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-900">{t('no_appointments')}</h3>
              <p className="text-gray-500 text-sm mb-4">{t('no_appointments_desc')}</p>
              <Button onClick={() => window.location.href = '/new-booking'}>{t('book_online')}</Button>
            </div>
          )}

        </div>

        {/* Right Column: Insights & History */}
        <div className="space-y-8">

          {/* History Snippet */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t('last_visit')}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastAppointment ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lastAppointment.service_name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(lastAppointment.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full justify-start text-pink-600 hover:text-pink-700 hover:bg-pink-50 p-0 h-auto font-medium">
                    <Repeat className="w-4 h-4 mr-2" /> {t('repeat_service')}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t('history_empty')}</p>
              )}
            </CardContent>
          </Card>

          {/* Recommendations / Insights */}
          <Card className="border-none shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                {t('your_status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-indigo-100 text-sm">{t('with_us')}</span>
                <span className="font-bold">{monthsSince} {t('months')}</span>
              </div>

              <div className="pt-2">
                <p className="text-sm text-indigo-100 mb-3">
                  {t('next_level_message', { points: 150 })}
                </p>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-300 w-[70%]" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Специальные предложения */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-500" />
          {t('special_offers')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardData?.special_offers?.map((promo: any) => (
            <Card key={promo.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={promo.image_url || promo.image}
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-red-500">
                  {promo.daysLeft} {t('days')}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{promo.title}</CardTitle>
                <CardDescription>{promo.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {promo.old_price || promo.oldPrice} AED
                  </span>
                  <span className="text-xl font-bold text-pink-600">
                    {promo.new_price || promo.newPrice} AED
                  </span>
                </div>
                <Button className="w-full">{t('book_now')}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
