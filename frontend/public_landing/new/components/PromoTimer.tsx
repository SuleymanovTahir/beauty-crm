import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";

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

    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]"
        >
            <div className="relative">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[oklch(0.145_0_0)] tabular-nums tracking-tight font-bold bg-gradient-to-br from-primary/10 to-transparent p-2 sm:p-3 rounded-lg">
                    {String(value).padStart(2, '0')}
                </div>
            </div>
            <div className="text-[10px] sm:text-xs text-[oklch(0.145_0_0)] opacity-80 uppercase tracking-wider mt-1 sm:mt-2 font-medium">
                {label}
            </div>
        </motion.div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <div className="bg-white/50 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-pink-100 shadow-lg">
                <p className="text-[oklch(0.145_0_0)] text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-3 sm:mb-4 lg:mb-6 text-center font-medium">
                    {t('promoEnds', { defaultValue: 'Акция действует ещё' })}
                </p>

                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
                    <TimeUnit value={timeLeft.days} label={t('days', { defaultValue: 'дней' })} />
                    <div className="text-xl sm:text-2xl md:text-3xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-6">:</div>
                    <TimeUnit value={timeLeft.hours} label={t('hours', { defaultValue: 'часов' })} />
                    <div className="text-xl sm:text-2xl md:text-3xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-6">:</div>
                    <TimeUnit value={timeLeft.minutes} label={t('minutes', { defaultValue: 'минут' })} />
                    <div className="text-xl sm:text-2xl md:text-3xl text-[oklch(0.145_0_0)] opacity-60 pb-3 sm:pb-6">:</div>
                    <TimeUnit value={timeLeft.seconds} label={t('seconds', { defaultValue: 'секунд' })} />
                </div>
            </div>
        </motion.div>
    );
}
