// /frontend/public_landing/components/PromoTimer.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function PromoTimer() {
    const { t } = useTranslation(['public_landing', 'common']);
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
        <div className="animate-fade-in">
            <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                <p className="text-white/90 text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-3 sm:mb-4 text-center">
                    {t('promoEnds', { defaultValue: 'Акция действует ещё' })}
                </p>

                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
                    <div className="flex flex-col items-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-2xl sm:text-4xl md:text-5xl text-amber-400 tabular-nums tracking-tight">
                            {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider mt-1 sm:mt-2">
                            {t('days', { defaultValue: 'дней' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-3xl text-white/30 pb-3 sm:pb-5">:</div>
                    <div className="flex flex-col items-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-2xl sm:text-4xl md:text-5xl text-amber-400 tabular-nums tracking-tight">
                            {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider mt-1 sm:mt-2">
                            {t('hours', { defaultValue: 'часов' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-3xl text-white/30 pb-3 sm:pb-5">:</div>
                    <div className="flex flex-col items-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-2xl sm:text-4xl md:text-5xl text-amber-400 tabular-nums tracking-tight">
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider mt-1 sm:mt-2">
                            {t('minutes', { defaultValue: 'минут' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-3xl text-white/30 pb-3 sm:pb-5">:</div>
                    <div className="flex flex-col items-center min-w-[50px] sm:min-w-[70px]">
                        <div className="text-2xl sm:text-4xl md:text-5xl text-amber-400 tabular-nums tracking-tight">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider mt-1 sm:mt-2">
                            {t('seconds', { defaultValue: 'секунд' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
