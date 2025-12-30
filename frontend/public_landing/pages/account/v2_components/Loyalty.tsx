import { useState, useEffect } from 'react';
import { Star, TrendingUp, Flame, Gift, Share2, Copy, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';
import { toast } from 'sonner';

export function Loyalty() {
  const { t } = useTranslation(['account', 'common']);
  const [loading, setLoading] = useState(true);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);

  useEffect(() => {
    loadLoyalty();
  }, []);

  const loadLoyalty = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientLoyalty();
      if (data.success) {
        setLoyaltyData(data);
      }
    } catch (error) {
      console.error('Error loading loyalty:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const tiers = [
    { name: 'Bronze', points: 0, discount: 5, color: '#CD7F32' },
    { name: 'Silver', points: 1000, discount: 10, color: '#C0C0C0' },
    { name: 'Gold', points: 2000, discount: 15, color: '#FFD700' },
    { name: 'Platinum', points: 5000, discount: 25, color: '#E5E4E2' },
  ];

  const { loyalty } = loyaltyData || {};

  // Default loyalty data if not available
  const defaultLoyalty = {
    points: 0,
    tier: 'Bronze',
    discount: 5,
    total_spent: 0,
    total_saved: 0,
    referral_code: 'BEAUTY000',
    tier_progress: 0
  };

  const loyaltyInfo = loyalty || defaultLoyalty;

  const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === loyaltyInfo.tier.toLowerCase());
  const currentTierData = tiers[currentTierIndex >= 0 ? currentTierIndex : 0];
  const nextTierData = tiers[currentTierIndex + 1];

  const progressToNext = nextTierData
    ? ((loyaltyInfo.points - currentTierData.points) / (nextTierData.points - currentTierData.points)) * 100
    : 100;

  const userName = localStorage.getItem('user_name') || 'Client';
  const userId = localStorage.getItem('user_id') || '00000000';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(loyaltyInfo.referral_code || '');
    toast.success(t('loyalty.code_copied', 'Промокод скопирован'));
  };

  const handleAddToWallet = () => {
    toast.info(t('loyalty.wallet_coming_soon', 'Функция добавления в Apple Wallet скоро будет доступна'));
  };

  const shareWhatsApp = () => {
    const text = `${t('loyalty.share_text', 'Присоединяйся к салону красоты! Используй мой промокод')} ${loyaltyInfo.referral_code} ${t('loyalty.share_bonus', 'и получи бонусы!')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareInstagram = async () => {
    const referralText = `${t('loyalty.share_text', 'Присоединяйся к салону красоты! Используй мой промокод')} ${loyaltyInfo.referral_code} ${t('loyalty.share_bonus', 'и получи бонусы!')}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Beauty Salon',
          text: referralText,
        });
        toast.success(t('loyalty.shared', 'Успешно поделились'));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          // Fallback: copy to clipboard and show Instagram instructions
          await navigator.clipboard.writeText(`${referralText}\n\n#beautysalon #beauty`);
          toast.success(t('loyalty.code_copied_instagram', 'Промокод скопирован! Вставьте в Instagram Stories'));
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      try {
        await navigator.clipboard.writeText(`${referralText}\n\n#beautysalon #beauty`);
        toast.info(t('loyalty.code_copied_instagram', 'Промокод скопирован! Вставьте в Instagram Stories'));
      } catch (error) {
        toast.error(t('common:error_occurred', 'Произошла ошибка'));
      }
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>{t('loyalty.title', 'Лояльность и Бонусы')}</h1>
        <p className="text-muted-foreground">{t('loyalty.subtitle', 'Ваши привилегии и награды')}</p>
      </div>

      {/* Текущий статус */}
      <Card className="border-2" style={{ borderColor: currentTierData?.color }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6" style={{ color: currentTierData?.color }} />
                {currentTierData?.name} {t('loyalty.status', 'статус')}
              </CardTitle>
              <CardDescription className="mt-2">
                {loyaltyInfo.points} {t('loyalty.points', 'баллов')} • {loyaltyInfo.discount}% {t('loyalty.discount', 'скидка')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: currentTierData?.color }}>
                {loyaltyInfo.points}
              </div>
              <div className="text-sm text-muted-foreground">{t('loyalty.points', 'баллов')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextTierData && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('loyalty.to_next_level', 'До')} {nextTierData.name} {t('loyalty.level', 'уровня')}</span>
                  <span className="font-semibold">
                    {nextTierData.points - loyaltyInfo.points} {t('loyalty.points', 'баллов')}
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {t('loyalty.next_discount', 'При достижении')} {nextTierData.name} {t('loyalty.level', 'уровня')} {t('loyalty.your_discount', 'ваша скидка составит')} {nextTierData.discount}%
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Информация об уровнях лояльности */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            {t('loyalty.tier_system', 'Система уровней')}
          </CardTitle>
          <CardDescription>{t('loyalty.tier_explanation', 'Накапливайте баллы и получайте больше привилегий')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`p-4 rounded-lg border-2 ${
                tier.name === currentTierData?.name
                  ? 'bg-white border-current'
                  : 'border-gray-200'
              }`}
              style={tier.name === currentTierData?.name ? { borderColor: tier.color } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {tier.name}
                      {tier.name === currentTierData?.name && (
                        <Badge className="text-xs" style={{ backgroundColor: tier.color }}>
                          {t('loyalty.current', 'Текущий')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tier.points === 0
                        ? t('loyalty.starting_level', 'Начальный уровень')
                        : `${t('loyalty.from', 'От')} ${tier.points} ${t('loyalty.points', 'баллов')}`
                      }
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg" style={{ color: tier.color }}>
                    {tier.discount}%
                  </div>
                  <div className="text-xs text-muted-foreground">{t('loyalty.discount', 'скидка')}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Streak геймификация */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            {t('loyalty.visit_streak', 'Серия визитов')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-orange-500">{loyaltyInfo.streak || 0}</div>
            <div className="flex-1">
              <div className="font-semibold">{t('loyalty.days_in_row', 'дней подряд!')}</div>
              <p className="text-sm text-muted-foreground">
                {t('loyalty.streak_message', 'Продолжайте посещать салон регулярно и получайте дополнительные бонусы')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Аналитика трат - показывать только если есть данные */}
      {((loyalty?.spending_by_month && loyalty.spending_by_month.length > 0) ||
        (loyalty?.spending_by_category && loyalty.spending_by_category.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loyalty?.spending_by_month && loyalty.spending_by_month.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('loyalty.spending_by_month', 'Расходы по месяцам')}</CardTitle>
                <CardDescription>{t('loyalty.last_six_months', 'Последние 6 месяцев')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={loyalty.spending_by_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#FF6B9D" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {loyalty?.spending_by_category && loyalty.spending_by_category.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('loyalty.spending_by_category', 'Расходы по категориям')}</CardTitle>
                <CardDescription>{t('loyalty.year_distribution', 'Распределение за год')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={loyalty.spending_by_category}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.category}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {loyalty.spending_by_category.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Виртуальная карта */}
      <Card>
        <CardHeader>
          <CardTitle>{t('loyalty.virtual_card', 'Виртуальная карта лояльности')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-8 text-white w-full md:w-96 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm opacity-80">{t('loyalty.loyalty_card', 'Карта лояльности')}</div>
                  <div className="font-bold text-xl mt-1">{currentTierData?.name}</div>
                </div>
                <Star className="w-8 h-8" style={{ color: currentTierData?.color }} />
              </div>

              <div className="space-y-1">
                <div className="text-sm opacity-80">{t('loyalty.card_holder', 'Владелец карты')}</div>
                <div className="font-semibold">{userName}</div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm opacity-80">{t('loyalty.client_id', 'ID клиента')}</div>
                  <div className="font-mono">{userId.padStart(8, '0')}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{loyaltyInfo.discount}%</div>
                  <div className="text-xs opacity-80">{t('loyalty.discount', 'скидка')}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: 'loyalty_card',
                      client_id: userId,
                      tier: loyaltyInfo.tier,
                      discount: loyaltyInfo.discount,
                      points: loyaltyInfo.points,
                      generated_at: new Date().toISOString()
                    })}
                    size={128}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('loyalty.show_qr', 'Покажите QR-код при посещении салона')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('loyalty.qr_info', 'Сканирование автоматически применит вашу скидку')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleAddToWallet}>
                  <Gift className="w-4 h-4 mr-2" />
                  {t('loyalty.add_to_wallet', 'Добавить в Wallet')}
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
            {t('loyalty.referral_program', 'Реферальная программа')}
          </CardTitle>
          <CardDescription>
            {t('loyalty.referral_subtitle', 'Приглашайте друзей и получайте бонусы')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-200">
            <div className="text-sm text-muted-foreground mb-2">{t('loyalty.your_promo', 'Ваш промокод')}</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-bold text-purple-600">{loyaltyInfo.referral_code}</code>
              <Button size="sm" variant="outline" onClick={handleCopyReferral}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">+{loyaltyInfo.referral_stats?.points_for_referrer || 500}</div>
              <div className="text-sm text-muted-foreground">{t('loyalty.points_for_you', 'баллов вам')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">+{loyaltyInfo.referral_stats?.points_for_friend || 300}</div>
              <div className="text-sm text-muted-foreground">{t('loyalty.points_for_friend', 'баллов другу')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{loyaltyInfo.referral_stats?.referral_count || 0}</div>
              <div className="text-sm text-muted-foreground">{t('loyalty.invitations', 'приглашений')}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={shareWhatsApp}>
              <Share2 className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button className="flex-1" variant="outline" onClick={shareInstagram}>
              <Share2 className="w-4 h-4 mr-2" />
              Instagram
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
