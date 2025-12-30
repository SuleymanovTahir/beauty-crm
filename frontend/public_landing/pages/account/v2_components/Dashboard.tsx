import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Star, TrendingUp, Zap, Repeat, Users, MessageCircle, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';
import { toast } from 'sonner';

export function Dashboard() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientDashboard();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning', 'Доброе утро');
    if (hour < 18) return t('dashboard.good_afternoon', 'Добрый день');
    return t('dashboard.good_evening', 'Добрый вечер');
  };

  const getMotivation = () => {
    const phrases = [
      t('dashboard.motivation_1', 'Время сиять!'),
      t('dashboard.motivation_2', 'Вы прекрасны!'),
      t('dashboard.motivation_3', 'Каждый день - новая возможность!'),
      t('dashboard.motivation_4', 'Будьте собой, будьте красивы!'),
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const addToGoogleCalendar = (booking: any) => {
    const startDate = new Date(`${booking.date} ${booking.time || '10:00'}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    const formatDateForGoogle = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: booking.service,
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
      details: `Мастер: ${booking.master}`,
      location: 'Beauty Salon',
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
    toast.success(t('dashboard.added_to_calendar', 'Добавлено в календарь'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const { loyalty, next_booking, last_visit, achievements_summary, visit_stats } = dashboardData || {};
  const userName = localStorage.getItem('user_name') || 'Гость';

  return (
    <div className="space-y-6 pb-8">
      {/* Приветствие */}
      <div className="space-y-2">
        <h1 className="flex items-center gap-2">
          {getGreeting()}, {userName.split(' ')[0]}! <Sparkles className="w-6 h-6 text-pink-500" />
        </h1>
        <p className="text-muted-foreground">{getMotivation()}</p>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_visits', 'Всего визитов')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visit_stats?.total_visits || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.this_month', '+3 за этот месяц')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.loyalty_points', 'Баллы лояльности')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyalty?.points || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.loyalty_level', 'Bronze уровень')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_saved', 'Сэкономлено')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyalty?.total_saved || 0} AED</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.with_discounts', 'С программой лояльности')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ближайшая запись */}
      {next_booking && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('dashboard.next_booking', 'Ближайшая запись')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={next_booking.master_photo} alt={next_booking.master} />
                <AvatarFallback>{next_booking.master?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{next_booking.master}</div>
                <div className="text-sm text-muted-foreground">{next_booking.service}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {new Date(next_booking.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long'
                    })}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => addToGoogleCalendar(next_booking)}>
                <Calendar className="w-4 h-4 mr-2" />
                {t('dashboard.add_to_calendar', 'В календарь')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/new-booking')}>
          <Calendar className="w-5 h-5" />
          <span className="text-sm">{t('dashboard.book', 'Записаться')}</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => {
            if (last_visit) {
              navigate('/new-booking', {
                state: {
                  prefillMaster: last_visit.master_id,
                  prefillService: last_visit.service_id,
                  repeatBooking: last_visit
                }
              });
            } else {
              navigate('/new-booking');
            }
          }}
        >
          <Repeat className="w-5 h-5" />
          <span className="text-sm">{t('dashboard.repeat', 'Повторить')}</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/account/masters')}>
          <Users className="w-5 h-5" />
          <span className="text-sm">{t('dashboard.my_masters', 'Мои мастера')}</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => {
            // Открываем WhatsApp или Telegram чат с салоном
            const phone = '+971501234567'; // Номер салона
            window.open(`https://wa.me/${phone}`, '_blank');
          }}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{t('dashboard.contact', 'Связаться')}</span>
        </Button>
      </div>

      {/* Последний визит */}
      {last_visit && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.last_visit', 'Последний визит')}</CardTitle>
            <CardDescription>
              {new Date(last_visit.date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} - {last_visit.service}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/review/${last_visit.booking_id || last_visit.id}`)}>
              <Star className="w-4 h-4 mr-2" />
              {t('dashboard.leave_review', 'Оставить отзыв')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/new-booking', {
                state: {
                  prefillMaster: last_visit.master_id,
                  prefillService: last_visit.service_id,
                  repeatBooking: last_visit
                }
              })}
            >
              <Repeat className="w-4 h-4 mr-2" />
              {t('dashboard.repeat_service', 'Повторить услугу')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Достижения */}
      {achievements_summary && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t('dashboard.achievements', 'Достижения')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('dashboard.unlocked', 'Разблокировано')}</span>
              <span className="font-semibold">{achievements_summary.unlocked} / {achievements_summary.total}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
