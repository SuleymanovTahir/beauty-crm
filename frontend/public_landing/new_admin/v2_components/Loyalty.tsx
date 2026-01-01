import { Star, TrendingUp, Flame, QrCode, Gift, Share2, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function Loyalty({ loyalty }: any) {
  const { t } = useTranslation(['account/loyalty', 'common']);
  // Use loyalty prop data mixed with defaults
  const points = loyalty?.points || 0;
  const currentTier = loyalty?.tier || 'Bronze';
  const history = loyalty?.history || [];

  // Use spending data from props or empty array
  const spendingData = loyalty?.spendingByMonth || [
    { month: t('month_jan'), amount: 0 },
    { month: t('month_feb'), amount: 0 },
    { month: t('month_mar'), amount: 0 },
    { month: t('month_apr'), amount: 0 },
    { month: t('month_may'), amount: 0 },
    { month: t('month_jun'), amount: 0 },
  ];

  // Use category spending data from props or empty array
  const categorySpending = loyalty?.categorySpending || [
    { name: t('category_hair'), value: 0, fill: '#FF6B9D' },
    { name: t('category_nails'), value: 0, fill: '#FF9EBB' },
    { name: t('category_face'), value: 0, fill: '#FFC4D6' },
    { name: t('category_body'), value: 0, fill: '#FFE1EA' },
  ];
  const referralCode = loyalty?.referralCode || 'REF123';

  const tiers = [
    { name: 'Bronze', points: 0, discount: 5, color: '#CD7F32' },
    { name: 'Silver', points: 1000, discount: 10, color: '#C0C0C0' },
    { name: 'Gold', points: 5000, discount: 15, color: '#FFD700' },
    { name: 'Platinum', points: 10000, discount: 25, color: '#E5E4E2' },
  ];

  const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === currentTier.toLowerCase());
  // Find safe index, default to 0
  const safeIndex = currentTierIndex >= 0 ? currentTierIndex : 0;
  const currentTierData = tiers[safeIndex];
  const nextTierData = tiers[safeIndex + 1];

  const progressToNext = nextTierData
    ? ((points - currentTierData.points) / (nextTierData.points - currentTierData.points)) * 100
    : 100;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success(t('promo_copied'));
  };

  const handleAddToWallet = () => {
    toast.info(t('wallet_coming_soon'));
  };

  const shareWhatsApp = () => {
    const text = `Присоединяйся к салону красоты! Используй мой промокод ${referralCode} и получи бонусы!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Текущий статус */}
      <Card className="border-2" style={{ borderColor: currentTierData.color }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6" style={{ color: currentTierData.color }} />
                {currentTierData.name} {t('status')}
              </CardTitle>
              <CardDescription className="mt-2">
                {points} {t('points')} • {currentTierData.discount}% {t('discount')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: currentTierData.color }}>
                {points}
              </div>
              <div className="text-sm text-muted-foreground">{t('points')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextTierData && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('to_next_tier', { tier: nextTierData.name })}</span>
                  <span className="font-semibold">
                    {t('points_needed', { points: Math.max(0, nextTierData.points - points) })}
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {t('next_tier_benefit', { tier: nextTierData.name, discount: nextTierData.discount })}
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
            {t('visit_streak')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-orange-500">3</div>
            <div className="flex-1">
              <div className="font-semibold">{t('days_in_row')}</div>
              <p className="text-sm text-muted-foreground">
                {t('streak_message')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Аналитика трат */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('spending_by_month')}</CardTitle>
            <CardDescription>{t('last_6_months')}</CardDescription>
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
            <CardTitle>{t('spending_by_category')}</CardTitle>
            <CardDescription>{t('year_distribution')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySpending}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
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
          <CardTitle>{t('virtual_card')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-8 text-white w-full md:w-96 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm opacity-80">{t('loyalty_card')}</div>
                  <div className="font-bold text-xl mt-1">{currentTierData.name}</div>
                </div>
                <Star className="w-8 h-8" style={{ color: currentTierData.color }} />
              </div>

              <div className="space-y-1">
                <div className="text-sm opacity-80">{t('card_holder')}</div>
                <div className="font-semibold">Tahir Suleymanov</div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm opacity-80">{t('client_id')}</div>
                  <div className="font-mono">00012345</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{currentTierData.discount}%</div>
                  <div className="text-xs opacity-80">{t('discount')}</div>
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
                {t('show_qr')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleAddToWallet}>
                  <Gift className="w-4 h-4 mr-2" />
                  {t('add_to_wallet')}
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
            {t('referral_program')}
          </CardTitle>
          <CardDescription>
            {t('referral_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-200">
            <div className="text-sm text-muted-foreground mb-2">{t('your_promo_code')}</div>
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
              <div className="text-sm text-muted-foreground">{t('points_to_you')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">+300</div>
              <div className="text-sm text-muted-foreground">{t('points_to_friend')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">{t('invitations')}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={shareWhatsApp}>
              <Share2 className="w-4 h-4 mr-2" />
              {t('share_whatsapp')}
            </Button>
            <Button className="flex-1" variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              {t('share_instagram')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
