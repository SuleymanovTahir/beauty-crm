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
        const fetchSettings = async () => {
            try {
                const getApiUrl = () => {
                    try {
                        return import.meta?.env?.VITE_API_URL || window.location.origin;
                    } catch {
                        return window.location.origin;
                    }
                };
                const API_URL = getApiUrl();
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
        <div className="mt-8 sm:mt-12 animate-fade-in">
            <div className="bg-primary/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-primary/20">
                <p className="text-foreground/80 text-xs sm:text-sm uppercase tracking-[0.2em] mb-3 sm:mb-4 text-center">
                    {t('promoEnds', { defaultValue: 'Акция действует ещё' })}
                </p>

                <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8">
                    <div className="flex flex-col items-center">
                        <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-primary tabular-nums tracking-wider">
                            {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1 sm:mt-2">
                            {t('days', { defaultValue: 'дней' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl text-primary/30">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-primary tabular-nums tracking-wider">
                            {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1 sm:mt-2">
                            {t('hours', { defaultValue: 'часов' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl text-primary/30">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-primary tabular-nums tracking-wider">
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1 sm:mt-2">
                            {t('minutes', { defaultValue: 'минут' })}
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl text-primary/30">:</div>
                    <div className="flex flex-col items-center">
                        <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-primary tabular-nums tracking-wider">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1 sm:mt-2">
                            {t('seconds', { defaultValue: 'секунд' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
