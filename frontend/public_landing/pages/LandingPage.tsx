import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { IntroSection } from '../components/IntroSection';
import { CookieConsent } from '../components/CookieConsent';
import { Footer } from '../components/Footer';
import { trackSection } from '../utils/analytics';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Share2 } from 'lucide-react';
import { api } from '../../src/services/api';
import {
  captureReferralAttributionFromCurrentUrl,
  getLanguageFromQuery,
  persistReferralAttribution,
  normalizeSeoLanguage,
  syncCanonicalAndHreflang,
  syncHtmlLanguageMeta,
  syncLanguageQueryParam,
} from '../utils/urlUtils';
import '../styles/css/index.css';

// Lazy load components for better performance
const About = lazy(() => import('../components/About').then(m => ({ default: m.About })));
const Services = lazy(() => import('../components/Services').then(m => ({ default: m.Services })));
const Portfolio = lazy(() => import('../components/Portfolio').then(m => ({ default: m.Portfolio })));
const TeamSection = lazy(() => import('../components/TeamSection').then(m => ({ default: m.TeamSection })));
const ReviewsSection = lazy(() => import('../components/ReviewsSection').then(m => ({ default: m.ReviewsSection })));
const Gallery = lazy(() => import('../components/Gallery').then(m => ({ default: m.Gallery })));
const FAQ = lazy(() => import('../components/FAQ').then(m => ({ default: m.FAQ })));
const MapSection = lazy(() => import('../components/MapSection').then(m => ({ default: m.MapSection })));
const BookingSection = lazy(() => import('../components/BookingSection').then(m => ({ default: m.BookingSection })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

interface ReferralCabinetLead {
  id: string;
  event_type: 'visit' | 'booking';
  name: string;
  phone: string;
  location: string;
  registered: boolean;
  booked: boolean;
  status: string;
  timestamp: string | null;
}

interface ReferralCabinetProfile {
  campaign_id: number;
  campaign_name: string;
  campaign_description: string;
  campaign_active: boolean;
  period: string;
  date_from: string;
  date_to: string;
  share_token: string;
  is_individual_link: boolean;
  referrer_client_id: string;
  referrer_name: string;
  referrer_phone: string;
  referral_link: string;
  referral_link_absolute: string;
  total_clicks: number;
  unique_clicks: number;
  total_bookings: number;
  registered_clients: number;
  conversion_rate: number;
  leads: ReferralCabinetLead[];
}

export function LandingPage() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const { shareToken } = useParams<{ shareToken: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<any>(null);
  const [referralToken, setReferralToken] = useState('');
  const [referralProfile, setReferralProfile] = useState<ReferralCabinetProfile | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  const normalizeReferralLink = (rawLink: string) => {
    const normalizedLink = String(rawLink ?? '').trim();
    if (normalizedLink.startsWith('http://') || normalizedLink.startsWith('https://')) {
      return normalizedLink;
    }
    if (normalizedLink.startsWith('/')) {
      return `${window.location.origin}${normalizedLink}`;
    }
    return `${window.location.origin}/${normalizedLink}`;
  };

  const handleCopyReferralLink = async (linkValue: string) => {
    try {
      await navigator.clipboard.writeText(linkValue);
    } catch (error) {
      console.error('Error copying referral link:', error);
    }
  };

  const handleShareReferralLink = async (linkValue: string) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: t('referral_cabinet_title', 'Реферальный кабинет'),
          text: t('referral_cabinet_subtitle', 'Ваша персональная ссылка и аналитика переходов'),
          url: linkValue,
        });
        return;
      }
      await handleCopyReferralLink(linkValue);
    } catch (error) {
      console.error('Error sharing referral link:', error);
    }
  };

  const handleDownloadReferralQr = (containerId: string, fileName: string) => {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      return;
    }

    const qrSvgElement = containerElement.querySelector('svg');
    if (!qrSvgElement) {
      return;
    }

    const svgString = new XMLSerializer().serializeToString(qrSvgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const downloadAnchor = document.createElement('a');
    const safeName = String(fileName ?? 'referral-qr')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    downloadAnchor.href = objectUrl;
    downloadAnchor.download = `${safeName.length > 0 ? safeName : 'referral-qr'}.svg`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(objectUrl);
  };

  // SEO: Dynamic meta tags
  useEffect(() => {
    const language = normalizeSeoLanguage(i18n.language);
    const baseUrl = (initialData?.seo?.base_url || window.location.origin).toString();
    const description = t('seo.description', 'Professional beauty salon. Manicure, pedicure, hair services, cosmetology.');
    const title = t('seo.title', 'M Le Diamant - Premium Beauty Salon in Dubai | Spa, Nails, Hair, Keratin, Brows, Lashes, Waxing, Permanent Makeup');
    const baseKeywords = t('seo.keywords', 'beauty salon, manicure, pedicure, hair, cosmetology');
    const serviceKeywords = Array.isArray(initialData?.services)
      ? Array.from(
        new Set(
          initialData.services
            .map((service: any) =>
              (service?.name ?? '').toString().trim().toLowerCase()
            )
            .filter((name: string) => name.length > 1)
        )
      ).slice(0, 20)
      : [];
    const keywords = [baseKeywords, ...serviceKeywords].join(', ');

    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const canonicalUrl = syncCanonicalAndHreflang(baseUrl, window.location.pathname || '/', language);
    syncLanguageQueryParam(language);
    syncHtmlLanguageMeta(language);

    document.title = title;
    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('robots', 'index, follow');
    updateMeta('language', language);
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMetaProperty('og:title', title);
    updateMetaProperty('og:description', description);
    updateMetaProperty('og:url', canonicalUrl);
  }, [initialData, t, i18n.language]);

  useEffect(() => {
    const normalizedRouteToken = String(shareToken ?? '').trim().toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const normalizedQueryShareToken = String(searchParams.get('ref_share') ?? '').trim().toLowerCase();
    const parsedCampaignId = Number.parseInt(String(searchParams.get('ref_campaign') ?? ''), 10);
    const fallbackCampaignToken = Number.isFinite(parsedCampaignId) && parsedCampaignId > 0
      ? `cmp${parsedCampaignId}`
      : '';
    const resolvedToken = normalizedRouteToken.length > 0
      ? normalizedRouteToken
      : normalizedQueryShareToken.length > 0
        ? normalizedQueryShareToken
        : fallbackCampaignToken;

    setReferralToken(resolvedToken);

    if (resolvedToken.length > 0) {
      const inferredCampaignMatch = resolvedToken.match(/^cmp(\d+)$/);
      const inferredCampaignId = inferredCampaignMatch && inferredCampaignMatch[1]
        ? Number.parseInt(inferredCampaignMatch[1], 10)
        : 0;
      const resolvedCampaignId = Number.isFinite(parsedCampaignId) && parsedCampaignId > 0
        ? parsedCampaignId
        : inferredCampaignId;

      persistReferralAttribution({
        campaignId: resolvedCampaignId,
        shareToken: resolvedToken
      }, location.pathname);
    }

    const isCabinetMode = searchParams.get('cabinet') === '1';
    const isReferralEntry = resolvedToken.length > 0;
    if (isReferralEntry && !isCabinetMode) {
      const redirectParams = new URLSearchParams(location.search);
      redirectParams.delete('ref_campaign');
      redirectParams.delete('cabinet');
      redirectParams.set('ref_share', resolvedToken);

      const redirectQuery = redirectParams.toString();
      const accountTarget = redirectQuery.length > 0 ? `/account?${redirectQuery}` : '/account';
      navigate(accountTarget, { replace: true });
      return;
    }

    if (normalizedRouteToken.length === 0 && resolvedToken.length > 0) {
      searchParams.delete('ref_campaign');
      searchParams.delete('ref_share');
      const cleanQuery = searchParams.toString();
      const targetPath = cleanQuery.length > 0
        ? `/ref/${resolvedToken}?${cleanQuery}`
        : `/ref/${resolvedToken}`;
      navigate(targetPath, { replace: true });
    }
  }, [shareToken, location.pathname, location.search, navigate]);

  useEffect(() => {
    const loadReferralProfile = async () => {
      const normalizedToken = String(referralToken ?? '').trim().toLowerCase();
      if (normalizedToken.length === 0) {
        setReferralProfile(null);
        setReferralLoading(false);
        return;
      }

      try {
        setReferralLoading(true);
        const response = await api.getPublicReferralLinkProfile(normalizedToken, { period: '30d' });
        const profile = response?.profile ?? null;
        setReferralProfile(profile);
        if (profile && Number.isFinite(Number(profile.campaign_id)) && Number(profile.campaign_id) > 0) {
          persistReferralAttribution({
            campaignId: Number(profile.campaign_id),
            shareToken: normalizedToken
          }, window.location.pathname);
        }
      } catch (error) {
        console.error('Error loading referral profile:', error);
        setReferralProfile(null);
      } finally {
        setReferralLoading(false);
      }
    };

    loadReferralProfile();
  }, [referralToken]);

  useEffect(() => {
    captureReferralAttributionFromCurrentUrl();

    // We no longer use localStorage for initial data to avoid showing stale content
    // during development or after updates.

    // 2. Fetch fresh data from unified endpoint
    const fetchInitialData = async () => {
      try {
        const { fetchPublicApiWithLanguage } = await import('../utils/apiUtils');
        const queryLanguage = getLanguageFromQuery();
        const storedLanguage = localStorage.getItem('i18nextLng');
        const browserLanguage = normalizeSeoLanguage(navigator.language || 'en');
        const language = normalizeSeoLanguage(queryLanguage || storedLanguage || browserLanguage);

        if (normalizeSeoLanguage(i18n.language) !== language) {
          await i18n.changeLanguage(language);
        }
        syncLanguageQueryParam(language);
        syncHtmlLanguageMeta(language);

        const data = await fetchPublicApiWithLanguage('initial-load', language);

        if (data && !data.error) {
          setInitialData(data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    fetchInitialData();

    // 3. Setup section tracking
    trackSection('hero');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id) {
            trackSection(id);
          }
        }
      });
    }, { threshold: 0.3 });

    const sections = document.querySelectorAll('main > div[id]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, [i18n]);

  const referralProfileLink = referralProfile
    ? normalizeReferralLink(
      referralProfile.referral_link_absolute && referralProfile.referral_link_absolute.length > 0
        ? referralProfile.referral_link_absolute
        : referralProfile.referral_link
    )
    : '';

  return (
    <div className="min-h-screen bg-background">
      <Header salonInfo={initialData?.salon} />
      <main>
        {String(referralToken ?? '').trim().length > 0 && (
          <section className="px-4 md:px-8 pt-6">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                    {t('referral_cabinet_title', 'Реферальный кабинет')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('referral_cabinet_subtitle', 'Ваша персональная ссылка и аналитика переходов')}
                  </p>
                </div>

                {referralLoading && (
                  <p className="text-sm text-gray-500">{t('common:loading', 'Загрузка')}</p>
                )}

                {!referralLoading && referralProfile && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{t('referral_campaign_label', 'Кампания')}</p>
                        <p className="text-sm font-semibold text-gray-900">{referralProfile.campaign_name}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{t('assigned_to', 'Закреплено за')}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {referralProfile.referrer_name ? referralProfile.referrer_name : t('referral_general_link', 'Общая ссылка кампании')}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-2">{t('campaign_referral_link', 'Реферальная ссылка')}</p>
                      <div className="flex flex-col md:flex-row gap-2">
                        <input
                          value={referralProfileLink}
                          readOnly
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyReferralLink(referralProfileLink)}
                          className="h-10 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white inline-flex items-center justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          {t('copy_link', 'Копировать')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareReferralLink(referralProfileLink)}
                          className="h-10 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white inline-flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          {t('share', 'Поделиться')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReferralQr('public-referral-qr', `referral-${referralProfile.share_token}`)}
                          className="h-10 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white inline-flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          {t('download_qr', 'Скачать QR')}
                        </button>
                      </div>
                      <div id="public-referral-qr" className="mt-3 inline-flex p-3 rounded-lg border border-gray-200 bg-white">
                        <QRCodeSVG value={referralProfileLink} size={128} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="rounded-lg border border-gray-200 p-2 bg-white">
                        <p className="text-[11px] text-gray-500">{t('analytics_clicks', 'Переходы')}</p>
                        <p className="text-base font-semibold text-gray-900">{referralProfile.total_clicks}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-2 bg-white">
                        <p className="text-[11px] text-gray-500">{t('analytics_unique_clicks', 'Уникальные переходы')}</p>
                        <p className="text-base font-semibold text-gray-900">{referralProfile.unique_clicks}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-2 bg-white">
                        <p className="text-[11px] text-gray-500">{t('analytics_bookings', 'Записи')}</p>
                        <p className="text-base font-semibold text-gray-900">{referralProfile.total_bookings}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-2 bg-white">
                        <p className="text-[11px] text-gray-500">{t('analytics_registered', 'Зарегистрированы')}</p>
                        <p className="text-base font-semibold text-gray-900">{referralProfile.registered_clients}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-2 bg-white">
                        <p className="text-[11px] text-gray-500">{t('analytics_conversion', 'Конверсия')}</p>
                        <p className="text-base font-semibold text-gray-900">{referralProfile.conversion_rate}%</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      {t('analytics_clicks_hint', 'Переходы — все открытия ссылки. Уникальные переходы — разные посетители без повторов.')}
                    </p>

                    {Array.isArray(referralProfile.leads) && referralProfile.leads.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-800">{t('referral_leads_title', 'Кто перешел и записался')}</p>
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                          {referralProfile.leads.slice(0, 12).map((lead) => (
                            <div key={lead.id} className="px-3 py-2 text-xs text-gray-700">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {lead.event_type === 'booking' ? t('event_booking', 'Запись') : t('event_visit', 'Переход')}
                                </span>
                                <span className="text-gray-500">
                                  {lead.timestamp ? new Date(lead.timestamp).toLocaleString() : '-'}
                                </span>
                              </div>
                              <p className="mt-1">
                                {lead.name} {lead.phone !== '-' ? `• ${lead.phone}` : ''}
                              </p>
                              <p className="text-gray-500 mt-1">
                                {t('location_label', 'Локация')}: {lead.location}
                              </p>
                              <p className="text-gray-500 mt-1">
                                {lead.registered ? t('event_registered', 'Зарегистрирован') : t('event_not_registered', 'Не зарегистрирован')}
                                {' • '}
                                {lead.booked ? t('event_booked', 'Записался') : t('event_not_booked', 'Не записался')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!referralLoading && !referralProfile && (
                  <p className="text-sm text-gray-500">{t('referral_not_found', 'Ссылка не найдена или неактивна')}</p>
                )}
              </div>
            </div>
          </section>
        )}

        <Hero
          initialBanner={initialData?.banners?.[0]}
          salonInfo={initialData?.salon}
        />

        {/* SEO-оптимизированная секция с ключевыми словами из H1 */}
        <IntroSection />

        <Suspense fallback={<LoadingSpinner />}>
          <About />
        </Suspense>

        <div id="services">
          <Suspense fallback={<LoadingSpinner />}>
            <Services initialServices={initialData?.services} />
          </Suspense>
        </div>

        <div id="portfolio">
          <Suspense fallback={<LoadingSpinner />}>
            <Portfolio />
          </Suspense>
        </div>

        <div id="team">
          <Suspense fallback={<LoadingSpinner />}>
            <TeamSection />
          </Suspense>
        </div>

        <div id="testimonials">
          <Suspense fallback={<LoadingSpinner />}>
            <ReviewsSection />
          </Suspense>
        </div>

        <div id="gallery">
          <Suspense fallback={<LoadingSpinner />}>
            <Gallery />
          </Suspense>
        </div>

        <div id="faq">
          <Suspense fallback={<LoadingSpinner />}>
            <FAQ />
          </Suspense>
        </div>

        <div id="map-section">
          <Suspense fallback={<LoadingSpinner />}>
            <MapSection salonInfo={initialData?.salon} />
          </Suspense>
        </div>

        <div id="booking">
          <Suspense fallback={<LoadingSpinner />}>
            <BookingSection />
          </Suspense>
        </div>
      </main>

      <Footer salonInfo={initialData?.salon} />
      <CookieConsent />
    </div>
  );
}
