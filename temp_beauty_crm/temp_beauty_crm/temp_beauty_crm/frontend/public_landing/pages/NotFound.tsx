import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation('public_landing');

  useEffect(() => {
    // Set HTTP status code 404 for SEO
    document.title = `404 - ${t('notFoundTitle')} | M Le Diamant`;

    // Add meta tag for robots
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    return () => {
      // Cleanup
      document.head.removeChild(metaRobots);
    };
  }, [t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Logo */}
        <div className="mb-8">
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors duration-200 font-medium"
          >
            <Home className="w-5 h-5" />
            {t('goToHomepage')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-pink-600 hover:text-pink-600 transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('goBack')}
          </button>
        </div>

        {/* Popular Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">{t('popularPages')}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/" className="text-sm text-pink-600 hover:underline">{t('home')}</Link>
            <Link to="/" className="text-sm text-pink-600 hover:underline">{t('services')}</Link>
            <Link to="/account" className="text-sm text-pink-600 hover:underline">{t('myAccount')}</Link>
            <Link to="/new-booking" className="text-sm text-pink-600 hover:underline">{t('bookNow')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
