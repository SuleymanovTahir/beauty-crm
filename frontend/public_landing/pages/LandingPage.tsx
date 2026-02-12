import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { IntroSection } from '../components/IntroSection';
import { CookieConsent } from '../components/CookieConsent';
import { Footer } from '../components/Footer';
import { trackSection } from '../utils/analytics';
import {
  getLanguageFromQuery,
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

export function LandingPage() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [initialData, setInitialData] = useState<any>(null);

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
              (service?.name || service?.name_en || service?.name_ru || '').toString().trim().toLowerCase()
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

  return (
    <div className="min-h-screen bg-background">
      <Header salonInfo={initialData?.salon} />
      <main>
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
