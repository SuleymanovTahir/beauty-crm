import { useState } from 'react';
import { Star, TrendingUp, Flame, QrCode, Gift, Share2, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { currentUser, spendingData, categorySpending, referralCode } from '../../../data/mockData';
import { toast } from 'sonner';

export function Loyalty() {
  const tiers = [
    { name: 'Bronze', points: 0, discount: 5, color: '#CD7F32' },
    { name: 'Silver', points: 1000, discount: 10, color: '#C0C0C0' },
    { name: 'Gold', points: 2000, discount: 15, color: '#FFD700' },
    { name: 'Platinum', points: 5000, discount: 25, color: '#E5E4E2' },
  ];

  const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === currentUser.currentTier);
  const currentTierData = tiers[currentTierIndex];
  const nextTierData = tiers[currentTierIndex + 1];

  const progressToNext = nextTierData
    ? ((currentUser.loyaltyPoints - currentTierData.points) / (nextTierData.points - currentTierData.points)) * 100
    : 100;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Промокод скопирован');
  };

  const handleAddToWallet = () => {
    toast.info('Функция добавления в Apple Wallet скоро будет доступна');
  };

  const shareWhatsApp = () => {
    const text = `Присоединяйся к салону красоты! Используй мой промокод ${referralCode} и получи бонусы!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>Лояльность и Бонусы</h1>
        <p className="text-muted-foreground">Ваши привилегии и награды</p>
      </div>

      {/* Текущий статус */}
      <Card className="border-2" style={{ borderColor: currentTierData.color }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6" style={{ color: currentTierData.color }} />
                {currentTierData.name} статус
              </CardTitle>
              <CardDescription className="mt-2">
                {currentUser.loyaltyPoints} баллов • {currentUser.currentDiscount}% скидка
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: currentTierData.color }}>
                {currentUser.loyaltyPoints}
              </div>
              <div className="text-sm text-muted-foreground">баллов</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextTierData && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>До {nextTierData.name} уровня</span>
                  <span className="font-semibold">
                    {nextTierData.points - currentUser.loyaltyPoints} баллов
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                При достижении {nextTierData.name} уровня ваша скидка составит {nextTierData.discount}%
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Streak геймификация */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Серия визитов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-orange-500">{currentUser.streak}</div>
            <div className="flex-1">
              <div className="font-semibold">дней подряд!</div>
              <p className="text-sm text-muted-foreground">
                Продолжайте посещать салон регулярно и получайте дополнительные бонусы
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Аналитика трат */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Расходы по месяцам</CardTitle>
            <CardDescription>Последние 6 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#FF6B9D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расходы по категориям</CardTitle>
            <CardDescription>Распределение за год</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySpending}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.category}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Виртуальная карта */}
      <Card>
        <CardHeader>
          <CardTitle>Виртуальная карта лояльности</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-8 text-white w-full md:w-96 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm opacity-80">Карта лояльности</div>
                  <div className="font-bold text-xl mt-1">{currentTierData.name}</div>
                </div>
                <Star className="w-8 h-8" style={{ color: currentTierData.color }} />
              </div>
              
              <div className="space-y-1">
                <div className="text-sm opacity-80">Владелец карты</div>
                <div className="font-semibold">{currentUser.name}</div>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm opacity-80">ID клиента</div>
                  <div className="font-mono">{currentUser.id.padStart(8, '0')}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{currentUser.currentDiscount}%</div>
                  <div className="text-xs opacity-80">скидка</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                  <QrCode className="w-32 h-32 text-gray-400" />
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Покажите QR-код при посещении салона
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleAddToWallet}>
                  <Gift className="w-4 h-4 mr-2" />
                  Добавить в Wallet
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Реферальная программа */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-purple-500" />
            Реферальная программа
          </CardTitle>
          <CardDescription>
            Приглашайте друзей и получайте бонусы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-200">
            <div className="text-sm text-muted-foreground mb-2">Ваш промокод</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-bold text-purple-600">{referralCode}</code>
              <Button size="sm" variant="outline" onClick={handleCopyReferral}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">+500</div>
              <div className="text-sm text-muted-foreground">баллов вам</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">+300</div>
              <div className="text-sm text-muted-foreground">баллов другу</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">приглашений</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={shareWhatsApp}>
              <Share2 className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button className="flex-1" variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Instagram
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
