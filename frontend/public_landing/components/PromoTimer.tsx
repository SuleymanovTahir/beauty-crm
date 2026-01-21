// /frontend/public_landing/components/PromoTimer.tsx
import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";
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
                const API_URL = getApiUrl();
                const res = await safeFetch(`${API_URL}/api/salon-settings`);
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
            <div className="bg-background/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-pink-100 shadow-lg">
                <p className="text-[oklch(0.145_0_0)] text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 sm:mb-3 text-center font-medium">
                    {t('promoEnds')}
                </p>

                <div className="flex items-center justify-center gap-1 sm:gap-3 md:gap-4">
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                        <div className="text-xl sm:text-3xl md:text-4xl text-[oklch(0.145_0_0)] tabular-nums tracking-tight font-bold">
                            {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[oklch(0.145_0_0)] opacity-80 uppercase tracking-wider mt-1 sm:mt-1.5 font-medium">
                            {t('days')}
                        </div>
                    </div>
                    <div className="text-lg sm:text-2xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-4">:</div>
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                        <div className="text-xl sm:text-3xl md:text-4xl text-[oklch(0.145_0_0)] tabular-nums tracking-tight font-bold">
                            {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[oklch(0.145_0_0)] opacity-80 uppercase tracking-wider mt-1 sm:mt-1.5 font-medium">
                            {t('hours')}
                        </div>
                    </div>
                    <div className="text-lg sm:text-2xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-4">:</div>
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                        <div className="text-xl sm:text-3xl md:text-4xl text-[oklch(0.145_0_0)] tabular-nums tracking-tight font-bold">
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[oklch(0.145_0_0)] opacity-80 uppercase tracking-wider mt-1 sm:mt-1.5 font-medium">
                            {t('minutes')}
                        </div>
                    </div>
                    <div className="text-lg sm:text-2xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-4">:</div>
                    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[60px]">
                        <div className="text-xl sm:text-3xl md:text-4xl text-[oklch(0.145_0_0)] tabular-nums tracking-tight font-bold">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-[oklch(0.145_0_0)] opacity-80 uppercase tracking-wider mt-1 sm:mt-1.5 font-medium">
                            {t('seconds')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
