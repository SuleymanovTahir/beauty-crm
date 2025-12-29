import { Calendar, Clock, Star, TrendingUp, Zap, Repeat, Users, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { currentUser, appointments, masters, promotions } from '../data/mockData';

export function Dashboard() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const getMotivation = () => {
    const phrases = [
      'Время сиять!',
      'Вы прекрасны!',
      'Каждый день - новая возможность!',
      'Будьте собой, будьте красивы!',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const upcomingAppointment = appointments.find(a => a.status === 'upcoming');
  const lastAppointment = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  const master = upcomingAppointment ? masters.find(m => m.id === upcomingAppointment.masterId) : null;

  const monthsSince = Math.floor(
    (new Date().getTime() - new Date(currentUser.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const totalSpent = 4360; // Mock

  return (
    <div className="space-y-6 pb-8">
      {/* Приветствие */}
      <div className="space-y-2">
        <h1 className="flex items-center gap-2">
          {getGreeting()}, {currentUser.name.split(' ')[0]}! <Sparkles className="w-6 h-6 text-pink-500" />
        </h1>
        <p className="text-muted-foreground">{getMotivation()}</p>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего визитов</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser.totalVisits}</div>
            <p className="text-xs text-muted-foreground">+3 за этот месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баллы лояльности</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser.loyaltyPoints}</div>
            <p className="text-xs text-muted-foreground">
              {currentUser.currentTier === 'gold' ? 'Gold' : currentUser.currentTier} уровень
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Текущая скидка</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser.currentDiscount}%</div>
            <p className="text-xs text-muted-foreground">Доступна на все услуги</p>
          </CardContent>
        </Card>
      </div>

      {/* Ближайшая запись */}
      {upcomingAppointment && master && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Ближайшая запись
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={master.avatar} alt={master.name} />
                <AvatarFallback>{master.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{master.name}</div>
                <div className="text-sm text-muted-foreground">{upcomingAppointment.service}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {new Date(upcomingAppointment.date).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </Badge>
                  <Badge variant="outline">{upcomingAppointment.time}</Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{upcomingAppointment.price} AED</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Calendar className="w-4 h-4 mr-2" />
                В календарь
              </Button>
              <Button size="sm" variant="outline">Перенести</Button>
              <Button size="sm" variant="outline">Отменить</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-20 flex-col gap-2">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">Записаться</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <Repeat className="w-5 h-5" />
          <span className="text-sm">Повторить</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <Users className="w-5 h-5" />
          <span className="text-sm">Мои мастера</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Связаться</span>
        </Button>
      </div>

      {/* Последний визит */}
      {lastAppointment && (
        <Card>
          <CardHeader>
            <CardTitle>Последний визит</CardTitle>
            <CardDescription>
              {new Date(lastAppointment.date).toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              })} - {lastAppointment.service}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {lastAppointment.canReview && (
              <Button variant="outline">
                <Star className="w-4 h-4 mr-2" />
                Оставить отзыв
              </Button>
            )}
            <Button variant="outline">
              <Repeat className="w-4 h-4 mr-2" />
              Повторить услугу
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Инсайты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Ваша история
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Вы с нами</span>
              <span className="font-semibold">{monthsSince} месяцев</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сэкономили</span>
              <span className="font-semibold text-green-600">{Math.round(totalSpent * currentUser.currentDiscount / 100)} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Серия визитов</span>
              <span className="font-semibold flex items-center gap-1">
                <Zap className="w-4 h-4 text-orange-500" />
                {currentUser.streak} дней
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="font-medium">Пора освежить цвет!</div>
              <p className="text-sm text-muted-foreground">
                Прошло 6 недель с последнего окрашивания
              </p>
            </div>
            <Button size="sm" className="w-full">
              Записаться на окрашивание
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Специальные предложения */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-500" />
          Специальные предложения
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={promo.image} 
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-red-500">
                  {promo.daysLeft} дней
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{promo.title}</CardTitle>
                <CardDescription>{promo.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {promo.oldPrice} AED
                  </span>
                  <span className="text-xl font-bold text-pink-600">
                    {promo.newPrice} AED
                  </span>
                </div>
                <Button className="w-full">Записаться</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
