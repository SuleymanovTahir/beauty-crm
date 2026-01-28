// /frontend/public_landing/components/PromoTimer.tsx
import { useState, useEffect } from "react";
import { fetchPublicApi } from "../utils/apiUtils";
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
                const settings = await fetchPublicApi('salon-settings');
                if (settings.promo_end_date) {
                    startTimer(new Date(settings.promo_end_date));
                    return;
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
        <div className="animate-fade-in promo-timer-container">
            <div className="promo-timer-card">
                <p className="promo-timer-label">
                    {t('promoEnds')}
                </p>

                <div className="promo-timer-grid">
                    <div className="promo-timer-unit">
                        <div className="promo-timer-value">
                            {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <div className="promo-timer-unit-label">
                            {t('days')}
                        </div>
                    </div>
                    <div className="promo-timer-separator">:</div>
                    <div className="promo-timer-unit">
                        <div className="promo-timer-value">
                            {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <div className="promo-timer-unit-label">
                            {t('hours')}
                        </div>
                    </div>
                    <div className="promo-timer-separator">:</div>
                    <div className="promo-timer-unit">
                        <div className="promo-timer-value">
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <div className="promo-timer-unit-label">
                            {t('minutes')}
                        </div>
                    </div>
                    <div className="promo-timer-separator">:</div>
                    <div className="promo-timer-unit">
                        <div className="promo-timer-value">
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <div className="promo-timer-unit-label">
                            {t('seconds')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
