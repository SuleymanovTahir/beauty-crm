import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export function NotFound() {
  const { t, i18n } = useTranslation('public_landing');
  const [salonInfo, setSalonInfo] = useState<any>(null);

  useEffect(() => {
    // Set HTTP status code 404 for SEO
    document.title = `404 - ${t('notFoundTitle')} | M Le Diamant`;

    // Add meta tag for robots
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header salonInfo={salonInfo} />

      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50 px-4 pt-24 pb-12">
        <div className="max-w-2xl w-full text-center">
          {/* 404 Logo */}
          <div className="mb-8 font-serif">
            <h1 className="text-9xl font-bold text-pink-600 mb-4 tracking-tight">404</h1>
            <div className="h-1 w-24 bg-pink-600 mx-auto rounded-full"></div>
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
              className="inline-flex items-center gap-2 px-8 py-4 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-pink-200"
            >
              <Home className="w-5 h-5" />
              {t('goToHomepage')}
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-full hover:border-pink-600 hover:text-pink-600 transition-all duration-300 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('goBack')}
            </button>
          </div>

          {/* Popular Links */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-6">{t('popularPages')}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/" className="px-4 py-2 rounded-full bg-white border border-gray-100 text-sm text-gray-600 hover:text-pink-600 hover:border-pink-100 transition-all shadow-sm">{t('home')}</Link>
              <Link to="/#services" className="px-4 py-2 rounded-full bg-white border border-gray-100 text-sm text-gray-600 hover:text-pink-600 hover:border-pink-100 transition-all shadow-sm">{t('services')}</Link>
              <Link to="/account" className="px-4 py-2 rounded-full bg-white border border-gray-100 text-sm text-gray-600 hover:text-pink-600 hover:border-pink-100 transition-all shadow-sm">{t('myAccount')}</Link>
              <Link to="/new-booking" className="px-4 py-2 rounded-full bg-white border border-gray-100 text-sm text-gray-600 hover:text-pink-600 hover:border-pink-100 transition-all shadow-sm">{t('bookNow')}</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer salonInfo={salonInfo} />
    </div>
  );
}
