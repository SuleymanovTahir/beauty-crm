import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { IntroSection } from '../components/IntroSection';
import { CookieConsent } from '../components/CookieConsent';
import { Footer } from '../components/Footer';
import { trackSection } from '../utils/analytics';
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
    const salonName = initialData?.salon?.name || '';
    const description = t('seo.description', 'Professional beauty salon. Manicure, pedicure, hair services, cosmetology.');
    const keywords = t('seo.keywords', 'beauty salon, manicure, pedicure, hair, cosmetology');

    if (salonName) {
      document.title = `${salonName} - ${t('seo.title', 'Luxury Beauty Salon')}`;
    } else {
      document.title = t('seo.title', 'Luxury Beauty Salon');
    }

    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);
  }, [initialData, t, i18n.language]);

  useEffect(() => {
    // We no longer use localStorage for initial data to avoid showing stale content
    // during development or after updates.

    // 2. Fetch fresh data from unified endpoint
    const fetchInitialData = async () => {
      try {
        const { fetchPublicApiWithLanguage } = await import('../utils/apiUtils');
        const language = localStorage.getItem('i18nextLng') || 'ru';
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
  }, []);

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
