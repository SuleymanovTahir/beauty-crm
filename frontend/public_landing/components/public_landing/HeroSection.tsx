import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HeroSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 6,
    minutes: 44,
    seconds: 39
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center bg-[#e8dfd5]" style={{ marginTop: '-80px', paddingTop: '80px' }}>
      {/* Full screen background image with model */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1762843353166-e0542bba1a66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiZWF1dHklMjBtb2RlbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NDIxODIzNHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="M Le Diamant Model"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#e8dfd5]/95 via-[#e8dfd5]/60 to-transparent" />
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-24">
          {/* Left side - Content */}
          <div className="space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full">
              <Sparkles className="w-4 h-4 text-[#b8a574]" />
              <span className="text-sm text-[#2d2d2d]">{t('heroTag')}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-[#2d2d2d] tracking-tight leading-tight">
                {t('heroTitle')}
                <span className="block mt-2">{t('heroSubtitle')}</span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-[#2d2d2d] max-w-lg leading-relaxed">
              {t('heroDescription')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToBooking}
                className="px-8 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                {t('bookNow')}
              </button>
              <button className="px-8 py-4 border-2 border-[#2d2d2d] text-[#2d2d2d] rounded-full hover:bg-[#2d2d2d] hover:text-white transition-colors">
                {t('ourServices')}
              </button>
            </div>
          </div>

          {/* Right side - Timer */}
          <div className={`flex ${language === 'ar' ? 'lg:justify-start' : 'lg:justify-end'} items-center`}>
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 lg:p-12 shadow-2xl max-w-md w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <p className="text-sm text-[#6b6b6b] mb-4 text-center">{t('promoEnds')}</p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl text-[#2d2d2d] mb-2">
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-[#6b6b6b] uppercase tracking-wider">{t('days')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl text-[#2d2d2d] mb-2">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-[#6b6b6b] uppercase tracking-wider">{t('hours')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl text-[#2d2d2d] mb-2">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-[#6b6b6b] uppercase tracking-wider">{t('minutes')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl text-[#2d2d2d] mb-2">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-[#6b6b6b] uppercase tracking-wider">{t('seconds')}</div>
                </div>
              </div>

              <button
                onClick={scrollToBooking}
                className="w-full px-8 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors mb-4"
              >
                {t('bookNow')}
              </button>

              <p className="text-xs text-center text-[#6b6b6b]">{t('availableForNew')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
