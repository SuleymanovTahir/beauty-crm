import { useState, useEffect } from 'react';
import { Star, TrendingUp, Gift, Copy, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@crm/api/client';
import { toast } from 'sonner';
import { useCurrency } from '@crm/hooks/useSalonSettings';
import { formatInstagramUrl, formatWhatsAppUrlWithText } from '../../../utils/urlUtils';
import { useSalonSettings } from '../../../hooks/useSalonSettings';

export function Loyalty() {
  const { t } = useTranslation(['account', 'common', 'adminpanel/loyaltymanagement', 'layouts/mainlayout']);
  const { currency: globalCurrency, formatCurrency } = useCurrency();
  const { phone: salonPhone, salonName, instagram: salonInstagram } = useSalonSettings();
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

  const { loyalty } = loyaltyData || {};
  const tierList = Array.isArray(loyalty?.all_tiers) ? loyalty.all_tiers : [];
  const levels = tierList.map((tier: any) => {
    const tierKey = String(tier.name ?? '').toLowerCase();
    const tierPoints = Number(tier.points ?? 0);

    return {
      key: tierKey,
      displayName: t(`loyalty.tiers.${tierKey}`, tier.name),
      points: tierPoints,
      discount: Number(tier.discount ?? 0),
      color: tier.color ?? '#CD7F32',
      requirement: tierPoints === 0
        ? t('loyalty.tiers.bronze_req', 'Базовый уровень')
        : t('loyalty.tiers.points_req', 'От {{points}} баллов', { points: tierPoints })
    };
  });
  const currency = loyalty?.currency ?? globalCurrency;

  const loyaltyInfo = {
    points: Number(loyalty?.points ?? 0),
    available_points: Number(loyalty?.available_points ?? loyalty?.points ?? 0),
    tier: String(loyalty?.tier ?? 'bronze'),
    discount: Number(loyalty?.discount ?? 0),
    total_spent: Number(loyalty?.total_spent ?? 0),
    total_saved: Number(loyalty?.total_saved ?? 0),
    referral_code: String(loyalty?.referral_code ?? ''),
    referral_stats: {
      points_for_referrer: Number(loyalty?.referral_stats?.points_for_referrer ?? 0),
      points_for_friend: Number(loyalty?.referral_stats?.points_for_friend ?? 0),
      referral_count: Number(loyalty?.referral_stats?.referral_count ?? 0),
    }
  };

  const currentTierKey = loyaltyInfo.tier.toLowerCase();
  const currentTierIndex = levels.findIndex((tier: any) => tier.key === currentTierKey);
  const currentLevel = levels[currentTierIndex >= 0 ? currentTierIndex : 0] ?? {
    key: currentTierKey,
    displayName: loyaltyInfo.tier,
    points: 0,
    discount: loyaltyInfo.discount,
    color: '#CD7F32',
    requirement: t('loyalty.tiers.bronze_req', 'Базовый уровень')
  };
  const nextLevel = currentTierIndex >= 0 ? levels[currentTierIndex + 1] : undefined;
  const levelsToRender = levels.length > 0 ? levels : [currentLevel];
  const cashbackPercent = Number(loyalty?.discount ?? 0);
  const referralCode = loyaltyInfo.referral_code.trim();
  const hasReferralCode = referralCode.length > 0;
  const shareText = hasReferralCode
    ? `${t('loyalty.share_text', 'Join the beauty salon! Use my promo code')} ${referralCode} ${t('loyalty.share_bonus', 'and get bonuses!')}`
    : `${salonName}. ${t('loyalty.referral_subtitle', 'Invite friends and get bonuses')}`;

  const handleCopyReferral = () => {
    if (!hasReferralCode) {
      toast.error(t('common:error_occurred', 'An error occurred'));
      return;
    }

    navigator.clipboard.writeText(referralCode)
      .then(() => {
        toast.success(t('loyalty.code_copied', 'Promo code copied'));
      })
      .catch(() => {
        toast.error(t('common:error_occurred', 'An error occurred'));
      });
  };

  const shareWhatsApp = () => {
    const whatsappUrl = formatWhatsAppUrlWithText(salonPhone, shareText);
    if (!whatsappUrl.startsWith('http')) {
      toast.error(t('common:error_occurred', 'An error occurred'));
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const shareInstagram = () => {
    const instagramUrl = formatInstagramUrl(salonInstagram);
    if (instagramUrl.length === 0) {
      toast.error(t('common:error_occurred', 'An error occurred'));
      return;
    }

    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl pb-8">
      {/* Loyalty and Cashback */}
      <div className="mb-6">
        <h2 className="font-semibold mb-4">{t('adminpanel/loyaltymanagement:title')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('loyalty.subtitle', 'Collect points and get cashback from each service')}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-green-600" size={20} />
              <span className="text-sm font-medium">{t('loyalty.your_cashback', 'Your Cashback')}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{cashbackPercent.toFixed(0)}%</div>
            <div className="text-xs text-gray-500">{t('loyalty.cashback_description', 'The cost of each service is refunded in points')}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="text-blue-600" size={20} />
              <span className="text-sm font-medium">{t('loyalty.available_points', 'Points available')}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{loyaltyInfo.available_points}</div>
            <div className="text-xs text-gray-500">{t('loyalty.points_value', '1 point = 1 {{currency}} discount', { currency: currency })}</div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="text-amber-500 fill-amber-500" size={20} />
            <span className="font-semibold">{currentLevel.displayName}</span>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{loyaltyInfo.points}</div>
            <div className="text-xs text-gray-500">{t('loyalty.points', 'points')}</div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {loyaltyInfo.points} {t('loyalty.points_total', 'total accumulated')} • {t('loyalty.discount', 'Discount {{percent}}%', { percent: loyaltyInfo.discount })}
        </div>

        {nextLevel && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-700">{t('loyalty.to_next_level', 'To')} {nextLevel.displayName} {t('loyalty.level', 'level')}</span>
              <span className="font-semibold">{nextLevel.points} {t('loyalty.points', 'points')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-gray-400 to-gray-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    nextLevel.points > currentLevel.points
                      ? ((loyaltyInfo.points - currentLevel.points) / (nextLevel.points - currentLevel.points)) * 100
                      : 0,
                    100
                  )}%`
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {t('loyalty.next_discount', 'Upon reaching')} {nextLevel.displayName} {t('loyalty.level', 'level')} {t('loyalty.your_discount', 'your discount will be')} {nextLevel.discount}%
            </div>
          </div>
        )}
      </div>

      {/* Level System */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-blue-600" size={20} />
          <h2 className="font-semibold">{t('loyalty.tier_system', 'Level system')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">{t('loyalty.tier_explanation', 'Collect points and get more privileges')}</p>
      </div>

      {/* Levels Grid */}
      <div className="grid grid-cols-2 gap-4">
        {levelsToRender.map((level: any) => {
          const isCurrent = level.key === currentLevel.key;

          return (
            <div
              key={level.key}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <span className="font-semibold">{level.displayName}</span>
                  {isCurrent && (
                    <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded">
                      {t('loyalty.current', 'Current')}
                    </span>
                  )}
                </div>
                {level.discount > 0 && (
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {level.discount}%
                    </div>
                    <div className="text-xs text-gray-500">{t('loyalty.discount_short', 'discount')}</div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">{level.requirement}</div>
            </div>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-2">{t('loyalty.total_spent', 'Total spent')}</div>
          <div className="text-2xl font-bold">{formatCurrency(loyaltyInfo.total_spent, currency)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-2">{t('loyalty.total_saved', 'Total Saved')}</div>
          <div className="text-2xl font-bold">{formatCurrency(loyaltyInfo.total_saved, currency)}</div>
        </div>
      </div>

      {/* Referral Program */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">


        <div className="flex items-center gap-3 mb-2">
          <Gift className="text-purple-600" size={20} />
          <h2 className="font-semibold">{t('loyalty.referral_program', 'Referral program')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">{t('loyalty.referral_subtitle', 'Invite friends and get bonuses')}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">{t('loyalty.your_promo', 'Your referral code')}</span>
            <button
              onClick={handleCopyReferral}
              disabled={!hasReferralCode}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="font-mono text-lg font-bold bg-white border border-dashed border-gray-200 rounded-lg p-3 mb-4 text-center">
            {hasReferralCode ? referralCode : '-'}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {t('loyalty.referral_code_hint', 'Код создается автоматически и используется для приглашения друзей.')}
          </p>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium text-gray-700 mb-2">{t('loyalty.referral_how_it_works', 'How does this work:')}</p>
            <ul className="space-y-1.5 pl-4">
              <li className="flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{t('loyalty.referral_step1', 'Share a promo code with a friend')}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{t('loyalty.referral_step2', 'A friend indicates the code when registering for the first time')}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{t('loyalty.referral_step3', 'You both get bonus points!')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">+{loyaltyInfo.referral_stats.points_for_referrer}</div>
            <div className="text-xs text-gray-600 mt-1">{t('loyalty.points_for_you', 'points for you')}</div>
          </div>
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">+{loyaltyInfo.referral_stats.points_for_friend}</div>
            <div className="text-xs text-gray-600 mt-1">{t('loyalty.points_for_friend', 'points for a friend')}</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{loyaltyInfo.referral_stats.referral_count}</div>
            <div className="text-xs text-gray-600 mt-1">{t('loyalty.invitations', 'invitations')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={shareWhatsApp}
            className="bg-black text-white py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={shareInstagram}
            className="bg-white text-black border border-gray-300 py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </button>
        </div>
      </div>


    </div>
  );
}
