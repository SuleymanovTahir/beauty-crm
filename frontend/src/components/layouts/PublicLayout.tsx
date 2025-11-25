//src/components/PublicLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Phone, Mail, Instagram, Menu, X, MessageCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import PublicLanguageSwitcher from '../PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function PublicLayout() {
  const location = useLocation();
  const { t } = useTranslation(['public', 'common']);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [salonInfo, setSalonInfo] = React.useState<any>({});

  React.useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  const menuItems = [
    { label: t('public:home'), path: '/' },
    { label: t('public:price_list'), path: '/price-list' },
    { label: t('public:about'), path: '/about' },
    { label: t('public:contacts'), path: '/contacts' },
    { label: t('public:faq'), path: '/faq' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              {/* <img src="./logo.png" 
                alt={salonInfo.name || "Logo"} 
                className="w-12 h-12 object-contain rounded-full"/> */}
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl text-gray-900">{salonInfo.name}</h1>
                <p className="text-xs text-gray-500">{salonInfo.tagline}</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors ${location.pathname === item.path
                    ? 'text-pink-600'
                    : 'text-gray-700 hover:text-pink-600'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Contact Info & CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {salonInfo.phone && (
                <a
                  href={`tel:${salonInfo.phone}`}
                  className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{salonInfo.phone}</span>
                </a>
              )}
              {salonInfo.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              <PublicLanguageSwitcher />
              <Link
                to="/cabinet"
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow"
              >
                {t('public:login')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-3 rounded-lg ${location.pathname === item.path
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/cabinet"
                className="block px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-center rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('public:personal_cabinet')}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg mb-4">{salonInfo.name}</h3>
              <p className="text-gray-400 text-sm">
                {salonInfo.description || t('public:footer.description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg mb-4">{t('public:footer.quick_links')}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/price-list" className="hover:text-white">{t('public:price_list')}</Link></li>
                <li><Link to="/about" className="hover:text-white">{t('public:about')}</Link></li>
                <li><Link to="/cooperation" className="hover:text-white">{t('public:footer.cooperation')}</Link></li>
                <li><Link to="/faq" className="hover:text-white">{t('public:faq')}</Link></li>
              </ul>
            </div>

            {/* Contacts */}
            <div>
              <h3 className="text-lg mb-4">{t('public:footer.contacts')}</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                {salonInfo.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${salonInfo.phone}`} className="hover:text-white transition-colors">
                      {salonInfo.phone}
                    </a>
                  </li>
                )}
                {salonInfo.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${salonInfo.email}`} className="hover:text-white transition-colors">
                      {salonInfo.email}
                    </a>
                  </li>
                )}
                {salonInfo.instagram && (
                  <li className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    <a
                      href={`https://instagram.com/${salonInfo.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {salonInfo.instagram}
                    </a>
                  </li>
                )}
                {salonInfo.whatsapp && (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <a
                      href={`https://wa.me/${salonInfo.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Working Hours */}
            <div>
              <h3 className="text-lg mb-4">{t('public:footer.working_hours')}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{t('public:footer.weekdays')}: {salonInfo.hours_weekdays}</li>
                <li>{t('public:footer.weekends')}: {salonInfo.hours_weekends}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2025 {salonInfo.name}. {t('public:footer.all_rights')}.</p>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="hover:text-white">{t('public:footer.privacy_policy')}</Link>
              <Link to="/terms" className="hover:text-white">{t('public:footer.terms')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
