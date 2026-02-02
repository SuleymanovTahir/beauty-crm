import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import '../styles/css/landing.css';

export function NotFound() {
  const { t, i18n } = useTranslation('public_landing');
  const [salonInfo, setSalonInfo] = useState<any>(null);

  useEffect(() => {
    // Set HTTP status code 404 for SEO
    document.title = `${t('notFoundTitle')} | M Le Diamant`;

    // Add meta tag for robots if not already present
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      (metaRobots as any).name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', 'noindex, nofollow');

    // Fetch salon info for header/footer
    const fetchSalonInfo = async () => {
      try {
        const { fetchPublicApiWithLanguage } = await import('../utils/apiUtils');
        const data = await fetchPublicApiWithLanguage('salon-info', i18n.language);
        if (data && !data.error) {
          setSalonInfo(data);
        }
      } catch (error) {
        console.error('Error loading salon info:', error);
      }
    };
    fetchSalonInfo();

    return () => {
      // Cleanup
      document.head.removeChild(metaRobots);
    };
  }, [t, i18n.language]);

  return (
    <div className="not-found-container">
      <Header salonInfo={salonInfo} />

      <main className="not-found-main">
        <div className="max-w-2xl w-full text-center">
          {/* 404 Logo */}
          <div className="mb-8">
            <h1 className="not-found-404-text">404</h1>
            <div className="not-found-divider"></div>
          </div>

          {/* Error Message */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('notFoundTitle')}
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            {t('notFoundDescription')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/"
              className="btn-primary-capsule"
            >
              <Home className="w-5 h-5" />
              {t('goToHomepage')}
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-outline-capsule"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('goBack')}
            </button>
          </div>

          {/* Popular Links */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-6">{t('popularPages')}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/" className="popular-link-tag">{t('home')}</Link>
              <Link to="/#services" className="popular-link-tag">{t('services')}</Link>
              <Link to="/account" className="popular-link-tag">{t('myAccount')}</Link>
              <Link to="/new-booking" className="popular-link-tag">{t('bookNow')}</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer salonInfo={salonInfo} />
    </div>
  );
}
