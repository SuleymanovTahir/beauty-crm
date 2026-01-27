// /frontend/src/components/layouts/PublicLayout.tsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Phone, Mail, Instagram, Menu, X, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSalonInfo } from '../../../public_landing/hooks/useSalonInfo';
import PublicLanguageSwitcher from '../PublicLanguageSwitcher';
import './PublicLayout.css';

/**
 * PublicLayout - Main layout for public-facing pages with premium aesthetics.
 * Uses useSalonInfo hook for unified data management.
 * Strictly follows the "No colors in TSX" rule.
 */
export default function PublicLayout() {
  const location = useLocation();
  const { t } = useTranslation(['public', 'common']);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { salonInfo } = useSalonInfo();

  const menuItems = [
    { label: t('public:home'), path: '/' },
    { label: t('public:price_list'), path: '/price-list' },
    { label: t('public:about'), path: '/about' },
    { label: t('public:contacts'), path: '/contacts' },
    { label: t('public:faq'), path: '/faq' },
  ];

  const salonName = salonInfo?.name || '';
  const salonPhone = salonInfo?.phone || '';
  const salonEmail = salonInfo?.email || '';
  const salonInstagram = salonInfo?.instagram || '';
  const salonWhatsapp = salonInfo?.whatsapp || '';

  return (
    <div className="min-h-screen flex flex-col bg-white public-layout">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 brand-gradient rounded-full flex items-center justify-center shadow-lg group-hover:shadow-pink-500/20 transition-all duration-300">
                <Sparkles className="text-white w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold brand-text-gradient leading-tight">
                  {salonName}
                </h1>
                <p className="text-[10px] uppercase tracking-widest brand-text-primary font-semibold opacity-80">
                  {t('public:luxury_beauty')}
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors relative py-1 group brand-link ${location.pathname === item.path ? 'active' : ''
                    }`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 nav-underline transition-all duration-300 ${location.pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'
                    }`} />
                </Link>
              ))}
            </nav>

            {/* Contact Info & CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {salonPhone && (
                <a
                  href={`tel:${salonPhone}`}
                  className="flex items-center gap-2 brand-link transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">{salonPhone}</span>
                </a>
              )}
              {salonInstagram && (
                <a
                  href={`https://instagram.com/${salonInstagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full social-icon-instagram flex items-center justify-center transition-all"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {salonWhatsapp && (
                <a
                  href={`https://wa.me/${salonWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full social-icon-whatsapp flex items-center justify-center transition-all"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              <div className="h-6 w-px bg-gray-200 mx-2" />
              <PublicLanguageSwitcher />
              <Link
                to="/cabinet"
                className="px-6 py-2.5 btn-primary-gradient text-white rounded-full font-medium transition-all duration-300 hover:-translate-y-0.5"
              >
                {t('public:login')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-pink-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <nav className="px-4 py-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-3 rounded-xl font-medium ${location.pathname === item.path
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-gray-100">
                <Link
                  to="/cabinet"
                  className="block px-4 py-4 btn-primary-gradient text-white text-center rounded-xl font-bold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('public:personal_cabinet')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* About */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">{salonName}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {salonInfo?.description || t('public:footer.description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm footer-section-title mb-6">{t('public:footer.quick_links')}</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link to="/price-list" className="footer-link">{t('public:price_list')}</Link></li>
                <li><Link to="/about" className="footer-link">{t('public:about')}</Link></li>
                <li><Link to="/cooperation" className="footer-link">{t('public:footer.cooperation')}</Link></li>
                <li><Link to="/faq" className="footer-link">{t('public:faq')}</Link></li>
              </ul>
            </div>

            {/* Contacts */}
            <div>
              <h4 className="text-sm footer-section-title mb-6">{t('public:footer.contacts')}</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                {salonPhone && (
                  <li className="flex items-center gap-3 group footer-contact-item">
                    <div className="w-8 h-8 rounded-full footer-contact-icon flex items-center justify-center transition-colors">
                      <Phone className="w-4 h-4 group-hover:text-pink-500" />
                    </div>
                    <a href={`tel:${salonPhone}`} className="footer-link">
                      {salonPhone}
                    </a>
                  </li>
                )}
                {salonEmail && (
                  <li className="flex items-center gap-3 group footer-contact-item">
                    <div className="w-8 h-8 rounded-full footer-contact-icon flex items-center justify-center transition-colors">
                      <Mail className="w-4 h-4 group-hover:text-blue-500" />
                    </div>
                    <a href={`mailto:${salonEmail}`} className="footer-link">
                      {salonEmail}
                    </a>
                  </li>
                )}
                <li className="flex gap-4 pt-2">
                  {salonInstagram && (
                    <a
                      href={`https://instagram.com/${salonInstagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full footer-contact-icon flex items-center justify-center hover:bg-pink-500 transition-all duration-300 shadow-lg"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {salonWhatsapp && (
                    <a
                      href={`https://wa.me/${salonWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full footer-contact-icon flex items-center justify-center hover:bg-green-500 transition-all duration-300 shadow-lg"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  )}
                </li>
              </ul>
            </div>

            {/* Working Hours */}
            <div>
              <h4 className="text-sm footer-section-title mb-6">{t('public:footer.working_hours')}</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex justify-between items-center footer-working-hours-item p-3 rounded-lg">
                  <span className="text-xs uppercase tracking-wider">{t('public:footer.weekdays')}</span>
                  <span className="text-white font-bold">{salonInfo?.hours_weekdays || ''}</span>
                </li>
                <li className="flex justify-between items-center footer-working-hours-item p-3 rounded-lg">
                  <span className="text-xs uppercase tracking-wider">{t('public:footer.weekends')}</span>
                  <span className="text-white font-bold">{salonInfo?.hours_weekends || ''}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 {salonName}. {t('public:footer.all_rights')}.</p>
            <div className="flex gap-8">
              <Link to="/privacy-policy" className="footer-link">{t('public:footer.privacy_policy')}</Link>
              <Link to="/terms" className="footer-link">{t('public:footer.terms')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
