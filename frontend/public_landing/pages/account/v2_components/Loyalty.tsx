import { useState } from 'react';
import { Star, Flame, QrCode, Gift, Share2, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { currentUser, spendingData } from '../data/mockData';egorySpending, referralCode } from '../data/mockData';
import { toast } from 'sonner';

export function Loyalty({ loyalty, user }: any) {
  // Map prop to local structure if needed, or use directly.
  // Assuming loyalty prop has { points, tier, history }
  const currentUser = user || {};
  const points = loyalty?.points || 0;

  const spendingData = loyalty?.spendingData || [];
  const categorySpending = loyalty?.categorySpending || [];
  const referralCode = currentUser?.referralCode || 'REF123';
  const tier = loyalty?.tier || 'Bronze';
  // const history = loyalty?.history || []; // map real history
  const tiers = [
    { name: 'Bronze', points: 0, discount: 5, color: '#CD7F32' },
    { name: 'Silver', points: 1000, discount: 10, color: '#C0C0C0' },
    { name: 'Gold', points: 2000, discount: 15, color: '#FFD700' },
    { name: 'Platinum', points: 5000, discount: 25, color: '#E5E4E2' },
  ];

  const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === String(tier).toLowerCase());
  const currentTierData = tiers[currentTierIndex] || tiers[0];
  const nextTierData = tiers[currentTierIndex + 1];

  const progressToNext = nextTierData
    ? ((points - currentTierData.points) / (nextTierData.points - currentTierData.points)) * 100
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent inline-block">
          Лояльность и Бонусы
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Ваши привилегии и награды</p>
      </div>

      {/* Текущий статус */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl p-8">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm font-medium text-yellow-300 mb-2">
                <Star className="w-4 h-4 fill-yellow-300" /> {currentTierData.name} уровень
              </div>
              <h2 className="text-4xl font-bold">{currentUser.loyaltyPoints} <span className="text-2xl font-normal text-white/60">баллов</span></h2>
              <p className="text-gray-300 mt-1">Ваша персональная скидка: <span className="text-white font-bold">{currentTierData.discount}%</span></p>
            </div>

            <div className="w-full md:w-1/2 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">До уровня {nextTierData?.name || 'MAX'}</span>
                <span className="font-bold text-white">{nextTierData ? nextTierData.points - points : 0} баллов</span>
              </div>
              <Progress value={progressToNext} className="h-3 bg-white/10" indicatorClassName="bg-gradient-to-r from-yellow-400 to-amber-500" />
              {nextTierData && (
                <p className="text-xs text-gray-400 mt-2 text-right">
                  На {nextTierData.name} скидка будет {nextTierData.discount}%
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tiers.map((t) => {
              const isActive = t.name === currentTierData.name;
              return (
                <div key={t.name} className={`rounded-xl p-3 text-center transition-all ${isActive ? 'bg-white/20 shadow-lg scale-105 border border-white/20' : 'bg-white/5 opacity-60'}`}>
                  <div className="font-bold text-sm" style={{ color: isActive ? '#fff' : t.color }}>{t.name}</div>
                  <div className="text-xs text-gray-300">{t.discount}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

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
                  label={(entry: any) => entry.category}
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
                  <div className="font-mono">{String(currentUser.id || '').padStart(8, '0')}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{currentTierData.discount}%</div>
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
