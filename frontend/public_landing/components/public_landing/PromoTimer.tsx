import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function PromoTimer() {
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
        <section className="py-12 bg-[#f5f3f0]">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="flex justify-center items-center">
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
        </section>
    );
}
