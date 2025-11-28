import { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";

export function PromoTimer() {
    const { t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Fetch promo end date from API
        const fetchSettings = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
                const res = await fetch(`${API_URL}/api/salon-settings`);
                if (res.ok) {
                    const settings = await res.json();
                    if (settings.promo_end_date) {
                        startTimer(new Date(settings.promo_end_date));
                        return;
                    }
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }

            // Fallback: End of current month
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            startTimer(endOfMonth);
        };

        fetchSettings();
    }, []);

    const startTimer = (deadline: Date) => {
        const calculateTimeLeft = () => {
            const difference = +deadline - +new Date();

            if (difference > 0) {
                setIsVisible(true);
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setIsVisible(false);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    };

    if (!isVisible) return null;

    return (
        <div className="mt-12 animate-fade-in">
            <div className="flex flex-col gap-6">
                <p className="text-white/80 text-sm uppercase tracking-[0.2em] mb-2">
                    {t('promoEnds')}
                </p>

                <div className="flex items-center gap-4 md:gap-8">
                    <div className="flex flex-col items-center">
                        <div className="text-4xl md:text-5xl font-light text-white tabular-nums tracking-wider">
                            {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2">{t('days')}</div>
                    </div>
                    <div className="text-2xl md:text-3xl font-light text-white/30 -mt-6">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-4xl md:text-5xl font-light text-white tabular-nums tracking-wider">
                            {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2">{t('hours')}</div>
                    </div>
                    <div className="text-2xl md:text-3xl font-light text-white/30 -mt-6">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-4xl md:text-5xl font-light text-white tabular-nums tracking-wider">
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2">{t('minutes')}</div>
                    </div>
                    <div className="text-2xl md:text-3xl font-light text-white/30 -mt-6">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-4xl md:text-5xl font-light text-white tabular-nums tracking-wider">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2">{t('seconds')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
